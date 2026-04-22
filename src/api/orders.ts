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
  }

  const payload = pickPreorderPayload(raw)
  normalizeRearEmpties(payload)
  return payload
}

export type PreorderResponse = {
  order?: Record<string, unknown>
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
