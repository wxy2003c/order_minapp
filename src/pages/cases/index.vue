<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NDrawer } from 'naive-ui'
import { useRouter } from 'vue-router'
import TgSelect from '@/components/TgSelect.vue'
import CarSelectionPanel from '@/components/CarSelectionPanel.vue'
import StyleModelPickerDrawer from '@/components/StyleModelPickerDrawer.vue'
import { fetchCasesList, fetchFinishCards } from '@/api/rolesApi'
import type { CaseItem } from '@/api/rolesApi'
import type { FinishCardItem } from '@/api/admin/finishCards'
import type { StyleModelItem } from '@/api/admin/styleModels'
import { t } from '@/i18n/uiI18n'

const router = useRouter()

// ── 汽车选择弹层 ──────────────────────────────────────────────────────────────
const carOpen = ref(false)
const selectedBrand = ref('')
const selectedModel = ref('')

function onCarComplete() {
  carOpen.value = false
  applyAndLoad()
}

const carLabel = computed(() => {
  if (selectedBrand.value && selectedModel.value) return `${selectedBrand.value} ${selectedModel.value}`
  if (selectedBrand.value) return selectedBrand.value
  return ''
})

// ── 筛选抽屉 ──────────────────────────────────────────────────────────────────
const filterOpen = ref(false)
const pending = reactive({ structure_type: '', color_code: '', style_no: '' })
const applied = reactive({ structure_type: '', color_code: '', style_no: '' })

// WL 型号：用 StyleModelPickerDrawer 选取，结构切换时清空
const stylePickerOpen = ref(false)
const pendingStyleModel = ref<StyleModelItem | null>(null)

watch(() => pending.structure_type, () => {
  pending.style_no = ''
  pendingStyleModel.value = null
})

function openFilter() {
  Object.assign(pending, applied)
  pendingStyleModel.value = appliedStyleModel.value
  filterOpen.value = true
}

// 应用筛选时同步已选型号
const appliedStyleModel = ref<StyleModelItem | null>(null)

function onStyleModelConfirm(item: StyleModelItem) {
  pendingStyleModel.value = item
  pending.style_no = item.style_no
}

const styleNoLabel = computed(() => {
  const m = pendingStyleModel.value
  if (!m) return ''
  return `${m.style_no} ${m.style_name}`.trim()
})

const structureOptions = computed(() => [
  { label: t('headerFilter.all'), value: '' },
  { label: t('customOrder.structureSingle'), value: '单片' },
  { label: t('customOrder.structureDual'), value: '双片' },
  { label: t('customOrder.structureTriple'), value: '三片' },
  { label: t('customOrder.structureOffroad'), value: '越野' },
])

// 色卡：从 /finish-cards 接口取
const finishItems = ref<FinishCardItem[]>([])
const colorOptions = computed(() => {
  const opts = [{ label: t('headerFilter.all'), value: '' }]
  for (const item of finishItems.value) {
    const label = [item.code, item.name_cn].filter(Boolean).join(' ')
    opts.push({ label, value: item.code })
  }
  return opts
})

const selectedColorItem = computed(() =>
  finishItems.value.find(x => x.code === pending.color_code) ?? null,
)

function applyFilter() {
  Object.assign(applied, pending)
  appliedStyleModel.value = pendingStyleModel.value
  filterOpen.value = false
  applyAndLoad()
}

// ── 激活标签 ──────────────────────────────────────────────────────────────────
type TagKey = 'car' | 'structure_type' | 'color_code' | 'style_no'
const activeTags = computed((): { key: TagKey; label: string }[] => {
  const tags: { key: TagKey; label: string }[] = []
  if (carLabel.value) tags.push({ key: 'car', label: carLabel.value })
  if (applied.structure_type) tags.push({ key: 'structure_type', label: applied.structure_type })
  if (applied.color_code) tags.push({ key: 'color_code', label: applied.color_code })
  if (applied.style_no) tags.push({ key: 'style_no', label: applied.style_no })
  return tags
})

