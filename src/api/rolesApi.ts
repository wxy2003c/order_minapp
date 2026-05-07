/*
 * @Author: wxy2003c 774078984@qq.com
 * @Date: 2026-04-30 14:03:12
 * @LastEditors: wxy2003c 774078984@qq.com
 * @LastEditTime: 2026-05-07 10:11:14
 * @FilePath: \vite-project\src\api\rolesApi.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 角色动态接口分发器
 * 根据当前用户角色，自动将请求派发到 admin/ 或 user/ 对应接口。
 * 外部只需 import { xxx } from '@/api/rolesApi'，无需关心角色。
 */

import * as adminApi from '@/api/admin/index'
import * as userOrdersApi from '@/api/user/orders'
import { ensureOrderApiRoutingReady, getCurrentUserRole } from '@/api/user/index'

// 调用时取角色，确保 fetchUserDetail 已完成
const orderApi = () => {
  const role = getCurrentUserRole()
  return (role === 'admin' ? adminApi : userOrdersApi) as typeof adminApi
}

async function readyOrderApi(): Promise<typeof adminApi> {
  await ensureOrderApiRoutingReady()
  return orderApi()
}

// ── 类型透传 ────────────────────────────────────────────────────────────────
export type {
  OrderDetailResponse,
  OrderListImageItem,
  OrderListItem,
  OrderListStatusTab,
  OrdersListData,
  OrdersListQuery,
  OrderWriteResult,
  OrderDetailBillItem,
  CustomOrderFormsSnapshot,
  SelectOptionLite,
} from '@/utils/orderHelpers'

export type { FinishCardGroup, FinishCardItem, FinishCardsData } from '@/api/admin/finishCards'
export type { StyleModelItem, StyleCoverImage } from '@/api/admin/styleModels'
export type { UserRoleSnapshot, CurrentUserRole } from '@/api/user/index'

export {
  buildCreateOrderFromCustomOrder,
  parseWheelLibraryStructureSubtypeOffroad,
  mapApiStatusToOrderStatus,
} from '@/utils/orderHelpers'

// ══════════════════════════════════════════════════════════════════════════════
// 订单接口 — admin: /orders   user: /user/orders（自动剔除金额/币种）
// ══════════════════════════════════════════════════════════════════════════════

export const createOrder: typeof adminApi.createOrder =
  async (...args) => (await readyOrderApi()).createOrder(...args)

export const updateOrder: typeof adminApi.updateOrder =
  async (...args) => (await readyOrderApi()).updateOrder(...args)

export const cancelOrder: typeof adminApi.cancelOrder =
  async (...args) => (await readyOrderApi()).cancelOrder(...args)

export const fetchOrdersList: typeof adminApi.fetchOrdersList =
  async (...args) => (await readyOrderApi()).fetchOrdersList(...args)

export const fetchOrderDetail: typeof adminApi.fetchOrderDetail =
  async (...args) => (await readyOrderApi()).fetchOrderDetail(...args)

// ══════════════════════════════════════════════════════════════════════════════
// 共享接口 — 两种角色走同一端
// ══════════════════════════════════════════════════════════════════════════════

export { fetchFinishCards } from '@/api/admin/finishCards'
export { fetchStyleModels, resolveStyleModelItemForHydrate } from '@/api/admin/styleModels'
export { fetchHomePage } from '@/api/admin/home'
export type { HomePageData, HomeStyleModelItem, HomeCustomerCase } from '@/api/admin/home'
export { fetchCasesList, fetchCaseDetail } from '@/api/admin/cases'
export type { CaseItem, CasesListParams, CasesListResult, CaseDetailData, CaseViewerImage, CaseWheelAxisDetail } from '@/api/admin/cases'

// ══════════════════════════════════════════════════════════════════════════════
// 用户专属接口
// ══════════════════════════════════════════════════════════════════════════════

export { reviewOrder } from '@/api/user/orders'
export type { ReviewOrderParams } from '@/api/user/orders'

// ══════════════════════════════════════════════════════════════════════════════
// 用户接口
// ══════════════════════════════════════════════════════════════════════════════

export { fetchUserDetail, getCurrentUserRole, ensureOrderApiRoutingReady, orderRoutingRoleRef } from '@/api/user/index'
