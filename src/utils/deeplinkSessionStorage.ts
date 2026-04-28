/** 与 Pinia `staffDeeplink` 同步的 sessionStorage，供 HTTP 拦截器在无 Vue 上下文时读取 */

const K_PLATFORM_UID = 'wl_deeplink_platform_uid'
const K_CUSTOMER_TELEGRAM_ID = 'wl_deeplink_customer_telegram_id'
const K_CUSTOMER_DISPLAY_NAME = 'wl_deeplink_customer_display_name'

export function persistStaffDeepLinkContext(
  platformUid: string,
  telegramCustomerId: string,
  displayName?: string | null,
): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    const p = String(platformUid ?? '').trim()
    const t = String(telegramCustomerId ?? '').trim()
    if (p) sessionStorage.setItem(K_PLATFORM_UID, p)
    else sessionStorage.removeItem(K_PLATFORM_UID)
    if (t) sessionStorage.setItem(K_CUSTOMER_TELEGRAM_ID, t)
    else sessionStorage.removeItem(K_CUSTOMER_TELEGRAM_ID)
    const n = String(displayName ?? '').trim()
    if (n) sessionStorage.setItem(K_CUSTOMER_DISPLAY_NAME, n)
    else sessionStorage.removeItem(K_CUSTOMER_DISPLAY_NAME)
  } catch {
    /* ignore */
  }
}

export function readStaffSnapshotFromSession(): {
  platformUid: string
  customerTelegramId: string
  customerDisplayName: string
} {
  if (typeof sessionStorage === 'undefined') {
    return { platformUid: '', customerTelegramId: '', customerDisplayName: '' }
  }
  try {
    return {
      platformUid: String(sessionStorage.getItem(K_PLATFORM_UID) ?? '').trim(),
      customerTelegramId: String(sessionStorage.getItem(K_CUSTOMER_TELEGRAM_ID) ?? '').trim(),
      customerDisplayName: String(sessionStorage.getItem(K_CUSTOMER_DISPLAY_NAME) ?? '').trim(),
    }
  } catch {
    return { platformUid: '', customerTelegramId: '', customerDisplayName: '' }
  }
}
