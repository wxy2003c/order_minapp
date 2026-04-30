/**
 * 订单详情 / 定制单回填：文本归一、`specs` / `imgs` 槽位、轮规行等纯函数。
 */
import type { OrderDetailBillItem, OrderDetailResponse, OrderListImageItem } from '@/utils/orderHelpers'
import { resolveOrderAssetUrl } from '@/utils/orderMedia'
import { normalizeInchDiamString } from '@/utils/wheelDiam'

export function str(v: unknown): string {
  if (v == null) return ''
  return String(v)
}

/** 备注/说明类字段；避免 `String(object)` → "[object Object]" */
export function asPlainText(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) {
    return v.map(x => asPlainText(x)).filter(s => s.length).join(' · ')
  }
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    const values = Object.values(o)
    if (values.length === 0) return ''
    const allScalar = values.every(
      x => x == null || ['string', 'number', 'boolean'].includes(typeof x),
    )
    if (allScalar) {
      return values
        .map(x => (x == null || x === '' ? '' : String(x).trim()))
        .filter(Boolean)
        .join(' ')
    }
    try {
      return JSON.stringify(o)
    } catch {
      return ''
    }
  }
  return String(v)
}

export function specGet(specs: Record<string, unknown> | undefined | null, key: string): string {
  if (!specs) return ''
  const x = specs[key]
  if (x == null) return ''
  return typeof x === 'object' ? JSON.stringify(x) : String(x)
}

const DESIGN_IMGS_CATEGORIES = ['color_sample', 'wheel_color', 'cover', 'front_mark'] as const

/** 正式图区不展示与说明区同类的 `imgs` 分类 */
export function isDesignSlotCategory(im: OrderListImageItem): boolean {
  const imX = im as OrderListImageItem & Record<string, unknown>
  for (const p of [imX.category, imX.category_label, imX.label, imX.section]) {
    const s = str(p).trim()
    if (!s) continue
    const n = s.toLowerCase().replace(/_label$/i, '')
    if (DESIGN_IMGS_CATEGORIES.includes(n as (typeof DESIGN_IMGS_CATEGORIES)[number])) return true
  }
  return false
}

export type ImgSlotValue = 'color_sample' | 'wheel_color' | 'cover' | 'front_mark'

/** 说明：造型/颜色取 order 根；中心盖/刻字取 specs */
export function getSlotDescText(
  d: Record<string, unknown> | null,
  sp: Record<string, unknown> | undefined,
  slot: ImgSlotValue,
): string {
  const raw
    = slot === 'color_sample' ? d?.['color_sample_desc']
      : slot === 'wheel_color' ? d?.['wheel_color_desc']
        : slot === 'cover' ? sp?.['中心盖']
          : sp?.['正面刻字']
  return asPlainText(raw ?? '')
}

export function imgItemMatchesSlot(item: OrderListImageItem, slot: ImgSlotValue): boolean {
  const im = item as OrderListImageItem & Record<string, unknown>
  for (const p of [im.category, im.category_label, im.label, im.section]) {
    const s = str(p).trim()
    if (!s) continue
    const sn = s.toLowerCase().replace(/_label$/i, '')
    if (sn === slot) return true
  }
  /** `category` 缺失时：`category_label` 中文与详情文案（如「中心盖参考图」）兜底 */
  const labelish = str(im.category_label ?? im.label ?? '').trim().toLowerCase()
  if (labelish) {
    if (slot === 'cover' && (labelish.includes('中心盖') || labelish.includes('center cap'))) return true
    if (slot === 'wheel_color' && (labelish.includes('轮毂颜色') || labelish.includes('颜色参考'))) return true
    if (slot === 'color_sample' && (labelish.includes('造型') || labelish.includes('色样'))) return true
    if (slot === 'front_mark' && (labelish.includes('刻字') || labelish.includes('正面'))) return true
  }
  return false
}

export function collectImgUrlsForSlot(d: OrderDetailResponse | null, slot: ImgSlotValue): string[] {
  if (!d?.imgs?.length) return []
  const out: string[] = []
  for (const im of d.imgs) {
    if (!imgItemMatchesSlot(im, slot)) continue
    const u = resolveOrderAssetUrl(im.url ?? im.path) || ''
    if (u) out.push(u)
  }
  return out
}

