/*
 * @Author: wxy2003c 774078984@qq.com
 * @Date: 2026-04-27 10:29:20
 * @LastEditors: wxy2003c 774078984@qq.com
 * @LastEditTime: 2026-04-27 10:49:16
 * @FilePath: \vite-project\src\utils\orderStatus.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import type { OrderStatus } from '@/data/orders'

const API_STATUS_ZH: Record<string, OrderStatus> = {
  待确认: 'pending_confirm',
  设计中: 'designing',
  已取消: 'cancelled',
  已锁单: 'locked',
  生产中: 'in_production',
  待发货: 'pending_shipment',
  已发货: 'shipped',
  已完成: 'completed',
}

/**
 * 将 `GET /orders` / `GET /orders/detail` 返回的中文 `status` / `status_label` 映射为本地 `OrderStatus`，
 * 用于 `orderStatusMeta` 底栏动作、样式等。无法识别时回退为 `pending_confirm`。
 */
export function mapApiStatusToOrderStatus(status: string | null | undefined): OrderStatus {
  const s = String(status ?? '').trim()
  if (!s) return 'pending_confirm'
  return API_STATUS_ZH[s] ?? 'pending_confirm'
}
 