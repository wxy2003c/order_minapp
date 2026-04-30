/**
 * Wheel-Size：配置、响应解析与本文件内全部请求。
 */
import httpApi from '@/utils/http'

// —— types ——
export type WheelSizeBodyRow = {
  slug: string
  name: string
  image: string
}

export type WheelSizeGenerationRow = {
  slug: string
  name: string
  platform: string
  start: number
  end: number
  years?: number[]
  /** API `year_ranges`，如 `["2010-2015"]` */
  year_ranges?: string[]
  bodies?: WheelSizeBodyRow[]
}

export type WheelSizeOption = { id: string; label: string }

// —— config ——
export const wheelSizeApiEnabled = !!(import.meta.env.VITE_WHEEL_SIZE_API_KEY || '').trim()

// —— parse ——
function toStringSafe(v: unknown): string {
  if (v === undefined || v === null) return ''
  return String(v)
}

function unwrapPayloadArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    const keys = ['data', 'results', 'items', 'makes', 'models', 'years', 'modifications', 'generations']
    for (const k of keys) {
      const v = o[k]
      if (Array.isArray(v)) return v
    }
    const inner = o.data
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const io = inner as Record<string, unknown>
      for (const k of keys) {
        const v = io[k]
        if (Array.isArray(v)) return v
      }
    }
    for (const v of Object.values(o)) {
      if (Array.isArray(v) && v.length) return v
    }
  }
  return []
}

/**
 * Wheel-Size「世代」接口常见包层：`{ data: rows }`、axios/Laravel 再包一层 `{ data: { data, meta } }` 等。
 * 逐层下钻 `data` 直到得到数组，避免与列表接口共用 unwrap 时漏解一层。
 */
function unwrapWheelSizeGenerationsRows(raw: unknown): unknown[] {
  let v: unknown = raw
  for (let depth = 0; depth < 6; depth++) {
    if (Array.isArray(v)) return v
    if (!v || typeof v !== 'object') break
    const o = v as Record<string, unknown>
    const d = o.data
    if (Array.isArray(d)) return d
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      v = d
      continue
    }
    for (const key of ['generations', 'results', 'items'] as const) {
      const a = o[key]
      if (Array.isArray(a)) return a
    }
    break
  }
  return unwrapPayloadArray(raw)
}

function normalizeWheelSizeOptions(
  raw: unknown,
  keyCandidates: string[],
  labelCandidates: string[],
): WheelSizeOption[] {
  const arr = unwrapPayloadArray(raw)
  return arr.map((item) => {
    const obj = item as Record<string, unknown>
    const id = keyCandidates.map(k => toStringSafe(obj[k])).find(Boolean) || toStringSafe(obj.id)
    const label = labelCandidates.map(k => toStringSafe(obj[k])).find(Boolean) || id
    return { id, label }
  }).filter((x) => !!x.id && !!x.label)
}

function normalizeYearOptions(raw: unknown): WheelSizeOption[] {
  const arr = unwrapPayloadArray(raw)
  return arr.map((item) => {
    const obj = item as Record<string, unknown>
    const y = obj.name ?? obj.year ?? obj.slug
    const id = String(y)
    return { id, label: id }
  }).filter((x) => !!x.id && x.id !== 'null' && x.id !== 'undefined')
}

function normalizeModificationOptions(raw: unknown): WheelSizeOption[] {
  const arr = unwrapPayloadArray(raw)
  return arr.map((item) => {
    const obj = item as Record<string, unknown>
    const id = toStringSafe(obj.slug)
    const trim = toStringSafe(obj.trim)
    const name = toStringSafe(obj.name)
    const body = toStringSafe(obj.body)
    const label = [trim || name, body].filter(Boolean).join(' · ') || id
    return { id, label }
  }).filter((x) => !!x.id)
}

