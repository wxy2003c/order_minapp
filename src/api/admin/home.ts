/** 首页接口；双端共享，GET /index */
import httpApi from '@/utils/http'

export type HomeStyleModelItem = {
  id: number
  style_no: string
  style_name: string
  effect_image: string
}

export type HomeCustomerCase = {
  id: number
  case_no: string
  display_title: string
  car_brand: string
  car_model: string
  car_year: string
  style_id: number
  style_no: string
  structure_type: string
  wheel_specs: Record<string, unknown>
  cover_image: string
  created_at: string
  updated_at: string
}

export type HomePageData = {
  random_style_models: HomeStyleModelItem[]
  popular_style_models: HomeStyleModelItem[]
  customer_cases: HomeCustomerCase[]
}

export async function fetchHomePage(): Promise<HomePageData> {
  const raw = (await httpApi.get('/index')) as { data?: HomePageData } | HomePageData
  const d = (raw as { data?: HomePageData }).data ?? (raw as HomePageData)
  return {
    random_style_models: d.random_style_models ?? [],
    popular_style_models: d.popular_style_models ?? [],
    customer_cases: d.customer_cases ?? [],
  }
}
