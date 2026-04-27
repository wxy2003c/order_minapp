<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { t, uiLocale } from '@/i18n/uiI18n'
import { currenciesToSelectOptions } from '@/constants/currencies'
import { Icon } from '@iconify/vue'
import TgButton from '@/components/TgButton.vue'
import TgSelect from '@/components/TgSelect.vue'
import TgSwitch from '@/components/TgSwitch.vue'
import TgFilepond from '@/components/TgFilepond.vue'
import { buildCreateOrderFromCustomOrder, createOrder, fetchOrderDetail } from '@/api/orders'
import {
  applyOrderDetailToCustomOrderForms,
  brandModelLabelsFromDetail,
  findSelectValue,
  orderIdFromRouteQuery,
} from '@/utils/applyOrderDetailToCustomOrder'
import type { WheelSizeGenerationRow, WheelSizeOption } from '@/api/wheelsline-size'
import {
  fetchWheelSizeGenerations,
  fetchWheelSizeMakes,
  fetchWheelSizeModels,
  fetchWheelSizeModifications,
  isWheelSizeEnabled,
  resolveWheelSizeYearOptions,
} from '@/api/wheelsline-size'
import { fetchFinishCards, type FinishCardGroup, type FinishCardItem } from '@/api/finishCards'
import { getTelegramUserId } from '@/utils/userTelegram'

type OrderTab = 'vehicle' | 'creative' | 'address' | 'amount'

interface SelectOption {
  value: string | number
  label: string
}

const route = useRoute()
const openOutline = ref<boolean>(false)
const orderEditLoading = ref(false)
const orderEditError = ref('')

function strU(v: unknown) {
  return v == null ? '' : String(v)
}

/** 从详情页「修改订单」进入时带 `orderId`，回填各步表单 */
async function hydrateFromOrderId(orderId: string) {
  orderEditLoading.value = true
  orderEditError.value = ''
  try {
    const d = await fetchOrderDetail(orderId)
    const o = d as Record<string, unknown>
    if (wheelSizeEnabled) {
      if (!wsBrandOptions.value.length) await loadWheelMakes()
      const { brand: bLabel, model: mLabel } = brandModelLabelsFromDetail(d)
      const bVal = findSelectValue(wsBrandOptions.value, bLabel)
      if (bVal) {
        await onWheelBrandChange(bVal)
        const mVal = findSelectValue(wsModelOptions.value, mLabel)
        if (mVal) {
          await onWheelModelChange(mVal)
          const genKey = strU(o.wheel_generation) || strU(o.structure_subtype_offroad)
          if (genKey) {
            const gVal = findSelectValue(wsGenOptions.value, genKey)
            if (gVal) {
              await onWheelGenerationChange(gVal)
              const yLabel = strU(o.year)
              if (yLabel) {
                const yVal = findSelectValue(wsYearOptions.value, yLabel)
                if (yVal) {
                  await onWheelYearChange(yVal)
                  const modKey = strU(o.wheel_modification) || strU(o.modification)
                  if (modKey) {
                    const modVal = findSelectValue(wsModOptions.value, modKey)
                    if (modVal) onWheelModificationChange(modVal)
                  }
                }
              }
            }
          }
        }
      }
      applyOrderDetailToCustomOrderForms(
        d,
        { vehicleForm, creativeForm, addressForm, amountForm },
        countryOptions,
      )
    } else {
      const { brand: bLabel, model: mLabel } = brandModelLabelsFromDetail(d)
      if (bLabel) {
        const v = findSelectValue(staticBrandOptions, bLabel)
        if (v) vehicleForm.brand = v
      }
      if (mLabel) {
        const v = findSelectValue(staticModelOptions, mLabel)
        if (v) vehicleForm.model = v
      }
      applyOrderDetailToCustomOrderForms(
        d,
        { vehicleForm, creativeForm, addressForm, amountForm },
        countryOptions,
      )
    }
  } catch (e) {
    orderEditError.value = e instanceof Error ? e.message : String(e)
  } finally {
    orderEditLoading.value = false
  }
}

const activeTab = ref<OrderTab>('vehicle')
const vehicleExpanded = ref(false)

const wheelSizeEnabled = isWheelSizeEnabled()

const staticBrandOptions: SelectOption[] = [
  { value: 'audi', label: 'Audi' },
  { value: 'bmw', label: 'BMW' },
  { value: 'benz', label: 'Benz' },
]

const staticModelOptions: SelectOption[] = [
  { value: 'a5', label: 'A5(F5/2016-2020)/D9SSEL 2.0T 14 188HP' },
  { value: 'a4', label: 'A4(B9/2020-2024)/45 TFSI' },
]

const wsBrandOptions = ref<SelectOption[]>([])
const wsModelOptions = ref<SelectOption[]>([])
const wsGenOptions = ref<SelectOption[]>([])
const wsYearOptions = ref<SelectOption[]>([])
const wsModOptions = ref<SelectOption[]>([])
const wsGenerationsCache = ref<WheelSizeGenerationRow[]>([])
/** 与 CarSelectionPanel 一致：仅当前请求层级显示 loading，避免锁死其它下拉 */
const wsLoadingStage = ref<number | null>(null)
/** i18n key under `ws.*` */
const wsErrorKey = ref<string | null>(null)

function wheelOptToSelect(o: WheelSizeOption): SelectOption {
  return { value: o.id, label: o.label }
}

function generationRowsToSelectOptions(rows: WheelSizeGenerationRow[]): SelectOption[] {
  return rows.map(g => ({
    value: g.slug,
    label: `${g.name} (${g.start}–${g.end})${g.platform ? ` · ${g.platform}` : ''}`,
  }))
}

const preorderBrandOptions = computed<SelectOption[]>(() =>
  wheelSizeEnabled ? wsBrandOptions.value : staticBrandOptions,
)

const preorderModelOptions = computed<SelectOption[]>(() =>
  wheelSizeEnabled ? wsModelOptions.value : staticModelOptions,
)

