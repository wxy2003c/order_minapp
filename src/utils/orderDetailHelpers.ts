/**
 * 订单详情 / 定制单回填：文本归一、`specs` / `imgs` 槽位、轮规行等纯函数。
 */
import type { OrderDetailResponse, OrderListImageItem } from '@/api/orders'
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
  for (const p of [imX.category_label, imX.label, imX.category, imX.section]) {
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
  for (const p of [im.category_label, im.label, im.category, im.section]) {
    const s = str(p).trim()
    if (!s) continue
    if (s.toLowerCase().replace(/_label$/i, '') === slot) return true
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
  if (end === 'f') {
    const size
      = sizeOverride
        ?? (() => {
          const a = specGet(sp, '尺寸') || str(o.size_choice) || str(o.f_diam)
          return a.trim() || '—'
        })()
    const qty = qtyOverride ?? (str(o.f_qty) || specGet(sp, '前轮数量') || '—')
    const surface
      = surfaceOverride
        ?? (str(o.appearance) || specGet(sp, '表面处理') || '—')
    return [
      { labelKey: 'orderDetails.wheelSizeR', value: size },
      { labelKey: 'orderDetails.quantity', value: qty },
      {
        labelKey: 'orderDetails.wheelWidthJ',
        value: str(o.f_width) || specGet(sp, '宽度') || specGet(sp, '前轮J值') || '—',
      },
      { labelKey: 'orderDetails.wheelEt', value: str(o.f_et) || specGet(sp, 'ET') || '—' },
      { labelKey: 'orderDetails.wheelPcd', value: str(o.f_pcd) || specGet(sp, 'PCD') || '—' },
      { labelKey: 'orderDetails.wheelCb', value: str(o.f_cb) || specGet(sp, 'CB') || '—' },
      { labelKey: 'orderDetails.wheelBolt', value: str(o.f_oem_bolt) || specGet(sp, '螺丝') || '—' },
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
  const surfaceR
    = surfaceOverride
      ?? (str(o.r_appearance) || str(o.appearance) || '—')
  return [
    { labelKey: 'orderDetails.wheelSizeR', value: sizeR },
    { labelKey: 'orderDetails.quantity', value: qtyR },
    { labelKey: 'orderDetails.wheelWidthJ', value: str(o.r_width) || '—' },
    { labelKey: 'orderDetails.wheelEt', value: str(o.r_et) || '—' },
    { labelKey: 'orderDetails.wheelPcd', value: str(o.r_pcd) || '—' },
    { labelKey: 'orderDetails.wheelCb', value: str(o.r_cb) || '—' },
    { labelKey: 'orderDetails.wheelBolt', value: str(o.r_oem_bolt) || '—' },
    { labelKey: 'orderDetails.wheelHole', value: str(o.r_hole) || '—' },
    { labelKey: 'orderDetails.wheelSurface', value: surfaceR },
  ]
}

export function splitWheelSpecHeadRest(rows: WheelSpecRow[]) {
  return { head: rows.slice(0, 2), rest: rows.slice(2) }
}

export function isWheelsIdenticalOrder(d: OrderDetailResponse | null): boolean {
  if (!d) return true
  const sm = str((d as { spec_mode?: string }).spec_mode).trim().toLowerCase()
  if (sm === 'split' || sm === '分轮') return false
  if (sm === 'same' || sm === 'mirror' || sm === 'same_front_rear') return true

  const o = d as Record<string, unknown>
  const g = (k: string) => str(o[k]).trim()
  const rearEmpty
    = !g('r_diam') && !g('r_width') && !g('r_et') && !g('r_pcd') && !g('r_cb')
      && !g('r_qty') && !g('r_hole') && !g('r_oem_bolt') && !g('r_appearance')
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
