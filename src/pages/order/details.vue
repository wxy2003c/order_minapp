<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useRoute, useRouter } from 'vue-router'
import {
  orderStatusMeta,
  type OrderDetailActionKey,
  type OrderStatus,
} from '@/data/orders'
import TgButton from '@/components/TgButton.vue'
import {
  type OrderDetailResponse,
  type OrderListImageItem,
  type OrderListItem,
  cancelOrder,
  fetchOrderDetail,
  mapApiStatusToOrderStatus,
} from '@/api/orders'
import { orderIdFromRouteQuery } from '@/utils/applyOrderDetailToCustomOrder'
import { resolveOrderAssetUrl } from '@/utils/orderMedia'
import { getTelegramWebApp } from '@/utils/userTelegram'
import { t } from '@/i18n/uiI18n'
import { useStaffDeeplinkStore } from '@/stores/staffDeeplink'
import {
  asPlainText,
  buildWheelSpecRows,
  collectImgUrlsForSlot,
  coverFallbackUrlsAfterSlots,
  fieldFromOrder as fieldFromOrderRecord,
  getSlotDescText,
  getSpecialReqFromSpecs,
  isDesignSlotCategory,
  isWheelsIdenticalOrder,
  specGet,
  splitWheelSpecHeadRest,
  str,
  type ImgSlotValue,
  type WheelSpecRow,
} from '@/utils/orderDetailHelpers'

const router = useRouter()
const route = useRoute()
const staffDeeplink = useStaffDeeplinkStore()

const loading = ref(true)
const loadError = ref('')
const detail = ref<OrderDetailResponse | null>(null)

const cancelModalOpen = ref(false)
const cancelSubmitting = ref(false)
const cancelError = ref('')

/** 车型、轮规、型号库：展开按钮均在各块内容最下方。车辆信息默认收起；轮规在「一致」时一块展开（默认开）；分轮时前/后各一块（默认都展开、各自收放） */
const vehicleInfoOpen = ref(false)
/** 除「尺寸、数量」外的轮规行；尺寸/数量始终展示 */
const wheelSpecOpen = ref(false)
const frontWheelSpecOpen = ref(false)
const rearWheelSpecOpen = ref(false)
const designCustomOpen = ref(true)

const orderId = computed(() =>
  orderIdFromRouteQuery(route.query as Record<string, string | string[] | null | undefined>),
)

function fieldFromOrder(keys: string[]) {
  return fieldFromOrderRecord(
    detail.value as Record<string, unknown> | null,
    specs.value,
    keys,
  )
}

function slotDescText(slot: ImgSlotValue) {
  return getSlotDescText(
    detail.value as Record<string, unknown> | null,
    specs.value,
    slot,
  )
}

const listRow = computed(() => (detail.value as OrderListItem) ?? ({} as OrderListItem))
const specs = computed(() => {
  const s = detail.value?.specs
  if (!s || typeof s !== 'object' || Array.isArray(s)) return undefined
  return s as Record<string, unknown>
})

const currentStatus = computed<OrderStatus>(() =>
  mapApiStatusToOrderStatus(detail.value?.status_label || detail.value?.status),
)
const statusMeta = computed(() => orderStatusMeta[currentStatus.value])

const showFactorySection = computed(
  () => !['designing', 'pending_confirm', 'cancelled'].includes(currentStatus.value),
)

/** 接口分组（category / label） */
const factoryImageGroups = computed(() => {
  const d = detail.value
  if (!d) return [] as { title: string; urls: string[] }[]
  const raw = (d.design_imgs?.length ? d.design_imgs : d.imgs) as OrderListImageItem[] | undefined
  if (!raw?.length) return []
  const map = new Map<string, string[]>()
  for (const im of raw) {
    if (isDesignSlotCategory(im)) continue
    const u = resolveOrderAssetUrl(im.url ?? im.path) || ''
    if (!u) continue
    const title
      = str(im.category || im.label || im.section).trim() || t('orderDetails.materialTitle')
    if (!map.has(title)) map.set(title, [])
    map.get(title)!.push(u)
  }
  return [...map.entries()].map(([title, urls]) => ({ title, urls }))
})

/**
 * 与原先「3 组 × 每行 3 个格子」的版式一致：有图则出图，无图则 `mdi:wheel` 深底占位；无接口数据时仍显示三组占位。
 */
const factoryPlates = computed(() => {
  if (!showFactorySection.value) return [] as { title: string; cells: (string | null)[] }[]
  const fromApi = factoryImageGroups.value
  if (fromApi.length) {
    return fromApi.map(g => ({
      title: g.title,
      cells: [g.urls[0] ?? null, g.urls[1] ?? null, g.urls[2] ?? null] as (string | null)[],
    }))
  }
  return [
    { title: t('orderDetails.materialTitle'), cells: [null, null, null] },
    { title: t('orderDetails.materialTitle'), cells: [null, null, null] },
    { title: t('orderDetails.materialTitle'), cells: [null, null, null] },
  ]
})

const wheelColors = [
  { code: 'WL049', hex: '#252631' },
  { code: 'WL058', hex: '#94e3a6' },
  { code: 'WL028M', hex: '#b6b7af' },
] as const

