import type { Router } from 'vue-router'
import { useStaffDeeplinkStore } from '@/stores/staffDeeplink'
import { getTelegramWebApp, getTelegramUserId } from '@/utils/userTelegram'

const LINK_DEBUG_TAG = '[TMA link]'

function decodeUriComponent(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '))
  }
  catch {
    return s
  }
}

function tryParseJsonString(s: string): unknown {
  const t = s.trim()
  if (!t) return t
  if (!t.startsWith('{') && !t.startsWith('[')) return t
  try {
    return JSON.parse(t) as unknown
  }
  catch {
    return t
  }
}

/** 将 `#` 后整段按 `&` 粗切为 `key=value`（tgWebAppData 含 `user={...}` 时比直接 URLSearchParams 更稳） */
function parseHashToRawParams(hash: string): Record<string, string> {
  const h = hash.replace(/^#/, '')
  if (!h) return {}
  const out: Record<string, string> = {}
  for (const segment of h.split('&')) {
    const i = segment.indexOf('=')
    if (i <= 0) continue
    const key = segment.slice(0, i)
    const val = segment.slice(i + 1)
    if (out[key] == null) out[key] = val
  }
  return out
}

function buildDecodedLinkDebugSnapshot(): {
  searchParamsDecoded: Record<string, string>
  hashParamsRaw: Record<string, string>
  hashParamsDecoded: Record<string, unknown>
} {
  if (typeof window === 'undefined') {
    return { searchParamsDecoded: {}, hashParamsRaw: {}, hashParamsDecoded: {} }
  }

  const searchParamsDecoded: Record<string, string> = {}
  new URLSearchParams(window.location.search).forEach((v, k) => {
    searchParamsDecoded[k] = decodeUriComponent(v)
  })

  const hashParamsRaw = parseHashToRawParams(window.location.hash)
  const hashParamsDecoded: Record<string, unknown> = {}

  for (const [k, enc] of Object.entries(hashParamsRaw)) {
    const dec = decodeUriComponent(enc)
    if (k === 'tgWebAppThemeParams') {
      hashParamsDecoded[k] = tryParseJsonString(dec)
    }
    else if (k === 'tgWebAppData' && dec.startsWith('user=')) {
      const jsonPart = dec.slice('user='.length)
      hashParamsDecoded[k] = { user: tryParseJsonString(jsonPart) }
    }
    else if (k === 'auth_date' && /^\d+$/.test(dec)) {
      hashParamsDecoded[k] = Number.parseInt(dec, 10)
    }
    else if (k === 'tgWebAppBotInline' && (dec === '0' || dec === '1')) {
      hashParamsDecoded[k] = dec === '1'
    }
    else {
      hashParamsDecoded[k] = dec
    }
  }

  return { searchParamsDecoded, hashParamsRaw, hashParamsDecoded }
}

/**
 * 在 Telegram / 浏览器控制台查看链接与 start_param 解析结果（调试用）
 */
export function logTelegramLinkParams(
  phase: string,
  extra?: { routeQuery?: Record<string, unknown> },
): void {
  if (typeof window === 'undefined') return

  const tg = getTelegramWebApp()
  const sp = new URLSearchParams(window.location.search)
  const allQuery: Record<string, string> = {}
  sp.forEach((v, k) => {
    allQuery[k] = v
  })

  const u = tg?.initDataUnsafe?.user
  const startUnsafe = tg?.initDataUnsafe?.start_param
  const startResolved = getTelegramStartParam()
  const createParsed = parseCreateStaffToken(startResolved)
  const manageParsed = parseManageStaffToken(startResolved)
  const orderParsed = parseOrderStartParam(startResolved)
  const collected = collectOrderDeepLinkFromLocation()
  const decoded = buildDecodedLinkDebugSnapshot()

  let initDataUnsafeDecoded: unknown = null
  try {
    initDataUnsafeDecoded
      = tg?.initDataUnsafe != null
        ? (JSON.parse(JSON.stringify(tg.initDataUnsafe)) as unknown)
        : null
  }
  catch {
    initDataUnsafeDecoded = tg?.initDataUnsafe ?? null
  }

  /** 无 start 打开时与「带 order_ 深链」时的对照说明 */
  const note
    = !startResolved
      && !collected
      && !Object.keys(allQuery).length
      ? '无 start 时 start_param 为空是正常现象（从菜单/聊天按钮直接打开、未用 t.me/bot?startapp=…）。'
        + ' hash 里多为 user、auth、theme。深链：`manage_平台uid_客户telegram`、`create_…`、`order_…`（start_param / ?create=）。'
      : undefined

  // eslint-disable-next-line no-console
  console.log(LINK_DEBUG_TAG, phase, {
    href: window.location.href,
    search: window.location.search,
    hash: (window.location.hash && window.location.hash.length > 200)
      ? `${window.location.hash.slice(0, 200)}…(truncated, total ${window.location.hash.length} chars)`
      : (window.location.hash || '(empty)'),
    locationQuery: allQuery,
    searchParamsDecoded: decoded.searchParamsDecoded,
    hashParamsDecoded: decoded.hashParamsDecoded,
    hashParamsRawKeys: Object.keys(decoded.hashParamsRaw),
    initDataUnsafeDecoded,
    'initDataUnsafe.user (摘要)': u
      ? { id: u.id, first_name: u.first_name, last_name: u.last_name, username: u.username, language_code: u.language_code }
      : null,
    'initDataUnsafe.start_param': typeof startUnsafe === 'string' ? startUnsafe : startUnsafe === undefined ? '(undefined)' : String(startUnsafe),
    getTelegramStartParam: startResolved || '(empty)',
    parseCreateStaffToken: createParsed,
    parseManageStaffToken: manageParsed,
    parseOrderStartParam: orderParsed,
    collectOrderDeepLink: collected,
    note,
    ...extra,
  })
}

function parseParamBlock(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  const s = (raw || '').replace(/^[?#]/, '')
  const sp = new URLSearchParams(s)
  for (const [k, v] of sp.entries()) {
    if (out[k] == null) out[k] = v
  }
  return out
}

/** hash 中若出现 `start_param=xxx`（与 tgWebAppData 的复杂嵌套无关），整段子串直接取出 */
function tryStartParamFromHashString(hash: string): string {
  if (!hash) return ''
  const m = /(?:^|[#&?])start_param=([^&]+)/.exec(hash)
  if (!m) return ''
  try {
    return decodeURIComponent(m[1]!)
  }
  catch {
    return m[1]!
  }
}

/**
 * 与 TMA 文档/常见调试页一致：优先 initDataUnsafe.start_param，其次 ?tgWebAppStartParam=，再尝试 hash 内 tgWebAppData
 * @see https://core.telegram.org/bots/webapps#initializing-mini-apps
 */
export function getTelegramStartParam(): string {
  const tg = getTelegramWebApp() as any
  const fromUnsafe = tg?.initDataUnsafe?.start_param
  if (typeof fromUnsafe === 'string' && fromUnsafe)
    return fromUnsafe

  if (typeof window === 'undefined')
    return ''

  const sp = new URLSearchParams(window.location.search)
  const fromSearch = sp.get('tgWebAppStartParam')
  if (fromSearch)
    return fromSearch

  const hash = window.location.hash
  if (hash) {
    const fromKey = tryStartParamFromHashString(hash)
    if (fromKey)
      return fromKey

    const hashParams = parseParamBlock(hash)
    if (hashParams.tgWebAppData) {
      const inner = parseParamBlock(hashParams.tgWebAppData)
      if (inner.start_param)
        return inner.start_param
    }
  }
  return ''
}

function base64UrlToUtf8(s: string): string {
  try {
    const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : ''
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++)
      bytes[i] = bin.charCodeAt(i)
    return new TextDecoder().decode(bytes)
  }
  catch {
    return ''
  }
}

export interface OrderDeepLinkPayload {
  /** 业务侧用户 ID（十进制数字串） */
  uid: string
  /** 展示名；可与 uid 分开展示或写入备注 */
  name: string
}

/**
 * `startapp` 单段参数，建议由 Bot 生成：
 * - `order_<uid>` — 仅用户 ID
 * - `order_<uid>_<base64url(UTF-8 姓名)>` — 带姓名（避免 `_` 与冲突，姓名走 base64url）
 * 例：`order_12345`、`order_12345_5Y2g5LqM`（“张三” 的 base64url）
 */
export function parseOrderStartParam(startParam: string): OrderDeepLinkPayload | null {
  const m = /^order_(\d+)(?:_(.+))?$/.exec((startParam || '').trim())
  if (!m)
    return null
  const uid = m[1]!
  let name = ''
  if (m[2]) {
    const decoded = base64UrlToUtf8(m[2])
    name = decoded || m[2]
  }
  return { uid, name }
}

/**
 * 解析 `create_<customer_id>_<chat_id>[_<base64url昵称>]`（第三段可选，UTF-8 base64url）。
 *
 * 字段语义：
 * - `platformUid`        → 第一段，客户的 Telegram ID（即表单 `telegram_id`；`user_id` 由 SDK 提供）
 * - `telegramCustomerId` → 第二段，chat_id，不使用
 * - `displayName`        → 第三段，base64url 编码的客户昵称（Bot 生成链接时可携带）
 */
export interface StaffCreateDeepLink {
  platformUid: string
  telegramCustomerId: string
  displayName: string
}

export function parseCreateStaffToken(raw: string): StaffCreateDeepLink | null {
  const m = /^create_(\d+)_(\d+)(?:_(.+))?$/.exec((raw || '').trim())
  if (!m) return null
  let displayName = ''
  if (m[3]) {
    const decoded = base64UrlToUtf8(m[3])
    displayName = decoded || m[3]
  }
  return {
    platformUid: m[1]!,
    telegramCustomerId: m[2]!,
    displayName,
  }
}

/** `manage_<平台user_id>_<客户telegram_id>` → 订单列表用平台 user_id，客户 id 写入 session 供 telegram_id */
export function parseManageStaffToken(
  raw: string,
): { platformUid: string; telegramCustomerId: string } | null {
  const m = /^manage_(\d+)_(\d+)$/.exec((raw || '').trim())
  if (!m) return null
  return { platformUid: m[1]!, telegramCustomerId: m[2]! }
}

function collectOrderDeepLinkFromLocation(): OrderDeepLinkPayload | null {
  const start = getTelegramStartParam()

  const fromCreateStart = parseCreateStaffToken(start)
  if (fromCreateStart) {
    return {
      uid: fromCreateStart.platformUid,
      name: fromCreateStart.telegramCustomerId,
    }
  }

  if (typeof window !== 'undefined') {
    const createQuery = new URLSearchParams(window.location.search).get('create')
    if (createQuery) {
      const fromCreateQuery = parseCreateStaffToken(createQuery)
      if (fromCreateQuery) {
        return {
          uid: fromCreateQuery.platformUid,
          name: fromCreateQuery.telegramCustomerId,
        }
      }
    }
  }

  const fromOrder = parseOrderStartParam(start)
  if (fromOrder) return fromOrder

  return null
}

function commitStaffDeepLinkAndLanding(
  router: Router,
  platformUid: string,
  telegramCustomerId: string,
  displayName: string | undefined,
  replaceTo: { path: string; query?: Record<string, string> },
) {
  const store = useStaffDeeplinkStore()
  store.setStaffContext(
    {
      platformUid,
      customerTelegramId: telegramCustomerId,
      customerDisplayName: displayName,
    },
    { fromTelegramStartParam: true },
  )
  markDeepLinkNavigated()
  void router.replace(replaceTo).then(() => {
    store.setLandingRoute(router.currentRoute.value.fullPath)
  })
}

/** 当前环境是否带有任一代客深链（不含纯 `order_` 遗留；无任一则视为「普通入口」仅用本人 Telegram）。 */
function hasStaffDeepLinkToken(start: string): boolean {
  if (parseManageStaffToken(start) || parseCreateStaffToken(start))
    return true
  if (typeof window === 'undefined') return false
  const sp = new URLSearchParams(window.location.search)
  const c = String(sp.get('create') ?? '').trim()
  const m = String(sp.get('manage') ?? '').trim()
  if (c && (parseManageStaffToken(c) || parseCreateStaffToken(c)))
    return true
  if (m && parseManageStaffToken(m))
    return true
  return false
}

function applyManageDeepLink(router: Router, uid: string, customerTgId: string) {
  commitStaffDeepLinkAndLanding(router, uid, customerTgId, undefined, { path: '/OrderList' })
}

function applyCreateDeepLink(router: Router, customerTgId: string, displayName?: string) {
  // uid = 客户 telegram_id，platformUid 留空使 user_id 走 SDK
  commitStaffDeepLinkAndLanding(router, '', customerTgId, displayName, { path: '/CustomOrder' })
}

const DEEPLINK_NAVIGATED_KEY = 'wl_deeplink_navigated'

function markDeepLinkNavigated(): void {
  try { sessionStorage.setItem(DEEPLINK_NAVIGATED_KEY, '1') } catch { /* ignore */ }
}

function hasDeepLinkNavigatedThisSession(): boolean {
  try { return sessionStorage.getItem(DEEPLINK_NAVIGATED_KEY) === '1' } catch { return false }
}

/**
 * `start_param` / `tgWebAppStartParam` / `?create=` / `?manage=`：
 * - **无深链**：清空代客会话，`user_id` 仅为当前 Telegram。
 * - `manage_<uid>_<chat_id>` → `/OrderList`（`user_id`=uid；从列表点「+」进创建订单时 uid 转为客户 telegram_id，`user_id` 切回 SDK）
 * - `create_<uid>_<chat_id>[_<base64昵称>]` → `/CustomOrder`（无返回键；`telegram_id`=uid；`user_id`=SDK）
 * - `order_<uid>[_…]` → `/CustomOrder`（兼容旧格式）
 */
export function tryApplyTelegramStaffDeepLink(router: Router): void {
  if (import.meta.env.DEV) {
    logTelegramLinkParams('tryApplyTelegramStaffDeepLink', { routeQuery: { ...router.currentRoute.value.query } })
  }

  const start = getTelegramStartParam()
  if (!hasStaffDeepLinkToken(start) && !parseOrderStartParam(start)) {
    useStaffDeeplinkStore().clearDeepLinkSession()
    // Telegram hash 参数（tgWebAppData 等）会导致 hash 路由无法匹配任何页面，
    // 此时主动跳到首页，避免空白
    if (!router.currentRoute.value.name) {
      void router.replace('/')
    }
    return
  }

  // 本次会话已经处理过深链跳转（页面刷新），不重复跳转
  // store 已从 sessionStorage 自动恢复上下文，无需再次 replace
  if (hasDeepLinkNavigatedThisSession()) return

  // — start_param 路径 —
  const manage = parseManageStaffToken(start)
  if (manage) { applyManageDeepLink(router, manage.platformUid, manage.telegramCustomerId); return }

  const createStaff = parseCreateStaffToken(start)
  if (createStaff) { applyCreateDeepLink(router, createStaff.platformUid, createStaff.displayName || undefined); return }

  const orderLegacy = parseOrderStartParam(start)
  if (orderLegacy) {
    commitStaffDeepLinkAndLanding(router, orderLegacy.uid, getTelegramUserId().trim(), orderLegacy.name || undefined, { path: '/CustomOrder' })
    return
  }

  // — URL query 路径 —
  if (typeof window === 'undefined') return
  const sp = new URLSearchParams(window.location.search)
  const manageQuery = sp.get('manage')
  const createQuery = sp.get('create')

  if (manageQuery) {
    const mq = parseManageStaffToken(manageQuery)
    if (mq) { applyManageDeepLink(router, mq.platformUid, mq.telegramCustomerId); return }
  }
  if (createQuery) {
    const cqManage = parseManageStaffToken(createQuery)
    if (cqManage) { applyManageDeepLink(router, cqManage.platformUid, cqManage.telegramCustomerId); return }
    const cqCreate = parseCreateStaffToken(createQuery)
    if (cqCreate) applyCreateDeepLink(router, cqCreate.platformUid, cqCreate.displayName || undefined)
  }
}