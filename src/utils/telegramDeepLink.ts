import type { Router } from 'vue-router'
import { getTelegramWebApp } from '@/utils/userTelegram'

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
  const createParsed = parseCreateToken(startResolved)
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
        + ' hash 里多为 user、auth、theme。订单深链用 `create_数字_数字` 或 `order_…`（start_param / ?create=…）。'
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
    parseCreateToken: createParsed,
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

/** `create_<id>_<name>`，两段均为数字串（第二段作「名称」业务上可为编号等） */
const CREATE_DEEP_RE = /^create_(\d+)_(\d+)$/

/**
 * 解析 `create_45454545_454545` 这类 token；成功则两段映射为 uid / name（字符串）
 */
export function parseCreateToken(raw: string): OrderDeepLinkPayload | null {
  const m = CREATE_DEEP_RE.exec((raw || '').trim())
  if (!m) return null
  return { uid: m[1]!, name: m[2]! }
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

  const fromCreateStart = parseCreateToken(start)
  if (fromCreateStart) return fromCreateStart

  if (typeof window !== 'undefined') {
    const createQuery = new URLSearchParams(window.location.search).get('create')
    if (createQuery) {
      const fromCreateQuery = parseCreateToken(createQuery)
      if (fromCreateQuery) return fromCreateQuery
    }
  }

  const fromOrder = parseOrderStartParam(start)
  if (fromOrder) return fromOrder

  return null
}

/**
 * 满足「创建订单深链」时，一律 `replace` 到 `/OrderCreate`，并只保留 `id` / `name`（及兼容用的 `uid`）；
 * 不判断当前路由。`create_…` 匹配成功后 query 只留 id/name，不再带原始 `create=`。
 */
export function tryApplyOrderDeepLink(router: Router): void {
  logTelegramLinkParams('tryApplyOrderDeepLink', {
    routeQuery: { ...router.currentRoute.value.query },
  })
  const payload = collectOrderDeepLinkFromLocation()
  if (!payload) return

  const q: Record<string, string> = {}
  if (payload.uid) {
    q.id = payload.uid
    q.uid = payload.uid
  }
  if (payload.name) q.name = payload.name
  void router.replace({ path: '/OrderCreate', query: q })
}
