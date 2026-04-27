<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NInput, useMessage } from 'naive-ui'
import { Icon } from '@iconify/vue'
import TgButton from '@/components/TgButton.vue'
import TgSelect from '@/components/TgSelect.vue'
import TgSwitch from '@/components/TgSwitch.vue'
import {
  buildCreateOrderFromSimpleForm,
  createOrder,
  type SimpleCreateOrderForm,
} from '@/api/orders'
import type { WheelSizeGenerationRow, WheelSizeOption } from '@/api/wheelsline-size'
import {
  fetchWheelSizeGenerations,
  fetchWheelSizeMakes,
  fetchWheelSizeModels,
  fetchWheelSizeModifications,
  isWheelSizeEnabled,
  resolveWheelSizeYearOptions,
} from '@/api/wheelsline-size'
import { t } from '@/i18n/uiI18n'
import { getTelegramWebApp } from '@/utils/userTelegram'
import { logTelegramLinkParams } from '@/utils/telegramDeepLink'
import { currenciesToSelectOptions } from '@/constants/currencies'

interface SelectOption {
  value: string | number
  label: string
}

const message = useMessage()
const route = useRoute()
const router = useRouter()
const pageRoot = ref<HTMLElement | null>(null)
const wheelSizeEnabled = isWheelSizeEnabled()

const wsBrandOptions = ref<SelectOption[]>([])
const wsModelOptions = ref<SelectOption[]>([])
const wsGenOptions = ref<SelectOption[]>([])
const wsYearOptions = ref<SelectOption[]>([])
const wsModOptions = ref<SelectOption[]>([])
const wsGenerationsCache = ref<WheelSizeGenerationRow[]>([])
const wsLoadingStage = ref<number | null>(null)
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

function labelOf(options: SelectOption[], value: string | number): string {
  return options.find(o => String(o.value) === String(value))?.label ?? String(value ?? '')
}

function getInitialFormState() {
  return {
    /** 由深链注入，仅用于提交 `telegram_id` / `first_name`，不在页上展示 */
    refUserId: '',
    refUserName: '',
    customerPhone: '',
    customerEmail: '',
    shippingAddress: '',
    country: '',
    coupon: '',
    remark: '',
    basePrice: '',
    currency: '',
    brand: '',
    model: '',
    wheelGeneration: '',
    wheelYear: '',
    wheelModification: '',
    carBrandText: '',
    carModelText: '',
    yearText: '',
    vin: '',
    chassis: '',
    styleName: '',
    brakeDisc: '',
    caliper: '',
    structure: '' as string,
    structureSubtypeSingle: '',
    sizeChoice: '',
    fDiam: '',
    appearance: '',
    rAppearance: '',
    fWidth: '',
    fEt: '',
    fPcd: '',
    fCb: '',
    fHole: '',
    fQty: '',
    fOemBolt: '',
    fNote: '',
    rDiam: '',
    rWidth: '',
    rEt: '',
    rPcd: '',
    rCb: '',
    rHole: '',
    rQty: '',
    rOemBolt: '',
    rNote: '',
  }
}

const form = reactive(getInitialFormState())

const rearSplit = ref(false)
/** 折叠：客户信息 3+更多；订单选填；前轮 3+更多；后轮 3+更多 */
const customerMoreOpen = ref(false)
const orderOptionalOpen = ref(false)
const frontMoreOpen = ref(false)
const rearMoreOpen = ref(false)
const orderSubmitting = ref(false)

const currencyOptions = computed<SelectOption[]>(() => currenciesToSelectOptions())

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

const structureOptions = computed<SelectOption[]>(() =>
  [...structureValues].map(v => ({ value: v, label: structureLabel(v) })),
)

const structureSubtypeOptions = computed<SelectOption[]>(() => [
  { value: '标准单片', label: '标准单片' },
  { value: '特殊单片', label: '特殊单片' },
])

function scrollPageTop() {
  pageRoot.value?.scrollTo({ top: 0, behavior: 'smooth' })
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  if (typeof document !== 'undefined') {
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }
}

