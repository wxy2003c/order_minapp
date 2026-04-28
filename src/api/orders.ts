import httpApi from '@/utils/http'
import { buildOrderDetailRequestParams, resolveOrderSubmitPlatformUserId } from '@/utils/deeplinkStaffContext'
import {
  colorSampleFromUrl,
  colorSampleListFromUrls,
  colorSampleFromOrderImageFields,
} from '@/utils/orderMedia'
import { normalizeInchDiamString } from '@/utils/wheelDiam'

// =============================================================================
// 创建订单：允许的 body 键（`POST /orders`）
// =============================================================================

/** 仅这些键会进入 `POST /orders` 请求体（与后端可接收字段一致） */
export const ORDER_CREATE_ALLOWED_KEYS = new Set([
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

/**
 * 从原始对象中只保留 `ORDER_CREATE_ALLOWED_KEYS` 中的键，用于组最终提交体。
 */
export function pickCreateOrderPayload(raw: Record<string, unknown>): Record<string, unknown> {
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

/**
 * 图片类字段：后端按字符串收（JSON 文本），空则返回 `''` 以便剪枝。
 */
function imageListToJsonStringForApi(arr: unknown[] | null | undefined): string {
  if (!Array.isArray(arr) || arr.length === 0) return ''
  return JSON.stringify(arr)
}

/**
 * 后轮相关键若缺省，补成空串，与对端「后轮字段可全空」的约定一致。
 */
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

/**
 * 删除可选项中的空串；空数组在部分图片字段上也会删掉；`r_*` 不删空串（已由 normalizeRearEmpties 处理）。
 */
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

// =============================================================================
// 定制单 / 快建单 表单 → body
// =============================================================================

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

/**
 * 在下拉 options 中根据当前 value 取展示用 label，找不到则退回原 value 的字符串形式。
 */
function labelOf(options: SelectOptionLite[], value: string | number): string {
  return options.find(o => String(o.value) === String(value))?.label ?? String(value ?? '')
}

/**
 * 色卡说明 + 定制模式下的颜色说明，拼成 `f_note` 一段。
 */
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

/**
 * 将「定制单」多步表单快照转为 `POST /orders` 的 body（已 pick + 剪枝）。
 */
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
    /** 型号库世代 slug（仅世代，不含配置） */
    structure_subtype_offroad: buildStructureSubtypeOffroadFromWheelLibrary(String(v.wheelGeneration ?? '')),
    /** 型号库配置；对应前端的「配置」下拉 */
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
    /** 与快建单一致：`split` 分轮 / `same` 前后同规（勿与 creative/custom 设计模式混用） */
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

  const payload = pickCreateOrderPayload(raw)
  normalizeRearEmpties(payload)
  pruneEmptyCreateOrderFields(payload)
  return payload
}

export interface SimpleCreateOrderForm {
  telegramId: string
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
  vehicle_model: string
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

const MAX_ORDER_YEAR_STR_LEN = 50

const WHEEL_LIBRARY_OFFROAD_SEP = ' / '

/**
 * 型号库：**仅世代** slug → `structure_subtype_offroad`（配置走 `vehicle_model`）。
 */
export function buildStructureSubtypeOffroadFromWheelLibrary(
  wheelGeneration: string | null | undefined,
): string {
  return String(wheelGeneration ?? '').trim()
}

/**
 * 兼容旧数据：曾把「世代 / 配置」拼进 `structure_subtype_offroad`；新接口已拆成两字段。
 */
export function parseWheelLibraryStructureSubtypeOffroad(raw: string | null | undefined): {
  gen: string
  mod: string
} {
  const t = String(raw ?? '').trim()
  if (!t) return { gen: '', mod: '' }
  const i = t.indexOf(WHEEL_LIBRARY_OFFROAD_SEP)
  if (i < 0) return { gen: t, mod: '' }
  return { gen: t.slice(0, i).trim(), mod: t.slice(i + WHEEL_LIBRARY_OFFROAD_SEP.length).trim() }
}

/**
 * 将「快建单」单页表单转为 `POST /orders` body；`specMode === 'same'` 时从前轮规格复制到后轮。
 */
export function buildCreateOrderFromSimpleForm(f: SimpleCreateOrderForm): Record<string, unknown> {
  const same = f.specMode === 'same'
  const sizeChoiceRaw = f.sizeChoice.trim() || f.fDiam.trim() || f.rDiam.trim()
  const sizeChoice = normalizeInchDiamString(sizeChoiceRaw)
  const y = f.year.trim()
  const yearOut = y.length > MAX_ORDER_YEAR_STR_LEN ? y.slice(0, MAX_ORDER_YEAR_STR_LEN) : y

  let rD = normalizeInchDiamString(f.rDiam.trim())
  let rW = f.rWidth.trim()
  let rEt = f.rEt.trim()
  let rP = f.rPcd.trim()
  let rCb = f.rCb.trim()
  let rH = f.rHole.trim()
  let rQ = f.rQty.trim()
  let rOb = f.rOemBolt.trim()
  let rN = f.rNote.trim()
  if (same) {
    rD = normalizeInchDiamString(f.fDiam.trim() || sizeChoiceRaw) || rD
    rW = f.fWidth.trim() || rW
    rEt = f.fEt.trim() || rEt
    rP = f.fPcd.trim() || rP
    rCb = f.fCb.trim() || rCb
    rH = f.fHole.trim() || rH
    rQ = f.fQty.trim() || rQ
    rOb = f.fOemBolt.trim() || rOb
    rN = f.fNote.trim() || rN
  }

  const raw: Record<string, unknown> = {
    user_id: resolveOrderSubmitPlatformUserId(String(f.telegramId ?? '')),
    customer: f.telegramName,
    telegram_id: f.telegramId,
    car_model_imgs: [],
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
    structure_subtype_offroad: f.structureSubtypeOffroad || '',
    vehicle_model: f.vehicle_model || '',
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
    special_req: '',
    factory_name: '',
    factory_po: '',
  }
  const p = pickCreateOrderPayload(raw)
  normalizeRearEmpties(p)
  pruneEmptyCreateOrderFields(p)
  return p
}

// =============================================================================
// HTTP
// =============================================================================

/** 建单/改单类接口的通用返回（拦截器已解包 `data`） */
export type OrderWriteResult = { order?: Record<string, unknown> }

/**
 * 创建订单 `POST /orders`。
 */
export async function createOrder(body: Record<string, unknown>): Promise<OrderWriteResult> {
  return (await httpApi.post('/orders', body)) as OrderWriteResult
}

/**
 * 修改订单 `PUT /orders/{orderId}`（与创建使用同一套 body 字段）。
 */
export async function updateOrder(
  orderId: string | number,
  body: Record<string, unknown>,
): Promise<OrderWriteResult> {
  const id = encodeURIComponent(String(orderId).trim())
  return (await httpApi.put(`/orders/${id}`, body)) as OrderWriteResult
}

/**
 * 取消订单 `POST /orders/cancel`，body：`{ order_id }`。
 */
export async function cancelOrder(orderId: string | number): Promise<OrderWriteResult> {
  return (await httpApi.post('/orders/cancel', { order_id: orderId })) as OrderWriteResult
}

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
  /** 与 `category` 一致，部分接口为 `color_sample` / `color_sample_label` 等 */
  category?: string
  /** 如 `color_sample_label`，匹配时与 `category` 同样归一成 slot */
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

const MAX_DATA_UNWRAP = 6

/**
 * 全局 `http` 已解一层 `{ code, data }` 后，部分接口仍再包 `data: { 业务体 }`（甚至多层）。
 * 在子节点为 plain object 时沿 `data` 下剥，与 `{ id, order_no, specs, ... }` 对齐后再给页面/回显用。
 */
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

function normalizeOrdersListPayload(raw: unknown): OrdersListData {
  const body = unwrapApiDataObject<Record<string, unknown> & { items?: OrderListItem[] }>(raw) as unknown as
    | OrdersListData
    | Record<string, unknown>
  const d = body as OrdersListData
  if (d && Array.isArray(d.items)) {
    return { ...d, items: d.items.map(it => normalizeOrderListItem(it as OrderListItem)) }
  }
  return d
}

/**
 * 订单列表 `GET /orders`；`user_id` / `status` / `search` 等与后端 query 一致（全局还有 `lang`、`platform`、`user_id` 默认由 http 注入）。
 */
export async function fetchOrdersList(query: OrdersListQuery): Promise<OrdersListData> {
  const p: Record<string, string | number> = {}
  if (query.user_id != null && String(query.user_id).trim() !== '') p.user_id = query.user_id
  const st = String(query.status ?? '').trim()
  if (st && st !== 'all') p.status = st
  if (query.page != null) p.page = query.page
  if (query.page_size != null) p.page_size = query.page_size
  const q = String(query.search ?? '').trim()
  if (q) p.search = q
  return normalizeOrdersListPayload(await httpApi.get('/orders', { params: p }))
}

export type OrderDetailResponse = Partial<OrderListItem> & Record<string, unknown>

function looksLikeOrderBody(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === 'object' && !Array.isArray(x) && ('id' in x || 'order_no' in x)
}

/**
 * 详情接口在 `data` 之外还可能包 `order` / `record` 等一层；展开到带 `id` / `order_no` 的订单对象。
 */
function normalizeOrderDetailPayload(raw: unknown): OrderDetailResponse {
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

/**
 * 订单详情 `GET /orders/detail`，query：`order_id`；代客时另有 `telegram_id`，`user_id` 由全局拦截器注入（见 deeplinkStaffContext）。
 */
export async function fetchOrderDetail(orderId: string | number): Promise<OrderDetailResponse> {
  return normalizeOrderDetailPayload(
    await httpApi.get('/orders/detail', { params: buildOrderDetailRequestParams(orderId) }),
  )
}

/** 重新导出，便于与订单展示共用同一套映射 */
export { mapApiStatusToOrderStatus } from '@/utils/orderStatus'
