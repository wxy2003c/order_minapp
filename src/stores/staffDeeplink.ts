import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const K_PLATFORM_UID = 'wl_deeplink_platform_uid'
const K_CUSTOMER_TELEGRAM_ID = 'wl_deeplink_customer_telegram_id'
const K_CUSTOMER_DISPLAY_NAME = 'wl_deeplink_customer_display_name'

/** 与 Pinia 状态同步写入 session，供无 Vue 上下文处读取 */
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

/**
 * Bot 深链（start_param）：平台 user_id、客户 telegram_id / 昵称；
 * 着陆页不显示返回（仅可前进），离开着陆路由后恢复返回键。
 */
export const useStaffDeeplinkStore = defineStore('staffDeeplink', () => {
  const s0 = readStaffSnapshotFromSession()
  const platformUid = ref(s0.platformUid)
  const customerTelegramId = ref(s0.customerTelegramId)
  const customerDisplayName = ref(s0.customerDisplayName)

  /** 本次会话是否由带 `tgWebAppStartParam` 的深链写入 */
  const openedViaTelegramStartParam = ref(false)
  /** 深链 replace 后的首屏 fullPath */
  const landingFullPath = ref<string | null>(null)
  /** 已离开着陆页（含列表→详情） */
  const navigatedPastLanding = ref(false)

  /**
   * 订单详情：`GET /orders/detail` 经由全局 query 的 `user_id` 改为当前打开者 Telegram；
   * 客户身份用同请求上的 `telegram_id` 传递（见 `buildOrderDetailRequestParams`）。
   */
  const httpUserIdUsesSelfTelegram = ref(false)

  const allowHistoryBack = computed(() => {
    if (!openedViaTelegramStartParam.value) return true
    return navigatedPastLanding.value
  })

  function syncSessionFromState() {
    persistStaffDeepLinkContext(
      platformUid.value,
      customerTelegramId.value,
      customerDisplayName.value || null,
    )
  }

  function setStaffContext(
    p: { platformUid: string; customerTelegramId: string; customerDisplayName?: string | null },
    opts?: { fromTelegramStartParam?: boolean },
  ) {
    platformUid.value = String(p.platformUid ?? '').trim()
    customerTelegramId.value = String(p.customerTelegramId ?? '').trim()
    customerDisplayName.value = String(p.customerDisplayName ?? '').trim()
    syncSessionFromState()
    if (opts?.fromTelegramStartParam) {
      openedViaTelegramStartParam.value = true
      landingFullPath.value = null
      navigatedPastLanding.value = false
    }
  }

  /** deep link 内 `router.replace` 之后调用，锁定着陆 path */
  function setLandingRoute(fullPath: string) {
    const fp = String(fullPath ?? '').trim() || '/'
    landingFullPath.value = fp
    navigatedPastLanding.value = false
  }

  function onRouteFullPathChange(toFullPath: string) {
    if (!openedViaTelegramStartParam.value) return
    const to = String(toFullPath ?? '').trim() || '/'
    if (landingFullPath.value == null) {
      landingFullPath.value = to
      return
    }
    if (to !== landingFullPath.value) navigatedPastLanding.value = true
  }

  function hydrateFromSessionOnly() {
    const s = readStaffSnapshotFromSession()
    platformUid.value = s.platformUid
    customerTelegramId.value = s.customerTelegramId
    customerDisplayName.value = s.customerDisplayName
  }

  function setHttpUserIdUsesSelfTelegram(useSelf: boolean) {
    httpUserIdUsesSelfTelegram.value = useSelf
  }

  /** 无深链入口时清空代客会话，避免上轮 `user_id` 仍指向平台 uid */
  function clearDeepLinkSession() {
    platformUid.value = ''
    customerTelegramId.value = ''
    customerDisplayName.value = ''
    openedViaTelegramStartParam.value = false
    landingFullPath.value = null
    navigatedPastLanding.value = false
    httpUserIdUsesSelfTelegram.value = false
    persistStaffDeepLinkContext('', '', null)
  }

  /** 订单详情拉取后对齐客户 telegram（代客改单） */
  function patchCustomerFromOrderDetail(telegramId: string, displayName?: string | null) {
    const tid = String(telegramId ?? '').trim()
    if (!tid) return
    customerTelegramId.value = tid
    const n = String(displayName ?? '').trim()
    if (n) customerDisplayName.value = n
    syncSessionFromState()
  }

  return {
    platformUid,
    customerTelegramId,
    customerDisplayName,
    openedViaTelegramStartParam,
    landingFullPath,
    navigatedPastLanding,
    httpUserIdUsesSelfTelegram,
    allowHistoryBack,
    setStaffContext,
    setHttpUserIdUsesSelfTelegram,
    clearDeepLinkSession,
    setLandingRoute,
    onRouteFullPathChange,
    hydrateFromSessionOnly,
    syncSessionFromState,
    patchCustomerFromOrderDetail,
  }
})
