/**
 * 深链业务读取：优先 Pinia，回退 session（与 `staffDeeplink` store 内联的 session 同源）。
 */
import { getActivePinia } from 'pinia'
import {
  readStaffSnapshotFromSession,
  useStaffDeeplinkStore,
} from '@/stores/staffDeeplink'
import { getTelegramUserId } from '@/utils/userTelegram'

export { persistStaffDeepLinkContext, readStaffSnapshotFromSession } from '@/stores/staffDeeplink'

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
  return ('8482195832' || '').trim()
}

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

export function resolveOrderSubmitPlatformUserId(customerTelegramFromForm: string): string {
  const p = readStaffPlatformUid()
  if (p) return p
  return String(customerTelegramFromForm ?? '').trim()
}
