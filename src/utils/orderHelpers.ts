import { resolveHttpDefaultUserId, resolveOrderSubmitPlatformUserId } from '@/utils/deeplinkStaffContext'
import type { OrderStatus } from '@/data/orders'
import {
  colorSampleFromOrderImageFields,
  colorSampleFromUrl,
  colorSampleListFromUrls,
} from '@/utils/orderMedia'
import { normalizeInchDiamString } from '@/utils/wheelDiam'

// —— types ——
export type OrderWriteResult = { order?: Record<string, unknown> }

export type OrdersListQuery = {
  user_id?: string | number
  status?: string
  page?: number
  page_size?: number
  search?: string
}

export type OrderListImageItem = {
  url?: string
  name?: string
  path?: string | null
  label?: string
  category?: string
  category_label?: string
  desc?: string
  slot?: number
  section?: string
}

export type OrderListItem = {
  id: number
  order_no: string
  status: string
  status_label?: string
  customer: string
  car: string
  specs?: Record<string, unknown>
  imgs?: OrderListImageItem[]
  design_imgs?: OrderListImageItem[]
  car_model_imgs?: OrderListImageItem[]
  currency: string
  total: number
  paid: number
  order_date?: string
  updated_at?: string
  customer_id?: number
  telegram_id?: string | null
  telegram_nickname?: string | null
  telegram_avatar?: string | null
}

export type OrderListStatusTab = { key: string; label: string; count: number }

export type OrdersListData = {
  items: OrderListItem[]
  count: number
  page: number
  page_size: number
  last_page: number
  statuses?: OrderListStatusTab[]
}

export type OrderDetailResponse = Partial<OrderListItem> & Record<string, unknown>

export type SelectOptionLite = { value: string | number; label: string }

export interface CustomOrderFormsSnapshot {
  vehicle: Record<string, unknown>
  creative: Record<string, unknown>
  address: Record<string, unknown>
  amount: { basePrice: string; currency: string }
  brandOptions: SelectOptionLite[]
  modelOptions: SelectOptionLite[]
  countryOptions: SelectOptionLite[]
  wheelGenOptions?: SelectOptionLite[]
  wheelYearOptions?: SelectOptionLite[]
  wheelModOptions?: SelectOptionLite[]
}

// —— list query ——
function telegramQueryDefaults(): Record<string, string> {
  const uid = resolveHttpDefaultUserId().trim()
  const o: Record<string, string> = { platform: 'telegram' }
  if (uid) o.user_id = String(uid)
  return o
}

export function buildOrdersListRequestParams(query: OrdersListQuery): Record<string, string | number> {
  const p: Record<string, string | number> = {...telegramQueryDefaults()}
  if (query.user_id != null && String(query.user_id).trim() !== '') {
    p.user_id = String(query.user_id).trim()
  }
  const st = String(query.status ?? '').trim()
  if (st && st !== 'all') p.status = st
  if (query.page != null) p.page = query.page
  if (query.page_size != null) p.page_size = query.page_size
  const q = String(query.search ?? '').trim()
  if (q) p.search = q
  return p
}

// —— response normalize ——
const MAX_DATA_UNWRAP = 6

function unwrapApiDataObject<T>(raw: unknown): T {
  let v: unknown = raw
  for (let i = 0; i < MAX_DATA_UNWRAP; i++) {
    if (v == null || typeof v !== 'object' || Array.isArray(v)) return v as T
    if (!Object.prototype.hasOwnProperty.call(v, 'data')) return v as T
    const next = (v as Record<string, unknown>).data
    if (next == null || typeof next !== 'object' || Array.isArray(next)) return v as T
    v = next
  }
  return v as T
}

function normalizeOrderListItem(item: OrderListItem | Record<string, unknown>): OrderListItem {
  return unwrapApiDataObject<OrderListItem>(item)
}

export function normalizeOrdersListPayload(raw: unknown): OrdersListData {
  const body = unwrapApiDataObject<Record<string, unknown> & { items?: OrderListItem[] }>(raw) as unknown as
    | OrdersListData
    | Record<string, unknown>
  const d = body as OrdersListData
  if (d && Array.isArray(d.items)) {
    return {...d, items: d.items.map(it => normalizeOrderListItem(it as OrderListItem))}
  }
  return d
}

function looksLikeOrderBody(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === 'object' && !Array.isArray(x) && ('id' in x || 'order_no' in x)
}

export function normalizeOrderDetailPayload(raw: unknown): OrderDetailResponse {
  let v: unknown = unwrapApiDataObject(raw)
  if (looksLikeOrderBody(v)) return v as OrderDetailResponse
  for (const k of ['order', 'record', 'detail', 'item'] as const) {
    if (v && typeof v === 'object' && !Array.isArray(v) && k in (v as object)) {
      const inner = (v as Record<string, unknown>)[k]
      if (looksLikeOrderBody(inner)) {
        v = inner
        break
      }
    }
  }
  if (!looksLikeOrderBody(v)) v = unwrapApiDataObject(v)
  return v as OrderDetailResponse
}

