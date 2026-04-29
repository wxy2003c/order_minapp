/**
 * Wheel-Size：配置、响应解析与本文件内全部请求。
 */
import httpApi from '@/utils/http'

// —— types ——
export type WheelSizeGenerationRow = {
  slug: string
  name: string
  platform: string
  start: number
  end: number
  years?: number[]
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

function normalizeGenerationRows(raw: unknown): WheelSizeGenerationRow[] {
  const arr = unwrapPayloadArray(raw)
  return arr.map((item) => {
    const obj = item as Record<string, unknown>
    const yearsRaw = obj.years
    const years = Array.isArray(yearsRaw)
      ? yearsRaw.filter((n): n is number => typeof n === 'number')
      : undefined
    return {
      slug: toStringSafe(obj.slug),
      name: toStringSafe(obj.name),
      platform: toStringSafe(obj.platform),
      start: Number(obj.start) || 0,
      end: Number(obj.end) || 0,
      years: years?.length ? years : undefined,
    }
  }).filter((g) => !!g.slug)
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