/** 统一 `2010-2015` / `2010–2015` / `2010/2015` 等，便于与接口 `year_ranges` 对齐 */
function normalizeYearRangeToken(raw: string): string {
  return String(raw ?? '').trim().replace(/\s+/g, '').replace(/[\u2013\u2014]/g, '-').replace(/\//g, '-')
}

function bodyImageFromApiBody(bo: Record<string, unknown>): string {
  const rawImg = bo.image
  if (rawImg && typeof rawImg === 'object' && !Array.isArray(rawImg)) {
    const n = rawImg as Record<string, unknown>
    const u = toStringSafe(n.url ?? n.src ?? n.href ?? n.uri)
    if (u.trim()) return u.trim()
  }
  const flat = toStringSafe(bo.image ?? bo.image_url ?? bo.photo ?? bo.picture ?? bo.thumb ?? bo.thumbnail).trim()
  if (flat && flat !== '[object Object]') return flat
  return ''
}

function generationLevelImage(obj: Record<string, unknown>): string {
  return toStringSafe(obj.image ?? obj.cover_image ?? obj.thumbnail ?? obj.cover ?? obj.picture).trim()
}

function generationYearSpanLabel(g: WheelSizeGenerationRow): string {
  if (g.year_ranges?.length)
    return g.year_ranges.join('、')
  if (g.start || g.end)
    return `${g.start}–${g.end}`
  return ''
}

function yearsExpandedFromYearRanges(year_ranges: string[]): number[] {
  const out = new Set<number>()
  for (const r of year_ranges) {
    const s = normalizeYearRangeToken(r)
    const m = /^(\d{4})-(\d{4})$/.exec(s)
    if (m) {
      const a = parseInt(m[1], 10)
      const b = parseInt(m[2], 10)
      const lo = Math.min(a, b)
      const hi = Math.max(a, b)
      for (let y = lo; y <= hi; y++) out.add(y)
    }
    else if (/^\d{4}$/.test(s)) {
      out.add(parseInt(s, 10))
    }
  }
  return Array.from(out).sort((a, b) => b - a)
}

export function wheelSizeGenerationOptionLabel(g: WheelSizeGenerationRow): string {
  const span = generationYearSpanLabel(g)
  return `${g.name || g.slug}${span ? ` (${span})` : ''}${g.platform ? ` · ${g.platform}` : ''}`
}

function normalizeGenerationRows(raw: unknown): WheelSizeGenerationRow[] {
  const arr = unwrapWheelSizeGenerationsRows(raw)
  return arr.map((item) => {
    const obj = item as Record<string, unknown>
    const yearsRaw = obj.years
    const years = Array.isArray(yearsRaw)
      ? yearsRaw
          .map((n) => (typeof n === 'number' && Number.isFinite(n) ? n : parseInt(String(n), 10)))
          .filter((n): n is number => Number.isFinite(n))
      : undefined
    const yrRaw = obj.year_ranges
    const year_ranges = Array.isArray(yrRaw)
      ? yrRaw.map(x => toStringSafe(x)).filter(Boolean)
      : undefined
    const bodiesRaw = obj.bodies
    let bodies = Array.isArray(bodiesRaw)
      ? bodiesRaw.map((b) => {
          const bo = b as Record<string, unknown>
          const image = bodyImageFromApiBody(bo)
          return {
            slug: toStringSafe(bo.slug),
            name: toStringSafe(bo.name),
            image,
          }
        }).filter(b => !!b.image)
      : undefined
    const genImg = generationLevelImage(obj)
    if ((!bodies || !bodies.length) && genImg)
      bodies = [{ slug: '', name: '', image: genImg }]
    return {
      slug: toStringSafe(obj.slug),
      name: toStringSafe(obj.name),
      platform: toStringSafe(obj.platform),
      start: Number(obj.start) || 0,
      end: Number(obj.end) || 0,
      years: years?.length ? years : undefined,
      year_ranges: year_ranges?.length ? year_ranges : undefined,
      bodies: bodies?.length ? bodies : undefined,
    }
  }).filter((g) => !!g.slug)
}

/** 所选年份是否落在该世代：优先接口 `year_ranges`（与下拉展示一致），再 `years`，再 `start–end` */
export function yearFitsWheelSizeGeneration(year: number, g: WheelSizeGenerationRow): boolean {
  if (!Number.isFinite(year)) return false
  if (Array.isArray(g.year_ranges) && g.year_ranges.length) {
    let parsedRangeTokens = 0
    for (const r of g.year_ranges) {
      const s = normalizeYearRangeToken(r)
      const m = /^(\d{4})-(\d{4})$/.exec(s)
      if (m) {
        parsedRangeTokens++
        const a = parseInt(m[1], 10)
        const b = parseInt(m[2], 10)
        const lo = Math.min(a, b)
        const hi = Math.max(a, b)
        if (year >= lo && year <= hi) return true
      }
      else if (/^\d{4}$/.test(s)) {
        parsedRangeTokens++
        if (parseInt(s, 10) === year) return true
      }
    }
    /** 仅当存在可解析的区间且年份落在区间外时拒绝；无法解析的文案（如占位）则回退 `years` / start–end */
    if (parsedRangeTokens > 0) return false
  }
  if (Array.isArray(g.years) && g.years.length) return g.years.includes(year)
  if (g.start || g.end) return year >= g.start && year <= g.end
  return false
}

// —— http ——
export async function fetchWheelSizeMakes(): Promise<WheelSizeOption[]> {
  const raw = await httpApi.get('wheel-size/makes', {})
  return normalizeWheelSizeOptions(raw, ['slug', 'make', 'name'], ['name', 'make', 'slug'])
}

export async function fetchWheelSizeModels(make: string): Promise<WheelSizeOption[]> {
  const raw = await httpApi.get('wheel-size/models', { params: { make } })
  return normalizeWheelSizeOptions(raw, ['slug', 'model', 'name'], ['name', 'model', 'slug'])
}

export async function fetchWheelSizeGenerations(make: string, model: string): Promise<WheelSizeGenerationRow[]> {
  const key = (import.meta.env.VITE_WHEEL_SIZE_API_KEY || '').trim()
  const base = (import.meta.env.VITE_WHEEL_SIZE_API_BASE_URL || '').trim().replace(/\/$/, '')
  if (base && key && typeof fetch !== 'undefined') {
    try {
      const u
        = `${base}/generations/?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&user_key=${encodeURIComponent(key)}`
      const res = await fetch(u, { method: 'GET' })
      if (res.ok) {
        const raw = await res.json()
        return normalizeGenerationRows(raw)
      }
    }
    catch {
      /* CORS / 网络错误时走后端代理 */
    }
  }
  const raw = await httpApi.get('wheel-size/generations', { params: { make, model } })
  return normalizeGenerationRows(raw)
}

export async function fetchWheelSizeYears(make: string, model: string): Promise<WheelSizeOption[]> {
  const raw = await httpApi.get('wheel-size/years', { params: { make, model } })
  return normalizeYearOptions(raw)
}

export async function fetchWheelSizeModifications(
  make: string,
  model: string,
  year: string,
  generation?: string,
): Promise<WheelSizeOption[]> {
  const raw = await httpApi.get('wheel-size/modifications', {
    params: { make, model, year, generation: generation || '' },
  })
  return normalizeModificationOptions(raw)
}

export async function resolveWheelSizeYearOptions(
  make: string,
  model: string,
  gen: WheelSizeGenerationRow | undefined,
): Promise<WheelSizeOption[]> {
  if (gen?.year_ranges?.length) {
    const expanded = yearsExpandedFromYearRanges(gen.year_ranges)
    if (expanded.length)
      return expanded.map(y => ({ id: String(y), label: String(y) }))
  }
  if (gen?.years?.length) {
    return Array.from(new Set(gen.years)).sort((a, b) => b - a).map(y => ({ id: String(y), label: String(y) }))
  }
  const all = await fetchWheelSizeYears(make, model)
  if (gen && (gen.start || gen.end)) {
    return all.filter((o) => {
      const n = parseInt(o.id, 10)
      return Number.isFinite(n) && n >= gen.start && n <= gen.end
    })
  }
  return all
}

export function isWheelSizeEnabled() {
  return wheelSizeApiEnabled
}
