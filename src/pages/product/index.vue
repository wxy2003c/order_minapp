<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { NDrawer } from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import TgSelect from '@/components/TgSelect.vue'
import CarSelectionPanel from '@/components/CarSelectionPanel.vue'
import StyleModelPickerDrawer from '@/components/StyleModelPickerDrawer.vue'
import TgListSkeleton from '@/components/TgListSkeleton.vue'
import TgLoadingState from '@/components/TgLoadingState.vue'
import TgImage from '@/components/TgImage.vue'
import { fetchStyleModels } from '@/api/admin/styleModels'
import type { StyleModelItem } from '@/api/admin/styleModels'
import { resolveOrderAssetUrl } from '@/utils/orderMedia'
import { t } from '@/i18n/uiI18n'
import { useProductBrowseStore } from '@/stores/productBrowse'

const router = useRouter()
const route = useRoute()
const browse = useProductBrowseStore()
const {
  brand: selectedBrand,
  model: selectedModel,
  wheelGeneration: selectedWheelGeneration,
  wheelYear: selectedWheelYear,
  wheelModification: selectedWheelModification,
  styleMood: selectedStyleMood,
} = storeToRefs(browse)

// ── 汽车选择弹层（只展示品牌 + 车型）────────────────────────────────────────
const carOpen = ref(false)

function onCarComplete() {
  carOpen.value = false
  browse.setWheelSizeSelection('', '', '')
  applyAndLoad()
}

const carLabel = computed(() => {
  if (selectedBrand.value && selectedModel.value) return `${selectedBrand.value} ${selectedModel.value}`
  if (selectedBrand.value) return selectedBrand.value
  return ''
})

// ── 筛选抽屉 ──────────────────────────────────────────────────────────────────
const filterOpen = ref(false)

interface FilterState {
  structure_type: string
  spoke_type: string
  style_tag: string
  directional: string   // '' | '1' | '0'
  spoke_count: string
  style_no: string
}

const pending = reactive<FilterState>({
  structure_type: '',
  spoke_type: '',
  style_tag: '',
  directional: '',
  spoke_count: '',
  style_no: '',
})

const applied = reactive<FilterState>({
  structure_type: '',
  spoke_type: '',
  style_tag: '',
  directional: '',
  spoke_count: '',
  style_no: '',
})

// WL 型号（StyleModelPickerDrawer）
const stylePickerOpen = ref(false)
const pendingStyleModel = ref<StyleModelItem | null>(null)
const appliedStyleModel = ref<StyleModelItem | null>(null)

watch(() => pending.structure_type, () => {
  pending.style_no = ''
  pendingStyleModel.value = null
})

function openFilter() {
  Object.assign(pending, applied)
  pendingStyleModel.value = appliedStyleModel.value
  filterOpen.value = true
}

function onStyleModelConfirm(item: StyleModelItem) {
  pendingStyleModel.value = item
  pending.style_no = item.style_no
}

const styleNoLabel = computed(() => {
  const m = pendingStyleModel.value
  if (!m) return ''
  return `${m.style_no} ${m.style_name}`.trim()
})

function applyFilter() {
  Object.assign(applied, pending)
  appliedStyleModel.value = pendingStyleModel.value
  selectedStyleMood.value = applied.style_tag
  filterOpen.value = false
  applyAndLoad()
}

// ── 选项 ──────────────────────────────────────────────────────────────────────
const structureOptions = computed(() => [
  { label: t('customOrder.structureSingle'), value: '单片' },
  { label: t('customOrder.structureDual'), value: '双片' },
  { label: t('customOrder.structureTriple'), value: '三片' },
  { label: t('customOrder.structureOffroad'), value: '越野' },
])

const spokeTypeOptions = [
  { label: 'V型', value: 'V型' },
  { label: 'Y型', value: 'Y型' },
  { label: '刀锋', value: '刀锋' },
  { label: '多辐', value: '多辐' },
  { label: '旋风', value: '旋风' },
  { label: '直辐', value: '直辐' },
  { label: '网状', value: '网状' },
]

const styleTagOptions = [
  { label: '运动', value: '运动' },
  { label: '性能赛道', value: '性能赛道' },
  { label: '越野', value: '越野' },
  { label: '复古', value: '复古' },
  { label: '豪华商务', value: '豪华商务' },
  { label: 'OEM', value: 'OEM' },
]

const directionalOptions = [
  { label: '是', value: '1' },
  { label: '否', value: '0' },
]

