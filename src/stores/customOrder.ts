/**
 * 定制下单页（CustomOrder）共享状态：四步表单、Wheel-Size 联动、色卡与 Tab/弹层。
 * 逻辑仍由 `useCustomOrderSetup` 衔接路由 / `pageRoot` / Message；Tab 可直接 `useCustomOrderStore()`。
 */
import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { fetchFinishCards } from '@/api/finishCards'
import type { FinishCardGroup, FinishCardItem } from '@/api/finishCards'
import type { StyleModelItem } from '@/api/styleModels'
import { resolveOrderAssetUrl } from '@/utils/orderMedia'
import { getTelegramDisplayName, getTelegramUserId } from '@/utils/userTelegram'
import { readStaffCustomerDisplayName, readStaffCustomerTelegramId } from '@/utils/deeplinkStaffContext'
import { isWheelSizeEnabled } from '@/api/wheelsline-size'
import {
  buildFinishOrderNote,
  buildWheelColorSelectionDesc,
  finishItemDisplayLabel,
  finishSectionLabel as finishSectionLabelFromLocale,
} from '@/utils/finishCardDisplayHelpers'
import { findSelectValue } from '@/utils/applyOrderDetailToCustomOrder'
import { loadMyVehicleSelection } from '@/utils/myVehicleStorage'
import { buildWheelFieldsList } from '@/pages/CustomOrder/wheelFields'
import type { SelectOptionLite } from '@/pages/CustomOrder/useWheelSizeCascade'
import { useWheelSizeCascade } from '@/pages/CustomOrder/useWheelSizeCascade'
import type { OrderTab } from '@/pages/CustomOrder/models'
import type { VehicleFormState } from '@/pages/CustomOrder/models'
import { t, uiLocale } from '@/i18n/uiI18n'
import { currenciesToSelectOptions } from '@/constants/currencies'

interface SelectOption extends SelectOptionLite {}

function resolveInitialCustomerName(): string {
  return readStaffCustomerDisplayName().trim() || getTelegramDisplayName()
}

/** 客户 ID：代客深链时用参数里的客户 telegram；否则为当前打开者 Telegram id（直接进创建页与昵称一致） */
function resolveInitialCustomerId(): string {
  const staffCustomer = readStaffCustomerTelegramId().trim()
  if (staffCustomer) return staffCustomer
  return (getTelegramUserId() || '').trim()
}

function createInitialVehicleForm(wheelSizeEnabled: boolean): VehicleFormState {
  return {
    customerName: resolveInitialCustomerName(),
    customerId: resolveInitialCustomerId(),
    brand: wheelSizeEnabled ? '' : 'audi',
    model: wheelSizeEnabled ? '' : 'a5',
    wheelGeneration: '',
    wheelYear: '',
    wheelModification: '',
    brakeDisc: '',
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
    rimThickness: '',
  }
}