// —— create payload ——
const ORDER_CREATE_ALLOWED_KEYS = new Set([
  'user_id', 'customer', 'telegram_id', 'car_model_imgs', 'car_brand', 'car_model', 'year', 'vin', 'chassis',
  'style_name', 'brake_disc', 'caliper', 'country', 'shipping_address', 'base_price', 'customer_phone',
  'customer_email', 'currency', 'remark', 'f_width', 'f_et', 'f_pcd', 'f_cb', 'f_note', 'f_hole', 'f_qty',
  'f_oem_bolt', 'r_width', 'r_diam', 'r_et', 'r_pcd', 'r_cb', 'r_hole', 'r_qty', 'r_oem_bolt', 'r_note',
  'r_appearance', 'size_choice', 'structure', 'structure_subtype_single', 'structure_subtype_offroad',
  'vehicle_model',
  'appearance', 'special_req', 'factory_name', 'factory_po', 'color_sample', 'color_sample_desc',
  'cover_image', 'center_cap', 'front_marking', 'front_mark_image', 'wheel_color_desc', 'wheel_color_image',
  'order_date', 'coupon', 'spec_mode',
])

function pickCreateOrderPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(raw)) {
    if (ORDER_CREATE_ALLOWED_KEYS.has(key)) out[key] = raw[key]
  }
  return out
}

const REAR_KEYS = [
  'r_width', 'r_diam', 'r_et', 'r_pcd', 'r_cb', 'r_hole', 'r_qty', 'r_note', 'r_oem_bolt', 'r_appearance',
] as const
const REAR_KEY_SET = new Set<string>(REAR_KEYS)
const CREATE_EMPTY_ARRAY_KEYS = new Set(['color_sample', 'cover_image', 'front_mark_image', 'wheel_color_image'])

function imageListToJsonStringForApi(arr: unknown[] | null | undefined): string {
  if (!Array.isArray(arr) || arr.length === 0) return ''
  return JSON.stringify(arr)
}

function normalizeRearEmpties(payload: Record<string, unknown>): void {
  for (const key of REAR_KEYS) {
    if (payload[key] === undefined || payload[key] === null) payload[key] = ''
  }
}

function isEmptyStringField(v: unknown): boolean {
  if (v === undefined || v === null) return true
  if (typeof v === 'string') return v.trim() === ''
  return false
}

function pruneEmptyCreateOrderFields(payload: Record<string, unknown>): void {
  for (const key of Object.keys(payload)) {
    if (REAR_KEY_SET.has(key)) continue
    const v = payload[key]
    if (Array.isArray(v) && v.length === 0 && CREATE_EMPTY_ARRAY_KEYS.has(key)) {
      delete payload[key]
      continue
    }
    if (isEmptyStringField(v)) delete payload[key]
  }
}

function labelOf(options: SelectOptionLite[], value: string | number): string {
  return options.find(o => String(o.value) === String(value))?.label ?? String(value ?? '')
}

function joinFinishNotes(finishCardOrderNote: unknown, wheelColorNote: unknown): string {
  const a = String(finishCardOrderNote ?? '').trim()
  const b = String(wheelColorNote ?? '').trim()
  return [a, b].filter(Boolean).join(' | ')
}

function wheelStyleFromCreative(c: Record<string, unknown>): { styleNo: string; styleName: string } {
  const sm = c.selectedStyleModel as { style_no?: unknown; style_name?: unknown } | null | undefined
  if (!sm || typeof sm !== 'object') return { styleNo: '', styleName: '' }
  return {
    styleNo: String(sm.style_no ?? '').trim(),
    styleName: String(sm.style_name ?? '').trim(),
  }
}

const WHEEL_LIBRARY_OFFROAD_SEP = ' / '

export function parseWheelLibraryStructureSubtypeOffroad(raw: string | null | undefined): { gen: string; mod: string } {
  const t = String(raw ?? '').trim()
  if (!t) return { gen: '', mod: '' }
  const i = t.indexOf(WHEEL_LIBRARY_OFFROAD_SEP)
  if (i < 0) return { gen: t, mod: '' }
  return { gen: t.slice(0, i).trim(), mod: t.slice(i + WHEEL_LIBRARY_OFFROAD_SEP.length).trim() }
}

function finalizeCreatePayload(payload: Record<string, unknown>): Record<string, unknown> {
  normalizeRearEmpties(payload)
  pruneEmptyCreateOrderFields(payload)
  return payload
}

