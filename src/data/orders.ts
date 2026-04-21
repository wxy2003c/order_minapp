export type OrderStatus =
  | '设计中'
  | '待确认'
  | '已取消'
  | '已锁单'
  | '生产中'
  | '已发货'
  | '已完成'

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
  buttonLabel: string
  buttonVariant: 'primary' | 'outline'
}

export const orderStatusMeta: Record<OrderStatus, OrderStatusMeta> = {
  设计中: {
    label: '设计中',
    icon: 'solar:pen-bold',
    statusClass: 'text-[#f59e0b]',
    buttonLabel: '继续设计',
    buttonVariant: 'outline',
  },
  待确认: {
    label: '待确认',
    icon: 'solar:hourglass-bold',
    statusClass: 'text-[#94a3b8]',
    buttonLabel: '查看订单',
    buttonVariant: 'outline',
  },
  已取消: {
    label: '已取消',
    icon: 'solar:close-circle-bold',
    statusClass: 'text-[#9ca3af]',
    buttonLabel: '返回列表',
    buttonVariant: 'outline',
  },
  已锁单: {
    label: '已锁单',
    icon: 'solar:lock-keyhole-bold',
    statusClass: 'text-[#7c83ff]',
    buttonLabel: '查看锁单',
    buttonVariant: 'outline',
  },
  生产中: {
    label: '生产中',
    icon: 'solar:box-bold',
    statusClass: 'text-[#3b82f6]',
    buttonLabel: '查看进度',
    buttonVariant: 'outline',
  },
  已发货: {
    label: '已发货',
    icon: 'solar:delivery-bold',
    statusClass: 'text-[#14b8a6]',
    buttonLabel: '查看物流',
    buttonVariant: 'outline',
  },
  已完成: {
    label: '已完成',
    icon: 'solar:check-circle-bold',
    statusClass: 'text-[#6caeff]',
    buttonLabel: '去评价',
    buttonVariant: 'primary',
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