export const useCustomOrderStore = defineStore('customOrder', () => {
  const wheelSizeEnabled = isWheelSizeEnabled()

  const vehicleForm = reactive<VehicleFormState>(createInitialVehicleForm(wheelSizeEnabled))

  const cascade = useWheelSizeCascade(wheelSizeEnabled, vehicleForm)

  const creativeForm = reactive({
    designMode: 'creative',
    structure: '' as string,
    finishCardId: null as number | null,
    finishCardOrderNote: '',
    finishCardImageUrl: '',
    finishCardImagePath: '',
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
    selectedStyleModel: null as StyleModelItem | null,
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

  const staticBrandOptions: SelectOption[] = [
    { value: 'audi', label: 'Audi' },
    { value: 'bmw', label: 'BMW' },
    { value: 'benz', label: 'Benz' },
  ]

  const staticModelOptions: SelectOption[] = [
    { value: 'a5', label: 'A5(F5/2016-2020)/D9SSEL 2.0T 14 188HP' },
    { value: 'a4', label: 'A4(B9/2020-2024)/45 TFSI' },
  ]

  const preorderBrandOptions = computed<SelectOption[]>(() =>
    wheelSizeEnabled ? cascade.wsBrandOptions.value : staticBrandOptions,
  )

  const preorderModelOptions = computed<SelectOption[]>(() =>
    wheelSizeEnabled ? cascade.wsModelOptions.value : staticModelOptions,
  )

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

  const styleModelDrawerOpen = ref(false)

  function finishSectionLabel(g: FinishCardGroup): string {
    return finishSectionLabelFromLocale(g, uiLocale.value)
  }

  function wrapFinishItemDisplayLabel(item: FinishCardItem): string {
    return finishItemDisplayLabel(item, uiLocale.value)
  }

  function finishGroupContainingItem(item: FinishCardItem): FinishCardGroup | undefined {
    return finishCardGroups.value.find(g => (g.items ?? []).some(i => i.id === item.id))
  }

  function applyFinishSelection(item: FinishCardItem) {
    creativeForm.finishCardId = item.id
    creativeForm.finishCardOrderNote = buildFinishOrderNote(item, uiLocale.value)
    creativeForm.finishCardImageUrl = (item.image_url && String(item.image_url).trim()) || ''
    creativeForm.finishCardImagePath = (item.image_path && String(item.image_path).trim()) || ''
    creativeForm.wheelColorSelectionDesc = buildWheelColorSelectionDesc(item, finishGroupContainingItem(item), uiLocale.value)
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

  function getDefaultVehicleFormState(): VehicleFormState {
    return createInitialVehicleForm(wheelSizeEnabled)
  }

  async function resetCustomOrderFormsToInitial() {
    await cascade.onWheelBrandChange('')
    Object.assign(vehicleForm, getDefaultVehicleFormState())
    Object.assign(creativeForm, {
      designMode: 'creative' as const,
      structure: '',
      finishCardId: null as number | null,
      finishCardOrderNote: '',
      finishCardImageUrl: '',
      finishCardImagePath: '',
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
      selectedStyleModel: null as StyleModelItem | null,
    })
    Object.assign(addressForm, {
      name: '',
      phone: '',
      email: '',
      country: 'russia',
      address: '',
      coupon: '',
      remark: '',
    })
    Object.assign(amountForm, { basePrice: '', currency: '' })
    vehicleExpanded.value = false
    styleModelDrawerOpen.value = false
    orderSubmitError.value = ''
    await loadFinishCards()
  }

  /**
   * 每次进入 `/CustomOrder` 路由时重置（Pinia 单例需显式清空，等同旧版「新组件实例」）。
   * 不拉色卡；由 `useCustomOrderSetup` onMounted 再 `loadWheelMakes` / `loadFinishCards`。
   */
  async function resetPageForNewVisit() {
    await cascade.onWheelBrandChange('')
    Object.assign(vehicleForm, getDefaultVehicleFormState())
    Object.assign(creativeForm, {
      designMode: 'creative' as const,
      structure: '',
      finishCardId: null as number | null,
      finishCardOrderNote: '',
      finishCardImageUrl: '',
      finishCardImagePath: '',
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
      selectedStyleModel: null as StyleModelItem | null,
    })
    Object.assign(addressForm, {
      name: '',
      phone: '',
      email: '',
      country: 'russia',
      address: '',
      coupon: '',
      remark: '',
    })
    Object.assign(amountForm, { basePrice: '', currency: '' })
    finishCardGroups.value = []
    allFinishItems.value = []
    selectedFinishGroupIndex.value = 0
    vehicleExpanded.value = false
    styleModelDrawerOpen.value = false
    activeTab.value = 'vehicle'
    openOutline.value = false
    postSubmitModalOpen.value = false
    myVehiclePrefillModalOpen.value = false
    continueFillClearModalOpen.value = false
    lastSubmittedOrderId.value = null
    orderEditLoading.value = false
    orderEditError.value = ''
    orderSubmitError.value = ''
  }

  function styleModelCoverUrl(path: string) {
    const u = String(path ?? '').trim()
    if (!u) return ''
    return resolveOrderAssetUrl(u) || u
  }

  function onStyleModelConfirm(item: StyleModelItem) {
    creativeForm.selectedStyleModel = item
  }

  const currencyOptions = computed<SelectOption[]>(() => currenciesToSelectOptions())

  const selectedFinishPreview = computed(() => {
    const id = creativeForm.finishCardId
    if (id == null) return null
    return allFinishItems.value.find(x => x.id === id) ?? null
  })

  const orderSubmitting = ref(false)
  const orderSubmitError = ref('')

  const countryOptions: SelectOption[] = [
    { value: 'russia', label: 'Russia' },
    { value: 'germany', label: 'Germany' },
    { value: 'uae', label: 'UAE' },
  ]

  const holeOptions = computed<SelectOption[]>(() => [
    { value: '锥口', label: t('wheel.holeConical') },
    { value: '平口', label: t('wheel.holeFlat') },
    { value: '球口', label: t('wheel.holeBall') },
  ])

  const oemBoltTypeOptions = computed<SelectOption[]>(() => [
    { value: '原厂螺丝', label: t('customOrder.oemBoltOem') },
    { value: '改装螺丝', label: t('customOrder.oemBoltAftermarket') },
  ])

  const frontWheelFields = computed(() =>
    buildWheelFieldsList({
      prefix: 'front',
      sizeOptions: sizeOptions.value,
      holeOptions: holeOptions.value,
      oemBoltTypeOptions: oemBoltTypeOptions.value,
      translate: t,
    }),
  )

  const rearWheelFields = computed(() =>
    buildWheelFieldsList({
      prefix: 'rear',
      sizeOptions: sizeOptions.value,
      holeOptions: holeOptions.value,
      oemBoltTypeOptions: oemBoltTypeOptions.value,
      translate: t,
    }),
  )

  const openOutline = ref(false)
  const orderEditLoading = ref(false)
  const orderEditError = ref('')
  const activeTab = ref<OrderTab>('vehicle')
  const vehicleExpanded = ref(false)

  const myVehiclePrefillModalOpen = ref(false)
  const postSubmitModalOpen = ref(false)
  const continueFillClearModalOpen = ref(false)
  const lastSubmittedOrderId = ref<string | null>(null)

  const OutlineValue = ref<unknown>({})
  const types = ref(0)

  function handelOutline(values: unknown, type: number) {
    if (type === 0 && creativeForm.designMode === (values as { id?: string }).id)
      return
    if (type === 1) {
      const next = typeof values === 'string' ? values : String((values as { id?: unknown })?.id ?? '')
      if (!creativeForm.structure) {
        creativeForm.structure = next
        creativeForm.selectedStyleModel = null
        return
      }
      if (creativeForm.structure === next) return
    }
    openOutline.value = true
    OutlineValue.value = values
    types.value = type
  }

  function handelSublitOutline() {
    openOutline.value = false
    if (types.value === 0) {
      creativeForm.designMode = (OutlineValue.value as { id: typeof creativeForm.designMode }).id
      creativeForm.selectedStyleModel = null
    }
    else {
      creativeForm.structure = OutlineValue.value as string
      creativeForm.selectedStyleModel = null
    }
  }

  function onPostSubmitContinue() {
    postSubmitModalOpen.value = false
    lastSubmittedOrderId.value = null
    continueFillClearModalOpen.value = true
  }

  async function applyMyVehicleFromProfileCache() {
    const cache = loadMyVehicleSelection()
    if (!cache) return
    if (wheelSizeEnabled) {
      if (!cascade.wsBrandOptions.value.length) await cascade.loadWheelMakes()
      const bVal = findSelectValue(cascade.wsBrandOptions.value, cache.brand)
      if (!bVal) return
      await cascade.onWheelBrandChange(bVal)
      const mVal = findSelectValue(cascade.wsModelOptions.value, cache.model)
      if (!mVal) return
      await cascade.onWheelModelChange(mVal)

      const wgKey = (cache.wheelGeneration ?? '').trim()
      const wyKey = (cache.wheelYear ?? '').trim()
      const wmKey = (cache.wheelModification ?? '').trim()

      if (wgKey && wyKey) {
        const gVal = findSelectValue(cascade.wsGenOptions.value, wgKey)
        if (gVal) {
          await cascade.onWheelGenerationChange(gVal)
          const yVal = findSelectValue(cascade.wsYearOptions.value, wyKey)
          if (yVal) {
            await cascade.onWheelYearChange(yVal)
            if (wmKey) {
              const modVal = findSelectValue(cascade.wsModOptions.value, wmKey)
              if (modVal)
                cascade.onWheelModificationChange(modVal)
            }
            return
          }
        }
      }

      const yLabel = cache.year.trim()
      if (!yLabel) return
      const gens = [...cascade.wsGenOptions.value]
      for (const g of gens) {
        await cascade.onWheelGenerationChange(g.value)
        const yVal = findSelectValue(cascade.wsYearOptions.value, yLabel)
        if (yVal) {
          await cascade.onWheelYearChange(yVal)
          return
        }
      }
      return
    }
    if (cache.brand.trim()) {
      const v = findSelectValue(staticBrandOptions, cache.brand.trim())
      if (v) vehicleForm.brand = v
    }
    if (cache.model.trim()) {
      const v = findSelectValue(staticModelOptions, cache.model.trim())
      if (v) vehicleForm.model = v
    }
  }

  function onMyVehiclePrefillCancel() {
    myVehiclePrefillModalOpen.value = false
  }

  return {
    wheelSizeEnabled,
    vehicleForm,
    creativeForm,
    addressForm,
    amountForm,
    staticBrandOptions,
    staticModelOptions,
    ...cascade,
    preorderBrandOptions,
    preorderModelOptions,
    sizeOptions,
    designModeOptions,
    structureValues,
    structureLabel,
    finishSectionLabel,
    finishItemDisplayLabel: wrapFinishItemDisplayLabel,
    finishCardGroups,
    finishCardLoading,
    finishCardLoadError,
    selectedFinishGroupIndex,
    groupsWithItems,
    currentFinishItems,
    tabItems,
    styleModelDrawerOpen,
    styleModelCoverUrl,
    onStyleModelConfirm,
    currencyOptions,
    selectedFinishPreview,
    orderSubmitting,
    orderSubmitError,
    countryOptions,
    holeOptions,
    oemBoltTypeOptions,
    frontWheelFields,
    rearWheelFields,
    openOutline,
    orderEditLoading,
    orderEditError,
    activeTab,
    vehicleExpanded,
    myVehiclePrefillModalOpen,
    postSubmitModalOpen,
    continueFillClearModalOpen,
    lastSubmittedOrderId,
    OutlineValue,
    types,
    loadFinishCards,
    applyFinishSelection,
    selectFinishGroup,
    getDefaultVehicleFormState,
    resetCustomOrderFormsToInitial,
    resetPageForNewVisit,
    handelOutline,
    handelSublitOutline,
    onPostSubmitContinue,
    applyMyVehicleFromProfileCache,
    onMyVehiclePrefillCancel,
  }
})
