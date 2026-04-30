/**
 * CustomOrder 路由与车辆表单的 TypeScript 形状说明。
 */

/** 顶部四个步骤，与 `tabItems` / 底部按钮切换一致 */
export type OrderTab = 'vehicle' | 'creative' | 'address' | 'amount'

/**
 * 车辆 + 前后轮规格（与 `buildCreateOrderFromCustomOrder` / 详情回填字段对齐）。
 * Wheel-Size 关闭时仍用 `brand` / `model`；开启时另含世代/年/配置 slug 或 id。
 */
export interface VehicleFormState {
  /** Telegram 展示昵称（对接 `telegram_nickname`，≠ 收货人姓名） */
  customerName: string
  /** 通常来自 Telegram，可手改 */
  customerId: string
  brand: string
  model: string
  /** Wheel-Size：世代 slug */
  wheelGeneration: string
  /** Wheel-Size：年份选项 value（常为 id） */
  wheelYear: string
  /** Wheel-Size：配置/trim slug */
  wheelModification: string
  /** 接口字段 brake_disc */
  brakeDisc: string
  /** true = 前后轮规格镜像同一套；false = 填后轮区 */
  mirrorPair: boolean
  frontSize: string
  frontQuantity: string
  frontWidth: string
  frontEt: string
  frontPcdLeft: string
  frontPcdRight: string
  frontCb: string
  frontPaint: string
  frontHole: string
  frontBoltSeat: string
  rearSize: string
  rearQuantity: string
  rearWidth: string
  rearEt: string
  rearPcdLeft: string
  rearPcdRight: string
  rearCb: string
  rearPaint: string
  rearHole: string
  rearBoltSeat: string
  vin: string
  plate: string
  /** 卡钳/轮缘等补充说明 */
  rimThickness: string
  /**
   * Wheel-Size：所选世代 + 年份下首张车身图（CDN URL），用于展示与 `car_model_imgs` 提交。
   */
  carModelBodyImageUrl: string
}