const yesNoOptions = computed<SelectOption[]>(() => [
  { value: 'yes', label: t('common.yes') },
  { value: 'no', label: t('common.no') },
])

const sizeOptions = computed<SelectOption[]>(() => [
  { value: '16', label: t('wheel.inch16') },
  { value: '17', label: t('wheel.inch17') },
  { value: '18', label: t('wheel.inch18') },
  { value: '19', label: t('wheel.inch19') },
  { value: '20', label: t('wheel.inch20') },
  { value: '21', label: t('wheel.inch21') },
  { value: '22', label: t('wheel.inch22') },
  { value: '23', label: t('wheel.inch23') },
  { value: '24', label: t('wheel.inch24') },
])

const designModeOptions = computed(() => [
  { id: 'creative' as const, title: t('customOrder.designModeCreative'), icon: 'mdi:shape-outline' },
  { id: 'custom' as const, title: t('customOrder.designModeCustom'), icon: 'mdi:palette-outline' },
])

const structureValues = ['单片', '双片', '三片', '越野'] as const

function structureLabel(v: string): string {
  const map: Record<string, string> = {
    单片: 'customOrder.structureSingle',
    双片: 'customOrder.structureDual',
    三片: 'customOrder.structureTriple',
    越野: 'customOrder.structureOffroad',
  }
  const k = map[v]
  return k ? t(k) : v
}

const finishCardGroups = ref<FinishCardGroup[]>([])
const allFinishItems = ref<FinishCardItem[]>([])
const finishCardLoading = ref(false)
const finishCardLoadError = ref('')
const selectedFinishGroupIndex = ref(0)

const groupsWithItems = computed(() =>
  [...finishCardGroups.value]
    .filter(g => (g.items?.length ?? 0) > 0)
    .sort((a, b) => a.sort - b.sort),
)

const currentFinishItems = computed(() => {
  const g = groupsWithItems.value[selectedFinishGroupIndex.value]
  if (!g?.items?.length) return []
  return [...g.items].sort((a, b) => a.sort - b.sort)
})

const tabItems = computed(() => [
  { label: t('customOrder.tabs.vehicle'), value: 'vehicle' as const },
  { label: t('customOrder.tabs.creative'), value: 'creative' as const },
  { label: t('customOrder.tabs.address'), value: 'address' as const },
  { label: t('customOrder.tabs.amount'), value: 'amount' as const },
])

const vehicleForm = reactive({
  customerName: 'Mexicidad Dukoi',
  customerId: getTelegramUserId(),
  brand: wheelSizeEnabled ? '' : 'audi',
  model: wheelSizeEnabled ? '' : 'a5',
  /** Wheel-Size：世代 slug、年份 id、配置 slug（仅 API 模式使用） */
  wheelGeneration: '',
  wheelYear: '',
  wheelModification: '',
  forged: '',
  mirrorPair: true,
  frontSize: '',
  frontQuantity: '',
  frontWidth: '',
  frontEt: '',
  frontPcdLeft: '',
  frontPcdRight: '',
  frontCb: '',
  frontPaint: '',
  frontHole: '',
  frontBoltSeat: '',
  rearSize: '',
  rearQuantity: '',
  rearWidth: '',
  rearEt: '',
  rearPcdLeft: '',
  rearPcdRight: '',
  rearCb: '',
  rearPaint: '',
  rearHole: '',
  rearBoltSeat: '',
  vin: '',
  plate: '',
  axleWeight: '',
  rimThickness: '',
})

const creativeForm = reactive({
  designMode: 'creative',
  /** 结构类型：默认不选，首次点选直接赋值，已选时切换走确认弹窗 */
  structure: '' as string,
  /** 色卡项 id；与 `finishCardOrderNote` 同步 */
  finishCardId: null as number | null,
  /** 预下单 f_note 片段：色卡 code + 展示名 */
  finishCardOrderNote: '',
  /** 色卡缩略图 URL，供 `wheel_color_image` 提交 */
  finishCardImageUrl: '',
  /** 接口 `image_path`，与 URL 二选一或同时用于拼 `{ path, url, name }` */
  finishCardImagePath: '',
  /** 当前所选色卡展示名称拼接 → `wheel_color_desc` */
  wheelColorSelectionDesc: '',
  wheelShapeFile: null as File | null,
  wheelLipFile: null as File | null,
  centerCapFile: null as File | null,
  wheelShapeUrl: '',
  wheelLipUrl: '',
  centerCapUrl: '',
  wheelShapeNote: '',
  wheelColorNote: '',
  centerCapNote: '',
  centerCapTexture: '',
  specialRequest: '',
})

const selectedFinishPreview = computed(() => {
  const id = creativeForm.finishCardId
  if (id == null) return null
  return allFinishItems.value.find(x => x.id === id) ?? null
})

function finishSectionLabel(g: FinishCardGroup): string {
  const loc = uiLocale.value
  if (loc === 'en' && g.section_name_en) return g.section_name_en
  if (loc === 'ru' && g.section_name_en) return g.section_name_en
  return g.section_name || g.section_name_en || g.group_name
}

function finishItemDisplayLabel(item: FinishCardItem): string {
  const loc = uiLocale.value
  const d = (item.description || '').toString()
  if (loc === 'en') {
    return (item.name_en || item.name_cn || d || item.code).toString().split('\n').pop() || item.code
  }
  if (loc === 'zh') {
    return (item.name_cn || item.name_en || d || item.code).toString().split('\n')[0] || item.code
  }
  return (item.name_en || item.name_cn || d || item.code).toString().split('\n')[0] || item.code
}

function buildFinishOrderNote(item: FinishCardItem): string {
  const label = finishItemDisplayLabel(item)
  return [item.code, label].filter(Boolean).join(' · ')
}

function finishGroupContainingItem(item: FinishCardItem): FinishCardGroup | undefined {
  return finishCardGroups.value.find(g => (g.items ?? []).some(i => i.id === item.id))
}

