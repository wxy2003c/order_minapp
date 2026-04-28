/**
 * 深链上下文：优先读 Pinia `staffDeeplink`，回退 session（HTTP 无异步组件时）。
 */
import { getActivePinia } from 'pinia'
import { useStaffDeeplinkStore } from '@/stores/staffDeeplink'
import { getTelegramUserId } from '@/utils/userTelegram'
import { readStaffSnapshotFromSession } from '@/utils/deeplinkSessionStorage'

export { persistStaffDeepLinkContext } from '@/utils/deeplinkSessionStorage'

function readFromStorePlatform(): string {
  try {
    const pinia = getActivePinia()
    if (!pinia) return ''
    const s = useStaffDeeplinkStore(pinia)
    return String(s.platformUid ?? '').trim()
  } catch {
    return ''
  }
}

function readFromStoreCustomerTg(): string {
  try {
    const pinia = getActivePinia()
    if (!pinia) return ''
    const s = useStaffDeeplinkStore(pinia)
    return String(s.customerTelegramId ?? '').trim()
  } catch {
    return ''
  }
}

function readFromStoreCustomerName(): string {
  try {
    const pinia = getActivePinia()
    if (!pinia) return ''
    const s = useStaffDeeplinkStore(pinia)
    return String(s.customerDisplayName ?? '').trim()
  } catch {
    return ''
  }
}

export function readStaffPlatformUid(): string {
  return readFromStorePlatform() || readStaffSnapshotFromSession().platformUid
}

export function readStaffCustomerTelegramId(): string {
  return readFromStoreCustomerTg() || readStaffSnapshotFromSession().customerTelegramId
}

export function readStaffCustomerDisplayName(): string {
  return readFromStoreCustomerName() || readStaffSnapshotFromSession().customerDisplayName
}

/**
 * 全局 Axios query 默认 `user_id`：
 * - 无深链或普通页：`user_id`=当前 Telegram
 * - `create_` / `manage_`：`user_id`=深链第一段平台 uid（与列表拉单、`POST` 下单等一致）
 * - `/OrderDetails` 且代客流：`user_id`=当前 Telegram，客户 id 单独走 `telegram_id`（见下单体与详情 query）
 */
export function resolveHttpDefaultUserId(): string {
  try {
    const pinia = getActivePinia()
    if (pinia) {
      const sd = useStaffDeeplinkStore(pinia)
      if (sd.httpUserIdUsesSelfTelegram) {
        return (getTelegramUserId() || '').trim()
      }
    }
  } catch {
    /* Pinia 未就绪时走下方 */
  }
  const p = readStaffPlatformUid()
  if (p) return p
  return (getTelegramUserId() || '').trim()
}

/**
 * 订单详情 `GET /orders/detail`：必有 `order_id`；当代客进入详情时再带 `telegram_id`（与客户订单绑定）。
 */
export function buildOrderDetailRequestParams(orderId: string | number): Record<string, string | number> {
  const params: Record<string, string | number> = { order_id: orderId }
  try {
    const pinia = getActivePinia()
    if (!pinia) return params
    const sd = useStaffDeeplinkStore(pinia)
    if (!sd.httpUserIdUsesSelfTelegram) return params
    const tg = String(sd.customerTelegramId ?? '').trim()
    if (tg) params.telegram_id = tg
  } catch {
    /* ignore */
  }
  return params
}

/**
 * 下单 body 的 `user_id`：平台账号 id；无深链时与历史行为一致为客商 telegram（与 customerId 同源）。
 */
export function resolveOrderSubmitPlatformUserId(customerTelegramFromForm: string): string {
  const p = readStaffPlatformUid()
  if (p) return p
  return String(customerTelegramFromForm ?? '').trim()
}
