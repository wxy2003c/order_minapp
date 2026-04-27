import httpApi from '@/utils/http'

/**
 * 与示例 `createOrderViaApi` 中 `allowedKeys` 对齐；仅这些键会发往 `/orders/preorder`。
 * 后续字段可在页面补全后再并入 builder。
 */
export const ORDER_PREORDER_ALLOWED_KEYS = new Set([
  'telegram_id',
  'telegram_name',
  'telegram_avatar',
  'order_date',
  'customer_phone',
  'customer_email',
  'shipping_address',
  'country',
  'coupon',
  'remark',
  'base_price',
  'currency',
  'car_brand',
  'car_model',
  'year',
  'vin',
  'chassis',
  'style_name',
  'brake_disc',
  'caliper',
  'structure',
  'structure_subtype_single',
  'structure_subtype_offroad',
  'f_width',
  'f_et',
  'f_pcd',
  'f_cb',
  'f_note',
  'f_hole',
  'f_qty',
  'f_oem_bolt',
  'r_width',
  'r_diam',
  'r_et',
  'r_pcd',
  'r_cb',
  'r_hole',
  'r_qty',
  'r_note',
  'r_oem_bolt',
  'r_appearance',
  'size_choice',
  'spec_mode',
  'appearance',
  'wheel_shape_url',
  'wheel_lip_url',
  'center_cap_url',
])

export type PreorderRawFields = Record<string, unknown>

export function pickPreorderPayload(raw: PreorderRawFields): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(raw)) {
    if (ORDER_PREORDER_ALLOWED_KEYS.has(key))
      out[key] = raw[key]
  }
  return out
}

/** 与示例一致：后轮相关缺省补空串 */
const REAR_KEYS = [
  'r_width',
  'r_diam',
  'r_et',
  'r_pcd',
  'r_cb',
  'r_hole',
  'r_qty',
  'r_note',
  'r_oem_bolt',
  'r_appearance',
] as const

function normalizeRearEmpties(payload: Record<string, unknown>) {
  for (const key of REAR_KEYS) {
    if (payload[key] === undefined || payload[key] === null)
      payload[key] = ''
  }
}

const REAR_KEY_SET = new Set<string>(REAR_KEYS)

/**
 * 与「另一套 createOrderViaApi」一致：只带**有值**的选填；空串的键不下发，避免一坨与示例无关的 `""`。
 * 例外：`r_*` 仍随 `normalizeRearEmpties` 保留在 body 中（允许全为 `''`，与对后轮字段单独 pick 的约定一致）。
 */
function isEmptyStringField(v: unknown): boolean {
  if (v === undefined || v === null) return true
  if (typeof v === 'string') return v.trim() === ''
  return false
}

function pruneEmptyPreorderFields(payload: Record<string, unknown>) {
  for (const key of Object.keys(payload)) {
    if (REAR_KEY_SET.has(key)) {
      continue
    }
    if (isEmptyStringField(payload[key])) {
      delete payload[key]
    }
  }
}

export type SelectOptionLite = { value: string | number; label: string }

export interface CustomOrderFormsSnapshot {
  vehicle: Record<string, unknown>
  creative: Record<string, unknown>
  address: Record<string, unknown>
  amount: { basePrice: string; currency: string }
  brandOptions: SelectOptionLite[]
  modelOptions: SelectOptionLite[]
  countryOptions: SelectOptionLite[]
  /** Wheel-Size：世代 / 年份 / 配置下拉选项（与 vehicle 中 wheel* 字段对应） */
  wheelGenOptions?: SelectOptionLite[]
  wheelYearOptions?: SelectOptionLite[]
  wheelModOptions?: SelectOptionLite[]
}

function labelOf(options: SelectOptionLite[], value: string | number): string {
  return options.find(o => String(o.value) === String(value))?.label ?? String(value ?? '')
}

/**
 * 将当前定制单页表单快照映射为预下单 body（未填的键多为空串，便于后端与示例行为一致）。
 */