/** 提交 `wheel_color_desc`：分区名 + 条目展示名 + 工艺/色调（若有） */
function buildWheelColorSelectionDesc(item: FinishCardItem, group: FinishCardGroup | undefined): string {
  const parts: string[] = []
  if (group) {
    const sec = finishSectionLabel(group)
    if (sec) parts.push(sec)
  }
  const label = finishItemDisplayLabel(item)
  if (label) parts.push(label)
  for (const x of [item.tone_label, item.process_label]) {
    const t = String(x ?? '').trim()
    if (t && !parts.includes(t)) parts.push(t)
  }
  return parts.join(' · ')
}

function applyFinishSelection(item: FinishCardItem) {
  creativeForm.finishCardId = item.id
  creativeForm.finishCardOrderNote = buildFinishOrderNote(item)
  creativeForm.finishCardImageUrl = (item.image_url && String(item.image_url).trim()) || ''
  creativeForm.finishCardImagePath = (item.image_path && String(item.image_path).trim()) || ''
  creativeForm.wheelColorSelectionDesc = buildWheelColorSelectionDesc(item, finishGroupContainingItem(item))
}

function selectFinishGroup(i: number) {
  if (i < 0 || i >= groupsWithItems.value.length) return
  selectedFinishGroupIndex.value = i
  const first = currentFinishItems.value[0]
  if (first) applyFinishSelection(first)
}

async function loadFinishCards() {
  finishCardLoadError.value = ''
  finishCardLoading.value = true
  try {
    const data = await fetchFinishCards()
    const groups = [...(data.groups ?? [])].sort((a, b) => a.sort - b.sort)
    finishCardGroups.value = groups
    allFinishItems.value = groups.flatMap(g => g.items ?? [])

    const withItems = groupsWithItems.value
    if (withItems.length) {
      selectedFinishGroupIndex.value = 0
      const g0 = withItems[0]
      const sorted = [...(g0.items ?? [])].sort((a, b) => a.sort - b.sort)
      if (sorted[0]) applyFinishSelection(sorted[0])
    } else {
      creativeForm.finishCardId = null
      creativeForm.finishCardOrderNote = ''
      creativeForm.finishCardImageUrl = ''
      creativeForm.finishCardImagePath = ''
      creativeForm.wheelColorSelectionDesc = ''
    }
  } catch (e) {
    finishCardGroups.value = []
    allFinishItems.value = []
    finishCardLoadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    finishCardLoading.value = false
  }
}

watch(uiLocale, () => {
  const id = creativeForm.finishCardId
  if (id == null) return
  const it = allFinishItems.value.find(x => x.id === id)
  if (it) applyFinishSelection(it)
})

const addressForm = reactive({
  name: '',
  phone: '',
  email: '',
  country: 'russia',
  address: '',
  coupon: '',
  remark: '',
})

const amountForm = reactive({
  basePrice: '',
  currency: '',
})

const currencyOptions = computed<SelectOption[]>(() => currenciesToSelectOptions())

const orderSubmitting = ref(false)
const orderSubmitError = ref('')
const orderSubmitOk = ref(false)

const countryOptions: SelectOption[] = [
  { value: 'russia', label: 'Russia' },
  { value: 'germany', label: 'Germany' },
  { value: 'uae', label: 'UAE' },
]

// 与 `specs.孔型` / `specs.后轮孔型` 及创建订单 `f_hole` / `r_hole` 一致
const holeOptions = computed<SelectOption[]>(() => [
  { value: '锥口', label: t('wheel.holeConical') },
  { value: '平口', label: t('wheel.holeFlat') },
  { value: '球口', label: t('wheel.holeBall') },
])

const boltSeatOptions = computed<SelectOption[]>(() => [
  { value: '球座', label: t('wheel.seatBall') },
  { value: '锥座', label: t('wheel.seatConical') },
])

async function loadWheelMakes() {
  wsLoadingStage.value = 0
  wsErrorKey.value = null
  try {
    const items = await fetchWheelSizeMakes()
    wsBrandOptions.value = items.map(wheelOptToSelect)
    if (!items.length) wsErrorKey.value = 'ws.emptyBrands'
  } catch {
    wsBrandOptions.value = []
    wsErrorKey.value = 'ws.brandsFailed'
  } finally {
    wsLoadingStage.value = null
  }
}

async function loadWheelModels(make: string) {
  wsModelOptions.value = []
  if (!make) return
  wsLoadingStage.value = 1
  wsErrorKey.value = null
  try {
    const items = await fetchWheelSizeModels(make)
    wsModelOptions.value = items.map(wheelOptToSelect)
    if (!items.length) wsErrorKey.value = 'ws.emptyModels'
  } catch {
    wsModelOptions.value = []
    wsErrorKey.value = 'ws.modelsFailed'
  } finally {
    wsLoadingStage.value = null
  }
}

async function loadWheelGenerations(make: string, model: string) {
  wsGenOptions.value = []
  wsGenerationsCache.value = []
  if (!make || !model) return
  wsLoadingStage.value = 2
  wsErrorKey.value = null
  try {
    const rows = await fetchWheelSizeGenerations(make, model)
    wsGenerationsCache.value = rows
    wsGenOptions.value = generationRowsToSelectOptions(rows)
    if (!rows.length) wsErrorKey.value = 'ws.emptyGenerations'
  } catch {
    wsGenerationsCache.value = []
    wsGenOptions.value = []
    wsErrorKey.value = 'ws.generationsFailed'
  } finally {
    wsLoadingStage.value = null
  }
}

async function loadWheelYears(make: string, model: string, genSlug: string) {
  wsYearOptions.value = []
  if (!make || !model || !genSlug) return
  wsLoadingStage.value = 3
  wsErrorKey.value = null
  try {
    const gen = wsGenerationsCache.value.find(x => x.slug === genSlug)
    const items = await resolveWheelSizeYearOptions(make, model, gen)
    wsYearOptions.value = items.map(wheelOptToSelect)
    if (!items.length) wsErrorKey.value = 'ws.emptyYears'
  } catch {
    wsYearOptions.value = []
    wsErrorKey.value = 'ws.yearsFailed'
  } finally {
    wsLoadingStage.value = null
  }
}