const slotImgUrls = computed(() => {
  const d = detail.value
  return {
    color_sample: collectImgUrlsForSlot(d, 'color_sample'),
    wheel_color: collectImgUrlsForSlot(d, 'wheel_color'),
    cover: collectImgUrlsForSlot(d, 'cover'),
    front_mark: collectImgUrlsForSlot(d, 'front_mark'),
  }
})
/** 中心盖图：imgs 槽位优先，否则 `cover_image` / 可解析的 `cover` 链 */
const coverDisplayUrls = computed((): string[] => {
  const u = slotImgUrls.value.cover
  if (u.length) return u
  return coverFallbackUrlsAfterSlots(detail.value)
})

function wheelColorName(code: string): string {
  const k = `orderDetails.colorName_${code}` as const
  const s = t(k)
  return s === k ? code : s
}

const structureLabel = computed((): string => {
  const raw = str(specs.value?.['结构']).trim()
  if (!raw) return '—'
  if (raw.includes('双片')) return t('orderStructure.two_piece')
  if (raw.includes('三片')) return t('orderStructure.three_piece')
  if (raw.includes('越野')) return t('orderStructure.off_road')
  if (raw.includes('单片')) return t('orderStructure.one_piece')
  return raw
})

const avatarUrl = computed(
  () => resolveOrderAssetUrl(detail.value?.telegram_avatar as string | undefined) || null,
)

const brandModelLine = computed(() => {
  const d = detail.value
  if (!d) return ''
  const car = str(d.car).trim()
  if (car) return car
  const b = str((d as { car_brand?: string }).car_brand)
  const m = str((d as { car_model?: string }).car_model)
  if (b && m) return `${b} ${m}`.trim()
  return '—'
})

const libThumb = computed(() => {
  const u0 = slotImgUrls.value.color_sample[0]
  if (u0) return u0
  const d = detail.value as OrderListItem | null
  if (d?.design_imgs?.[0]) {
    return resolveOrderAssetUrl(d.design_imgs[0].url || d.design_imgs[0].path) || null
  }
  if (d?.imgs?.[0]) return resolveOrderAssetUrl(d.imgs[0].url || d.imgs[0].path) || null
  return null
})

const carHeroSrc = computed(() => {
  const d = detail.value
  if (!d) return null
  const a = d.car_model_imgs?.[0] ?? d.imgs?.[0] ?? d.design_imgs?.[0]
  return resolveOrderAssetUrl(a?.url || a?.path) || null
})

const sizeDisplay = computed(() => {
  const s = specGet(specs.value, '尺寸') || str((detail.value as { size_choice?: string })?.size_choice)
  return s || str((detail.value as { f_diam?: string })?.f_diam) || '—'
})

const quantityDisplay = computed(() => {
  const fq = specGet(specs.value, '前轮数量') || str((detail.value as { f_qty?: string })?.f_qty)
  const rq = specGet(specs.value, '后轮数量') || str((detail.value as { r_qty?: string })?.r_qty)
  if (fq && rq && fq === rq) return fq
  if (fq && rq) return `${fq} / ${rq}`
  return fq || rq || '—'
})

const transDisplay = computed(
  () => specGet(specs.value, '变速箱') || str((detail.value as { 变速箱?: string })?.['变速箱']) || '—',
)

const surfaceFinish = computed(
  () => specGet(specs.value, '表面处理')
    || str((detail.value as { appearance?: string })?.appearance)
    || '—',
)

const wheelsIdentical = computed(() => isWheelsIdenticalOrder(detail.value))

const vehicleInfoRows = computed(() => {
  const v = (s: string) => (s.trim() ? s : '—')
  return [
    {
      labelKey: 'orderDetails.brakeDiscLabel' as const,
      value: v(
        fieldFromOrder([
          'brake_disc',
          '刹车盘',
          'forged',
          'is_oem_brake',
          'oem_brake',
          '是否原厂',
          '是否原厂刹车',
          '是否为原厂刹车',
          'brake_oem',
          'is_original_brake',
        ]),
      ),
    },
    { labelKey: 'orderDetails.vinLabel' as const, value: v(fieldFromOrder(['vin', 'VIN', '车架号'])) },
    {
      labelKey: 'orderDetails.chassisNo' as const,
      value: v(fieldFromOrder(['chassis', 'chassis_no', '底盘', '底盘号', '车型代码'])),
    },
    { labelKey: 'orderDetails.caliperLabel' as const, value: v(fieldFromOrder(['caliper', '卡钳'])) },
    { labelKey: 'orderDetails.transmission' as const, value: transDisplay.value },
  ]
})

/** 车型信息除首行（刹车盘）外，在展开区内 */
const vehicleInfoRowsRest = computed(() => vehicleInfoRows.value.slice(1))

const wheelSpecUnifiedRows = computed(() => {
  if (!wheelsIdentical.value) return [] as WheelSpecRow[]
  return buildWheelSpecRows(
    detail.value,
    specs.value,
    'f',
    sizeDisplay.value,
    quantityDisplay.value,
    surfaceFinish.value,
  )
})
const wheelSpecFrontRows = computed(() => {
  if (wheelsIdentical.value) return [] as WheelSpecRow[]
  return buildWheelSpecRows(detail.value, specs.value, 'f')
})
const wheelSpecRearRows = computed(() => {
  if (wheelsIdentical.value) return [] as WheelSpecRow[]
  return buildWheelSpecRows(detail.value, specs.value, 'r')
})

