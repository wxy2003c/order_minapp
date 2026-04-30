<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useRoute, useRouter } from 'vue-router'
import Swiper from '@/components/Swiper.vue'
import { fetchCaseDetail, fetchFinishCards } from '@/api/rolesApi'
import type { CaseDetailData, CaseWheelAxisDetail } from '@/api/rolesApi'
import type { FinishCardItem } from '@/api/admin/finishCards'

const route = useRoute()
const router = useRouter()

function goCustomOrder() {
  const orderId = detail.value?.order_id
  if (orderId) {
    router.push({ path: '/CustomOrder', query: { orderId: String(orderId), reorder: '1' } })
  } else {
    router.push({ path: '/CustomOrder' })
  }
}

const detail = ref<CaseDetailData | null>(null)
const loading = ref(true)
const error = ref('')

// 色卡 code → FinishCardItem 映射
const finishMap = ref<Record<string, FinishCardItem>>({})

onMounted(async () => {
  const caseId = route.query.caseId ?? route.query.case_id
  if (!caseId) { error.value = 'Missing case_id'; loading.value = false; return }
  try {
    const [caseRes, fcRes] = await Promise.allSettled([
      fetchCaseDetail(String(caseId)),
      fetchFinishCards(),
    ])
    if (caseRes.status === 'fulfilled') detail.value = caseRes.value
    else error.value = caseRes.reason instanceof Error ? caseRes.reason.message : String(caseRes.reason)
    if (fcRes.status === 'fulfilled') {
      const map: Record<string, FinishCardItem> = {}
      for (const g of fcRes.value.groups ?? []) {
        for (const item of g.items ?? []) {
          if (item.code && !map[item.code]) map[item.code] = item
        }
      }
      finishMap.value = map
    }
  } finally {
    loading.value = false
  }
})

// Swiper items：viewer_images → HomeStyleModelItem 兼容格式
const swiperItems = computed(() =>
  (detail.value?.viewer_images ?? [])
    .filter((x): x is NonNullable<typeof x> => !!x?.url)
    .map((img, i) => ({
      id: i + 1,
      style_no: '',
      style_name: img.label ?? '',
      effect_image: img.url,
    })),
)

// 轮毂规格 tabs
const specTabs = [
  { label: '前轮', value: 'front' as const },
  { label: '后轮', value: 'rear' as const },
]
const activeTab = ref<'front' | 'rear'>('front')

function buildSpecRows(spec: CaseWheelAxisDetail | undefined) {
  if (!spec) return []
  const rows: { label: string; value: string }[] = []
  const add = (label: string, val: string | undefined) => {
    if (val && String(val).trim()) rows.push({ label, value: String(val).trim() })
  }
  add('尺寸 (R)', spec.size_r ? `${spec.size_r} 英寸` : '')
  add('数量', spec.qty)
  add('宽度 (J)', spec.width_j ? `${spec.width_j}J` : '')
  add('ET(MM)', spec.et)
  add('PCD', spec.pcd)
  add('CB', spec.cb)
  add('孔型', spec.hole)
  add('表面处理', spec.appearance)
  return rows
}

const activeRows = computed(() =>
  buildSpecRows(
    activeTab.value === 'front'
      ? detail.value?.wheel_specs_front
      : detail.value?.wheel_specs_rear,
  ),
)

// 颜色信息：code + 从色卡接口匹配对应图片
const colors = computed(() => {
  const d = detail.value
  if (!d) return []
  return (d.color_codes ?? []).map(code => ({
    name: [code, finishMap.value[code]?.name_cn].filter(Boolean).join(' '),
    image_url: finishMap.value[code]?.image_url ?? null,
  }))
})

// 其他信息
const extraInfos = computed(() => {
  const d = detail.value
  if (!d) return []
  const rows: { label: string; value: string }[] = []
  const add = (label: string, val: string | null | undefined) => {
    if (val && String(val).trim() && String(val).trim() !== '—') {
      rows.push({ label, value: String(val).trim() })
    }
  }
  add('表面工艺', d.surface_craft_display)
  add('拆件工艺', d.structure_craft_display)
  add('中心盖', d.center_cap)
  add('载重设计', d.mold_design)
  if (d.custom_note?.trim()) rows.push({ label: '备注', value: d.custom_note.trim() })
  return rows
})

// 标题副行：结构 + 前轮尺寸
const subtitleLine = computed(() => {
  const d = detail.value
  if (!d) return ''
  const f = d.wheel_specs_front
  const size = f?.size_r && f?.width_j ? `${f.size_r}x${f.width_j}J` : ''
  return [d.structure_display, size].filter(Boolean).join(' · ')
})
</script>