function removeTag(key: TagKey) {
  if (key === 'car') {
    selectedBrand.value = ''
    selectedModel.value = ''
  } else {
    applied[key] = ''
    pending[key] = ''
  }
  applyAndLoad()
}

// ── 列表数据 ──────────────────────────────────────────────────────────────────
const cases = ref<CaseItem[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const PAGE_SIZE = 20

async function loadCases(reset = false) {
  if (reset) {
    page.value = 1
    cases.value = []
  }
  loading.value = true
  try {
    const res = await fetchCasesList({
      car_brand: selectedBrand.value || undefined,
      style_no: applied.style_no || undefined,
      structure_type: applied.structure_type || undefined,
      color_code: applied.color_code || undefined,
      page: page.value,
      page_size: PAGE_SIZE,
    })
    if (reset) {
      cases.value = res.items ?? []
    } else {
      cases.value.push(...(res.items ?? []))
    }
    total.value = res.total ?? 0
  } finally {
    loading.value = false
  }
}

function applyAndLoad() {
  void loadCases(true)
}

async function loadMore() {
  if (loading.value || cases.value.length >= total.value) return
  page.value++
  await loadCases(false)
}

onMounted(async () => {
  const [fc] = await Promise.allSettled([
    fetchFinishCards(),
    loadCases(true),
  ])
  if (fc.status === 'fulfilled') {
    const seen = new Set<string>()
    const all: FinishCardItem[] = []
    for (const g of fc.value.groups ?? []) {
      for (const item of g.items ?? []) {
        if (!seen.has(item.code)) { seen.add(item.code); all.push(item) }
      }
    }
    finishItems.value = all
  }
})

function goDetail(item: CaseItem) {
  router.push({ path: '/CasesDetails', query: { caseId: String(item.id) } })
}

function specSummary(item: CaseItem): string[] {
  const s = item.wheel_specs?.front
  const parts: string[] = [item.structure_type].filter(Boolean)
  if (s?.size_r && s?.width_j) parts.push(`${s.size_r}x${s.width_j}J`)
  if (s?.pcd) parts.push(s.pcd)
  if (s?.et) parts.push(`ET${s.et}`)
  return parts
}
</script>

<template>
  <div class="min-h-full w-full overflow-x-hidden overflow-y-auto bg-[#202126] pb-6 text-white">
    <div class="px-4 pt-4">
      <img src="@/assets/image/navLogo.png" class="h-14 w-65" alt="">

      <!-- 顶部栏：汽车选择 + 筛选 -->
      <div class="mt-4 flex items-center justify-between gap-3 border-b border-b-[#BBBBBB]">
        <!-- 汽车品牌/车型 按钮 -->
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center justify-between gap-2 py-3 text-left outline-none"
          @click="carOpen = true"
        >
          <div class="min-w-0">
            <div class="text-3 text-white/55">{{ t('headerFilter.titleCase') }}</div>
            <div
              v-if="carLabel"
              class="mt-0.5 max-w-[160px] truncate text-3.25 font-600 text-white/90"
            >{{ carLabel }}</div>
          </div>
          <Icon
            icon="solar:alt-arrow-down-outline"
            width="18" height="18"
            class="shrink-0 text-white transition"
            :class="carOpen ? 'rotate-180' : ''"
          />
        </button>

        <!-- 筛选按钮 -->
        <button
          type="button"
          class="flex w-28 items-center justify-between px-4 py-3 text-4 font-600 text-white outline-none"
          @click="openFilter"
        >
          <span>{{ t('headerFilter.filter') }}</span>
          <Icon icon="hugeicons:filter-horizontal" width="18" height="18" />
        </button>
      </div>

      <!-- 激活筛选标签 -->
      <div class="mt-3 flex min-h-8 flex-wrap gap-2">
        <span
          v-if="activeTags.length === 0"
          class="rounded-full px-3 py-1.5 text-3 text-white/40"
        >{{ t('headerFilter.noActiveFilters') }}</span>
        <button
          v-for="tag in activeTags"
          :key="tag.key"
          type="button"
          class="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-3 text-white/90"
          @click="removeTag(tag.key)"
        >
          {{ tag.label }}
          <Icon icon="mdi:close" width="13" height="13" class="text-white/50" />
        </button>
      </div>
    </div>

    <!-- 案例列表 -->
    <div class="mt-5 flex flex-col gap-5 px-4">
      <!-- 骨架 -->
      <template v-if="loading && cases.length === 0">
        <div v-for="n in 4" :key="n" class="animate-pulse">
          <div class="h-48 w-full rounded-2xl bg-white/10" />
          <div class="mt-3 h-4 w-40 rounded bg-white/10" />
        </div>
      </template>
      <template v-else>
        <button
          v-for="item in cases"
          :key="item.id"
          type="button"
          class="w-full text-left transition active:opacity-80"
          @click="goDetail(item)"
        >
          <div class="relative h-48 w-full overflow-hidden rounded-2xl bg-white/5">
            <img
              v-if="item.cover_image"
              :src="item.cover_image"
              class="h-full w-full object-cover"
              alt=""
            >
            <div v-else class="flex h-full w-full items-center justify-center text-white/20">
              <Icon icon="mdi:image-outline" width="48" height="48" />
            </div>
          </div>
          <div class="mt-3 flex items-start justify-between gap-3">
            <div class="text-4 font-700 text-[#F3F4F6]">{{ item.display_title }}</div>
            <div class="flex flex-wrap justify-end gap-2">
              <span
                v-for="tag in specSummary(item)"
                :key="tag"
                class="rounded-2 border border-[#BCCAE4] px-2.5 py-1 text-3 leading-none text-[#BCCAE4]"
              >{{ tag }}</span>
            </div>
          </div>
        </button>

        <!-- 空状态 -->
        <div v-if="!loading && cases.length === 0" class="py-16 text-center text-3.5 text-white/40">
          <Icon icon="mdi:folder-open-outline" width="48" height="48" class="mx-auto mb-3" />
          <p>{{ t('common.noData') }}</p>
        </div>
      </template>
    </div>

    <!-- 加载更多 -->
    <div v-if="cases.length > 0 && cases.length < total" class="mt-6 px-4">
      <button
        type="button"
        class="w-full rounded-xl bg-white/10 py-3 text-3.5 text-white/70 active:opacity-70"
        :disabled="loading"
        @click="loadMore"
      >
        {{ loading ? t('common.loading') : t('common.loadMore') }}
      </button>
    </div>

    <!-- 汽车品牌/车型 选择抽屉（只展示品牌 + 车型） -->
    <NDrawer
      v-model:show="carOpen"
      :height="'min(88vh, 720px)'"
      placement="bottom"
      :trap-focus="false"
      :block-scroll="true"
      :native-scrollbar="false"
      :content-style="{ height: '100%', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }"
    >
      <div
        class="tg-light-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[20px] border-t shadow-[var(--app-shadow)] outline-none"
        style="border-color: var(--tg-theme-section-separator-color)"
      >
        <CarSelectionPanel
          class="min-h-0 flex-1"
          :brand="selectedBrand"
          :model="selectedModel"
          year=""
          :brand-model-only="true"
          @update:brand="selectedBrand = $event"
          @update:model="selectedModel = $event"
          @complete="onCarComplete"
        />
      </div>
    </NDrawer>

    <!-- WL 型号选择器（复用创建订单同款组件） -->
    <StyleModelPickerDrawer
      v-model:show="stylePickerOpen"
      :structure-type="pending.structure_type"
      @confirm="onStyleModelConfirm"
    />

    <!-- 筛选抽屉 -->
    <NDrawer
      v-model:show="filterOpen"
      :height="'min(75vh, 540px)'"
      placement="bottom"
      :trap-focus="false"
      :block-scroll="true"
    >
      <div
        class="tg-light-surface flex h-full flex-col overflow-hidden rounded-t-[20px] border-t"
        style="border-color: var(--tg-theme-section-separator-color)"
      >
        <div class="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-2">
          <div class="mb-5 text-5 font-700">{{ t('headerFilter.filter') }}</div>
          <div class="space-y-5">
            <!-- 结构类型 -->
            <div class="space-y-2">
              <div class="text-3.5 font-600">{{ t('headerFilter.structure') }}</div>
              <TgSelect
                v-model="pending.structure_type"
                :options="structureOptions"
                :searchable="false"
                :placeholder="t('headerFilter.phStructure')"
              />
            </div>

            <!-- 颜色（select + 色样圆点） -->
            <div class="space-y-3">
              <div class="text-3.5 font-600">{{ t('headerFilter.color') }}</div>
              <div class="relative">
                <!-- 选中色样小图 -->
                <span
                  v-if="selectedColorItem?.image_url"
                  class="pointer-events-none absolute left-3.5 top-1/2 z-1 h-5 w-5 -translate-y-1/2 overflow-hidden rounded-full border border-black/10"
                >
                  <img :src="selectedColorItem.image_url" class="h-full w-full object-cover" alt="">
                </span>
                <TgSelect
                  v-model="pending.color_code"
                  :class="selectedColorItem?.image_url ? 'pl-10' : ''"
                  :options="colorOptions"
                  :searchable="false"
                  :placeholder="t('headerFilter.phColor')"
                />
              </div>

              <!-- 当前选中名称 -->
              <div v-if="selectedColorItem" class="text-center text-4 font-700">
                {{ selectedColorItem.code }}{{ selectedColorItem.name_cn ? ' ' + selectedColorItem.name_cn : '' }}
              </div>

              <!-- 色样圆点快速选择 -->
              <div class="flex flex-wrap gap-3 justify-center">
                <button
                  v-for="item in finishItems.slice(0, 12)"
                  :key="item.code"
                  type="button"
                  class="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full border-2 transition"
                  :class="pending.color_code === item.code
                    ? 'border-[color:var(--tg-theme-text-color)] shadow-[0_0_0_3px_var(--tg-theme-secondary-bg-color),0_0_0_4px_var(--tg-theme-text-color)]'
                    : 'border-transparent'"
                  :title="item.code"
                  @click="pending.color_code = pending.color_code === item.code ? '' : item.code"
                >
                  <img v-if="item.image_url" :src="item.image_url" class="h-full w-full object-cover" alt="">
                  <span v-else class="flex h-full w-full items-center justify-center bg-[#E5E7EB] text-2.5 text-[#6B7280]">
                    {{ item.code.slice(0, 4) }}
                  </span>
                </button>
              </div>
            </div>

            <!-- WL 型号（StyleModelPickerDrawer 通用组件，根据结构加载） -->
            <div class="space-y-2">
              <div class="text-3.5 font-600">{{ t('headerFilter.wlCode') }}</div>
              <button
                type="button"
                class="flex h-11 w-full items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 transition"
                :disabled="!pending.structure_type"
                :class="!pending.structure_type ? 'opacity-40 cursor-not-allowed' : ''"
                @click="stylePickerOpen = true"
              >
                <span :class="styleNoLabel ? 'text-[#111827]' : 'text-[#B6BBC5]'">
                  {{ styleNoLabel || (!pending.structure_type ? t('customOrder.wheelStyleNeedStructure') : t('headerFilter.phWlCode')) }}
                </span>
                <Icon icon="lucide:chevron-right" width="16" height="16" class="text-[#9CA3AF]" />
              </button>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div
          class="shrink-0 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
          style="border-color: var(--tg-theme-section-separator-color); background: var(--tg-theme-secondary-bg-color)"
        >
          <div class="flex gap-4">
            <button
              type="button"
              class="tg-btn-outline-light h-12 flex-1 rounded-xl border text-4 font-600"
              @click="filterOpen = false"
            >{{ t('common.cancel') }}</button>
            <button
              type="button"
              class="tg-btn-primary h-12 flex-1 rounded-xl border text-4 font-700"
              @click="applyFilter"
            >{{ t('common.confirm') }}</button>
          </div>
        </div>
      </div>
    </NDrawer>
  </div>
</template>
