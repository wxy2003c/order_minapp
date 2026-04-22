import httpApi from '@/utils/http';
export type WheelSizeOption = {
  id: string;
  label: string;
};

/** wheel-size API 配置（官方文档: /makes → /models → /years → /modifications） */
export const wheelSizeApiBaseUrl = ('https://chain.wheelsline.com/api/v1/wheel-size').trim().replace(/\/$/, '');
export const wheelSizeApiKey = (import.meta.env.VITE_WHEEL_SIZE_API_KEY || '').trim();
const wheelSizeApiRegionRaw = (import.meta.env.VITE_WHEEL_SIZE_API_REGION || 'eudm').trim().toLowerCase();

/**
 * API v2 的 region 为区域代码（如 eudm、usdm、chdm），不是 “europe” 这种英文名。
 * 见 https://api-demo.wheel-size.com/region-list/ 或 GET /v2/regions/
 */
const REGION_ALIASES: Record<string, string> = {
  europe: 'eudm',
  eu: 'eudm',
  usa: 'usdm',
  us: 'usdm',
  canada: 'cdm',
  china: 'chdm',
  japan: 'jdm',
  russia: 'rus',
  korea: 'skdm',
  mexico: 'mxndm',
  oceania: 'audm',
  ladm: 'ladm',
  medm: 'medm',
  nadm: 'nadm',
  sadm: 'sadm',
  sam: 'sam',
  mxndm: 'mxndm',
  eudm: 'eudm',
  usdm: 'usdm',
  cdm: 'cdm',
  chdm: 'chdm',
  jdm: 'jdm',
  rus: 'rus',
  skdm: 'skdm',
  audm: 'audm'
};

export function normalizeWheelSizeApiRegion(raw: string): string {
  const k = raw.trim().toLowerCase();
  if(REGION_ALIASES[k]) return REGION_ALIASES[k];
  if(k && /^[a-z0-9_-]{2,12}$/.test(k)) return k;
  return 'eudm';
}

export const wheelSizeApiRegion = normalizeWheelSizeApiRegion(wheelSizeApiRegionRaw);
export const wheelSizeApiEnabled = !!wheelSizeApiKey && !!wheelSizeApiBaseUrl;


/** GET /generations/ 单条（与 OpenAPI data[] 一致） */
export type WheelSizeGenerationRow = {
  slug: string;
  name: string;
  platform: string;
  start: number;
  end: number;
  years?: number[];
};

function toStringSafe(v: unknown) {
  if(v === undefined || v === null) return '';
  return String(v);
}

/** API 常返回 { data: [...] }，直接当数组解析会得到空列表 */
function unwrapPayloadArray(raw: unknown): unknown[] {
  if(Array.isArray(raw)) return raw;
  if(raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const keys = ['data', 'results', 'items', 'makes', 'models', 'years', 'modifications', 'generations'];
    for(const k of keys) {
      const v = o[k];
      if(Array.isArray(v)) return v;
    }
    const inner = o.data;
    if(inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const io = inner as Record<string, unknown>;
      for(const k of keys) {
        const v = io[k];
        if(Array.isArray(v)) return v;
      }
    }
    for(const v of Object.values(o)) {
      if(Array.isArray(v) && v.length) return v;
    }
  }
  return [];
}

function normalizeOptions(raw: unknown, keyCandidates: string[], labelCandidates: string[]): WheelSizeOption[] {
  const arr = unwrapPayloadArray(raw);
  return arr.map((item) => {
    const obj = item as Record<string, unknown>;
    const id = keyCandidates.map((k) => toStringSafe(obj[k])).find(Boolean) || toStringSafe(obj.id);
    const label = labelCandidates.map((k) => toStringSafe(obj[k])).find(Boolean) || id;
    return {id, label};
  }).filter((x) => !!x.id && !!x.label);
}