// ── 激活标签 ──────────────────────────────────────────────────────────────────
type TagKey = 'car' | keyof FilterState
const activeTags = computed((): { key: TagKey; label: string }[] => {
  const tags: { key: TagKey; label: string }[] = []
  if (carLabel.value) tags.push({ key: 'car', label: carLabel.value })
  if (applied.structure_type) tags.push({ key: 'structure_type', label: applied.structure_type })
  if (applied.spoke_type) tags.push({ key: 'spoke_type', label: applied.spoke_type })
  if (applied.style_tag) tags.push({ key: 'style_tag', label: applied.style_tag })
  if (applied.directional !== '') tags.push({ key: 'directional', label: applied.directional === '1' ? '左右旋:是' : '左右旋:否' })
  if (applied.spoke_count) tags.push({ key: 'spoke_count', label: `条幅:${applied.spoke_count}` })
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
    if (key === 'style_no') {
      appliedStyleModel.value = null
      pendingStyleModel.value = null
    }
    if (key === 'style_tag')
      selectedStyleMood.value = ''
  }
  applyAndLoad()
}

// ── 列表数据 ──────────────────────────────────────────────────────────────────
const items = ref<StyleModelItem[]>([])
const loading = ref(false)
const loadError = ref('')
const totalCount = ref(0)
const lastPage = ref(1)
const page = ref(1)
const PAGE_SIZE = 20
let loadSeq = 0

const hasMore = computed(() => page.value < lastPage.value && items.value.length < totalCount.value)

