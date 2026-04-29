import type { OrderListItem } from '@/utils/orderHelpers'
import { resolveOrderAssetUrl } from '@/utils/orderMedia'

/**
 * 订单列表卡片：时间展示 `YYYY-MM-DD HH:mm`
 */
export function formatOrderListDateTime(raw: string | undefined): string {
  if (!raw || !String(raw).trim()) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return String(raw)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

const SPECS_DISPLAY_SKIP_KEYS = new Set(['spec_mode'])

/**
 * 直接展示接口 `specs` 对象（`键: 值` 以 ` | ` 拼接）；超出由卡片上 `line-clamp` 省略显示。
 */
export function orderRowSpecsText(row: OrderListItem): string {
  const s = row.specs
  if (!s || typeof s !== 'object' || Array.isArray(s)) return ''
  const o = s as Record<string, unknown>
  const parts: string[] = []
  for (const k of Object.keys(o).sort()) {
    if (SPECS_DISPLAY_SKIP_KEYS.has(k)) continue
    const v = o[k]
    if (v === null || v === undefined) continue
    const text = typeof v === 'object' ? JSON.stringify(v) : String(v)
    const t = text.trim()
    if (!t) continue
    parts.push(`${k}: ${t}`)
  }
  return parts.join(' | ')
}

export function orderRowThumbSrc(row: OrderListItem): string | null {
  const first = row.design_imgs?.[0] ?? row.imgs?.[0] ?? row.car_model_imgs?.[0]
  const raw = first?.url ?? first?.path
  return resolveOrderAssetUrl(typeof raw === 'string' ? raw : null)
}

export function orderRowAvatarSrc(row: OrderListItem): string | null {
  return resolveOrderAssetUrl(row.telegram_avatar ?? null)
}

export function orderRowDisplayName(row: OrderListItem): string {
  return String(row.telegram_nickname || row.customer || '—').trim() || '—'
}

export function orderRowDateText(row: OrderListItem): string {
  return formatOrderListDateTime(row.updated_at || row.order_date)
}
