import httpApi from '@/utils/http'
import { resolveOrderAssetUrl } from '@/utils/orderMedia'

export type CaseWheelAxisSpec = {
  cb?: string
  et?: string
  pcd?: string
  qty?: string
  hole?: string
  size_r?: string
  width_j?: string
  appearance?: string
}

export type CaseWheelSpecs = {
  front?: CaseWheelAxisSpec
  rear?: CaseWheelAxisSpec
  structure_subtype_single?: string
}

export type CaseItem = {
  id: number
  case_no: string
  display_title: string
  car_brand: string
  car_model: string
  car_year: string
  style_id: number
  style_no: string
  structure_type: string
  wheel_specs: CaseWheelSpecs
  cover_image: string
  created_at: string
  updated_at: string
}

export type CasesListParams = {
  car_brand?: string
  car_model?: string
  style_no?: string
  structure_type?: string
  color_code?: string
  page?: number
  page_size?: number
}

export type CasesListResult = {
  items: CaseItem[]
  total: number
  page: number
  page_size: number
}

export type CaseWheelAxisDetail = {
  cb?: string
  et?: string
  pcd?: string
  qty?: string
  hole?: string
  size_r?: string
  width_j?: string
  appearance?: string
}

export type CaseViewerImage = {
  url: string
  label?: string
  desc?: string
}

export type CaseDetailData = {
  id: number
  case_no: string
  display_title: string
  vehicle_display: string
  structure_display: string
  surface_craft_display: string
  structure_craft_display: string
  legacy_craft_display: string
  style_no: string
  structure_type: string
  car_brand: string
  car_model: string
  car_year: string
  order_id: number | null
  order_no: string | null
  created_at_display: string
  wheel_specs_front: CaseWheelAxisDetail
  wheel_specs_rear: CaseWheelAxisDetail
  color_codes: string[]
  surface_processes: string[]
  structure_processes: string[]
  center_cap: string | null
  mold_design: string | null
  custom_note: string | null
  viewer_images: (CaseViewerImage | null)[]
  review_user: string | null
  review_stars: number | null
  review_text: string | null
  review_car_model: string | null
}

export async function fetchCaseDetail(caseId: number | string): Promise<CaseDetailData> {
  const res = (await httpApi.get('/cases/detail', { params: { case_id: caseId } })) as CaseDetailData
  if (Array.isArray(res?.viewer_images)) {
    res.viewer_images = res.viewer_images.map(img =>
      img ? { ...img, url: resolveOrderAssetUrl(img.url) || img.url } : null,
    )
  }
  return res
}

export async function fetchCasesList(params: CasesListParams = {}): Promise<CasesListResult> {
  const clean: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) clean[k] = v
  }
  const res = (await httpApi.get('/cases', { params: clean })) as CasesListResult
  if (Array.isArray(res?.items)) {
    res.items = res.items.map(item => ({
      ...item,
      cover_image: resolveOrderAssetUrl(item.cover_image) || item.cover_image,
    }))
  }
  return res
}