async function loadWheelMods(make: string, model: string, year: string, genSlug: string) {
  wsModOptions.value = []
  if (!make || !model || !year) return
  wsLoadingStage.value = 4
  wsErrorKey.value = null
  try {
    const items = await fetchWheelSizeModifications(make, model, year, genSlug || undefined)
    wsModOptions.value = items.map(wheelOptToSelect)
    if (!items.length) wsErrorKey.value = 'ws.emptyMods'
  } catch {
    wsModOptions.value = []
    wsErrorKey.value = 'ws.modsFailed'
  } finally {
    wsLoadingStage.value = null
  }
}

async function onWheelBrandChange(v: string | number) {
  const make = String(v ?? '')
  vehicleForm.brand = make
  vehicleForm.model = ''
  vehicleForm.wheelGeneration = ''
  vehicleForm.wheelYear = ''
  vehicleForm.wheelModification = ''
  wsModelOptions.value = []
  wsGenOptions.value = []
  wsYearOptions.value = []
  wsModOptions.value = []
  wsGenerationsCache.value = []
  if (!make) return
  await loadWheelModels(make)
}

async function onWheelModelChange(v: string | number) {
  const model = String(v ?? '')
  vehicleForm.model = model
  vehicleForm.wheelGeneration = ''
  vehicleForm.wheelYear = ''
  vehicleForm.wheelModification = ''
  wsGenOptions.value = []
  wsYearOptions.value = []
  wsModOptions.value = []
  wsGenerationsCache.value = []
  if (!vehicleForm.brand || !model) return
  await loadWheelGenerations(vehicleForm.brand, model)
}

async function onWheelGenerationChange(v: string | number) {
  const slug = String(v ?? '')
  vehicleForm.wheelGeneration = slug
  vehicleForm.wheelYear = ''
  vehicleForm.wheelModification = ''
  wsYearOptions.value = []
  wsModOptions.value = []
  if (!vehicleForm.brand || !vehicleForm.model || !slug) return
  await loadWheelYears(vehicleForm.brand, vehicleForm.model, slug)
}

async function onWheelYearChange(v: string | number) {
  const y = String(v ?? '')
  vehicleForm.wheelYear = y
  vehicleForm.wheelModification = ''
  wsModOptions.value = []
  if (!vehicleForm.brand || !vehicleForm.model || !y) return
  await loadWheelMods(vehicleForm.brand, vehicleForm.model, y, vehicleForm.wheelGeneration)
}

function onWheelModificationChange(v: string | number) {
  vehicleForm.wheelModification = String(v ?? '')
}

onMounted(() => {
  void (async () => {
    if (wheelSizeEnabled) await loadWheelMakes()
    await loadFinishCards()
    const oid = orderIdFromRouteQuery(
      route.query as Record<string, string | string[] | null | undefined>,
    )
    if (oid) await hydrateFromOrderId(oid)
  })()
})

watch(
  () =>
    orderIdFromRouteQuery(route.query as Record<string, string | string[] | null | undefined>),
  (id, oldId) => {
    if (!id) return
    if (id === oldId) return
    void hydrateFromOrderId(id)
  },
)

function goNextFromVehicle() {
  activeTab.value = 'creative'
}

function goFromCreativeToAddress() {
  activeTab.value = 'address'
}

function goBackToVehicle() {
  activeTab.value = 'vehicle'
}

function goBackToCreative() {
  activeTab.value = 'creative'
}

function goToAmount() {
  activeTab.value = 'amount'
}

function buildWheelFieldsList(prefix: 'front' | 'rear') {
  return [
    { key: `${prefix}Size`, label: t('customOrder.sizeIn'), type: 'select' as const, options: sizeOptions.value, placeholder: t('common.pleaseSelect') },
    { key: `${prefix}Quantity`, label: t('customOrder.qty'), type: 'input' as const, placeholder: t('common.pleaseEnter') },
    { key: `${prefix}Width`, label: t('customOrder.widthJ'), type: 'input' as const, placeholder: t('common.pleaseEnter') },
    { key: `${prefix}Et`, label: t('customOrder.etMm'), type: 'input' as const, placeholder: t('common.pleaseEnter') },
    { key: `${prefix}Pcd`, label: t('customOrder.pcd'), type: 'pcd' as const },
    { key: `${prefix}Cb`, label: t('customOrder.cbMm'), type: 'input' as const, placeholder: t('common.pleaseEnter') },
    { key: `${prefix}BoltSeat`, label: t('customOrder.bolt'), type: 'select' as const, options: boltSeatOptions.value, placeholder: t('common.pleaseSelect') },
    { key: `${prefix}Hole`, label: t('customOrder.hole'), type: 'select' as const, options: holeOptions.value, placeholder: t('common.pleaseSelect') },
    { key: `${prefix}Paint`, label: t('customOrder.finish'), type: 'input' as const, placeholder: t('customOrder.finishPh') },
  ] as const
}

const frontWheelFields = computed(() => buildWheelFieldsList('front'))
const rearWheelFields = computed(() => buildWheelFieldsList('rear'))

const OutlineValue = ref<any>({})
const types = ref(0)
// 切换创作 / 结构类型
const handelOutline = (values: any, type: number) => {
  if (type === 0) {
    if (creativeForm.designMode === values?.id) return
  }
  if (type === 1) {
    const next = typeof values === 'string' ? values : String(values?.id ?? '')
    if (!creativeForm.structure) {
      creativeForm.structure = next
      return
    }
    if (creativeForm.structure === next) return
  }
  openOutline.value = true
  OutlineValue.value = values
  types.value = type
}
// 确认切换设计
const handelSublitOutline = () => {
  openOutline.value = false
  if (types.value === 0) {
    creativeForm.designMode = OutlineValue.value.id
  } else {
    creativeForm.structure = OutlineValue.value
  }
}

