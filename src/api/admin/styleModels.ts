import httpApi from '@/utils/http'

/** 型号多图（与后端 `cover_images` 一致） */
export type StyleCoverImage = {
  url: string
  name?: string
  path?: string
  label?: string
}

export type StyleModelItem = {
  id: number
  parent_id: number | null
  style_no: string
  style_name: string
  brand: string
  model: string
  structure_type: string
  spoke_type: string
  spoke_count: number | null
  directional: boolean
  style_tags: string[]
  enabled: boolean
  cover_image: string
  /** 多图预览；缺省时用 `cover_image` 单张 */
  cover_images?: StyleCoverImage[]
  created_at: string
  children: StyleModelItem[]
}


/** `GET /style-models`，拦截器已解包一层 `data`，此处直接返回该对象（含 items / count 等）。 */
export async function fetchStyleModels(params: {
  structure_type?: string
  page?: number
  page_size?: number
  search?: string
  brand?: string
  model?: string
  style_tag?: string
  spoke_type?: string
  /** true → 传 1，false → 传 0，undefined → 不传 */
  directional?: boolean | null
  spoke_count?: number | string
  style_no?: string
}) {
  const extra: Record<string, string | number> = {}
  if (params.brand?.trim()) extra.brand = params.brand.trim()
  if (params.model?.trim()) extra.model = params.model.trim()
  if (params.style_tag?.trim()) extra.style_tag = params.style_tag.trim()
  if (params.spoke_type?.trim()) extra.spoke_type = params.spoke_type.trim()
  if (params.directional != null) extra.directional = params.directional ? 1 : 0
  if (params.spoke_count !== undefined && params.spoke_count !== '') extra.spoke_count = params.spoke_count
  if (params.style_no?.trim()) extra.style_no = params.style_no.trim()
  const q = String(params.search ?? '').trim()
  return httpApi.get('/style-models', {
    params: {
      structure_type: params.structure_type ?? '',
      page: params.page ?? 1,
      page_size: params.page_size ?? 10,
      ...(q ? { search: q } : {}),
      ...extra,
    },
  })
}

export type StyleModelDetailImage = {
  url: string
  label?: string
  desc?: string
}

export type StyleModelCaseCard = {
  id: number
  case_no: string
  cover: string | null
  title: string
  meta: string
}

export type StyleModelDetail = StyleModelItem & {
  overview: {
    style_no: string
    brand_display: string
    style_name_display: string
    structure_display: string
    spoke_type_display: string
    spoke_count_display: string
    directional_display: string
    created_at_display: string
  }
  style_detail_images: StyleModelDetailImage[]
  style_library_cases: {
    total_count: number
    case_cards: StyleModelCaseCard[]
  }
  directional_label: string
}

/** `GET /style-models/detail?style_id=xxx` */
export async function fetchStyleModelDetail(styleId: number | string): Promise<StyleModelDetail> {
  return httpApi.get('/style-models/detail', { params: { style_id: styleId } })
}

function normalizeStyleNoKey(s: string): string {
  return String(s ?? '').trim().replace(/[—–]/g, '-').toLowerCase()
}

/**
 * 订单编辑回填：按 `structure_type` + `style_no` 请求造型列表，解析出完整 `StyleModelItem`（无需先打开抽屉）。
 */
export async function resolveStyleModelItemForHydrate(
  structure_type: string,
  style_no: string,
): Promise<StyleModelItem | null> {
  const st = String(structure_type ?? '').trim()
  const sn = String(style_no ?? '').trim()
  if (!st || !sn) return null
  const target = normalizeStyleNoKey(sn)

  const scan = async (page: number, pageSize: number, search?: string) => {
    return (await fetchStyleModels({
      structure_type: st,
      page,
      page_size: pageSize,
      ...(search ? { search } : {}),
    })) as { items?: StyleModelItem[]; last_page?: number }
  }

  const first = await scan(1, 100, sn)
  const pick = (items: StyleModelItem[] | undefined) =>
    items?.find(i => normalizeStyleNoKey(i.style_no) === target)
      ?? items?.find(i => {
        const a = normalizeStyleNoKey(i.style_no)
        return a.includes(target) || target.includes(a)
      })

  let found = pick(first.items)
  if (found) return found

  const lastPage = Math.min(5, Math.max(1, Number(first.last_page) || 1))
  for (let p = 2; p <= lastPage; p += 1) {
    const d = await scan(p, 100, sn)
    found = pick(d.items)
    if (found) return found
  }

  const wide = await scan(1, 250, undefined)
  return pick(wide.items) ?? null
}
