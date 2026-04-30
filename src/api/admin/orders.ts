/** 管理员端订单（超级管理员 / 小程序审核员）；全量 `/orders` 路径。 */
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

export async function createOrder(body: Record<string, unknown>): Promise<OrderWriteResult> {
  return (await httpApi.post('/orders', body)) as OrderWriteResult
}

export async function updateOrder(
  orderId: string | number,
  body: Record<string, unknown>,
): Promise<OrderWriteResult> {
  const id = encodeURIComponent(String(orderId).trim())
  return (await httpApi.put(`/orders/${id}`, body)) as OrderWriteResult
}

export async function cancelOrder(orderId: string | number): Promise<OrderWriteResult> {
  return (await httpApi.post('/orders/cancel', { order_id: orderId })) as OrderWriteResult
}

export async function fetchOrdersList(query: OrdersListQuery): Promise<OrdersListData> {
  const raw = await httpApi.get('/orders', { params: buildOrdersListRequestParams(query) })
  return normalizeOrdersListPayload(raw)
}

export async function fetchOrderDetail(orderId: string | number): Promise<OrderDetailResponse> {
  const raw = await httpApi.get('/orders/detail', { params: buildOrderDetailRequestParams(orderId) })
  return normalizeOrderDetailPayload(raw)
}