/** `imgs` 中某槽位的第一条原始项（便于取 `path` 回填 `finishCardImagePath` 等） */
export function firstOrderListImageForSlot(
  d: OrderDetailResponse | null,
  slot: ImgSlotValue,
): OrderListImageItem | undefined {
  if (!d?.imgs?.length) return undefined
  for (const im of d.imgs) {
    if (imgItemMatchesSlot(im, slot)) return im
  }
  return undefined
}

/** 从 `imgs.wheel_color` / `wheel_color_image[].name` 解析色卡匹配键（`code` 或 `finish:157`） */
export function parseWheelColorFinishLookupName(raw: unknown): { code: string | null; id: number | null } {
  const s = str(raw).trim()
  if (!s) return { code: null, id: null }
  const m = /^finish:(\d+)$/i.exec(s)
  if (m) {
    const id = Number(m[1])
    return { code: null, id: Number.isFinite(id) ? id : null }
  }
  if (/\.(png|jpe?g|webp|gif)(\?|$)/i.test(s)) return { code: null, id: null }
  return { code: s, id: null }
}

/** 订单详情上轮毂颜色槽位：优先 `imgs`，否则解析根字段 `wheel_color_image` JSON 数组首条 */
export function wheelColorFinishLookupFromOrder(
  d: OrderDetailResponse | null,
): { code: string | null; id: number | null } {
  if (!d) return { code: null, id: null }
  const im = firstOrderListImageForSlot(d, 'wheel_color')
  if (im) {
    const from = parseWheelColorFinishLookupName(im.name ?? im.label)
    if (from.code || from.id != null) return from
  }
  const o = d as Record<string, unknown>
  let rows: unknown[] = []
  const wci = o.wheel_color_image
  if (Array.isArray(wci)) rows = wci
  else if (typeof wci === 'string') {
    const t = wci.trim()
    if (t.startsWith('[')) {
      try {
        const p = JSON.parse(t) as unknown
        if (Array.isArray(p)) rows = p
      } catch {
        /* ignore */
      }
    }
  }
  const row0 = rows[0] as Record<string, unknown> | undefined
  if (!row0) return { code: null, id: null }
  return parseWheelColorFinishLookupName(row0.name ?? row0.label)
}

/** `cover` 槽位无图时：回退 `cover_image` / 可解析为图片 URL 的 `cover` 字符串 */
export function coverFallbackUrlsAfterSlots(d: OrderDetailResponse | null): string[] {
  if (!d) return []
  const ci = d.cover_image as OrderListImageItem[] | undefined
  if (Array.isArray(ci) && ci[0]) {
    const a = resolveOrderAssetUrl(ci[0].url || ci[0].path) || ''
    if (a) return [a]
  }
  const cov = str((d as { cover?: string }).cover)
  if (cov && /\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(cov)) {
    const a = resolveOrderAssetUrl(cov) || ''
    if (a) return [a]
  }
  return []
}

/** 根与 `specs` 上同一批键，取首段非空（VIN 等） */
export function fieldFromOrder(
  d: Record<string, unknown> | null,
  sp: Record<string, unknown> | undefined,
  keys: string[],
): string {
  if (!d) return ''
  for (const k of keys) {
    const v = d[k] ?? (sp ? sp[k] : undefined)
    if (v == null || v === '') continue
    const t0 = asPlainText(v)
    if (t0) return t0
  }
  return ''
}

export type WheelSpecRow = { labelKey: string; value: string }