/** GET /years/：年份项 name 为数字年，slug 可为 null */
function normalizeYearOptions(raw: unknown): WheelSizeOption[] {
  const arr = unwrapPayloadArray(raw);
  return arr.map((item) => {
    const obj = item as Record<string, unknown>;
    const y = obj.name ?? obj.year ?? obj.slug;
    const id = String(y);
    return {id, label: id};
  }).filter((x) => !!x.id && x.id !== 'null' && x.id !== 'undefined');
}

/** GET /modifications/：用 slug 作 id，文案优先 trim / name / body */
function normalizeModificationOptions(raw: unknown): WheelSizeOption[] {
  const arr = unwrapPayloadArray(raw);
  return arr.map((item) => {
    const obj = item as Record<string, unknown>;
    const id = toStringSafe(obj.slug);
    const trim = toStringSafe(obj.trim);
    const name = toStringSafe(obj.name);
    const body = toStringSafe(obj.body);
    const label = [trim || name, body].filter(Boolean).join(' · ') || id;
    return {id, label};
  }).filter((x) => !!x.id);
}

// 品牌
export async function fetchWheelSizeMakes(): Promise<WheelSizeOption[]> {
  const raw = await httpApi('wheel-size/makes', {});
  return normalizeOptions(raw, ['slug', 'make', 'name'], ['name', 'make', 'slug']);
}

export async function fetchWheelSizeModels(make: string): Promise<WheelSizeOption[]> {
  const raw = await httpApi('wheel-size/models', {params:{'make': make}});
  return normalizeOptions(raw, ['slug', 'model', 'name'], ['name', 'model', 'slug']);
}

/** GET /generations/?make=&model= 官方：代际/世代 */
export async function fetchWheelSizeGenerations(make: string, model: string): Promise<WheelSizeGenerationRow[]> {
  const raw = await httpApi('wheel-size/generations', {params:{'make': make, 'model': model}});
  const arr = unwrapPayloadArray(raw);
  return arr.map((item) => {
    const obj = item as Record<string, unknown>;
    const yearsRaw = obj.years;
    const years = Array.isArray(yearsRaw) ?
      yearsRaw.filter((n): n is number => typeof n === 'number') :
      undefined;
    return {
      slug: toStringSafe(obj.slug),
      name: toStringSafe(obj.name),
      platform: toStringSafe(obj.platform),
      start: Number(obj.start) || 0,
      end: Number(obj.end) || 0,
      years: years?.length ? years : undefined
    };
  }).filter((g) => !!g.slug);
}

/** GET /years/?make=&model= */
export async function fetchWheelSizeYears(make: string, model: string): Promise<WheelSizeOption[]> {
  const raw = await httpApi('wheel-size/years', {params:{'make': make, 'model': model}});
  return normalizeYearOptions(raw);
}

/**
 * 若世代自带 years[] 则直接用；否则拉 /years/ 并按世代 start–end 过滤。
 */
export async function resolveWheelSizeYearOptions(
  make: string,
  model: string,
  gen: WheelSizeGenerationRow | undefined
): Promise<WheelSizeOption[]> {
  if(gen?.years?.length) {
    return [...new Set(gen.years)].sort((a, b) => b - a).map((y) => ({id: String(y), label: String(y)}));
  }
  const all = await fetchWheelSizeYears(make, model);
  if(gen && (gen.start || gen.end)) {
    return all.filter((o) => {
      const n = parseInt(o.id, 10);
      return Number.isFinite(n) && n >= gen.start && n <= gen.end;
    });
  }
  return all;
}

/** GET /modifications/?make=&model=&year=&generation= 官方 */
export async function fetchWheelSizeModifications(
  make: string,
  model: string,
  year: string,
  generation?: string
): Promise<WheelSizeOption[]> {
  const raw = await httpApi('wheel-size/modifications', {
    params: {
      make,
      model,
      year,
      generation: generation || ''
    }
  });
  return normalizeModificationOptions(raw);
}

export function isWheelSizeEnabled() {
  return wheelSizeApiEnabled;
}
