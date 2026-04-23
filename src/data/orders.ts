export type OrderStatus =
  | 'designing'
  | 'pending_confirm'
  | 'cancelled'
  | 'locked'
  | 'in_production'
  | 'pending_shipment'
  | 'shipped'
  | 'completed'

export type OrderStructureKey = 'one_piece' | 'two_piece' | 'three_piece' | 'off_road'

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
  /** i18n key: `orderAction.*` */
  labelKey: string
  variant: 'primary' | 'outline'
}

export interface OrderSummary {
  id: string
  /** 展示用语种无关键，如 `orderStructure.*` */
  structureKey: OrderStructureKey
  status: OrderStatus
  title: string
  spec: string
  customer: string
  customerId: string
  time: string
}

export interface OrderStatusMeta {
  /** i18n key: `orderStatus.*` */
  labelKey: string
  icon: string
  statusClass: string
  detailActions: OrderDetailAction[]
}

export const orderStatusMeta: Record<OrderStatus, OrderStatusMeta> = {
  designing: {
    labelKey: 'orderStatus.designing',
    icon: 'solar:pen-bold',
    statusClass: 'text-[#f59e0b]',
    detailActions: [
      { key: 'contact_support', labelKey: 'orderAction.contact_support', variant: 'primary' },
    ],
  },
  pending_confirm: {
    labelKey: 'orderStatus.pending_confirm',
    icon: 'solar:hourglass-bold',
    statusClass: 'text-[#94a3b8]',
    detailActions: [
      { key: 'cancel_order', labelKey: 'orderAction.cancel_order', variant: 'outline' },
      { key: 'edit_order', labelKey: 'orderAction.edit_order', variant: 'primary' },
    ],
  },
  cancelled: {
    labelKey: 'orderStatus.cancelled',
    icon: 'solar:close-circle-bold',
    statusClass: 'text-[#9ca3af]',
    detailActions: [
      { key: 'reorder', labelKey: 'orderAction.reorder', variant: 'primary' },
    ],
  },
  locked: {
    labelKey: 'orderStatus.locked',
    icon: 'solar:lock-keyhole-bold',
    statusClass: 'text-[#7c83ff]',
    detailActions: [
      { key: 'contact_support', labelKey: 'orderAction.contact_support', variant: 'primary' },
    ],
  },
  in_production: {
    labelKey: 'orderStatus.in_production',
    icon: 'solar:box-bold',
    statusClass: 'text-[#3b82f6]',
    detailActions: [
      { key: 'contact_support', labelKey: 'orderAction.contact_support', variant: 'primary' },
    ],
  },
  pending_shipment: {
    labelKey: 'orderStatus.pending_shipment',
    icon: 'mdi:truck-delivery-outline',
    statusClass: 'text-[#0ea5e9]',
    detailActions: [
      { key: 'contact_support', labelKey: 'orderAction.contact_support', variant: 'primary' },
    ],
  },
  shipped: {
    labelKey: 'orderStatus.shipped',
    icon: 'solar:delivery-bold',
    statusClass: 'text-[#14b8a6]',
    detailActions: [
      { key: 'confirm_receive', labelKey: 'orderAction.confirm_receive', variant: 'primary' },
      { key: 'contact_support', labelKey: 'orderAction.contact_support', variant: 'outline' },
    ],
  },
  completed: {
    labelKey: 'orderStatus.completed',
    icon: 'solar:check-circle-bold',
    statusClass: 'text-[#6caeff]',
    detailActions: [
      { key: 'review', labelKey: 'orderAction.review', variant: 'primary' },
      { key: 'contact_support', labelKey: 'orderAction.contact_support', variant: 'outline' },
    ],
  },
}

export const profileOrders: OrderSummary[] = [
  {
    id: 'WL2026040961631',
    structureKey: 'two_piece',
    status: 'designing',
    title: 'Audi A5/F5[2016...2020]/DISESL 2.0Dti 14 188HP',
    spec: '20x10J | 5x114.3 | ET35 | CB67.1',
    customer: 'Mealcidal Deloi',
    customerId: '6182608402',
    time: '2026-03-31 09:12',
  },
  {
    id: 'WL2026040961632',
    structureKey: 'three_piece',
    status: 'locked',
    title: 'Audi A5/F5[2016...2020]/DISESL 2.0Dti 14 188HP',
    spec: '20x10J | 5x114.3 | ET35 | CB67.1',
    customer: 'Mealcidal Deloi',
    customerId: '6182608402',
    time: '2026-03-31 09:12',
  },
  {
    id: 'WL2026040961633',
    structureKey: 'one_piece',
    status: 'in_production',
    title: 'Audi A5/F5[2016...2020]/DISESL 2.0Dti 14 188HP',
    spec: '20x10J | 5x114.3 | ET35 | CB67.1',
    customer: 'Mealcidal Deloi',
    customerId: '6182608402',
    time: '2026-03-31 09:12',
  },
  {
    id: 'WL2026040961633b',
    structureKey: 'one_piece',
    status: 'pending_shipment',
    title: 'Audi A5/F5[2016...2020]/DISESL 2.0Dti 14 188HP',
    spec: '20x10J | 5x114.3 | ET35 | CB67.1',
    customer: 'Mealcidal Deloi',
    customerId: '6182608402',
    time: '2026-04-20 10:00',
  },
  {
    id: 'WL2026040961634',
    structureKey: 'two_piece',
    status: 'shipped',
    title: 'Audi A5/F5[2016...2020]/DISESL 2.0Dti 14 188HP',
    spec: '20x10J | 5x114.3 | ET35 | CB67.1',
    customer: 'Mealcidal Deloi',
    customerId: '6182608402',
    time: '2026-03-31 09:12',
  },
  {
    id: 'WL2026040961635',
    structureKey: 'two_piece',
    status: 'completed',
    title: 'Audi A5/F5[2016...2020]/DISESL 2.0Dti 14 188HP',
    spec: '20x10J | 5x114.3 | ET35 | CB67.1',
    customer: 'Mealcidal Deloi',
    customerId: '6182608402',
    time: '2026-03-31 09:12',
  },
]