export function buildWheelSpecRows(
  d: OrderDetailResponse | null,
  sp: Record<string, unknown> | undefined,
  end: 'f' | 'r',
  sizeOverride?: string,
  qtyOverride?: string,
  surfaceOverride?: string,
): WheelSpecRow[] {
  if (!d) return []
  const o = d as Record<string, unknown>
  const surfaceUnified
    = surfaceOverride !== undefined
      ? surfaceOverride
      : (str(o.appearance) || str(o.r_appearance) || specGet(sp, '表面处理') || '—')
  if (end === 'f') {
    const size
      = sizeOverride
        ?? (() => {
          const a = specGet(sp, '尺寸') || str(o.size_choice) || str(o.f_diam)
          return a.trim() || '—'
        })()
    const qty = qtyOverride ?? (str(o.f_qty) || specGet(sp, '前轮数量') || '—')
    const surface = surfaceUnified
    const etF
      = str(o.f_et).trim()
        || specGet(sp, '前轮ET').trim()
        || specGet(sp, '前ET').trim()
        || specGet(sp, 'ET').trim()
    const boltF
      = specGet(sp, '原车螺丝').trim()
        || str(o.f_oem_bolt).trim()
        || specGet(sp, '螺丝').trim()
    return [
      { labelKey: 'orderDetails.wheelSizeR', value: size },
      { labelKey: 'orderDetails.quantity', value: qty },
      {
        labelKey: 'orderDetails.wheelWidthJ',
        value: str(o.f_width) || specGet(sp, '前轮J值') || specGet(sp, '宽度') || '—',
      },
      { labelKey: 'orderDetails.wheelEt', value: etF || '—' },
      { labelKey: 'orderDetails.wheelPcd', value: str(o.f_pcd) || specGet(sp, 'PCD') || '—' },
      { labelKey: 'orderDetails.wheelCb', value: str(o.f_cb) || specGet(sp, 'CB') || '—' },
      { labelKey: 'orderDetails.wheelBolt', value: boltF || '—' },
      { labelKey: 'orderDetails.wheelHole', value: str(o.f_hole) || specGet(sp, '孔型') || '—' },
      { labelKey: 'orderDetails.wheelSurface', value: surface },
    ]
  }
  const sizeR
    = sizeOverride
      ?? (() => {
        const raw = specGet(sp, '后轮尺寸') || str(o.r_diam)
        const n = normalizeInchDiamString(String(raw)) || str(raw)
        return n.trim() || '—'
      })()
  const qtyR = qtyOverride ?? (str(o.r_qty) || specGet(sp, '后轮数量') || '—')
  const surfaceR = surfaceUnified
  const etR
    = str(o.r_et).trim()
      || specGet(sp, '后轮ET').trim()
      || specGet(sp, '后ET').trim()
      || specGet(sp, 'ET').trim()
  const boltR
    = specGet(sp, '后轮原车螺丝').trim()
      || specGet(sp, '原车螺丝').trim()
      || str(o.r_oem_bolt).trim()
      || specGet(sp, '后螺丝').trim()
      || specGet(sp, '螺丝').trim()
  const widthR = str(o.r_width) || specGet(sp, '后轮J值') || '—'
  const pcdR = str(o.r_pcd) || specGet(sp, '后轮PCD') || specGet(sp, 'PCD') || '—'
  const cbR = str(o.r_cb) || specGet(sp, '后轮CB') || specGet(sp, 'CB') || '—'
  const holeR = str(o.r_hole) || specGet(sp, '孔型') || '—'
  return [
    { labelKey: 'orderDetails.wheelSizeR', value: sizeR },
    { labelKey: 'orderDetails.quantity', value: qtyR },
    { labelKey: 'orderDetails.wheelWidthJ', value: widthR },
    { labelKey: 'orderDetails.wheelEt', value: etR || '—' },
    { labelKey: 'orderDetails.wheelPcd', value: pcdR },
    { labelKey: 'orderDetails.wheelCb', value: cbR },
    { labelKey: 'orderDetails.wheelBolt', value: boltR || '—' },
    { labelKey: 'orderDetails.wheelHole', value: holeR },
    { labelKey: 'orderDetails.wheelSurface', value: surfaceR },
  ]
}

export function splitWheelSpecHeadRest(rows: WheelSpecRow[]) {
  return { head: rows.slice(0, 2), rest: rows.slice(2) }
}

export function isWheelsIdenticalOrder(d: OrderDetailResponse | null): boolean {
  if (!d) return true
  const o = d as Record<string, unknown>
  const specs = o.specs && typeof o.specs === 'object' && !Array.isArray(o.specs) ? (o.specs as Record<string, unknown>) : null
  const specsModeRaw = specs?.spec_mode
  const specModeFromSpecs = typeof specsModeRaw === 'string' ? specsModeRaw.trim().toLowerCase() : ''
  const sm
    = str((d as { spec_mode?: string }).spec_mode).trim().toLowerCase()
      || specModeFromSpecs
  if (sm === 'split' || sm === '分轮') return false
  if (sm === 'same' || sm === 'mirror' || sm === 'same_front_rear') return true

  const g = (k: string) => str(o[k]).trim()
  const rearEmpty
    = !g('r_diam') && !g('r_width') && !g('r_et') && !g('r_pcd') && !g('r_cb')
      && !g('r_qty') && !g('r_hole') && !g('r_oem_bolt')
  if (rearEmpty) return true

  const appF = g('appearance')
  const appR = g('r_appearance') || appF
  return (
    g('f_diam') === g('r_diam')
    && g('f_width') === g('r_width')
    && g('f_et') === g('r_et')
    && g('f_pcd') === g('r_pcd')
    && g('f_cb') === g('r_cb')
    && g('f_hole') === g('r_hole')
    && g('f_qty') === g('r_qty')
    && g('f_oem_bolt') === g('r_oem_bolt')
    && appF === appR
  )
}

