/**
 * CustomOrder 页的 Composable：路由 / pageRoot 滚动 / Naive Message、Provide。
 *
 * 表单与联动状态在 `useCustomOrderStore()`（Pinia）；本子组件仅衔接接口与侧效应。
 *
 * `index.vue`：`useCustomOrderSetup(pageRoot)`；Tab 子组件 `useCustomOrderContext()` 注入合并后的 ctx。
 */

import { computed, nextTick, onMounted, provide, reactive, toRef, watch, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { t, uiLocale } from '@/i18n/uiI18n'
import { useCustomOrderStore } from '@/stores/customOrder'
import {
  buildCreateOrderFromCustomOrder,
  createOrder,
  updateOrder,
  fetchOrderDetail,
  parseWheelLibraryStructureSubtypeOffroad,
} from '@/api/orders'
import {
  applyOrderDetailToCustomOrderForms,
  brandModelLabelsFromDetail,
  findSelectValue,
  orderIdFromRouteQuery,
} from '@/utils/applyOrderDetailToCustomOrder'
import { loadMyVehicleSelection } from '@/utils/myVehicleStorage'
import {
  isRequiredWheelFieldKey,
  validateVehicleRequired,
  validateWheelSizeAndFinish,
} from '@/utils/customOrderValidation'
import type { OrderTab } from './models'
import { CUSTOM_ORDER_INJECTION_KEY, type CustomOrderPageInstance } from './customOrderContext'

/** 订单详情里各种 `unknown` 字段转字符串，用于与 Wheel-Size 选项匹配 */
function strU(v: unknown) {
  return v == null ? '' : String(v)
}

/** 创建/更新接口返回的 `order` 中取主键（兼容 `id` / `order_id`） */
function orderIdFromApiPayload(order: Record<string, unknown>): string | null {
  const raw = order.id ?? order.order_id
  if (raw == null || raw === '') return null
  return String(raw)
}

/** 切 Tab / 下一步后滚到页面顶部（同时滚 window 与 document，兼容不同布局） */
function scrollToPageRoot(pageRoot: Ref<HTMLElement | null | undefined>) {
  void nextTick(() => {
    pageRoot.value?.scrollTo?.({ top: 0, left: 0, behavior: 'smooth' })
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    if (typeof document !== 'undefined') {
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
  })
}

/**
 * `storeToRefs` 会跳过非 ref/reactive/computed 的字段（见 pinia `storeToRefs` 实现）。
 * 否则 `wheelSizeEnabled` 等缺失会导致 `v-if` 走错分支；`structureValues` / `countryOptions` 等会变为 undefined。
 */
function piniaSkippedStateToRefs(store: ReturnType<typeof useCustomOrderStore>) {
  return {
    wheelSizeEnabled: toRef(store, 'wheelSizeEnabled'),
    staticBrandOptions: toRef(store, 'staticBrandOptions'),
    staticModelOptions: toRef(store, 'staticModelOptions'),
    countryOptions: toRef(store, 'countryOptions'),
    structureValues: toRef(store, 'structureValues'),
  }
}

/** Pinia setup store 上的方法需显式挂到 `reactive` ctx，模板才能与 ref 一并正确解包 */
function pickStoreMethods(store: ReturnType<typeof useCustomOrderStore>) {
  return {
    structureLabel: store.structureLabel,
    finishSectionLabel: store.finishSectionLabel,
    finishItemDisplayLabel: store.finishItemDisplayLabel,
    styleModelCoverUrl: store.styleModelCoverUrl,
    onStyleModelConfirm: store.onStyleModelConfirm,
    loadFinishCards: store.loadFinishCards,
    applyFinishSelection: store.applyFinishSelection,
    selectFinishGroup: store.selectFinishGroup,
    getDefaultVehicleFormState: store.getDefaultVehicleFormState,
    resetCustomOrderFormsToInitial: store.resetCustomOrderFormsToInitial,
    resetPageForNewVisit: store.resetPageForNewVisit,
    handelOutline: store.handelOutline,
    handelSublitOutline: store.handelSublitOutline,
    onPostSubmitContinue: store.onPostSubmitContinue,
    applyMyVehicleFromProfileCache: store.applyMyVehicleFromProfileCache,
    onMyVehiclePrefillCancel: store.onMyVehiclePrefillCancel,
    loadWheelMakes: store.loadWheelMakes,
    loadWheelModels: store.loadWheelModels,
    loadWheelGenerations: store.loadWheelGenerations,
    loadWheelYears: store.loadWheelYears,
    loadWheelMods: store.loadWheelMods,
    onWheelBrandChange: store.onWheelBrandChange,
    onWheelModelChange: store.onWheelModelChange,
    onWheelGenerationChange: store.onWheelGenerationChange,
    onWheelYearChange: store.onWheelYearChange,
    onWheelModificationChange: store.onWheelModificationChange,
  }
}

/**
 * @param pageRoot 根滚动容器 Ref，必须与模板根节点 `ref` 绑定以便「下一步」滚顶。
 */
export function useCustomOrderSetup(
  pageRoot: Ref<HTMLElement | null | undefined>,
): CustomOrderPageInstance {
  const message = useMessage()
  const route = useRoute()
  const router = useRouter()
  const store = useCustomOrderStore()

  const editOrderId = computed(() =>
    orderIdFromRouteQuery(route.query as Record<string, string | string[] | null | undefined>),
  )

  function openStyleModelDrawer() {
    if (!String(store.creativeForm.structure ?? '').trim()) {
      message.warning(t('customOrder.wheelStyleNeedStructure'))
      return
    }
    store.styleModelDrawerOpen = true
  }

  function onContinueFillKeepContent() {
    store.continueFillClearModalOpen = false
    store.activeTab = 'vehicle'
    scrollToPageRoot(pageRoot)
  }

  async function onContinueFillClearAll() {
    store.continueFillClearModalOpen = false
    await store.resetCustomOrderFormsToInitial()
    store.activeTab = 'vehicle'
    scrollToPageRoot(pageRoot)
  }

  function onPostSubmitViewDetail() {
    const id = store.lastSubmittedOrderId
    store.postSubmitModalOpen = false
    store.lastSubmittedOrderId = null
    if (!id) return
    void router.push({ path: '/OrderDetails', query: { orderId: id } })
  }

  async function onMyVehiclePrefillConfirm() {
    store.myVehiclePrefillModalOpen = false
    await store.applyMyVehicleFromProfileCache()
    scrollToPageRoot(pageRoot)
  }

  function runVehicleValidators(): string | null {
    const v = validateVehicleRequired(
      store.wheelSizeEnabled,
      {
        brand: store.vehicleForm.brand,
        model: store.vehicleForm.model,
        wheelGeneration: store.vehicleForm.wheelGeneration,
        wheelYear: store.vehicleForm.wheelYear,
        wheelModification: store.vehicleForm.wheelModification,
      },
      t,
    )
    if (v) return v
    return validateWheelSizeAndFinish(
      {
        frontSize: store.vehicleForm.frontSize,
        frontPaint: store.vehicleForm.frontPaint,
        rearSize: store.vehicleForm.rearSize,
        rearPaint: store.vehicleForm.rearPaint,
        mirrorPair: store.vehicleForm.mirrorPair,
      },
      t,
    )
  }

  function goNextFromVehicle() {
    const err = runVehicleValidators()
    if (err) {
      message.warning(err)
      return
    }
    store.activeTab = 'creative'
    scrollToPageRoot(pageRoot)
  }

  function goFromCreativeToAddress() {
    const err = runVehicleValidators()
    if (err) {
      message.warning(err)
      return
    }
    if (!String(store.creativeForm.structure ?? '').trim()) {
      message.warning(t('customOrder.errMissingStructure'))
      return
    }
    store.activeTab = 'address'
    scrollToPageRoot(pageRoot)
  }

  function goBackToVehicle() {
    store.activeTab = 'vehicle'
  }

  function goBackToCreative() {
    store.activeTab = 'creative'
  }

  function goToAmount() {
    store.activeTab = 'amount'
    scrollToPageRoot(pageRoot)
  }

  const tabOrder: OrderTab[] = ['vehicle', 'creative', 'address', 'amount']

  function tabIndex(tab: OrderTab): number {
    return tabOrder.indexOf(tab)
  }

  /** 顶部 Tab：前进时与底部「下一步」相同校验；返回上一步不校验 */
  function trySelectTab(next: OrderTab) {
    if (next === store.activeTab) return
    const curI = tabIndex(store.activeTab)
    const nextI = tabIndex(next)
    if (nextI < curI) {
      store.activeTab = next
      scrollToPageRoot(pageRoot)
      return
    }
    const err = runVehicleValidators()
    if (err) {
      message.warning(err)
      return
    }
    if (nextI >= tabIndex('address')) {
      if (!String(store.creativeForm.structure ?? '').trim()) {
        message.warning(t('customOrder.errMissingStructure'))
        return
      }
    }
    store.activeTab = next
    scrollToPageRoot(pageRoot)
  }

  async function hydrateFromOrderId(orderId: string) {
    store.orderEditLoading = true
    store.orderEditError = ''
    try {
      const d = await fetchOrderDetail(orderId)
      const o = d as Record<string, unknown>
      if (store.wheelSizeEnabled) {
        if (!store.wsBrandOptions.length) await store.loadWheelMakes()
        const { brand: bLabel, model: mLabel } = brandModelLabelsFromDetail(d)
        const bVal = findSelectValue(store.wsBrandOptions, bLabel)
        if (bVal) {
          await store.onWheelBrandChange(bVal)
          const mVal = findSelectValue(store.wsModelOptions, mLabel)
          if (mVal) {
            await store.onWheelModelChange(mVal)
            const offParsed = parseWheelLibraryStructureSubtypeOffroad(strU(o.structure_subtype_offroad))
            const genKey = offParsed.gen || strU(o.wheel_generation) || strU(o.structure_subtype_offroad)
            if (genKey) {
              const gVal = findSelectValue(store.wsGenOptions, genKey)
              if (gVal) {
                await store.onWheelGenerationChange(gVal)
                const yLabel = strU(o.year)
                if (yLabel) {
                  const yVal = findSelectValue(store.wsYearOptions, yLabel)
                  if (yVal) {
                    await store.onWheelYearChange(yVal)
                    const modKey
                      = strU(o.vehicle_model ?? o.vehicleModel) || offParsed.mod || strU(o.wheel_modification) || strU(o.modification)
                    if (modKey) {
                      const modVal = findSelectValue(store.wsModOptions, modKey)
                      if (modVal) store.onWheelModificationChange(modVal)
                    }
                  }
                }
              }
            }
          }
        }
        applyOrderDetailToCustomOrderForms(d, {
          vehicleForm: store.vehicleForm,
          creativeForm: store.creativeForm,
          addressForm: store.addressForm,
          amountForm: store.amountForm,
        }, store.countryOptions)
      } else {
        const { brand: bLabel, model: mLabel } = brandModelLabelsFromDetail(d)
        if (bLabel) {
          const v = findSelectValue(store.staticBrandOptions, bLabel)
          if (v) store.vehicleForm.brand = v
        }
        if (mLabel) {
          const v = findSelectValue(store.staticModelOptions, mLabel)
          if (v) store.vehicleForm.model = v
        }
        applyOrderDetailToCustomOrderForms(d, {
          vehicleForm: store.vehicleForm,
          creativeForm: store.creativeForm,
          addressForm: store.addressForm,
          amountForm: store.amountForm,
        }, store.countryOptions)
      }
    } catch (e) {
      store.orderEditError = e instanceof Error ? e.message : String(e)
    } finally {
      store.orderEditLoading = false
    }
  }

  async function submitPreorder() {
    store.orderSubmitError = ''
    store.postSubmitModalOpen = false
    const veh = validateVehicleRequired(
      store.wheelSizeEnabled,
      {
        brand: store.vehicleForm.brand,
        model: store.vehicleForm.model,
        wheelGeneration: store.vehicleForm.wheelGeneration,
        wheelYear: store.vehicleForm.wheelYear,
        wheelModification: store.vehicleForm.wheelModification,
      },
      t,
    )
    if (veh) {
      store.orderSubmitError = veh
      return
    }
    const wheelErr = validateWheelSizeAndFinish(
      {
        frontSize: store.vehicleForm.frontSize,
        frontPaint: store.vehicleForm.frontPaint,
        rearSize: store.vehicleForm.rearSize,
        rearPaint: store.vehicleForm.rearPaint,
        mirrorPair: store.vehicleForm.mirrorPair,
      },
      t,
    )
    if (wheelErr) {
      store.orderSubmitError = wheelErr
      return
    }
    if (!String(store.amountForm.basePrice).trim()) {
      store.orderSubmitError = t('customOrder.errTotal')
      return
    }
    if (!String(store.amountForm.currency).trim()) {
      store.orderSubmitError = t('customOrder.errCurrency')
      return
    }
    store.orderSubmitting = true
    try {
      if (store.creativeForm.wheelShapeFile && !String(store.creativeForm.wheelShapeUrl).trim())
        throw new Error(t('customOrder.errWheelUpload'))
      if (store.creativeForm.wheelLipFile && !String(store.creativeForm.wheelLipUrl).trim())
        throw new Error(t('customOrder.errLipUpload'))
      if (store.creativeForm.centerCapFile && !String(store.creativeForm.centerCapUrl).trim())
        throw new Error(t('customOrder.errCapUpload'))

      const body = buildCreateOrderFromCustomOrder({
        vehicle: { ...store.vehicleForm },
        creative: { ...store.creativeForm },
        address: { ...store.addressForm },
        amount: { ...store.amountForm },
        brandOptions: store.preorderBrandOptions,
        modelOptions: store.preorderModelOptions,
        countryOptions: store.countryOptions,
        wheelGenOptions: store.wheelSizeEnabled ? store.wsGenOptions : undefined,
        wheelYearOptions: store.wheelSizeEnabled ? store.wsYearOptions : undefined,
        wheelModOptions: store.wheelSizeEnabled ? store.wsModOptions : undefined,
      })
      const oid = editOrderId.value
      if (oid) {
        const res = await updateOrder(oid, body)
        if (!res?.order) throw new Error(t('customOrder.errUpdate'))
        await router.replace({ path: '/OrderDetails', query: { orderId: String(oid) } })
        return
      }
      const res = await createOrder(body)
      if (!res?.order) throw new Error(t('customOrder.errCreate'))
      const newId = orderIdFromApiPayload(res.order as Record<string, unknown>)
      if (!newId) throw new Error(t('customOrder.errCreate'))
      store.lastSubmittedOrderId = newId
      store.postSubmitModalOpen = true
    } catch (e) {
      store.orderSubmitError = e instanceof Error ? e.message : String(e)
    } finally {
      store.orderSubmitting = false
    }
  }

  onMounted(() => {
    void (async () => {
      await store.resetPageForNewVisit()
      if (store.wheelSizeEnabled) await store.loadWheelMakes()
      await store.loadFinishCards()
      const oid = orderIdFromRouteQuery(route.query as Record<string, string | string[] | null | undefined>)
      if (oid) {
        await hydrateFromOrderId(oid)
        return
      }
      const cached = loadMyVehicleSelection()
      if (cached && (cached.brand || cached.model || cached.year))
        store.myVehiclePrefillModalOpen = true
    })()
  })

  watch(
    () => orderIdFromRouteQuery(route.query as Record<string, string | string[] | null | undefined>),
    (id, oldId) => {
      if (!id) return
      if (id === oldId) return
      void hydrateFromOrderId(id)
    },
  )

  const ctx = reactive({
    t,
    uiLocale,
    message,
    ...piniaSkippedStateToRefs(store),
    ...storeToRefs(store),
    ...pickStoreMethods(store),
    openStyleModelDrawer,
    onContinueFillKeepContent,
    onContinueFillClearAll,
    onPostSubmitViewDetail,
    onMyVehiclePrefillConfirm,
    editOrderId,
    trySelectTab,
    hydrateFromOrderId,
    goNextFromVehicle,
    goFromCreativeToAddress,
    goBackToVehicle,
    goBackToCreative,
    goToAmount,
    submitPreorder,
    isRequiredWheelFieldKey,
  }) as CustomOrderPageInstance

  provide(CUSTOM_ORDER_INJECTION_KEY, ctx)

  return ctx
}