<template>
  <div class="min-h-full w-full overflow-x-hidden overflow-y-auto bg-[#f5f5f2] pb-28 text-[#1F2937]">
    <!-- 骨架 -->
    <template v-if="loading">
      <div class="h-45 animate-pulse bg-[#E5E7EB]" />
      <div class="mt-2 bg-white p-4">
        <div class="h-5 w-2/3 rounded bg-[#E5E7EB]" />
        <div class="mt-2 h-3.5 w-1/2 rounded bg-[#E5E7EB]" />
      </div>
    </template>

    <div v-else-if="error" class="px-4 py-10 text-center text-3.5 text-[#DC2626]">{{ error }}</div>

    <template v-else>
      <Swiper :items="swiperItems" />

      <section class="bg-white px-4 py-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h1 class="text-4.5 font-700">
              {{ detail?.display_title ?? '—' }}
            </h1>
            <div class="mt-2 text-3 color-[#9CA3AF]">
              {{ subtitleLine }}
            </div>
          </div>
          <div>
            <div class="text-3 color-[#C0C4CC]">
              {{ detail?.order_no || '---' }}
            </div>
            <div class="text-3 color-[#C0C4CC] mt-2 ">
              {{ detail?.created_at_display ?? '' }}
            </div>
          </div>

        </div>
      </section>

      <section v-if="detail?.review_user || detail?.review_text" class="mt-2 bg-white px-4 py-4">
        <div class="text-4 font-700">
          客户评价
        </div>
        <div class="mt-4 flex items-start gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-[#5CA8FF] text-white">
            {{ String(detail?.review_user ?? '?').charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-3">
              <div class="truncate text-3.5 font-600">
                {{ detail?.review_user ?? '—' }}
              </div>
              <div class="flex items-center gap-0.5 text-[#F6C453]">
                <Icon v-for="index in 5" :key="index"
                  :icon="index <= (detail?.review_stars ?? 0) ? 'solar:star-bold' : 'solar:star-outline'" width="12"
                  height="12" />
              </div>
            </div>
            <p class="mt-2 text-3.5 leading-6 color-[#6B7280]">
              {{ detail?.review_text ?? '' }}
            </p>
          </div>
        </div>
      </section>

      <section class="mt-2 bg-white px-4 py-4">
        <div class="text-4 font-700">
          轮毂规格
        </div>
        <div class="gap-2 mt-4 w-full border-b border-b-[#BBBBBB] pos-relative">
          <div class="flex flex-items-center gap-5 pb-1.5">
            <div v-for="item in specTabs" :key="item.value" class="text-3.5"
              :class="activeTab === item.value ? 'color-[#333333] font-bold' : 'color-[#BBBBBB]'"
              @click="activeTab = item.value">{{ item.label }}</div>
          </div>
          <div class="w-7.5 h-.75 bg-[#3487FF] pos-absolute bottom-0" :class="activeTab === 'front' ? '' : 'left-12'" />
        </div>
        <div class="mt-4">
          <div v-if="activeRows.length" class="flex flex-col gap-2">
            <div v-for="spec in activeRows" :key="spec.label"
              class="flex items-center justify-between gap-3 border-b border-[#F2F4F7] pb-2 text-3.5">
              <span class="color-[#9CA3AF]">{{ spec.label }}</span>
              <span class="font-600 color-[#111827]">{{ spec.value }}</span>
            </div>
          </div>
          <div v-else class="py-4 text-center text-3.5 color-[#9CA3AF]">—</div>
        </div>
      </section>

      <section v-if="colors.length" class="mt-2 bg-white px-4 py-4">
        <div class="text-4 font-700">
          颜色信息
        </div>
        <!-- 只有 1 个颜色时居中 -->
        <div
          class="mt-4 gap-5"
          :class="colors.length === 1 ? 'flex justify-center' : 'grid grid-cols-2'"
        >
          <div v-for="item in colors" :key="item.name" class="text-center">
            <div class="text-3.5 font-600">
              {{ item.name }}
            </div>
            <div class="mx-auto mt-3 h-8 w-8 overflow-hidden rounded-full border border-black/6">
              <img v-if="item.image_url" :src="item.image_url" class="h-full w-full object-cover" alt="">
              <!-- 无图时用占位图标 -->
              <div v-else class="flex h-full w-full items-center justify-center bg-[#E5E7EB]">
                <Icon icon="mdi:palette-outline" width="14" height="14" class="text-[#9CA3AF]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="extraInfos.length" class="mt-2 bg-white px-4 py-4">
        <div class="text-4 font-700">
          其他信息
        </div>
        <div class="mt-4 space-y-3">
          <div v-for="item in extraInfos" :key="item.label"
            class="flex items-center justify-between gap-3 border-b border-[#F2F4F7] pb-2 text-3.5">
            <span class="color-[#9CA3AF]">{{ item.label }}</span>
            <span class="font-600 color-[#111827]">{{ item.value }}</span>
          </div>
        </div>
      </section>
    </template>

    <div
      class="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-[#ECE8DE] bg-white px-4 py-4">
      <button
        type="button"
        class="tg-btn-primary h-12 w-full rounded-xl border text-4 font-700 shadow-[0_10px_24px_rgba(0,0,0,0.12)]"
        @click="goCustomOrder"
      >
        定制同款
      </button>
    </div>
  </div>
</template>
