/**
 * 深链上下文：优先读 Pinia `staffDeeplink`，回退 session（HTTP 无异步组件时）。
 */
import { getActivePinia } from 'pinia'
import { readStaffSnapshotFromSession, useStaffDeeplinkStore } from '@/stores/staffDeeplink'
import { getTelegramUserId } from '@/utils/userTelegram'

type StaffStore = ReturnType<typeof useStaffDeeplinkStore>

/** 从 Pinia store 读取字符串字段，Pinia 未就绪时返回空字符串 */
function readFromStore(selector: (s: StaffStore) => string): string {
  try {
    const pinia = getActivePinia()
    if (!pinia) return ''
    return selector(useStaffDeeplinkStore(pinia))
  } catch {
    return ''
  }
}

export function readStaffPlatformUid(): string {
  return readFromStore(s => String(s.platformUid ?? '').trim())
    || readStaffSnapshotFromSession().platformUid
}

export function readStaffCustomerTelegramId(): string {
  return readFromStore(s => String(s.customerTelegramId ?? '').trim())
    || readStaffSnapshotFromSession().customerTelegramId
}

export function readStaffCustomerDisplayName(): string {
  return readFromStore(s => String(s.customerDisplayName ?? '').trim())
    || readStaffSnapshotFromSession().customerDisplayName
}

/**
 * 全局 Axios query 默认 `user_id`：
 * - 无深链 / `create` 深链：`user_id` = 当前 Telegram（SDK）
 * - `manage` 深链：`user_id` = 链接 uid（列表、详情页 API 均使用）；
 *   从列表进入创建订单后 uid 已转为 `customerTelegramId`，`user_id` 回退至 SDK
 */
export function resolveHttpDefaultUserId(): string {
  return readStaffPlatformUid() || getTelegramUserId().trim()
}

/**
 * 订单详情 `GET /orders/detail`：必有 `order_id`。
 */
export function buildOrderDetailRequestParams(orderId: string | number): Record<string, string | number> {
  return { order_id: orderId }
}

/**
 * 下单 body 的 `user_id`：永远取当前操作者 Telegram（SDK），不使用客户 ID。
 */
export function resolveOrderSubmitPlatformUserId(): string {
  return getTelegramUserId().trim()
}
