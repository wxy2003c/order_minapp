export type OrderStatus =
  | '设计中'
  | '待确认'
  | '已取消'
  | '已锁单'
  | '生产中'
  | '待发货'
  | '已发货'
  | '已完成'

/** 订单详情页底栏操作 */
export type OrderDetailActionKey =
  | 'cancel_order'
  | 'edit_order'
  | 'contact_support'
  | 'confirm_receive'
  | 'review'
  | 'reorder'

export interface OrderDetailAction {
  key: OrderDetailActionKey
  label: string
  variant: 'primary' | 'outline'
}

export interface OrderSummary {
  id: string
  type: string
  status: OrderStatus
  title: string
  spec: string
  customer: string
  customerId: string
  time: string
}

export interface OrderStatusMeta {
  label: OrderStatus
  icon: string
  statusClass: string
  /** 订单详情底部：待确认=取消+修改，设计中/已锁单/生产/待发货=联系客服，已发货=确认收货+客服，已完成=评价+客服，已取消=重新定制 */
  detailActions: OrderDetailAction[]
}

export const orderStatusMeta: Record<OrderStatus, OrderStatusMeta> = {
  设计中: {
    label: '设计中',
    icon: 'solar:pen-bold',
    statusClass: 'text-[#f59e0b]',
    detailActions: [
      { key: 'contact_support', label: '联系客服', variant: 'primary' },
    ],
  },
  待确认: {
    label: '待确认',
    icon: 'solar:hourglass-bold',
    statusClass: 'text-[#94a3b8]',
    detailActions: [
      { key: 'cancel_order', label: '取消订单', variant: 'outline' },
      { key: 'edit_order', label: '修改订单', variant: 'primary' },
    ],
  },
  已取消: {
    label: '已取消',
    icon: 'solar:close-circle-bold',
    statusClass: 'text-[#9ca3af]',
    detailActions: [
      { key: 'reorder', label: '重新定制', variant: 'primary' },
    ],
  },
  已锁单: {
    label: '已锁单',
    icon: 'solar:lock-keyhole-bold',
    statusClass: 'text-[#7c83ff]',
    detailActions: [
      { key: 'contact_support', label: '联系客服', variant: 'primary' },
    ],
  },
  生产中: {
    label: '生产中',
    icon: 'solar:box-bold',
    statusClass: 'text-[#3b82f6]',
    detailActions: [
      { key: 'contact_support', label: '联系客服', variant: 'primary' },
    ],
  },
  待发货: {
    label: '待发货',
    icon: 'mdi:truck-delivery-outline',
    statusClass: 'text-[#0ea5e9]',
    detailActions: [
      { key: 'contact_support', label: '联系客服', variant: 'primary' },
    ],
  },
  已发货: {
    label: '已发货',
    icon: 'solar:delivery-bold',
    statusClass: 'text-[#14b8a6]',
    detailActions: [
      { key: 'confirm_receive', label: '确认收货', variant: 'primary' },
      { key: 'contact_support', label: '联系客服', variant: 'outline' },
    ],
  },
  已完成: {
    label: '已完成',
    icon: 'solar:check-circle-bold',
    statusClass: 'text-[#6caeff]',
    detailActions: [
      { key: 'review', label: '评价', variant: 'primary' },
      { key: 'contact_support', label: '联系客服', variant: 'outline' },
    ],
  },
}

export const profileOrders: OrderSummary[] = [
  {
    id: 'WL2026040961631',
    type: '双片',
    status: '设计中',
    title: 'Audi A5/F5[2016...2020]/DISESL 2.0Dti 14 188HP',
    spec: '20x10J | 5x114.3 | ET35 | CB67.1',
    customer: 'Mealcidal Deloi',
    customerId: '6182608402',
    time: '2026-03-31 09:12',
  },
  {
    id: 'WL2026040961632',
    type: '三片',
    status: '已锁单',
    title: 'Audi A5/F5[2016...2020]/DISESL 2.0Dti 14 188HP',
    spec: '20x10J | 5x114.3 | ET35 | CB67.1',
    customer: 'Mealcidal Deloi',
    customerId: '6182608402',
    time: '2026-03-31 09:12',
  },
  {
    id: 'WL2026040961633',
    type: '单片',
    status: '生产中',
    title: 'Audi A5/F5[2016...2020]/DISESL 2.0Dti 14 188HP',
    spec: '20x10J | 5x114.3 | ET35 | CB67.1',
    customer: 'Mealcidal Deloi',
    customerId: '6182608402',
    time: '2026-03-31 09:12',
  },
  {
    id: 'WL2026040961633b',
    type: '单片',
    status: '待发货',
    title: 'Audi A5/F5[2016...2020]/DISESL 2.0Dti 14 188HP',
    spec: '20x10J | 5x114.3 | ET35 | CB67.1',
    customer: 'Mealcidal Deloi',
    customerId: '6182608402',
    time: '2026-04-20 10:00',
  },
  {
    id: 'WL2026040961634',
    type: '双片',
    status: '已发货',
    title: 'Audi A5/F5[2016...2020]/DISESL 2.0Dti 14 188HP',
    spec: '20x10J | 5x114.3 | ET35 | CB67.1',
    customer: 'Mealcidal Deloi',
    customerId: '6182608402',
    time: '2026-03-31 09:12',
  },
  {
    id: 'WL2026040961635',
    type: '双片',
    status: '已完成',
    title: 'Audi A5/F5[2016...2020]/DISESL 2.0Dti 14 188HP',
    spec: '20x10J | 5x114.3 | ET35 | CB67.1',
    customer: 'Mealcidal Deloi',
    customerId: '6182608402',
    time: '2026-03-31 09:12',
  },
]