async function submitPreorder() {
  orderSubmitError.value = ''
  orderSubmitOk.value = false
  if (!String(amountForm.basePrice).trim()) {
    orderSubmitError.value = t('customOrder.errTotal')
    return
  }
  if (!String(amountForm.currency).trim()) {
    orderSubmitError.value = t('customOrder.errCurrency')
    return
  }
  orderSubmitting.value = true
  try {
    if (creativeForm.wheelShapeFile && !String(creativeForm.wheelShapeUrl).trim())
      throw new Error(t('customOrder.errWheelUpload'))
    if (creativeForm.wheelLipFile && !String(creativeForm.wheelLipUrl).trim())
      throw new Error(t('customOrder.errLipUpload'))
    if (creativeForm.centerCapFile && !String(creativeForm.centerCapUrl).trim())
      throw new Error(t('customOrder.errCapUpload'))

    const body = buildCreateOrderFromCustomOrder({
      vehicle: { ...vehicleForm },
      creative: { ...creativeForm },
      address: { ...addressForm },
      amount: { ...amountForm },
      brandOptions: preorderBrandOptions.value,
      modelOptions: preorderModelOptions.value,
      countryOptions,
      wheelGenOptions: wheelSizeEnabled ? wsGenOptions.value : undefined,
      wheelYearOptions: wheelSizeEnabled ? wsYearOptions.value : undefined,
      wheelModOptions: wheelSizeEnabled ? wsModOptions.value : undefined,
    })
    const res = await createOrder(body)
    if (!res?.order)
      throw new Error(t('customOrder.errCreate'))
    orderSubmitOk.value = true
  } catch (e) {
    orderSubmitOk.value = false
    orderSubmitError.value = e instanceof Error ? e.message : String(e)
  } finally {
    orderSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-full w-full overflow-x-hidden overflow-y-auto bg-[#FAFAFA] pb-32 text-[#1F2937]">
    <div v-if="orderEditLoading" class="px-4 py-2 text-3.25 text-[#6B7280]">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="orderEditError" class="px-4 py-2 text-3.25 text-[#B91C1C]">
      {{ orderEditError }}
    </div>
    <div class="min-h-full">
      <div class="sticky top-0 z-20 border-b border-[#ECECEC] bg-white px-4 pb-2 pt-4">
        <img src="@/assets/image/navLogo.png" class="h-8 w-34 object-contain" alt="">
        <div class="relative mt-3 grid grid-cols-4">
          <button v-for="item in tabItems" :key="item.value" type="button" :class="[
            'relative py-3 text-3.5 font-600 outline-none transition-colors',
            activeTab === item.value ? 'text-[#111827]' : 'text-[#4B5563]',
          ]" @click="activeTab = item.value">
            {{ item.label }}
            <span v-show="activeTab === item.value"
              class="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[#2A2C33]" />
          </button>
        </div>
      </div>

      <div v-show="activeTab === 'vehicle'" class="outline-none">
        <div class="space-y-4 px-4 py-4">
          <div class="space-y-3">
            <div>
              <div class="mb-2 text-3.5 font-600">{{ t('customOrder.customerName') }}</div>
              <input v-model="vehicleForm.customerName" type="text"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
            </div>
            <div>
              <div class="mb-2 text-3.5 font-600">{{ t('customOrder.customerId') }}</div>
              <input v-model="vehicleForm.customerId" type="text"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
            </div>
          </div>

          <div class="overflow-hidden rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <img src="@/assets/vue.svg" class="h-34 w-full object-contain" alt="">
          </div>

          <div>
            <div class="text-4 font-700">{{ t('customOrder.selectVehicle') }}</div>
            <div class="mt-1 text-3 text-[#9CA3AF]">{{ t('customOrder.vehicleHint') }}</div>
          </div>

          <div class="space-y-3">
            <template v-if="wheelSizeEnabled">
              <div v-if="wsErrorKey"
                class="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-3.25 text-[#B91C1C]">
                {{ t(wsErrorKey) }}
              </div>
              <div>
                <div class="mb-2 text-3.5 font-600">{{ t('customOrder.brand') }} <span class="text-[#EF4444]">*</span></div>
                <TgSelect :key="`ws-make-${wsBrandOptions.length}`" :model-value="vehicleForm.brand"
                  :options="wsBrandOptions" :searchable="true" :disabled="wsLoadingStage === 0"
                  :placeholder="wsLoadingStage === 0 ? t('common.loading') : t('customOrder.phSelectBrand')" @update:model-value="onWheelBrandChange" />
              </div>
              <div>
                <div class="mb-2 text-3.5 font-600">{{ t('customOrder.model') }} <span class="text-[#EF4444]">*</span></div>
                <TgSelect :key="`ws-model-${wsModelOptions.length}`" :model-value="vehicleForm.model"
                  :options="wsModelOptions" :searchable="true" :disabled="!vehicleForm.brand || wsLoadingStage === 1"
                  :placeholder="!vehicleForm.brand ? t('common.selectBrandFirst') : wsLoadingStage === 1 ? t('common.loading') : t('customOrder.phSelectModel')"
                  @update:model-value="onWheelModelChange" />
              </div>
              <div>
                <div class="mb-2 text-3.5 font-600">{{ t('customOrder.generation') }} <span class="text-[#EF4444]">*</span></div>
                <TgSelect :key="`ws-gen-${wsGenOptions.length}`" :model-value="vehicleForm.wheelGeneration"
                  :options="wsGenOptions" :searchable="true" :disabled="!vehicleForm.model || wsLoadingStage === 2"
                  :placeholder="!vehicleForm.model ? t('common.selectModelFirst') : wsLoadingStage === 2 ? t('common.loading') : t('customOrder.phSelectGen')"
                  @update:model-value="onWheelGenerationChange" />
              </div>
              <div>
                <div class="mb-2 text-3.5 font-600">{{ t('customOrder.year') }} <span class="text-[#EF4444]">*</span></div>
                <TgSelect :key="`ws-year-${wsYearOptions.length}`" :model-value="vehicleForm.wheelYear"
                  :options="wsYearOptions" :searchable="false"
                  :disabled="!vehicleForm.wheelGeneration || wsLoadingStage === 3"
                  :placeholder="!vehicleForm.wheelGeneration ? t('common.selectGenFirst') : wsLoadingStage === 3 ? t('common.loading') : t('customOrder.phSelectYear')"
                  @update:model-value="onWheelYearChange" />
              </div>
              <div>
                <div class="mb-2 text-3.5 font-600">{{ t('customOrder.modification') }} <span class="text-[#EF4444]">*</span></div>
                <TgSelect :key="`ws-mod-${wsModOptions.length}`" :model-value="vehicleForm.wheelModification"
                  :options="wsModOptions" :searchable="true" :disabled="!vehicleForm.wheelYear || wsLoadingStage === 4"
                  :placeholder="!vehicleForm.wheelYear ? t('common.selectYearFirst') : wsLoadingStage === 4 ? t('common.loading') : t('customOrder.phSelectMod')"
                  @update:model-value="onWheelModificationChange" />
              </div>
            </template>
            <template v-else>
              <div>
                <div class="mb-2 text-3.5 font-600">{{ t('customOrder.brand') }}</div>
                <TgSelect v-model="vehicleForm.brand" :options="staticBrandOptions" :searchable="false"
                  placeholder="Audi" />
              </div>
              <div>
                <div class="mb-2 text-3.5 font-600">{{ t('customOrder.model') }}</div>
                <TgSelect v-model="vehicleForm.model" :options="staticModelOptions" :searchable="false"
                  :placeholder="t('customOrder.phSelectModelStatic')" />
              </div>
            </template>
            <div>
              <div class="mb-2 text-3.5 font-600">{{ t('customOrder.forged') }}</div>
              <TgSelect v-model="vehicleForm.forged" :options="yesNoOptions" :searchable="false" :placeholder="t('customOrder.forgedPh')" />
            </div>
          </div>

          <div v-if="vehicleExpanded" class="space-y-3">
            <div>
              <div class="mb-2 text-3.5 font-600">{{ t('customOrder.vin') }}</div>
              <input v-model="vehicleForm.vin" type="text" :placeholder="t('common.pleaseEnter')"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
            </div>
            <div>
              <div class="mb-2 text-3.5 font-600">{{ t('customOrder.chassis') }}</div>
              <input v-model="vehicleForm.plate" type="text" :placeholder="t('customOrder.platePlaceholder')"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
            </div>
            <div>
              <div class="mb-2 text-3.5 font-600">{{ t('customOrder.caliper') }}</div>
              <input v-model="vehicleForm.rimThickness" type="text" :placeholder="t('customOrder.caliperPh')"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
            </div>
          </div>

          <button type="button" class="mx-auto flex items-center gap-1 text-3.5 font-600 text-[#3487FF]"
            @click="vehicleExpanded = !vehicleExpanded">
            <Icon :icon="vehicleExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'" color="#3487FF" width="16"
              height="16" />
            <span>{{ vehicleExpanded ? t('common.collapse') : t('common.expand') }}</span>
          </button>


          <div class="flex items-center gap-2">
            <TgSwitch v-model="vehicleForm.mirrorPair" aria-label="toggle same wheel config" />
            <div class="text-3.5 font-600">{{ t('customOrder.sameFrontRear') }}</div>
          </div>

          <div class="space-y-3">
            <div class="text-4 font-700">{{ t('customOrder.front') }}</div>
            <div v-for="field in frontWheelFields" :key="field.key">
              <div class="mb-2 text-3.5 font-600">{{ field.label }}</div>

              <TgSelect v-if="field.type === 'select'"
                v-model="(vehicleForm as unknown as Record<string, string | number>)[field.key]" :options="field.options"
                :searchable="false" :placeholder="field.placeholder" />

              <div v-else-if="field.type === 'pcd'" class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <input v-model="vehicleForm.frontPcdLeft" type="text"
                  class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
                <span class="text-4 text-[#6B7280]">x</span>
                <input v-model="vehicleForm.frontPcdRight" type="text"
                  class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
              </div>

              <input v-else v-model="vehicleForm[field.key as keyof typeof vehicleForm]" type="text"
                :placeholder="field.placeholder"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
            </div>
          </div>

          <div v-if="!vehicleForm.mirrorPair" class="space-y-3">
            <div class="border-t border-dashed border-[#E5E7EB] pt-4 text-4 font-700">{{ t('customOrder.rear') }}</div>
            <div v-for="field in rearWheelFields" :key="field.key">
              <div class="mb-2 text-3.5 font-600">{{ field.label }}</div>

              <TgSelect v-if="field.type === 'select'"
                v-model="(vehicleForm as unknown as Record<string, string | number>)[field.key]" :options="field.options"
                :searchable="false" :placeholder="field.placeholder" />

              <div v-else-if="field.type === 'pcd'" class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <input v-model="vehicleForm.rearPcdLeft" type="text"
                  class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
                <span class="text-4 text-[#6B7280]">x</span>
                <input v-model="vehicleForm.rearPcdRight" type="text"
                  class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
              </div>

              <input v-else v-model="vehicleForm[field.key as keyof typeof vehicleForm] " type="text"
                :placeholder="field.placeholder"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
            </div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'creative'" class="outline-none">
        <div class="space-y-4 px-4 py-4">
          <div class="grid grid-cols-2 gap-3">
            <button v-for="item in designModeOptions" :key="item.id" type="button"
              class="rounded-2xl border px-4 py-5 text-left transition"
              :class="creativeForm.designMode === item.id ? 'border-[#88AEE4] bg-[#EFF5FF] shadow-[inset_0_0_0_1px_rgba(136,174,228,0.25)]' : 'border-[#ECECEC] bg-white'"
              @click="handelOutline(item, 0)">
              <Icon :icon="item.icon" width="22" height="22" class="text-[#6B7280]" />
              <div class="mt-4 text-4 font-700">{{ item.title }}</div>
            </button>
          </div>

          <div>
            <div class="mb-3 text-4 font-700">{{ t('customOrder.structure') }}</div>
            <div class="grid grid-cols-2 gap-3">
              <button v-for="item in structureValues" :key="item" type="button"
                class="rounded-2xl border px-4 py-5 text-left text-4 font-700 transition"
                :class="creativeForm.structure === item ? 'border-[#88AEE4] bg-[#EFF5FF] text-[#1F2937]' : 'border-[#ECECEC] bg-white text-[#4B5563]'"
                @click="handelOutline(item, 1)">
                {{ structureLabel(item) }}
              </button>
            </div>
          </div>

          <template v-if="creativeForm.designMode === 'creative'">
            <div class="rounded-3xl bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div class="flex gap-3">
                <div class="h-24 w-24 overflow-hidden rounded-2xl bg-[#111111]">
                  <img src="@/assets/vue.svg" class="h-full w-full object-contain p-3" alt="">
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-4 font-700">WL-M-053</div>
                  <div class="mt-1 text-3 text-[#6B7280]">
                    <template v-if="creativeForm.structure">{{ structureLabel(creativeForm.structure) }} | 1PC-053</template>
                    <template v-else>{{ t('customOrder.structurePh') }}</template>
                  </div>
                  <div class="mt-1 text-3 text-[#9CA3AF]">{{ t('customOrder.frontRearConfig') }}</div>
                  <div v-if="creativeForm.structure" class="mt-3 flex flex-wrap gap-2">
                    <span
                      class="inline-flex items-center rounded-full bg-[#EFF5FF] px-2.5 py-1 text-3 font-600 text-[#4478C8]">{{ t('customOrder.yType') }}</span>
                    <span
                      class="inline-flex items-center rounded-full bg-[#EFF5FF] px-2.5 py-1 text-3 font-600 text-[#4478C8]">{{
                      structureLabel(creativeForm.structure) }}</span>
                  </div>
                </div>
              </div>
              <button type="button" class="mt-3 inline-flex items-center gap-1 text-3.5 font-600 text-[#6B7280]">
                <Icon icon="mdi:refresh" width="16" height="16" />
                <span>{{ t('customOrder.reselect') }}</span>
              </button>
            </div>

            <div>
              <div class="text-4 font-700">{{ t('customOrder.wheelColor') }}</div>
              <div class="mt-4 overflow-hidden rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div v-if="selectedFinishPreview?.image_url" class="h-42 w-full overflow-hidden bg-[#F3F4F6]">
                  <img :src="selectedFinishPreview.image_url" class="h-full w-full object-contain" alt="" />
                </div>
                <div v-else class="h-42 w-full">
                  <img src="@/assets/vue.svg" class="h-full w-full object-contain opacity-80" alt=""
                    v-if="creativeForm.structure != '越野'">
                </div>
                <div v-if="finishCardLoadError"
                  class="mt-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-2 py-1.5 text-3 text-[#B91C1C]">
                  {{ finishCardLoadError }}
                </div>
                <div v-else-if="finishCardLoading" class="mt-2 text-center text-3 text-[#9CA3AF]">
                  {{ t('common.loading') }}
                </div>
                <div class="mt-4 flex flex-wrap justify-around gap-3 text-3 text-[#6B7280]">
                  <button v-for="(g, i) in groupsWithItems" :key="`${g.sort}-${g.section_name}`" type="button"
                    class="border-b pb-1" :class="selectedFinishGroupIndex === i
                      ? 'border-[#2A2C33] text-[#111827]' : 'border-transparent'
                    " :disabled="finishCardLoading" @click="selectFinishGroup(i)">
                    {{ finishSectionLabel(g) }}
                  </button>
                </div>
                <div class="mt-4 text-center text-4 font-700">
                  {{ t('customOrder.sampleName') }}
                </div>
                <div class="mt-4 flex max-h-50 flex-wrap items-center justify-center gap-3 overflow-y-auto">
                  <button v-for="item in currentFinishItems" :key="item.id" type="button"
                    class="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border transition"
                    :class="creativeForm.finishCardId === item.id
                      ? 'border-[#2A2C33] shadow-[0_0_0_3px_white,0_0_0_4px_#2A2C33]' : 'border-[#D1D5DB]'
                    " :disabled="finishCardLoading" :title="finishItemDisplayLabel(item)" @click="applyFinishSelection(item)">
                    <img v-if="item.image_url" :src="item.image_url" class="h-full w-full object-cover" alt="" />
                    <span v-else
                      class="flex h-full w-full items-center justify-center bg-[#E5E7EB] text-2.5 text-[#6B7280]">
                      {{ item.code.length > 4 ? item.code.slice(0, 4) : item.code }}
                    </span>
                  </button>
                </div>
                <p v-if="!finishCardLoading && !currentFinishItems.length" class="mt-2 text-center text-3 text-[#9CA3AF]">
                  {{ t('customOrder.emptyFinishSwatches') }}
                </p>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="space-y-4">
              <div>
                <div class="mb-2 text-3.5 font-600">{{ t('customOrder.wheelShape') }}</div>
                <div class="w-26 h-26">
                  <TgFilepond
                    v-model="creativeForm.wheelShapeFile"
                    v-model:uploaded-url="creativeForm.wheelShapeUrl"
                    :upload-form-fields="{ scene: 'orders' }"
                    accept="image/*"
                    aria-label="upload wheel shape" />
                </div>
              </div>

              <div>
                <div class="mb-2 text-3.5 font-600">{{ t('customOrder.wheelShapeDesc') }}</div>
                <input v-model="creativeForm.wheelShapeNote" type="text"
                  class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
              </div>

              <div class="border-t border-[#F1F3F5] pt-4">
                <div class="mb-2 text-3.5 font-600">{{ t('customOrder.wheelLip') }}</div>
                <div class="w-26 h-26">
                  <TgFilepond
                    v-model="creativeForm.wheelLipFile"
                    v-model:uploaded-url="creativeForm.wheelLipUrl"
                    :upload-form-fields="{ scene: 'orders' }"
                    accept="image/*"
                    aria-label="upload wheel lip" />
                </div>
              </div>

              <div>
                <div class="mb-2 text-3.5 font-600">{{ t('customOrder.wheelColorDesc') }}</div>
                <input v-model="creativeForm.wheelColorNote" type="text"
                  class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
              </div>
            </div>
          </template>

          <div class="mt-4 flex flex-col gap-4">
            <div class="border-t border-[#F1F3F5] pt-4">
              <div class="mb-2 text-3.5 font-600">{{ t('customOrder.centerCap') }}</div>
              <div class="w-26 h-26">
                <TgFilepond
                    v-model="creativeForm.centerCapFile"
                    v-model:uploaded-url="creativeForm.centerCapUrl"
                    :upload-form-fields="{ scene: 'orders' }"
                    accept="image/*"
                    aria-label="upload center cap" />
              </div>
            </div>

            <div>
              <div class="mb-2 text-3.5 font-600">{{ t('customOrder.centerCapDesc') }}</div>
              <input v-model="creativeForm.centerCapNote" type="text"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
            </div>

            <div>
              <div class="mb-2 text-3.5 font-600">{{ t('customOrder.special') }}</div>
              <textarea v-model="creativeForm.specialRequest" rows="4" :placeholder="t('customOrder.specialPh')"
                class="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-3.5 outline-none placeholder:text-[#B6BBC5]" />
            </div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'address'" class="outline-none">
        <div class="space-y-3 px-4 py-4">
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.name') }}</div>
            <input v-model="addressForm.name" type="text" :placeholder="t('common.pleaseEnter')"
              class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.phone') }}</div>
            <input v-model="addressForm.phone" type="text" :placeholder="t('common.pleaseEnter')"
              class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.email') }}</div>
            <input v-model="addressForm.email" type="text" :placeholder="t('common.pleaseEnter')"
              class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.country') }}</div>
            <TgSelect v-model="addressForm.country" :options="countryOptions" :searchable="false"
              placeholder="Russia" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.shipAddr') }}</div>
            <textarea v-model="addressForm.address" rows="4" :placeholder="t('common.pleaseEnter')"
              class="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-3.5 outline-none placeholder:text-[#B6BBC5]" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.coupon') }}</div>
            <input v-model="addressForm.coupon" type="text" :placeholder="t('common.pleaseEnter')"
              class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.remark') }}</div>
            <textarea v-model="addressForm.remark" rows="4" :placeholder="t('common.pleaseEnter')"
              class="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-3.5 outline-none placeholder:text-[#B6BBC5]" />
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'amount'" class="outline-none">
        <div class="space-y-4 px-4 py-6">
          <div class="text-4 font-700">{{ t('customOrder.amountTitle') }}</div>
          <div class="text-3 text-[#9CA3AF]">{{ t('customOrder.amountHint') }}</div>
          <div
            class="space-y-3 rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div>
              <div class="mb-2 text-3.5 font-600">{{ t('customOrder.total') }} <span class="text-[#EF4444]">*</span></div>
              <input v-model="amountForm.basePrice" type="text" inputmode="decimal" :placeholder="t('customOrder.numberPh')"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
            </div>
            <div>
              <div class="mb-2 text-3.5 font-600">{{ t('customOrder.currency') }} <span class="text-[#EF4444]">*</span></div>
              <TgSelect v-model="amountForm.currency" :options="currencyOptions" :searchable="false"
                :placeholder="t('common.pleaseSelect')" />
            </div>
          </div>
          <div v-if="orderSubmitError"
            class="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-3.5 text-[#B91C1C]">
            {{ orderSubmitError }}
          </div>
          <div v-else-if="orderSubmitOk"
            class="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-3.5 text-[#166534]">
            {{ t('customOrder.preorderOk') }}
          </div>
        </div>
      </div>
    </div>

    <NModal v-model:show="openOutline" preset="card" :style="{ maxWidth: 'min(90vw, 450px)' }" :mask-closable="true"
      :closable="true">
      <template #header>
        <div class="text-center text-[17px] font-semibold">
          {{ t('common.tip') }}
        </div>
      </template>
      <div class="text-sm text-[#4B5563] leading-normal">
        {{
          types === 0
            ? t('customOrder.outlineDesign')
            : t('customOrder.outlineStructure')
        }}
      </div>
      <template #footer>
        <div class="mt-2 flex w-full justify-between gap-3">
          <TgButton class="!min-w-0 flex-1" variant="outline" type="button" @click="openOutline = false">
            {{ t('common.cancel') }}
          </TgButton>
          <TgButton class="!min-w-0 flex-1" type="button" @click="handelSublitOutline">
            {{ t('common.confirm') }}
          </TgButton>
        </div>
      </template>
    </NModal>

    <div
      class="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-[#ECECEC] bg-white px-4 py-4">
      <div v-if="activeTab === 'vehicle'">
        <TgButton block  @click="goNextFromVehicle">
          {{ t('customOrder.footVehicle') }}
        </TgButton>
      </div>

      <div v-else-if="activeTab === 'creative'" class="grid grid-cols-2 gap-3">
        <TgButton block variant="outline" @click="goBackToVehicle">
          {{ t('customOrder.footCreative1') }}
        </TgButton>
        <TgButton block variant="primary" @click="goFromCreativeToAddress">
          {{ t('customOrder.footCreative2') }}
        </TgButton>
      </div>

      <div v-else-if="activeTab === 'address'" class="grid grid-cols-2 gap-3">
        <TgButton block variant="outline" @click="goBackToCreative">
          {{ t('customOrder.footAddr1') }}
        </TgButton>
        <TgButton block variant="primary" @click="goToAmount">
          {{ t('customOrder.footAddr2') }}
        </TgButton>
      </div>

      <div v-else class="grid grid-cols-2 gap-3">
        <TgButton block variant="outline" @click="goBackToCreative">
          {{ t('customOrder.backEdit') }}
        </TgButton>
        <TgButton block variant="primary" :disabled="orderSubmitting" @click="submitPreorder">
          {{ orderSubmitting ? t('common.submitting') : t('customOrder.submit') }}
        </TgButton>
      </div>
    </div>
  </div>
</template>