export function buildPreorderBodyFromCustomOrder(s: CustomOrderFormsSnapshot): Record<string, unknown> {
  const v = s.vehicle
  const c = s.creative
  const a = s.address

  const carBrand = labelOf(s.brandOptions, v.brand as string)
  const carModel = labelOf(s.modelOptions, v.model as string)
  const countryLabel = labelOf(s.countryOptions, a.country as string)

  const genLabel = labelOf(s.wheelGenOptions ?? [], String(v.wheelGeneration ?? ''))
  const yearWheelLabel = labelOf(s.wheelYearOptions ?? [], String(v.wheelYear ?? ''))
  const modLabel = labelOf(s.wheelModOptions ?? [], String(v.wheelModification ?? ''))
  const wheelYearLine = [genLabel, yearWheelLabel, modLabel].filter(Boolean).join(' · ')

  const mirror = !!v.mirrorPair

  const fPcd = [v.frontPcdLeft, v.frontPcdRight].filter(Boolean).join('x')
  const rPcd = [v.rearPcdLeft, v.rearPcdRight].filter(Boolean).join('x')

  const raw: PreorderRawFields = {
    telegram_id: String(v.customerId ?? ''),
    telegram_name: String(v.customerName ?? ''),
    telegram_avatar: '',
    order_date: new Date().toISOString().slice(0, 10),
    customer_phone: String(a.phone ?? ''),
    customer_email: String(a.email ?? ''),
    shipping_address: String(a.address ?? ''),
    country: countryLabel || String(a.country ?? ''),
    coupon: String(a.coupon ?? ''),
    remark: String(a.remark ?? ''),
    base_price: String(s.amount.basePrice ?? '').trim(),
    currency: String(s.amount.currency ?? '').trim(),
    car_brand: carBrand,
    car_model: carModel,
    year: wheelYearLine || '',
    structure_subtype_offroad: genLabel || '',
    vin: String(v.vin ?? ''),
    chassis: String(v.plate ?? ''),
    style_name: '',
    brake_disc: String(v.axleWeight ?? ''),
    caliper: String(v.rimThickness ?? ''),
    structure: String(c.structure ?? ''),
    structure_subtype_single: '',
    f_width: String(v.frontWidth ?? ''),
    f_et: String(v.frontEt ?? ''),
    f_pcd: fPcd,
    f_cb: String(v.frontCb ?? ''),
    f_note: '',
    f_hole: String(v.frontHole ?? ''),
    f_qty: String(v.frontQuantity ?? ''),
    f_oem_bolt: String(v.frontBoltSeat ?? ''),
    appearance: String(v.frontPaint ?? ''),
    r_appearance: String(v.rearPaint ?? ''),
    size_choice: String(v.frontSize ?? ''),
    spec_mode: String(c.designMode ?? ''),
    r_width: mirror ? String(v.frontWidth ?? '') : String(v.rearWidth ?? ''),
    r_diam: mirror ? String(v.frontSize ?? '') : String(v.rearSize ?? ''),
    r_et: mirror ? String(v.frontEt ?? '') : String(v.rearEt ?? ''),
    r_pcd: mirror ? fPcd : rPcd,
    r_cb: mirror ? String(v.frontCb ?? '') : String(v.rearCb ?? ''),
    r_hole: mirror ? String(v.frontHole ?? '') : String(v.rearHole ?? ''),
    r_qty: mirror ? String(v.frontQuantity ?? '') : String(v.rearQuantity ?? ''),
    r_note: '',
    r_oem_bolt: mirror ? String(v.frontBoltSeat ?? '') : String(v.rearBoltSeat ?? ''),
    wheel_shape_url: String(c.wheelShapeUrl ?? ''),
    wheel_lip_url: String(c.wheelLipUrl ?? ''),
    center_cap_url: String(c.centerCapUrl ?? ''),
  }

  const payload = pickPreorderPayload(raw)
  normalizeRearEmpties(payload)
  pruneEmptyPreorderFields(payload)
  return payload
}

export type PreorderResponse = {
  order?: Record<string, unknown>
}

/** 简版「创建订单」页表单（对齐示例 `submitCreateOrder` 字段，仅发送 `ORDER_PREORDER_ALLOWED_KEYS` 内键） */
export interface SimpleCreateOrderForm {
  /** 提交体字段名：`telegram_id` */
  telegramId: string
  /** 提交体字段名：`telegram_name`（深链第二段或当前用户展示名） */
  telegramName: string
  orderDate: string
  customerPhone: string
  customerEmail: string
  shippingAddress: string
  country: string
  coupon: string
  remark: string
  basePrice: string
  currency: string
  carBrand: string
  carModel: string
  year: string
  structureSubtypeOffroad: string
  vin: string
  chassis: string
  styleName: string
  brakeDisc: string
  caliper: string
  structure: string
  structureSubtypeSingle: string
  specMode: 'split' | 'same'
  sizeChoice: string
  fDiam: string
  appearance: string
  rAppearance: string
  fWidth: string
  fEt: string
  fPcd: string
  fCb: string
  fHole: string
  fQty: string
  fOemBolt: string
  fNote: string
  rDiam: string
  rWidth: string
  rEt: string
  rPcd: string
  rCb: string
  rHole: string
  rQty: string
  rOemBolt: string
  rNote: string
}