/** `specs['特殊要求']` */
export function getSpecialReqFromSpecs(sp: Record<string, unknown> | undefined): string {
  if (!sp) return ''
  return asPlainText(sp['特殊要求'])
}

/**
 * 订单详情里「可能是 JSON 字符串 / `{ data | items | list | rows }`」的字段，规范成数组。
 */
export function normalizeToArray(raw: unknown): unknown[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return []
    try {
      const v = JSON.parse(s) as unknown
      return normalizeToArray(v)
    }
    catch {
      return []
    }
  }
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    for (const k of ['data', 'items', 'list', 'rows'] as const) {
      const x = o[k]
      if (Array.isArray(x)) return x
    }
  }
  return []
}

/** `car_model_imgs` 等车图列表（接口可能给字符串 JSON；偶尔单对象非数组） */
export function normalizeOrderImageItemArray(raw: unknown): OrderListImageItem[] {
  const arr = normalizeToArray(raw)
  if (arr.length) return arr.filter(x => x != null && typeof x === 'object') as OrderListImageItem[]
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    if (str(o.url || o.path).trim()) return [raw as OrderListImageItem]
  }
  return []
}

function billRowDisplayLabel(o: Record<string, unknown>): string {
  const label = str(o.label || o.title || o.name).trim()
  if (label) return label
  return str(o.key || o.code || o.type).trim()
}

function billRowAmount(o: Record<string, unknown>): unknown {
  return o.amount ?? o.money ?? o.value ?? o.price ?? o.total
}

/**
 * 将任意「账单分项」数组收成统一结构；兼容 `label`/`title`/`name`，缺省时用 `key`/`code` 展示。
 */
export function normalizeBillItemsArray(arr: unknown[]): OrderDetailBillItem[] {
  const out: OrderDetailBillItem[] = []
  for (const x of arr) {
    if (!x || typeof x !== 'object') continue
    const o = x as Record<string, unknown>
    const label = billRowDisplayLabel(o)
    if (!label) continue
    const amount = billRowAmount(o)
    const hasAmountKey = ['amount', 'money', 'value', 'price', 'total'].some(k => k in o && o[k] != null && String(o[k]).trim() !== '')
    if (!hasAmountKey && amount == null) continue
    out.push({
      key: str(o.key || o.code).trim() || undefined,
      label,
      amount: (amount ?? '') as number | string,
    })
  }
  return out
}

const BILL_DISCOVERY_SKIP = new Set([
  'specs',
  'imgs',
  'design_imgs',
  'car_model_imgs',
  'cover_image',
  'color_sample',
  'wheel_color_image',
  'front_mark_image',
])

function billDiscoveryKeyScore(key: string): number {
  if (/bill|billing|payment|amount|fee|deposit|balance|price|分期|账单|款项|定金|尾款|生产|费用/i.test(key)) return 100
  return 0
}

/**
 * 在订单根对象及 `specs` 下扫描：第一个看起来像「多项金额」的数组即作为账单分项（不写死单字段名）。
 */
export function discoverBillItemsInDetail(d: Record<string, unknown> | null): OrderDetailBillItem[] {
  if (!d) return []
  let best: OrderDetailBillItem[] = []
  let bestScore = -1

  const consider = (raw: unknown, key: string) => {
    const arr = normalizeToArray(raw)
    if (!arr.length) return
    const rows = normalizeBillItemsArray(arr)
    if (!rows.length) return
    const sc = billDiscoveryKeyScore(key) + rows.length * 0.001
    if (sc > bestScore) {
      bestScore = sc
      best = rows
    }
  }

  for (const [k, v] of Object.entries(d)) {
    if (BILL_DISCOVERY_SKIP.has(k)) continue
    consider(v, k)
  }

  const sp = d.specs
  if (sp && typeof sp === 'object' && !Array.isArray(sp)) {
    for (const [k, v] of Object.entries(sp as Record<string, unknown>)) {
      consider(v, k)
    }
  }

  return best
}