async function resetFormAfterSuccess() {
  Object.assign(form, getInitialFormState())
  rearSplit.value = false
  customerMoreOpen.value = false
  orderOptionalOpen.value = false
  frontMoreOpen.value = false
  rearMoreOpen.value = false
  wsModelOptions.value = []
  wsGenOptions.value = []
  wsYearOptions.value = []
  wsModOptions.value = []
  wsGenerationsCache.value = []
  wsErrorKey.value = null
  if (wheelSizeEnabled) {
    void loadWheelMakes()
  } else {
    wsBrandOptions.value = []
  }
  await nextTick()
  scrollPageTop()
}

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
  form.brand = make
  form.model = ''
  form.wheelGeneration = ''
  form.wheelYear = ''
  form.wheelModification = ''
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
  form.model = model
  form.wheelGeneration = ''
  form.wheelYear = ''
  form.wheelModification = ''
  wsGenOptions.value = []
  wsYearOptions.value = []
  wsModOptions.value = []
  wsGenerationsCache.value = []
  if (!form.brand || !model) return
  await loadWheelGenerations(form.brand, model)
}

async function onWheelGenerationChange(v: string | number) {
  const slug = String(v ?? '')
  form.wheelGeneration = slug
  form.wheelYear = ''
  form.wheelModification = ''
  wsYearOptions.value = []
  wsModOptions.value = []
  if (!form.brand || !form.model || !slug) return
  await loadWheelYears(form.brand, form.model, slug)
}

async function onWheelYearChange(v: string | number) {
  const y = String(v ?? '')
  form.wheelYear = y
  form.wheelModification = ''
  wsModOptions.value = []
  if (!form.brand || !form.model || !y) return
  await loadWheelMods(form.brand, form.model, y, form.wheelGeneration)
}

function onWheelModificationChange(v: string | number) {
  form.wheelModification = String(v ?? '')
}

