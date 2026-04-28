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

/**
 * 当前页 `?search` 与 `#hash` 经 URL 解码、JSON 展开后的对象（调试用）
 */
export function buildDecodedLinkDebugSnapshot(): {
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
 * 解析 `create_<平台user_id>_<客户telegram_id>[_<base64url昵称>]`（第三段可选，UTF-8 base64url）
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

/**
 * @deprecated 旧 `create_数字_数字` 曾把第二段当「名称」；请用 {@link parseCreateStaffToken}
 */
export function parseCreateToken(raw: string): OrderDeepLinkPayload | null {
  const p = parseCreateStaffToken(raw)
  if (!p) return null
  return { uid: p.platformUid, name: p.telegramCustomerId }
}

/** `manage_<平台user_id>_<客户telegram_id>` → 订单列表用平台 user_id，客户 id 写入 session 供 telegram_id */
export function parseManageStaffToken(
  raw: string,
): { platformUid: string; telegramCustomerId: string } | null {
  const m = /^manage_(\d+)_(\d+)$/.exec((raw || '').trim())
  if (!m) return null
  return { platformUid: m[1]!, telegramCustomerId: m[2]! }
}

/**
 * 从当前地址解出「应打开快速下单」时的 id(uid) / name。
 * 支持：
 * 1. `?create=create_数字_数字`（或整段作为其它 query 值时再扩展）
 * 2. `start_param` 为 `create_数字_数字`（与 `order_…` 二选一，先试 create）
 * 3. Telegram `order_<uid>[_<base64url name>]` start_param
 */
export function collectOrderDeepLinkFromLocation(): OrderDeepLinkPayload | null {
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

/**
 * `start_param` / `tgWebAppStartParam` / `?create=` / `?manage=`：
 * - **无深链**：清空代客会话，后续 API `user_id` 仅为当前 Telegram（与从历史恢复区分：每次冷启动不带 token 即清）。
 * - `manage_<平台uid>_<客户telegram/chat_id>` → `/OrderList`（列表参数 `user_id`=平台 uid；客户在 session）
 * - `create_<平台uid>_<客户telegram/chat_id>[_<base64昵称>]` → `/CustomOrder`（表单 `telegram_id` 等处用参数上的客户 id）
 * - `order_<uid>[_…]` → `/CustomOrder`（兼容）
 *
 * **`/OrderDetails`**：需在 `staffDeeplink` 中已存在平台 uid + 客户 id 时代客；此时 HTTP `user_id`=本人，`telegram_id`=参数客户 id。
 */
export function tryApplyTelegramStaffDeepLink(router: Router): void {
  logTelegramLinkParams('tryApplyTelegramStaffDeepLink', {
    routeQuery: { ...router.currentRoute.value.query },
  })
  const start = getTelegramStartParam()

  if (!hasStaffDeepLinkToken(start) && !parseOrderStartParam(start)) {
    useStaffDeeplinkStore().clearDeepLinkSession()
    return
  }

  const manage = parseManageStaffToken(start)
  if (manage) {
    commitStaffDeepLinkAndLanding(router, manage.platformUid, manage.telegramCustomerId, undefined, {
      path: '/OrderList',
    })
    return
  }

  const createStaff = parseCreateStaffToken(start)
  if (createStaff) {
    commitStaffDeepLinkAndLanding(
      router,
      createStaff.platformUid,
      createStaff.telegramCustomerId,
      createStaff.displayName || undefined,
      { path: '/CustomOrder' },
    )
    return
  }

  const orderLegacy = parseOrderStartParam(start)
  if (orderLegacy) {
    const tid = (getTelegramUserId() || '').trim()
    commitStaffDeepLinkAndLanding(router, orderLegacy.uid, tid, orderLegacy.name || undefined, {
      path: '/CustomOrder',
    })
    return
  }

  if (typeof window === 'undefined') return
  const sp = new URLSearchParams(window.location.search)
  const createQuery = sp.get('create')
  const manageQuery = sp.get('manage')

  if (manageQuery) {
    const mq = parseManageStaffToken(manageQuery)
    if (mq) {
      commitStaffDeepLinkAndLanding(router, mq.platformUid, mq.telegramCustomerId, undefined, {
        path: '/OrderList',
        query: {},
      })
      return
    }
  }

  if (createQuery) {
    const cqManage = parseManageStaffToken(createQuery)
    if (cqManage) {
      commitStaffDeepLinkAndLanding(router, cqManage.platformUid, cqManage.telegramCustomerId, undefined, {
        path: '/OrderList',
        query: {},
      })
      return
    }

    const cqCreate = parseCreateStaffToken(createQuery)
    if (cqCreate) {
      commitStaffDeepLinkAndLanding(
        router,
        cqCreate.platformUid,
        cqCreate.telegramCustomerId,
        cqCreate.displayName || undefined,
        { path: '/CustomOrder', query: {} },
      )
    }
  }
}

/** @deprecated 使用 {@link tryApplyTelegramStaffDeepLink} */
export function tryApplyOrderDeepLink(router: Router): void {
  tryApplyTelegramStaffDeepLink(router)
}