export function buildCreateOrderFromCustomOrder(s: CustomOrderFormsSnapshot): Record<string, unknown> {
  const v = s.vehicle
  const c = s.creative
  const a = s.address

  const carBrand = labelOf(s.brandOptions, v.brand as string)
  const { styleNo: wheelStyleNo, styleName: wheelStyleName } = wheelStyleFromCreative(c)
  const carModel = wheelStyleNo || labelOf(s.modelOptions, v.model as string)
  const countryLabel = labelOf(s.countryOptions, a.country as string)
  const yearOnly = labelOf(s.wheelYearOptions ?? [], String(v.wheelYear ?? ''))
  const mirror = !!v.mirrorPair
  const fPcd = [v.frontPcdLeft, v.frontPcdRight].filter(Boolean).join('x')
  const rPcd = [v.rearPcdLeft, v.rearPcdRight].filter(Boolean).join('x')
  const fNote = joinFinishNotes(c.finishCardOrderNote, c.wheelColorNote)
  const colorSample = colorSampleListFromUrls([String(c.wheelShapeUrl ?? ''), String(c.wheelLipUrl ?? '')])
  const cover = colorSampleFromUrl(String(c.centerCapUrl ?? ''))
  const wheelColorDesc = String(c.wheelColorSelectionDesc ?? '').trim()
    || joinFinishNotes(c.finishCardOrderNote, c.wheelColorNote)
  const wheelImg = colorSampleFromOrderImageFields(
    String(c.finishCardImageUrl ?? ''),
    c.finishCardImagePath != null && String(c.finishCardImagePath).trim()
      ? String(c.finishCardImagePath)
      : null,
  )
  const wheelColorImageList = wheelImg ? [wheelImg] : []

  const frontD = normalizeInchDiamString(String(v.frontSize ?? ''))
  const rearD = normalizeInchDiamString(String(v.rearSize ?? ''))

  const customerTg = String(v.customerId ?? '').trim()
  const raw: Record<string, unknown> = {
    user_id: resolveOrderSubmitPlatformUserId(customerTg),
    customer: String(v.customerName ?? ''),
    telegram_id: customerTg,
    car_model_imgs: [],
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
    year: yearOnly || '',
    structure_subtype_offroad: String(v.wheelGeneration ?? '').trim(),
    vehicle_model: String(v.wheelModification ?? '').trim(),
    vin: String(v.vin ?? ''),
    chassis: String(v.plate ?? ''),
    style_name: wheelStyleName,
    brake_disc: String(v.brakeDisc ?? ''),
    caliper: String(v.rimThickness ?? ''),
    structure: String(c.structure ?? ''),
    structure_subtype_single: '',
    f_width: String(v.frontWidth ?? ''),
    f_et: String(v.frontEt ?? ''),
    f_pcd: fPcd,
    f_cb: String(v.frontCb ?? ''),
    f_note: fNote,
    f_hole: String(v.frontHole ?? ''),
    f_qty: String(v.frontQuantity ?? ''),
    f_oem_bolt: String(v.frontBoltSeat ?? ''),
    appearance: String(v.frontPaint ?? ''),
    r_appearance: String(v.rearPaint ?? ''),
    size_choice: frontD,
    spec_mode: mirror ? 'same' : 'split',
    r_width: mirror ? String(v.frontWidth ?? '') : String(v.rearWidth ?? ''),
    r_diam: mirror ? frontD : rearD,
    r_et: mirror ? String(v.frontEt ?? '') : String(v.rearEt ?? ''),
    r_pcd: mirror ? fPcd : rPcd,
    r_cb: mirror ? String(v.frontCb ?? '') : String(v.rearCb ?? ''),
    r_hole: mirror ? String(v.frontHole ?? '') : String(v.rearHole ?? ''),
    r_qty: mirror ? String(v.frontQuantity ?? '') : String(v.rearQuantity ?? ''),
    r_note: '',
    r_oem_bolt: mirror ? String(v.frontBoltSeat ?? '') : String(v.rearBoltSeat ?? ''),
    special_req: String(c.specialRequest ?? ''),
    factory_name: '',
    factory_po: '',
    color_sample: imageListToJsonStringForApi(colorSample),
    color_sample_desc: String(c.wheelShapeNote ?? ''),
    cover_image: imageListToJsonStringForApi(cover ? [cover] : []),
    center_cap: String(c.centerCapNote ?? ''),
    front_marking: '',
    front_mark_image: imageListToJsonStringForApi([]),
    wheel_color_desc: wheelColorDesc,
    wheel_color_image: imageListToJsonStringForApi(wheelColorImageList),
  }

  return finalizeCreatePayload(pickCreateOrderPayload(raw))
}

const API_STATUS_ZH: Record<string, OrderStatus> = {
  待确认: 'pending_confirm',
  设计中: 'designing',
  已取消: 'cancelled',
  已锁单: 'locked',
  生产中: 'in_production',
  待发货: 'pending_shipment',
  已发货: 'shipped',
  已完成: 'completed',
}

/** 接口中文 status / status_label → 本地 `OrderStatus`（无法识别则 `pending_confirm`） */
export function mapApiStatusToOrderStatus(status: string | null | undefined): OrderStatus {
  const s = String(status ?? '').trim()
  if (!s) return 'pending_confirm'
  return API_STATUS_ZH[s] ?? 'pending_confirm'
}
