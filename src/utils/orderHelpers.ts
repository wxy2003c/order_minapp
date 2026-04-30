import { resolveOrderSubmitPlatformUserId } from '@/utils/deeplinkStaffContext'
import type { OrderStatus } from '@/data/orders'
import type { ColorSampleImage } from '@/utils/orderMedia'
import {
  colorSampleFromOrderImageFields,
  colorSampleFromUrl,
  colorSampleListFromUrls,
  enrichWheelColorSampleWithFinishCode,
} from '@/utils/orderMedia'
import { normalizeInchDiamString } from '@/utils/wheelDiam'
import {
  CENTER_CAP_REF_IMAGE_MAX,
  WHEEL_COLOR_REF_IMAGE_MAX,
  WHEEL_SHAPE_REF_IMAGE_MAX,
} from '@/constants/customOrderCreative'

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

export type OrderDetailBillItem = {
  key?: string
  label: string
  amount: number | string
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
  /** 账单分项：`[{ key, label, amount }]`，可与接口字段 `bill_items` / JSON 字符串对齐 */
  bill_items?: OrderDetailBillItem[]
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
export function buildOrdersListRequestParams(query: OrdersListQuery): Record<string, string | number> {
  const p: Record<string, string | number> = {}
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

/** 部分接口把 `cover_image` 等存成 JSON 字符串，解析为数组便于 `imgs` 之外的回填逻辑 */
function coerceApiJsonArrayFields(body: Record<string, unknown>) {
  const keys = [
    'cover_image',
    'wheel_color_image',
    'color_sample',
    'front_mark_image',
    'car_model_imgs',
    'imgs',
    'bill_items',
  ] as const
  for (const key of keys) {
    const val = body[key]
    if (typeof val !== 'string') continue
    const t = val.trim()
    if (!t.startsWith('[')) continue
    try {
      const parsed = JSON.parse(t) as unknown
      if (Array.isArray(parsed)) body[key] = parsed
    }
    catch {
      /* 保持原字符串 */
    }
  }
}

export function normalizeOrderDetailPayload(raw: unknown): OrderDetailResponse {
  let v: unknown = unwrapApiDataObject(raw)
  if (looksLikeOrderBody(v)) {
    coerceApiJsonArrayFields(v)
    return v as OrderDetailResponse
  }
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
  if (looksLikeOrderBody(v)) coerceApiJsonArrayFields(v as Record<string, unknown>)
  return v as OrderDetailResponse
}

// —— create payload ——
const ORDER_CREATE_ALLOWED_KEYS = new Set([
  'user_id', 'customer', 'telegram_id', 'telegram_nickname', 'car_model_imgs', 'car_brand', 'car_model', 'year', 'vin', 'chassis',
  'style_no', 'style_name', 'brake_disc', 'caliper', 'country', 'shipping_address', 'base_price', 'customer_phone',
  'customer_email', 'currency', 'remark', 'f_width', 'f_et', 'f_pcd', 'f_cb', 'f_note', 'f_hole', 'f_qty',
  'f_oem_bolt', 'r_width', 'r_diam', 'r_et', 'r_pcd', 'r_cb', 'r_hole', 'r_qty', 'r_oem_bolt', 'r_note',
  'r_appearance', 'size_choice', 'structure', 'structure_subtype_single', 'structure_subtype_offroad',
  'vehicle_model',
  'appearance', 'special_req', 'factory_name', 'factory_po', 'color_sample', 'color_sample_desc',
  'cover_image', 'center_cap', 'front_marking', 'front_mark_image', 'wheel_color_desc', 'wheel_color_image',
  'order_date', 'coupon', 'spec_mode', 'imgs',
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
const CREATE_EMPTY_ARRAY_KEYS = new Set(['color_sample', 'cover_image', 'front_mark_image', 'wheel_color_image', 'imgs'])

function imageListToJsonStringForApi(arr: unknown[] | null | undefined): string {
  if (!Array.isArray(arr) || arr.length === 0) return ''
  return JSON.stringify(arr)
}

/** 与详情接口 `imgs[]` 一致：`category` 为槽位键，`category_label` 为展示文案（与后端落库一致）。 */
function buildOrderImgsForCreateApi(params: {
  colorSample: ColorSampleImage[]
  cover: ColorSampleImage[]
  wheelColor: ColorSampleImage[]
}): Record<string, string>[] {
  const LABEL: Record<'color_sample' | 'wheel_color' | 'cover', string> = {
    color_sample: '轮毂造型参考图',
    wheel_color: '轮毂颜色参考图',
    cover: '中心盖参考图',
  }
  const rows: Record<string, string>[] = []
  const push = (img: ColorSampleImage, cat: keyof typeof LABEL) => {
    rows.push({
      url: img.url,
      name: img.name,
      path: img.path,
      label: img.name,
      category: cat,
      category_label: LABEL[cat],
    })
  }
  for (const img of params.colorSample) push(img, 'color_sample')
  for (const img of params.cover) push(img, 'cover')
  for (const img of params.wheelColor) push(img, 'wheel_color')
  return rows
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

/**
 * 组装创建/更新订单 body：车辆字段与详情对齐；图片除历史 JSON 字段外增加 `imgs[]`（与详情 `imgs` 槽位结构一致）。
 */
export function buildCreateOrderFromCustomOrder(s: CustomOrderFormsSnapshot): Record<string, unknown> {
  const v = s.vehicle
  const c = s.creative
  const a = s.address

  const carBrand = labelOf(s.brandOptions, v.brand as string)
  const { styleNo: wheelStyleNo, styleName: wheelStyleName } = wheelStyleFromCreative(c)
  const carModel = labelOf(s.modelOptions, v.model as string)
  const countryLabel = labelOf(s.countryOptions, a.country as string)
  const yearOnly = labelOf(s.wheelYearOptions ?? [], String(v.wheelYear ?? ''))
  /** 与详情一致：后端存世代表述、配置表述（非 Wheel-Size slug/id），避免详情页再请求解析 */
  const structureSubtypeOffroadLabel = labelOf(
    s.wheelGenOptions ?? [],
    String(v.wheelGeneration ?? ''),
  )
  const vehicleModelSubmitLabel = labelOf(
    s.wheelModOptions ?? [],
    String(v.wheelModification ?? ''),
  )
  const mirror = !!v.mirrorPair
  const fPcd = [v.frontPcdLeft, v.frontPcdRight].filter(Boolean).join('x')
  const rPcd = [v.rearPcdLeft, v.rearPcdRight].filter(Boolean).join('x')
  const fNote = joinFinishNotes(c.finishCardOrderNote, c.wheelColorNote)
  const refRaw = c.wheelShapeRefUrls as unknown
  const refUrls = Array.isArray(refRaw)
    ? refRaw.map(x => String(x ?? '').trim()).filter(Boolean).slice(0, WHEEL_SHAPE_REF_IMAGE_MAX)
    : []
  const legacyShape = String((c as Record<string, unknown>).wheelShapeUrl ?? '').trim()
  const lip = String(c.wheelLipUrl ?? '').trim()
  const colorSampleUrls = [...(refUrls.length ? refUrls : legacyShape ? [legacyShape] : []), lip].filter(Boolean)
  const colorSample = colorSampleListFromUrls(colorSampleUrls)
  const capRefsRaw = c.centerCapRefUrls as unknown
  const coverListRaw = Array.isArray(capRefsRaw)
    ? capRefsRaw.map(x => String(x ?? '').trim()).filter(Boolean).slice(0, CENTER_CAP_REF_IMAGE_MAX)
    : []
  const coverList = coverListRaw.map(u => colorSampleFromUrl(u)).filter((x): x is ColorSampleImage => !!x)
  const wheelColorDesc = String(c.wheelColorSelectionDesc ?? '').trim()
    || joinFinishNotes(c.finishCardOrderNote, c.wheelColorNote)
  const wheelImgRaw = colorSampleFromOrderImageFields(
    String(c.finishCardImageUrl ?? ''),
    c.finishCardImagePath != null && String(c.finishCardImagePath).trim()
      ? String(c.finishCardImagePath)
      : null,
  )
  const finishCode = String(c.finishCardCode ?? '').trim()
  const wheelImg = wheelImgRaw ? enrichWheelColorSampleWithFinishCode(wheelImgRaw, finishCode) : null
  const wheelColorImageList: ColorSampleImage[] = []
  if (wheelImg) wheelColorImageList.push(wheelImg)
  const wheelColorCapped = wheelColorImageList.slice(0, WHEEL_COLOR_REF_IMAGE_MAX)
  const imgs = buildOrderImgsForCreateApi({
    colorSample,
    cover: coverList,
    wheelColor: wheelColorCapped,
  })

  const frontD = normalizeInchDiamString(String(v.frontSize ?? ''))
  const rearD = normalizeInchDiamString(String(v.rearSize ?? ''))

  const customerTg = String(v.customerId ?? '').trim()
  const carModelImgUrl = String(v.carModelBodyImageUrl ?? '').trim()
  const carModelSamples = carModelImgUrl ? colorSampleListFromUrls([carModelImgUrl]) : []
  const surfaceFinishOne = String(v.frontPaint ?? '').trim()
  const raw: Record<string, unknown> = {
    user_id: resolveOrderSubmitPlatformUserId(customerTg),
    /** 收货人姓名；未填时默认与 telegram_nickname 相同 */
    customer: String(a.name ?? '').trim() || String(v.customerName ?? '').trim(),
    telegram_nickname: String(v.customerName ?? '').trim(),
    telegram_id: customerTg,
    car_model_imgs: imageListToJsonStringForApi(carModelSamples),
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
    structure_subtype_offroad: structureSubtypeOffroadLabel,
    vehicle_model: vehicleModelSubmitLabel,
    vin: String(v.vin ?? ''),
    chassis: String(v.plate ?? ''),
    style_no: wheelStyleNo,
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
    appearance: surfaceFinishOne,
    r_appearance: surfaceFinishOne,
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
    cover_image: imageListToJsonStringForApi(coverList),
    center_cap: String(c.centerCapNote ?? ''),
    front_marking: '',
    front_mark_image: imageListToJsonStringForApi([]),
    wheel_color_desc: wheelColorDesc,
    wheel_color_image: imageListToJsonStringForApi(wheelColorCapped),
    imgs,
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