const wheelSpecUnifiedHR = computed(() => splitWheelSpecHeadRest(wheelSpecUnifiedRows.value))
const wheelSpecFrontHR = computed(() => splitWheelSpecHeadRest(wheelSpecFrontRows.value))
const wheelSpecRearHR = computed(() => splitWheelSpecHeadRest(wheelSpecRearRows.value))

const swatchThumbs = computed(() => {
  const d = detail.value as OrderListItem | null
  const list = slotImgUrls.value.wheel_color
  if (!d?.imgs || !list.length) return [] as { url: string; code: string }[]
  return list.map((url, i) => {
    const im = d.imgs!.find(
      x => (resolveOrderAssetUrl(x.url || x.path) || '') === url,
    )
    return { url, code: str(im?.name || im?.label) || `—${i + 1}` }
  })
})

const specialReqLine = computed(() => getSpecialReqFromSpecs(specs.value))

const addressName = computed(() => str((detail.value as { customer?: string })?.customer) || '—')
const addressContact = computed(() => {
  const d = detail.value as Record<string, unknown> | null
  if (!d) return '—'
  const phone
    = str(d.customer_phone) || specGet(specs.value, '手机') || specGet(specs.value, '电话')
  const email = str(d.customer_email) || specGet(specs.value, '邮箱')
  const p = [phone, email].filter(x => str(x) && str(x) !== '—')
  return p.length ? p.join(' | ') : '—'
})
const addressLines = computed(() => {
  const d = detail.value as Record<string, unknown> | null
  if (!d) return [] as string[]
  const a = str(d.shipping_address) || specGet(specs.value, '地址') || specGet(specs.value, '收货')
  if (!a) return []
  return a.split(/\n+/).map(s => s.trim()).filter(Boolean)
})
const couponDisplay = computed(
  () => str((detail.value as { coupon?: string })?.coupon) || specGet(specs.value, '优惠券') || '—',
)
const remarkDisplay = computed(() => {
  const d = detail.value as Record<string, unknown> | null
  if (!d) return '—'
  return (
    asPlainText(d.remark)
    || asPlainText(d.notes)
    || asPlainText(d.备注)
    || asPlainText(specs.value?.['买家留言'])
    || asPlainText(specs.value?.['留言'])
    || '—'
  )
})

/** 账单 4 行：与原先版式一致，无数据也占行 */
const amountRows = computed(() => {
  const pick = (cn: string) => specGet(specs.value, cn).trim() || '—'
  return [
    { labelKey: 'orderDetails.designDeposit' as const, value: pick('设计定金') },
    { labelKey: 'orderDetails.production' as const, value: pick('生产金') },
    { labelKey: 'orderDetails.finalPayment' as const, value: pick('尾款') },
    { labelKey: 'orderDetails.other' as const, value: pick('其他') },
  ]
})

const totalDisplay = computed(() => {
  const d = detail.value
  if (!d) return '—'
  const cur = str(d.currency) || 'USD'
  const n = d.total
  if (n == null || n === ('' as never)) return '—'
  return `${new Intl.NumberFormat().format(Number(n))} ${cur}`
})