/** 点击提交时写入下单时间（本地日期时间） */
function orderDateAtSubmit(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function getTelegramIdentity(): { telegramId: string; telegramName: string } {
  const u = getTelegramWebApp()?.initDataUnsafe?.user
  const telegramId = u?.id != null ? String(u.id) : ''
  const telegramName = u
    ? [u.first_name, u.last_name].filter(Boolean).join(' ') || (u.username ? `@${u.username}` : '')
    : ''
  return { telegramId, telegramName }
}

/**
 * 与桌面端 `telegram_id` 隐藏域逻辑一致，**唯一**可被深链改写的提交字段就是这两个（对应 body `telegram_id` / `telegram_name`）。
 * 车辆、金额、尺寸等仍走下面 `buildFormSnapshot` 的其它项，与参数无关。
 */
function resolvePreorderTelegramFieldsForSubmit(): { telegramId: string; telegramName: string } {
  const fromWebApp = getTelegramIdentity()
  const refId = form.refUserId.trim()
  const refName = form.refUserName.trim()
  if (refId || refName) {
    return {
      telegramId: refId || fromWebApp.telegramId,
      telegramName: refName || fromWebApp.telegramName,
    }
  }
  return fromWebApp
}

function buildFormSnapshot(): SimpleCreateOrderForm {
  const { telegramId, telegramName } = resolvePreorderTelegramFieldsForSubmit()
  const specMode = rearSplit.value ? 'split' : 'same'

  let carBrand = ''
  let carModel = ''
  let yearField = ''
  const structureSubtypeOffroad = ''

  if (wheelSizeEnabled) {
    carBrand = labelOf(wsBrandOptions.value, form.brand)
    carModel = labelOf(wsModelOptions.value, form.model)
    const yLabel = labelOf(wsYearOptions.value, form.wheelYear)
    yearField = yLabel
  } else {
    carBrand = form.carBrandText.trim()
    carModel = form.carModelText.trim()
    yearField = form.yearText.trim()
  }

  return {
    telegramId,
    telegramName,
    orderDate: orderDateAtSubmit(),
    customerPhone: form.customerPhone.trim(),
    customerEmail: form.customerEmail.trim(),
    shippingAddress: form.shippingAddress.trim(),
    country: form.country.trim(),
    coupon: form.coupon.trim(),
    remark: form.remark.trim(),
    basePrice: form.basePrice,
    currency: form.currency,
    carBrand,
    carModel,
    year: yearField,
    structureSubtypeOffroad,
    wheelGeneration: form.wheelGeneration,
    wheelModification: form.wheelModification,
    vin: form.vin.trim(),
    chassis: form.chassis.trim(),
    styleName: form.styleName.trim(),
    brakeDisc: form.brakeDisc.trim(),
    caliper: form.caliper.trim(),
    structure: form.structure.trim(),
    structureSubtypeSingle: form.structureSubtypeSingle.trim(),
    specMode,
    sizeChoice: form.sizeChoice.trim(),
    fDiam: form.fDiam.trim(),
    appearance: form.appearance.trim(),
    rAppearance: form.rAppearance.trim(),
    fWidth: form.fWidth.trim(),
    fEt: form.fEt.trim(),
    fPcd: form.fPcd.trim(),
    fCb: form.fCb.trim(),
    fHole: form.fHole.trim(),
    fQty: form.fQty.trim(),
    fOemBolt: form.fOemBolt.trim(),
    fNote: form.fNote.trim(),
    rDiam: form.rDiam.trim(),
    rWidth: form.rWidth.trim(),
    rEt: form.rEt.trim(),
    rPcd: form.rPcd.trim(),
    rCb: form.rCb.trim(),
    rHole: form.rHole.trim(),
    rQty: form.rQty.trim(),
    rOemBolt: form.rOemBolt.trim(),
    rNote: form.rNote.trim(),
  }
}

function validate(): string | null {
  const self = getTelegramIdentity()
  if (!form.refUserId.trim() && !self.telegramId.trim()) return t('orderCreate.errTelegram')
  if (!form.basePrice.trim()) return t('customOrder.errTotal')
  if (!String(form.currency).trim()) return t('customOrder.errCurrency')

  if (wheelSizeEnabled) {
    if (!form.brand || !form.model || !form.wheelGeneration || !form.wheelYear || !form.wheelModification)
      return t('orderCreate.errVehicle')
  } else {
    if (!form.carBrandText.trim() || !form.carModelText.trim() || !form.yearText.trim())
      return t('orderCreate.errVehicleStatic')
  }

  if (!form.structure.trim()) return t('orderCreate.errStructure')
  const sizeOk = !!(form.sizeChoice.trim() || form.fDiam.trim() || (rearSplit.value && form.rDiam.trim()))
  if (!sizeOk) return t('orderCreate.errSize')
  if (!form.appearance.trim()) return t('orderCreate.errAppearance')
  return null
}

function orderNoFromRes(order: unknown): string {
  if (!order || typeof order !== 'object') return ''
  const o = order as Record<string, unknown>
  const n = o.order_no ?? o.orderNo ?? o.id ?? o.number
  return n != null ? String(n) : ''
}

async function submit() {
  const err = validate()
  if (err) {
    message.warning(err, { duration: 4500 })
    return
  }
  orderSubmitting.value = true
  try {
    const snap = buildFormSnapshot()
    const body = buildCreateOrderFromSimpleForm(snap)
    const res = await createOrder(body)
    if (!res?.order) throw new Error(t('customOrder.errCreate'))
    const no = orderNoFromRes(res.order)
    const okText = no
      ? `${t('orderCreate.preorderOk')} — ${t('orderCreate.orderNo')} ${no}`
      : t('orderCreate.preorderOk')
    message.success(okText, { duration: 5000 })
    await resetFormAfterSuccess()
  } catch (e) {
    message.error(
      e instanceof Error ? e.message : t('orderCreate.errSubmit') || String(e),
      { duration: 5000 },
    )
  } finally {
    orderSubmitting.value = false
  }
}

function consumeOrderRefFromQuery() {
  logTelegramLinkParams('CreateOrder.consumeOrderRefFromQuery(before read)', {
    routeQuery: { ...route.query },
  })
  const id
    = typeof route.query.uid === 'string' ? route.query.uid
      : typeof route.query.id === 'string' ? route.query.id
        : ''
  const name = typeof route.query.name === 'string' ? route.query.name : ''
  if (!id && !name) return
  if (id) form.refUserId = id
  if (name) form.refUserName = name
  const newQuery = { ...route.query }
  delete newQuery.uid
  delete newQuery.id
  delete newQuery.name
  delete newQuery.create
  void router.replace({ path: route.path, query: newQuery })
}

onMounted(() => {
  consumeOrderRefFromQuery()
  if (wheelSizeEnabled) void loadWheelMakes()
})
</script>

<template>
  <div ref="pageRoot" class="min-h-full w-full overflow-x-hidden overflow-y-auto bg-[#FAFAFA] pb-32 text-[#1F2937]">
    <div class="space-y-4 px-4 py-4 text-3.5">
      <div v-if="wsErrorKey" class="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-3.25 text-[#B91C1C]">
        {{ t(wsErrorKey) }}
      </div>

      <div class="rounded-3xl bg-white p-4 mt-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <p class="mb-3 text-3 text-[#6B7280]">
          {{ t('orderCreate.openInTg') }}
        </p>
        <div class="space-y-3">
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.phone') }}</div>
            <NInput v-model:value="form.customerPhone" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.email') }}</div>
            <NInput v-model:value="form.customerEmail" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.shipAddr') }}</div>
            <NInput v-model:value="form.shippingAddress" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
          </div>
        </div>
        <div v-show="customerMoreOpen" class="mt-3 space-y-3 border-t border-dashed border-[#E5E7EB] pt-3">
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.country') }}</div>
            <NInput v-model:value="form.country" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.coupon') }}</div>
            <NInput v-model:value="form.coupon" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.remark') }}</div>
            <NInput v-model:value="form.remark" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
          </div>
        </div>
        <button type="button" class="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-3.5 font-600 text-[#3487FF]" @click="customerMoreOpen = !customerMoreOpen">
          <Icon :icon="customerMoreOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'" width="20" height="20" />
          <span>{{ customerMoreOpen ? t('common.collapse') : t('orderCreate.moreOptional') }}</span>
        </button>
      </div>

      <div class="rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div class="mb-3 text-4 font-700">
          {{ t('orderCreate.sectionOrder') }}
        </div>
        <div class="mb-2 text-3.5 font-600">
          {{ t('customOrder.total') }} <span class="text-[#EF4444]">*</span>
        </div>
        <NInput v-model:value="form.basePrice" :placeholder="t('customOrder.numberPh')" size="large" class="w-full" />
        <div class="mt-3">
          <div class="mb-2 text-3.5 font-600">
            {{ t('customOrder.currency') }} <span class="text-[#EF4444]">*</span>
          </div>
          <TgSelect v-model="form.currency" :options="currencyOptions" :searchable="false" :placeholder="t('customOrder.currencyModel')" />
        </div>

        <template v-if="wheelSizeEnabled">
          <div class="mt-3">
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.brand') }} <span class="text-[#EF4444]">*</span></div>
            <TgSelect
              :key="`c-make-${wsBrandOptions.length}`"
              :model-value="form.brand"
              :options="wsBrandOptions"
              :searchable="true"
              :disabled="wsLoadingStage === 0"
              :placeholder="wsLoadingStage === 0 ? t('common.loading') : t('customOrder.phSelectBrand')"
              @update:model-value="onWheelBrandChange"
            />
          </div>
          <div class="mt-3">
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.model') }} <span class="text-[#EF4444]">*</span></div>
            <TgSelect
              :key="`c-mdl-${wsModelOptions.length}`"
              :model-value="form.model"
              :options="wsModelOptions"
              :searchable="true"
              :disabled="!form.brand || wsLoadingStage === 1"
              :placeholder="!form.brand ? t('common.selectBrandFirst') : wsLoadingStage === 1 ? t('common.loading') : t('customOrder.phSelectModel')"
              @update:model-value="onWheelModelChange"
            />
          </div>
          <div class="mt-3">
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.generation') }} <span class="text-[#EF4444]">*</span></div>
            <TgSelect
              :key="`c-gen-${wsGenOptions.length}`"
              :model-value="form.wheelGeneration"
              :options="wsGenOptions"
              :searchable="true"
              :disabled="!form.model || wsLoadingStage === 2"
              :placeholder="!form.model ? t('common.selectModelFirst') : wsLoadingStage === 2 ? t('common.loading') : t('customOrder.phSelectGen')"
              @update:model-value="onWheelGenerationChange"
            />
          </div>
          <div class="mt-3">
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.year') }} <span class="text-[#EF4444]">*</span></div>
            <TgSelect
              :key="`c-yr-${wsYearOptions.length}`"
              :model-value="form.wheelYear"
              :options="wsYearOptions"
              :searchable="false"
              :disabled="!form.wheelGeneration || wsLoadingStage === 3"
              :placeholder="!form.wheelGeneration ? t('common.selectGenFirst') : wsLoadingStage === 3 ? t('common.loading') : t('customOrder.phSelectYear')"
              @update:model-value="onWheelYearChange"
            />
          </div>
          <div class="mt-3">
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.modification') }} <span class="text-[#EF4444]">*</span></div>
            <TgSelect
              :key="`c-mod-${wsModOptions.length}`"
              :model-value="form.wheelModification"
              :options="wsModOptions"
              :searchable="true"
              :disabled="!form.wheelYear || wsLoadingStage === 4"
              :placeholder="!form.wheelYear ? t('common.selectYearFirst') : wsLoadingStage === 4 ? t('common.loading') : t('customOrder.phSelectMod')"
              @update:model-value="onWheelModificationChange"
            />
          </div>
          <p class="mt-2 text-3 text-[#9CA3AF]">
            {{ t('orderCreate.yearLineHint') }}
          </p>
        </template>
        <template v-else>
          <div class="mt-3">
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.brand') }} <span class="text-[#EF4444]">*</span></div>
            <NInput v-model:value="form.carBrandText" size="large" class="w-full" />
          </div>
          <div class="mt-3">
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.model') }} <span class="text-[#EF4444]">*</span></div>
            <NInput v-model:value="form.carModelText" size="large" class="w-full" />
          </div>
          <div class="mt-3">
            <div class="mb-2 text-3.5 font-600">{{ t('orderCreate.carYear') }} <span class="text-[#EF4444]">*</span></div>
            <NInput
              v-model:value="form.yearText"
              size="large"
              class="w-full"
              :maxlength="50"
              show-count
            />
          </div>
        </template>

        <div v-show="orderOptionalOpen" class="mt-3 space-y-3 border-t border-dashed border-[#E5E7EB] pt-3">
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.vin') }}</div>
            <NInput v-model:value="form.vin" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.chassis') }}</div>
            <NInput v-model:value="form.chassis" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('orderCreate.styleCode') }}</div>
            <NInput v-model:value="form.styleName" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('orderCreate.brakeDisc') }}</div>
            <NInput v-model:value="form.brakeDisc" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.caliper') }}</div>
            <NInput v-model:value="form.caliper" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
          </div>
        </div>
        <button type="button" class="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-3.5 font-600 text-[#3487FF]" @click="orderOptionalOpen = !orderOptionalOpen">
          <Icon :icon="orderOptionalOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'" width="20" height="20" />
          <span>{{ orderOptionalOpen ? t('common.collapse') : t('orderCreate.moreOrderOptional') }}</span>
        </button>
      </div>

      <div class="rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div class="mb-3 text-4 font-700">
          {{ t('orderCreate.sectionWheel') }}
        </div>
        <div class="mb-2 text-3.5 font-600">
          {{ t('customOrder.structure') }} <span class="text-[#EF4444]">*</span>
        </div>
        <TgSelect v-model="form.structure" :options="structureOptions" :searchable="false" :placeholder="t('customOrder.structurePh')" />
        <div class="mt-3">
          <div class="mb-2 text-3.5 font-600">
            {{ t('orderCreate.structureSubtype') }}
          </div>
          <TgSelect v-model="form.structureSubtypeSingle" :options="structureSubtypeOptions" :searchable="false" :placeholder="t('common.optional')" />
        </div>
        <div class="mt-3">
          <div class="mb-2 text-3.5 font-600">
            {{ t('customOrder.sizeIn') }} <span class="text-[#EF4444]">*</span>
          </div>
          <TgSelect v-model="form.sizeChoice" :options="sizeOptions" :searchable="false" :placeholder="t('common.pleaseSelect')" />
        </div>
        <div class="mt-3">
          <div class="mb-2 text-3.5 font-600">
            {{ t('orderCreate.appearance') }} <span class="text-[#EF4444]">*</span>
          </div>
          <NInput v-model:value="form.appearance" :placeholder="t('customOrder.finishPh')" size="large" class="w-full" />
        </div>
        <div class="mt-3">
          <div class="mb-2 text-3.5 font-600">{{ t('orderCreate.rFinish') }}</div>
          <NInput v-model:value="form.rAppearance" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
        </div>

        <div class="mt-4 flex items-center gap-2">
          <TgSwitch v-model="rearSplit" :aria-label="t('orderCreate.rearConfigMode')" />
          <div class="text-3.5 font-600">
            {{ rearSplit ? t('orderCreate.specSplit') : t('orderCreate.specSame') }}
          </div>
        </div>

        <div class="mt-4 text-4 font-700">
          {{ t('orderCreate.frontBlock') }}
        </div>
        <p class="mt-1 text-3 text-[#9CA3AF]">
          {{ t('orderCreate.frontThreeHint') }}
        </p>
        <div class="mt-2 space-y-3">
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('orderCreate.fDiam') }}</div>
            <NInput v-model:value="form.fDiam" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.widthJ') }}</div>
            <NInput v-model:value="form.fWidth" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.etMm') }}</div>
            <NInput v-model:value="form.fEt" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
          </div>
        </div>
        <div v-show="frontMoreOpen" class="mt-3 grid grid-cols-1 gap-3 border-t border-dashed border-[#E5E7EB] pt-3 sm:grid-cols-2">
          <div v-for="(row, idx) in [
            ['fPcd', t('customOrder.pcd')],
            ['fCb', t('customOrder.cbMm')],
            ['fHole', t('customOrder.hole')],
            ['fQty', t('customOrder.qty')],
            ['fOemBolt', t('orderCreate.oemBolt')],
            ['fNote', t('orderCreate.fWheelNote')],
          ] as const" :key="`fm-${idx}`">
            <div class="mb-2 text-3.5 font-600">{{ row[1] }}</div>
            <NInput v-model:value="(form as Record<string, string>)[row[0]]" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
          </div>
        </div>
        <button type="button" class="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-3.5 font-600 text-[#3487FF]" @click="frontMoreOpen = !frontMoreOpen">
          <Icon :icon="frontMoreOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'" width="20" height="20" />
          <span>{{ frontMoreOpen ? t('common.collapse') : t('orderCreate.moreFront') }}</span>
        </button>

        <div v-show="rearSplit" class="mt-6 border-t border-dashed border-[#E5E7EB] pt-4">
          <div class="text-4 font-700">
            {{ t('orderCreate.rearBlock') }}
          </div>
          <p class="mt-1 text-3 text-[#9CA3AF]">
            {{ t('orderCreate.rearThreeHint') }}
          </p>
          <div class="mt-2 space-y-3">
            <div>
              <div class="mb-2 text-3.5 font-600">{{ t('orderCreate.rDiam') }}</div>
              <NInput v-model:value="form.rDiam" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
            </div>
            <div>
              <div class="mb-2 text-3.5 font-600">{{ t('customOrder.widthJ') }}</div>
              <NInput v-model:value="form.rWidth" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
            </div>
            <div>
              <div class="mb-2 text-3.5 font-600">{{ t('customOrder.etMm') }}</div>
              <NInput v-model:value="form.rEt" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
            </div>
          </div>
          <div v-show="rearMoreOpen" class="mt-3 grid grid-cols-1 gap-3 border-t border-dashed border-[#E5E7EB] pt-3 sm:grid-cols-2">
            <div v-for="(row, idx) in [
              ['rPcd', t('customOrder.pcd')],
              ['rCb', t('customOrder.cbMm')],
              ['rHole', t('customOrder.hole')],
              ['rQty', t('customOrder.qty')],
              ['rOemBolt', t('orderCreate.oemBolt')],
              ['rNote', t('orderCreate.rWheelNote')],
            ] as const" :key="`rm-${idx}`">
              <div class="mb-2 text-3.5 font-600">{{ row[1] }}</div>
              <NInput v-model:value="(form as Record<string, string>)[row[0]]" :placeholder="t('common.pleaseEnter')" size="large" class="w-full" />
            </div>
          </div>
          <button type="button" class="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-3.5 font-600 text-[#3487FF]" @click="rearMoreOpen = !rearMoreOpen">
            <Icon :icon="rearMoreOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'" width="20" height="20" />
            <span>{{ rearMoreOpen ? t('common.collapse') : t('orderCreate.moreRear') }}</span>
          </button>
        </div>
      </div>

      <TgButton block :disabled="orderSubmitting" @click="submit()">
        {{ orderSubmitting ? t('common.submitting') : t('orderCreate.submit') }}
      </TgButton>
    </div>
  </div>
</template>
