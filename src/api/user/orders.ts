/** 用户端订单；路径前缀 `/user/orders`。创建/编辑不传金额与币种。 */
import httpApi from '@/utils/http'
import { buildOrderDetailRequestParams } from '@/utils/deeplinkStaffContext'
import {
  buildOrdersListRequestParams,
  normalizeOrderDetailPayload,
  normalizeOrdersListPayload,
} from '@/utils/orderHelpers'
import type {
  OrderDetailResponse,
  OrdersListData,
  OrdersListQuery,
  OrderWriteResult,
} from '@/utils/orderHelpers'

const PREFIX = '/user/orders'

/** 剔除金额与币种字段——用户端接口不接收这两个字段 */
function stripPriceFields(body: Record<string, unknown>): Record<string, unknown> {
  const { base_price: _p, currency: _c, ...rest } = body
  return rest
}

export async function createOrder(body: Record<string, unknown>): Promise<OrderWriteResult> {
  return (await httpApi.post(PREFIX, stripPriceFields(body))) as OrderWriteResult
}

export async function updateOrder(
  orderId: string | number,
  body: Record<string, unknown>,
): Promise<OrderWriteResult> {
  const id = encodeURIComponent(String(orderId).trim())
  return (await httpApi.put(`${PREFIX}/${id}`, stripPriceFields(body))) as OrderWriteResult
}

export async function cancelOrder(orderId: string | number): Promise<OrderWriteResult> {
  return (await httpApi.post(`${PREFIX}/cancel`, { order_id: orderId })) as OrderWriteResult
}

export async function fetchOrdersList(query: OrdersListQuery): Promise<OrdersListData> {
  const raw = await httpApi.get(PREFIX, { params: buildOrdersListRequestParams(query) })
  return normalizeOrdersListPayload(raw)
}

export async function fetchOrderDetail(orderId: string | number): Promise<OrderDetailResponse> {
  const raw = await httpApi.get(`${PREFIX}/detail`, { params: buildOrderDetailRequestParams(orderId) })
  return normalizeOrderDetailPayload(raw)
}

export type ReviewOrderParams = {
  order_id: string | number
  rating: number
  content?: string
  image_urls?: string[]
}

export async function reviewOrder(params: ReviewOrderParams): Promise<unknown> {
  return httpApi.post(`${PREFIX}/review`, params)
}