async function load() {
  const id = orderId.value
  if (!id) {
    loadError.value = t('orderDetails.errNoId')
    detail.value = null
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    detail.value = await fetchOrderDetail(id)
  } catch (e) {
    detail.value = null
    loadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => { void load() })
watch(orderId, (id, prev) => {
  if (id === prev) return
  void load()
})

/** 深链代客场景：详情里的客户 telegram_id 与 Pinia 对齐，进入「修改订单」时与客商一致 */
watch(
  detail,
  (d) => {
    if (!d || !staffDeeplink.openedViaTelegramStartParam) return
    const tid = str((d as { telegram_id?: unknown }).telegram_id)
    if (!tid) return
    const name = str((d as { customer?: unknown }).customer)
    staffDeeplink.patchCustomerFromOrderDetail(tid, name || undefined)
  },
  { flush: 'post' },
)

const supportUrl = (import.meta.env.VITE_SUPPORT_URL as string | undefined)?.trim() || 'https://t.me/'

function openSupport() {
  const w = getTelegramWebApp()
  try {
    w?.openLink?.(supportUrl, { try_instant_view: false })
  } catch {
    window.open(supportUrl, '_blank', 'noopener,noreferrer')
  }
}

function copyOrderNo() {
  const no = str((detail.value as { order_no?: string })?.order_no)
  if (no && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(no)
  }
}

function openCancelModal() {
  cancelError.value = ''
  cancelModalOpen.value = true
}

async function confirmCancel() {
  const id = orderId.value
  if (!id) return
  cancelSubmitting.value = true
  cancelError.value = ''
  try {
    await cancelOrder(id)
    cancelModalOpen.value = false
    await router.push({ path: '/OrderList' })
  } catch (e) {
    cancelError.value = e instanceof Error ? e.message : String(e)
  } finally {
    cancelSubmitting.value = false
  }
}

function handleDetailAction(key: OrderDetailActionKey) {
  const id = str((detail.value as { id?: number | string })?.id)
  switch (key) {
    case 'cancel_order':
      openCancelModal()
      return
    case 'edit_order': {
      if (id) void router.push({ path: '/CustomOrder', query: { orderId: id } })
      return
    }
    case 'contact_support':
      openSupport()
      return
    case 'confirm_receive':
      if (window.confirm(t('orderDetails.confirmReceive'))) {
        // TODO: 确认收货 API
      }
      return
    case 'review':
      void router.push({ path: '/Evaluation' })
      return
    case 'reorder':
      void router.push({ path: '/CustomOrder' })
      return
    default: {
      const _e: never = key
      return _e
    }
  }
}
</script>

<template>
  <div class="min-h-full w-full overflow-x-hidden overflow-y-auto bg-[#f7f7f7] pb-28 text-[#22252b]">
    <div class="bg-white px-4 pb-5 pt-4">
      <div class="flex items-center justify-between gap-3">
        <img src="@/assets/image/navLogo.png" class="h-8 w-34 object-contain" alt="">
      </div>

      <div
        v-if="loading"
        class="mt-4 py-6 text-center text-3.5 text-[#9CA3AF]">
        {{ t('common.loading') }}
      </div>
      <div
        v-else-if="loadError"
        class="mt-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-3 text-3.25 text-[#B91C1C]">
        {{ loadError }}
      </div>

      <template v-else-if="detail">
        <div class="mt-4 flex items-center justify-between gap-3 border-b border-[#f0f1f4] pb-3">
          <div class="flex min-w-0 items-center gap-2 text-3.5">
            <Icon
              :icon="statusMeta.icon"
              width="15"
              height="15"
              :class="statusMeta.statusClass"
              color="#528FFF" />
            <span :class="statusMeta.statusClass" class="color-[#528FFF]">{{ t(statusMeta.labelKey) }}</span>
          </div>
          <div class="text-3 text-[#BBBBBB] flex flex-items-center gap-2">
            <button type="button" class="inline-flex" aria-label="copy" @click="copyOrderNo">
              <Icon icon="lucide:copy" width="14" height="14" />
            </button>
            <span class="truncate">{{
              (detail as { order_no?: string }).order_no || str((detail as { id?: unknown }).id) || '—'
            }}</span>
          </div>
        </div>

        <div class="mt-4 flex items-center gap-3">
          <div class="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-[#d7d9df] bg-white">
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              class="h-full w-full object-cover"
              alt="">
          </div>
          <span class="flex-1 truncate text-3.5 text-[#555b67]">
            {{ listRow.telegram_nickname || listRow.customer || '—' }}
          </span>
          <span class="shrink-0 text-3 text-[#8eaef4]">
            UID
            {{ str((detail as { customer_id?: unknown }).customer_id)
              || str((detail as { user_id?: unknown }).user_id)
              || str((detail as { telegram_id?: unknown }).telegram_id) || '—' }}
          </span>
        </div>
      </template>
    </div>

    <section v-if="!loading && detail && showFactorySection && factoryPlates.length" class="mt-3 bg-white px-4 py-4">
      <div class="text-4 font-700">
        {{ t('orderDetails.factoryDrawings') }}
      </div>
      <div class="mt-3 space-y-4">
        <div v-for="(group, gi) in factoryPlates" :key="`fp-${gi}-${group.title}`">
          <div class="mb-2 text-3 text-[#9ea3ad]">
            {{ group.title }}
          </div>
          <div class="flex gap-3">
            <template v-for="(cell, ci) in group.cells" :key="`c-${gi}-${ci}`">
              <a
                v-if="cell"
                :href="cell"
                target="_blank"
                rel="noopener noreferrer"
                class="flex h-12.5 w-12.5 items-center justify-center overflow-hidden rounded-[4px] bg-[#121318]">
                <img :src="cell" class="h-full w-full object-cover" alt="">
              </a>
              <div
                v-else
                class="flex h-12.5 w-12.5 items-center justify-center rounded-[4px] bg-[#121318]">
                <Icon icon="mdi:wheel" width="20" height="20" class="text-white" />
              </div>
            </template>
          </div>
        </div>
      </div>
    </section>

    <section v-if="!loading && detail" class="mt-3 bg-white px-4 py-4">
      <div class="flex items-center justify-center rounded-[12px] bg-[#fafafa] px-4 py-3">
        <div v-if="carHeroSrc" class="h-34 w-full max-w-70 overflow-hidden rounded-[10px]">
          <img :src="carHeroSrc" class="h-full w-full object-cover" alt="">
        </div>
        <div
          v-else
          class="relative h-34 w-full max-w-70 overflow-hidden rounded-[10px] bg-[linear-gradient(135deg,#e5e7eb_0%,#f5f6f8_40%,#d9dde5_100%)]">
          <div class="absolute left-[10%] top-[48%] h-10 w-10 rounded-full border-[6px] border-[#2a2d35]" />
          <div class="absolute right-[12%] top-[48%] h-10 w-10 rounded-full border-[6px] border-[#2a2d35]" />
          <div class="absolute left-[18%] top-[40%] h-14 w-[64%] rounded-[40px_48px_18px_18px] bg-[#2c2f38]" />
          <div class="absolute left-[24%] top-[34%] h-9 w-[31%] skew-x-[-16deg] rounded-t-[18px] bg-[#2c2f38]" />
          <div class="absolute left-[52%] top-[35%] h-8 w-[20%] skew-x-[-18deg] rounded-tr-[16px] bg-[#2c2f38]" />
        </div>
      </div>

      <div class="mt-4 border-b border-[#f0f1f4] pb-4">
        <div class="min-w-0 text-4 font-700">
          {{ t('orderDetails.vehicleInfo') }}
        </div>
        <div v-if="vehicleInfoRows[0]" class="mt-3">
          <div class="flex items-start justify-between gap-3 text-3.5">
            <span class="max-w-[48%] shrink-0 text-3 text-[#a3a7b0]">
              {{ t(vehicleInfoRows[0].labelKey) }}
            </span>
            <span
              class="min-w-0 flex-1 text-right font-500 leading-5.5 text-[#333] break-words whitespace-pre-wrap">
              {{ vehicleInfoRows[0].value }}
            </span>
          </div>
        </div>
        <div v-show="vehicleInfoOpen" class="mt-3 border-t border-[#f3f4f6] pt-3">
          <div class="text-4.5 font-700">
            {{ brandModelLine }}
          </div>
          <div class="mt-1 text-3.5 leading-5.5 text-[#5f6470]">
            {{ (detail as { car?: string }).car || '—' }}
          </div>
          <div class="mt-3 space-y-2.5">
            <div
              v-for="(row, vi) in vehicleInfoRowsRest"
              :key="`vrow-${vi}`"
              class="flex items-start justify-between gap-3 text-3.5">
              <span class="max-w-[48%] shrink-0 text-3 text-[#a3a7b0]">
                {{ t(row.labelKey) }}
              </span>
              <span
                class="min-w-0 flex-1 text-right font-500 leading-5.5 text-[#333] break-words whitespace-pre-wrap">
                {{ row.value }}
              </span>
            </div>
          </div>
        </div>
        <div class="mt-3 flex justify-center border-t border-[#f0f1f4] pt-3">
          <button
            type="button"
            :aria-expanded="vehicleInfoOpen"
            class="inline-flex items-center gap-0.5 text-3.25 text-[#528FFF]"
            @click="vehicleInfoOpen = !vehicleInfoOpen">
            <span class="font-700">{{ vehicleInfoOpen ? t('common.collapse') : t('common.expand') }}</span>
            <Icon
              :icon="vehicleInfoOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'"
              width="16"
              height="16" />
          </button>
        </div>

        <div class="mt-4 border-t border-[#f0f1f4] pt-4">
          <div class="mb-3 flex min-w-0 items-center gap-2 text-3.5 text-[#a0a4ae]">
            <span class="h-px flex-1 shrink-0 bg-[#e5e7eb]" />
            <span class="shrink-0 text-center">{{
              wheelsIdentical ? t('orderDetails.wheelsIdentical') : t('orderDetails.wheelSpecSplitHint')
            }}</span>
            <span class="h-px min-w-0 flex-1 bg-[#e5e7eb]" />
          </div>

          <template v-if="wheelsIdentical">
            <div class="space-y-2.5">
              <div
                v-for="(w, wi) in wheelSpecUnifiedHR.head"
                :key="`wuh-${wi}`"
                class="flex items-start justify-between gap-3 text-3.5">
                <span class="max-w-[48%] shrink-0 text-3 text-[#a3a7b0]">
                  {{ t(w.labelKey) }}
                </span>
                <span
                  class="min-w-0 flex-1 text-right font-500 break-words text-[#333] whitespace-pre-wrap">
                  {{ w.value }}
                </span>
              </div>
            </div>
            <div v-show="wheelSpecOpen" class="mt-2.5 space-y-2.5">
              <div
                v-for="(w, wi) in wheelSpecUnifiedHR.rest"
                :key="`wur-${wi}`"
                class="flex items-start justify-between gap-3 text-3.5">
                <span class="max-w-[48%] shrink-0 text-3 text-[#a3a7b0]">
                  {{ t(w.labelKey) }}
                </span>
                <span
                  class="min-w-0 flex-1 text-right font-500 break-words text-[#333] whitespace-pre-wrap">
                  {{ w.value }}
                </span>
              </div>
            </div>
            <div
              v-if="wheelSpecUnifiedHR.rest.length"
              class="mt-3 flex justify-center border-t border-[#f0f1f4] pt-3">
              <button
                type="button"
                :aria-expanded="wheelSpecOpen"
                class="inline-flex items-center gap-0.5 text-3.25 text-[#528FFF]"
                @click="wheelSpecOpen = !wheelSpecOpen">
                <span class="font-700">{{ wheelSpecOpen ? t('common.collapse') : t('common.expand') }}</span>
                <Icon
                  :icon="wheelSpecOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                  width="16"
                  height="16" />
              </button>
            </div>
          </template>
          <template v-else>
            <div class="border-b border-[#f0f1f4] pb-3">
              <div class="text-3.5 font-600 text-[#555b67]">
                {{ t('orderDetails.frontWheel') }}
              </div>
              <div class="mt-2.5 space-y-2.5">
                <div
                  v-for="(w, wi) in wheelSpecFrontHR.head"
                  :key="`wfh-${wi}`"
                  class="flex items-start justify-between gap-3 text-3.5">
                  <span class="max-w-[48%] shrink-0 text-3 text-[#a3a7b0]">
                    {{ t(w.labelKey) }}
                  </span>
                  <span
                    class="min-w-0 flex-1 text-right font-500 break-words text-[#333] whitespace-pre-wrap">
                    {{ w.value }}
                  </span>
                </div>
              </div>
              <div v-show="frontWheelSpecOpen" class="mt-2.5 space-y-2.5">
                <div
                  v-for="(w, wi) in wheelSpecFrontHR.rest"
                  :key="`wfr-${wi}`"
                  class="flex items-start justify-between gap-3 text-3.5">
                  <span class="max-w-[48%] shrink-0 text-3 text-[#a3a7b0]">
                    {{ t(w.labelKey) }}
                  </span>
                  <span
                    class="min-w-0 flex-1 text-right font-500 break-words text-[#333] whitespace-pre-wrap">
                    {{ w.value }}
                  </span>
                </div>
              </div>
              <div
                v-if="wheelSpecFrontHR.rest.length"
                class="mt-3 flex justify-end border-t border-[#f0f1f4] pt-3">
                <button
                  type="button"
                  :aria-expanded="frontWheelSpecOpen"
                  class="inline-flex items-center gap-0.5 text-3.25 text-[#3487FF]"
                  @click="frontWheelSpecOpen = !frontWheelSpecOpen">
                  <span class="font-700">{{ frontWheelSpecOpen ? t('common.collapse') : t('common.expand') }}</span>
                  <Icon
                    :icon="frontWheelSpecOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                    width="16"
                    height="16" color="#3487FF"/>
                </button>
              </div>
            </div>
            <div class="mt-4">
              <div class="text-3.5 font-600 text-[#555b67]">
                {{ t('orderDetails.rearWheel') }}
              </div>
              <div class="mt-2.5 space-y-2.5">
                <div
                  v-for="(w, wi) in wheelSpecRearHR.head"
                  :key="`wrh-${wi}`"
                  class="flex items-start justify-between gap-3 text-3.5">
                  <span class="max-w-[48%] shrink-0 text-3 text-[#a3a7b0]">
                    {{ t(w.labelKey) }}
                  </span>
                  <span
                    class="min-w-0 flex-1 text-right font-500 break-words text-[#333] whitespace-pre-wrap">
                    {{ w.value }}
                  </span>
                </div>
              </div>
              <div v-show="rearWheelSpecOpen" class="mt-2.5 space-y-2.5">
                <div
                  v-for="(w, wi) in wheelSpecRearHR.rest"
                  :key="`wrr-${wi}`"
                  class="flex items-start justify-between gap-3 text-3.5">
                  <span class="max-w-[48%] shrink-0 text-3 text-[#a3a7b0]">
                    {{ t(w.labelKey) }}
                  </span>
                  <span
                    class="min-w-0 flex-1 text-right font-500 break-words text-[#333] whitespace-pre-wrap">
                    {{ w.value }}
                  </span>
                </div>
              </div>
              <div
                v-if="wheelSpecRearHR.rest.length"
                class="mt-3 flex justify-end border-t border-[#f0f1f4] pt-3">
                <button
                  type="button"
                  :aria-expanded="rearWheelSpecOpen"
                  class="inline-flex items-center gap-0.5 text-3.25 text-[#528FFF]"
                  @click="rearWheelSpecOpen = !rearWheelSpecOpen">
                  <span>{{ rearWheelSpecOpen ? t('common.collapse') : t('common.expand') }}</span>
                  <Icon
                    :icon="rearWheelSpecOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                    width="16"
                    height="16" />
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div class="pt-4">
        <div class="min-w-0 text-4 font-700">
          {{ t('orderDetails.designLib') }}
        </div>

        <div v-show="designCustomOpen" class="mt-4 space-y-0">
          <div
            class="flex items-center justify-between gap-3 border-b border-[#e5e7eb] pb-3 text-3.5">
            <span class="shrink-0 text-[#a3a7b0]">
              {{ t('orderDetails.structureType') }}
            </span>
            <span class="min-w-0 flex-1 text-right font-500 text-[#333]">
              {{ structureLabel }}
            </span>
          </div>

          <div class="border-b border-[#e5e7eb] py-3">
            <div class="text-3 text-[#a3a7b0]">
              {{ t('customOrder.wheelShape') }}
            </div>
            <div class="mt-2 flex flex-wrap gap-3">
              <template v-if="slotImgUrls.color_sample.length">
                <a
                  v-for="(u, si) in slotImgUrls.color_sample"
                  :key="`cs-${si}`"
                  :href="u"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block h-10 w-10 shrink-0 overflow-hidden rounded-[4px] ring-1 ring-[#e8eaef]">
                  <img :src="u" class="h-full w-full object-cover" alt="">
                </a>
              </template>
              <a
                v-else-if="libThumb"
                :href="libThumb"
                target="_blank"
                rel="noopener noreferrer"
                class="block h-10 w-10 shrink-0 overflow-hidden rounded-[4px] ring-1 ring-[#e8eaef]">
                <img :src="libThumb" class="h-full w-full object-cover" alt="">
              </a>
              <div
                v-else
                class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-[#111216] ring-1 ring-[#e8eaef]">
                <Icon icon="mdi:wheel" width="20" height="20" class="text-white" />
              </div>
            </div>
            <div class="mt-3 text-3 text-[#a3a7b0]">
              {{ t('customOrder.wheelShapeDesc') }}
            </div>
            <p class="mt-2 break-words text-3.2 leading-5.3 text-[#333] whitespace-pre-wrap">
              {{ slotDescText('color_sample') || t('orderDetails.noDescription') }}
            </p>
          </div>

          <div class="border-b border-[#e5e7eb] py-3">
            <div class="text-3 text-[#a3a7b0]">
              {{ t('orderDetails.imgType.wheel_color') }}
            </div>
            <div v-if="swatchThumbs.length" class="mt-2 flex flex-wrap gap-3">
              <div v-for="(item, idx) in swatchThumbs" :key="`api-sw-${idx}`" class="w-12 shrink-0 text-center">
                <a
                  :href="item.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mx-auto block h-10 w-10 overflow-hidden rounded-[4px] ring-1 ring-[#e8eaef]">
                  <img :src="item.url" class="h-full w-full object-cover" alt="">
                </a>
                <div class="mt-1.5 text-[10px] leading-4 text-[#6d727c]">
                  {{ item.code }}
                </div>
              </div>
            </div>
            <div v-else class="mt-2 flex flex-wrap gap-3">
              <div v-for="item in wheelColors" :key="item.code" class="w-12 shrink-0 text-center">
                <div
                  class="mx-auto h-10 w-10 rounded-[4px] ring-1 ring-[#e8eaef]"
                  :style="{ backgroundColor: item.hex }" />
                <div class="mt-1.5 text-[10px] leading-4 text-[#6d727c]">
                  {{ item.code }}
                </div>
              </div>
            </div>
            <div class="mt-3 text-3 text-[#a3a7b0]">
              {{ t('orderDetails.colorDesc') }}
            </div>
            <div class="mt-2 space-y-1 text-3.2 leading-5.3 text-[#333]">
              <div v-for="item in wheelColors" :key="`t-${item.code}`">
                {{ t('orderDetails.swatch') }}: {{ item.code }} {{ wheelColorName(item.code) }}
              </div>
              <p class="whitespace-pre-wrap break-words">
                {{ slotDescText('wheel_color') || t('orderDetails.noDescription') }}
              </p>
            </div>
          </div>

          <div class="border-b border-[#e5e7eb] py-3">
            <div class="text-3 text-[#a3a7b0]">
              {{ t('orderDetails.imgType.cover') }}
            </div>
            <div
              v-if="coverDisplayUrls.length"
              class="mt-2 flex flex-wrap gap-3">
              <a
                v-for="(u, ci) in coverDisplayUrls"
                :key="`cv-${ci}`"
                :href="u"
                target="_blank"
                rel="noopener noreferrer"
                class="block h-10 w-10 shrink-0 overflow-hidden rounded-[4px] ring-1 ring-[#e8eaef]">
                <img :src="u" class="h-full w-full object-cover" alt="">
              </a>
            </div>
            <div
              v-else
              class="mt-2 h-10 w-10 shrink-0 rounded-[4px] bg-[#d8d8d8] ring-1 ring-[#e8eaef]" />
            <div class="mt-3 text-3 text-[#a3a7b0]">
              {{ t('orderDetails.capDesc') }}
            </div>
            <p class="mt-2 break-words text-3.2 leading-5.3 text-[#333] whitespace-pre-wrap">
              {{ slotDescText('cover') || t('orderDetails.noDescription') }}
            </p>
          </div>

          <div class="border-b border-[#e5e7eb] py-3">
            <div class="text-3 text-[#a3a7b0]">
              {{ t('orderDetails.imgType.front_mark') }}
            </div>
            <div
              v-if="slotImgUrls.front_mark.length"
              class="mt-2 flex flex-wrap gap-3">
              <a
                v-for="(u, fi) in slotImgUrls.front_mark"
                :key="`fm-${fi}`"
                :href="u"
                target="_blank"
                rel="noopener noreferrer"
                class="block h-10 w-10 shrink-0 overflow-hidden rounded-[4px] ring-1 ring-[#e8eaef]">
                <img :src="u" class="h-full w-full object-cover" alt="">
              </a>
            </div>
            <div
              v-else
              class="mt-2 h-10 w-10 shrink-0 rounded-[4px] bg-[#d8d8d8] ring-1 ring-[#e8eaef]" />
            <div class="mt-3 text-3 text-[#a3a7b0]">
              {{ t('orderDetails.engraveDesc') }}
            </div>
            <p class="mt-2 break-words text-3.2 leading-5.3 text-[#333] whitespace-pre-wrap">
              {{ slotDescText('front_mark') || t('orderDetails.noDescription') }}
            </p>
          </div>

          <div class="pt-3">
            <div class="text-3 text-[#a3a7b0]">
              {{ t('orderDetails.specialNote') }}
            </div>
            <p class="mt-2 break-words text-3.2 leading-5.3 text-[#333] whitespace-pre-wrap">
              {{ specialReqLine || t('orderDetails.noDescription') }}
            </p>
          </div>
        </div>
        <div class="mt-3 flex justify-end border-t border-[#e5e7eb] pt-3">
          <button
            type="button"
            :aria-expanded="designCustomOpen"
            class="inline-flex items-center gap-0.5 text-3.25 text-[#528FFF]"
            @click="designCustomOpen = !designCustomOpen">
            <span>{{ designCustomOpen ? t('common.collapse') : t('common.expand') }}</span>
            <Icon
              :icon="designCustomOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'"
              width="16"
              height="16" />
          </button>
        </div>
      </div>
    </section>

    <section v-if="!loading && detail" class="mt-3 bg-white px-4 py-4">
      <div class="text-4 font-700">
        {{ t('orderDetails.shippingAddr') }}
      </div>
      <div class="mt-3 text-3.5 font-600">
        {{ addressName }}
      </div>
      <div class="mt-1 text-3 text-[#8a9099]">
        {{ addressContact }}
      </div>
      <div v-if="addressLines.length" class="mt-3 space-y-1 text-3.2 leading-5.2 text-[#5d6370]">
        <div v-for="(line, i) in addressLines" :key="`addr-${i}`">
          {{ line }}
        </div>
      </div>
      <div v-else class="mt-3 text-3.2 text-[#9ca3af]">
        —
      </div>
      <div class="mt-4 flex items-center justify-between gap-3 text-3.5">
        <span class="text-[#a4a8b1]">{{ t('orderDetails.coupon') }}</span>
        <span class="max-w-[60%] text-right font-600 break-words">{{ couponDisplay }}</span>
      </div>
      <div class="mt-3 flex items-center justify-between gap-3 text-3.5">
        <span class="text-[#a4a8b1]">{{ t('orderDetails.remark') }}</span>
        <span class="max-w-[60%] text-right font-600 break-words">{{ remarkDisplay }}</span>
      </div>
    </section>

    <section v-if="!loading && detail" class="mt-3 bg-white px-4 py-4">
      <div class="text-4 font-700">
        {{ t('orderDetails.bill') }}
      </div>
      <div class="mt-4 space-y-3 text-3.5">
        <div
          v-for="(item, bi) in amountRows"
          :key="`am-${bi}`"
          class="flex items-center justify-between gap-3">
          <span class="text-[#8f949d]">{{ t(item.labelKey) }}</span>
          <span class="shrink-0 text-right">{{ item.value }}</span>
        </div>
        <div class="flex items-center justify-between gap-3 border-t border-[#f0f1f4] pt-3 text-4 font-700">
          <span>{{ t('orderDetails.total') }}</span>
          <span class="text-[#da3342]">{{ totalDisplay }}</span>
        </div>
      </div>
    </section>

    <div
      v-if="detail && !loadError"
      class="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 bg-white px-4 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
      <div class="flex gap-3">
        <TgButton
          v-for="action in statusMeta.detailActions"
          :key="action.key"
          type="button"
          :variant="action.variant === 'primary' ? 'primary' : 'outline'"
          :class="[
            '!h-12 !min-h-0 flex-1 !rounded-[4px] !text-4 !font-700',
            action.variant === 'outline' && '!bg-white !text-[color:var(--app-on-light)]',
          ]"
          @click="handleDetailAction(action.key)">
          {{ t(action.labelKey) }}
        </TgButton>
      </div>
    </div>

    <NModal
      v-model:show="cancelModalOpen"
      preset="card"
      :style="{ maxWidth: 'min(90vw, 450px)' }"
      :mask-closable="!cancelSubmitting"
      :closable="!cancelSubmitting">
      <template #header>
        <div class="text-center text-[17px] font-semibold">
          {{ t('orderAction.cancel_order') }}
        </div>
      </template>
      <div class="text-sm text-[#4B5563] leading-normal">
        {{ t('orderDetails.confirmCancel') }}
      </div>
      <div
        v-if="cancelError"
        class="mt-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-3.25 text-[#B91C1C]">
        {{ cancelError }}
      </div>
      <template #footer>
        <div class="mt-2 flex w-full justify-between gap-3">
          <TgButton
            class="!min-w-0 flex-1"
            variant="outline"
            type="button"
            :disabled="cancelSubmitting"
            @click="cancelModalOpen = false">
            {{ t('common.cancel') }}
          </TgButton>
          <TgButton
            class="!min-w-0 flex-1"
            type="button"
            :disabled="cancelSubmitting"
            @click="confirmCancel">
            {{ cancelSubmitting ? t('common.submitting') : t('common.confirm') }}
          </TgButton>
        </div>
      </template>
    </NModal>
  </div>
</template>