/**
 * 将简版创建订单表单转为 `/orders/preorder` body，含前后轮同规时从前轮复制到后轮。
 * 字段名与桌面 `submitCreateOrder` / `OrderFields` 对齐；**唯二**可被深链替换的是入口里的 `telegramId`/`telegramName`（见 CreateOrder 页），其它键含义不变。
 */
/** 与后端校验一致：`year` 最长 50 字符 */
const PREORDER_YEAR_MAX_LEN = 50

export function buildSimpleCreateOrderPayload(f: SimpleCreateOrderForm): Record<string, unknown> {
  const same = f.specMode === 'same'
  const sizeChoice = f.sizeChoice.trim() || f.fDiam.trim() || f.rDiam.trim()
  const yearTrimmed = f.year.trim()
  const yearOut
    = yearTrimmed.length > PREORDER_YEAR_MAX_LEN
      ? yearTrimmed.slice(0, PREORDER_YEAR_MAX_LEN)
      : yearTrimmed

  let rD = f.rDiam.trim()
  let rW = f.rWidth.trim()
  let rEt = f.rEt.trim()
  let rP = f.rPcd.trim()
  let rCb = f.rCb.trim()
  let rH = f.rHole.trim()
  let rQ = f.rQty.trim()
  let rOb = f.rOemBolt.trim()
  let rN = f.rNote.trim()
  if (same) {
    rD = f.fDiam.trim() || sizeChoice || rD
    rW = f.fWidth.trim() || rW
    rEt = f.fEt.trim() || rEt
    rP = f.fPcd.trim() || rP
    rCb = f.fCb.trim() || rCb
    rH = f.fHole.trim() || rH
    rQ = f.fQty.trim() || rQ
    rOb = f.fOemBolt.trim() || rOb
    rN = f.fNote.trim() || rN
  }

  const raw: PreorderRawFields = {
    telegram_id: f.telegramId,
    telegram_name: f.telegramName,
    order_date: f.orderDate,
    customer_phone: f.customerPhone,
    customer_email: f.customerEmail,
    shipping_address: f.shippingAddress,
    country: f.country,
    coupon: f.coupon,
    remark: f.remark,
    base_price: f.basePrice.trim(),
    currency: f.currency.trim(),
    car_brand: f.carBrand,
    car_model: f.carModel,
    year: yearOut,
    structure_subtype_offroad: f.structureSubtypeOffroad,
    vin: f.vin,
    chassis: f.chassis,
    style_name: f.styleName,
    brake_disc: f.brakeDisc,
    caliper: f.caliper,
    structure: f.structure,
    structure_subtype_single: f.structureSubtypeSingle,
    f_width: f.fWidth,
    f_et: f.fEt,
    f_pcd: f.fPcd,
    f_cb: f.fCb,
    f_note: f.fNote,
    f_hole: f.fHole,
    f_qty: f.fQty,
    f_oem_bolt: f.fOemBolt,
    r_diam: rD,
    r_width: rW,
    r_et: rEt,
    r_pcd: rP,
    r_cb: rCb,
    r_hole: rH,
    r_qty: rQ,
    r_note: rN,
    r_oem_bolt: rOb,
    r_appearance: f.rAppearance,
    size_choice: sizeChoice,
    spec_mode: f.specMode,
    appearance: f.appearance,
  }
  const p = pickPreorderPayload(raw)
  normalizeRearEmpties(p)
  pruneEmptyPreorderFields(p)
  return p
}

/**
 * POST `/orders/preorder`；响应经 `http` 拦截器已解包为 `data`。
 */
export async function createPreorder(
  body: Record<string, unknown>,
): Promise<PreorderResponse> {
  const res = (await httpApi.post('/orders/preorder', body)) as PreorderResponse
  return res ?? {}
}


// 订单列表
export async function OrderList(
  body: Record<string, unknown>,
): Promise<PreorderResponse> {
  const res = (await httpApi.get('/orders', {params:body})) as PreorderResponse
  return res ?? {}
}
