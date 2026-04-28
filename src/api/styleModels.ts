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
  structure_type: string
  page?: number
  page_size?: number
  search?: string
}) {
  const structure_type = String(params.structure_type ?? '').trim()
  const q = String(params.search ?? '').trim()
  return httpApi.get('/style-models', {
    params: {
      structure_type,
      page: params.page ?? 1,
      page_size: params.page_size ?? 10,
      ...(q ? { search: q } : {}),
    },
  })
}