async function loadProducts(reset = false) {
  const seq = ++loadSeq
  if (reset) {
    page.value = 1
    items.value = []
  }
  loading.value = true
  loadError.value = ''
  try {
    const res = await fetchStyleModels({
      structure_type: applied.structure_type || undefined,
      brand: selectedBrand.value || undefined,
      model: selectedModel.value || undefined,
      spoke_type: applied.spoke_type || undefined,
      style_tag: applied.style_tag || undefined,
      directional: applied.directional === '1' ? true : applied.directional === '0' ? false : null,
      spoke_count: applied.spoke_count || undefined,
      style_no: applied.style_no || undefined,
      page: page.value,
      page_size: PAGE_SIZE,
    }) as { items?: StyleModelItem[]; count?: number; page?: number; last_page?: number }
    if (seq !== loadSeq) return
    if (reset) {
      items.value = res.items ?? []
    } else {
      items.value.push(...(res.items ?? []))
    }
    totalCount.value = res.count ?? items.value.length
    lastPage.value = Math.max(1, res.last_page ?? 1)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('common.loadFailed')
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

function applyAndLoad() {
  void loadProducts(true)
}

function syncFiltersFromRouteQuery() {
  const routeStyleTag = typeof route.query.style_tag === 'string' ? route.query.style_tag.trim() : ''
  if (!routeStyleTag) return
  pending.style_tag = routeStyleTag
  applied.style_tag = routeStyleTag
  selectedStyleMood.value = routeStyleTag
}

async function loadMore() {
  if (loading.value || !hasMore.value) return
  page.value++
  await loadProducts(false)
}

function handleProductScroll(event: Event) {
  const el = event.currentTarget as HTMLElement | null
  if (!el || loading.value || !hasMore.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 160) {
    void loadMore()
  }
}

onMounted(() => {
  syncFiltersFromRouteQuery()
  if (selectedStyleMood.value && !applied.style_tag) {
    pending.style_tag = selectedStyleMood.value
    applied.style_tag = selectedStyleMood.value
  }
  loadProducts(true)
})

function goDetail(item: StyleModelItem) {
  router.push({ path: '/ProductDetails', query: { id: String(item.id) } })
}

function coverUrl(item: StyleModelItem): string | null {
  return resolveOrderAssetUrl(item.cover_image)
}
</script>

<template>
  <div
    class="tg-browse-adaptive h-full min-h-0 w-full overflow-x-hidden overflow-y-auto pb-28 text-white"
    @scroll.passive="handleProductScroll"
  >
    <div class="px-4 pt-4">
      <img src="@/assets/image/navLogo.png" class="h-14 w-65" alt="">

      <!-- 顶部栏：汽车选择 + 筛选 -->
      <div class="mt-4 flex items-center justify-between gap-3">
        <!-- 汽车品牌/车型 按钮 -->
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center justify-between gap-2 py-3 text-left outline-none"
          @click="carOpen = true"
        >
          <div class="min-w-0">
            <div class="text-3 text-white/55">{{ t('headerFilter.titleProduct') }}</div>
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

    <!-- 产品列表 -->
    <div class="mt-5 flex flex-col gap-5 px-4">
      <TgListSkeleton v-if="loading && items.length === 0" tone="dark" />
      <TgLoadingState
        v-else-if="loadError && items.length === 0"
        tone="dark"
        :title="loadError"
        :action-label="t('common.retry')"
        @action="applyAndLoad"
      />
      <template v-else>
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          class="tg-interactive group w-full rounded-3xl bg-white/[0.035] p-2 text-left shadow-[0_12px_30px_rgba(0,0,0,0.16)] ring-1 ring-white/8"
          @click="goDetail(item)"
        >
          <div class="relative h-48 w-full overflow-hidden rounded-2xl bg-white/5">
            <TgImage
              :src="coverUrl(item)"
              :alt="item.style_name"
              img-class="transition-transform duration-300 group-active:scale-[1.01]"
              placeholder-class="text-white/35"
            />
            <div class="pointer-events-none absolute inset-x-0 bottom-0 h-18 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
          <div class="mt-3 flex items-start justify-between gap-3">
            <div>
              <div class="text-3.5 font-700 text-[#F3F4F6]">{{ item.style_no }}</div>
              <div class="mt-0.5 text-3 text-white/55">{{ item.style_name }}</div>
            </div>
            <div class="flex flex-wrap justify-end gap-2">
              <span
                v-if="item.structure_type"
                class="rounded-2 border border-[#BCCAE4] px-2.5 py-1 text-3 leading-none text-[#BCCAE4]"
              >{{ item.structure_type }}</span>
              <span
                v-if="item.spoke_type"
                class="rounded-2 border border-[#BCCAE4] px-2.5 py-1 text-3 leading-none text-[#BCCAE4]"
              >{{ item.spoke_type }}</span>
              <span
                v-for="tag in item.style_tags"
                :key="tag"
                class="rounded-2 border border-[#BCCAE4] px-2.5 py-1 text-3 leading-none text-[#BCCAE4]"
              >{{ tag }}</span>
            </div>
          </div>
        </button>

        <TgLoadingState v-if="!loading && items.length === 0" tone="dark" :title="t('common.noData')" />
      </template>
    </div>

    <!-- 加载更多 -->
    <div v-if="items.length > 0 && hasMore" class="mt-6 px-4">
      <button
        type="button"
        class="tg-interactive w-full rounded-xl bg-white/10 py-3 text-3.5 text-white/70"
        :disabled="loading"
        @click="loadMore"
      >
        {{ loading ? t('common.loading') : t('common.loadMore') }}
      </button>
    </div>
    <TgLoadingState
      v-else-if="items.length > 0 && loading"
      tone="dark"
      compact
      spinning
      :title="t('common.loading')"
    />
    <TgLoadingState
      v-else-if="items.length > 0 && !hasMore"
      tone="dark"
      compact
      :title="t('common.noMore')"
    />

    <!-- 汽车品牌/车型 选择抽屉 -->
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
          :wheel-generation="selectedWheelGeneration"
          :wheel-year="selectedWheelYear"
          :wheel-modification="selectedWheelModification"
          :brand-model-only="true"
          @update:brand="selectedBrand = $event"
          @update:model="selectedModel = $event"
          @update:wheel-generation="selectedWheelGeneration = $event"
          @update:wheel-year="selectedWheelYear = $event"
          @update:wheel-modification="selectedWheelModification = $event"
          @complete="onCarComplete"
        />
      </div>
    </NDrawer>

    <!-- WL 型号选择器 -->
    <StyleModelPickerDrawer
      v-model:show="stylePickerOpen"
      :structure-type="pending.structure_type"
      @confirm="onStyleModelConfirm"
    />

    <!-- 筛选抽屉 -->
    <NDrawer
      v-model:show="filterOpen"
      :height="'min(85vh, 620px)'"
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

            <!-- 爪型 -->
            <div class="space-y-2">
              <div class="text-3.5 font-600">{{ t('headerFilter.claw') }}</div>
              <TgSelect
                v-model="pending.spoke_type"
                :options="spokeTypeOptions"
                :searchable="false"
                :placeholder="t('headerFilter.phClaw')"
              />
            </div>

            <!-- 风格标签 -->
            <div class="space-y-2">
              <div class="text-3.5 font-600">{{ t('headerFilter.styleMood') }}</div>
              <TgSelect
                v-model="pending.style_tag"
                :options="styleTagOptions"
                :searchable="false"
                :placeholder="t('headerFilter.phStyleMood')"
              />
            </div>

            <!-- 左右旋 -->
            <div class="space-y-2">
              <div class="text-3.5 font-600">{{ t('headerFilter.rotateSupport') }}</div>
              <TgSelect
                v-model="pending.directional"
                :options="directionalOptions"
                :searchable="false"
                :placeholder="t('headerFilter.phRotate')"
              />
            </div>

            <!-- 条幅数量（输入框） -->
            <div class="space-y-2">
              <div class="text-3.5 font-600">{{ t('headerFilter.stripCount') }}</div>
              <input
                v-model="pending.spoke_count"
                type="number"
                min="0"
                :placeholder="t('headerFilter.phStripCount')"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 text-[#111827] outline-none placeholder:text-[#B6BBC5]"
              >
            </div>

            <!-- WL 型号（StyleModelPickerDrawer） -->
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
