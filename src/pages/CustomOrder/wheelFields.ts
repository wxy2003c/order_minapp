/**
 * 定制预下单 · 前轮/后轮轮毂规格表单「行定义」。
 *
 * - 用于 `VehicleTab` 里 `v-for`，按 key 绑定到 `vehicleForm`（如 frontSize、rearPaint）。
 * - `type === 'pcd'` 时在模板中用两个独立 input（左×右），与提交 API 的 `f_*` / `r_*` 拆分一致。
 * - `translate` 传入 `t`，避免本模块依赖全局 i18n（便于测试与非 Vue 侧复用）。
 */

/** 下拉项（尺寸、孔型、螺丝类等共用） */
export interface CustomOrderSelectOpt {
  value: string | number
  label: string
}

/** select = 下拉；input = 单行文本；pcd = 双文本「孔距」非标准结构 */
export type WheelRowType = 'select' | 'input' | 'pcd'

/** 单列字段元数据，`key` 与 reactive `vehicleForm` 属性名一致 */
export interface WheelFieldRowDef {
  key: string
  label: string
  type: WheelRowType
  options?: CustomOrderSelectOpt[]
  /** PCD 行可为空字符串（占位不参与占位文案展示逻辑时使用） */
  placeholder: string
}

/**
 * 生成前轮或后轮一整列表单行定义（顺序与后端期望规格顺序对齐）。
 *
 * @param opts.prefix `front` | `rear`，决定 key 前缀（如 frontSize / rearSize）
 * @param opts.sizeOptions 寸数下拉（16–24 等由上游 `t('wheel.inch*')` 生成）
 * @param opts.holeOptions 孔型（锥口/平口/球口等，value 与后端约定中文一致）
 * @param opts.oemBoltTypeOptions 螺丝类型（原厂/改装）
 * @param opts.translate 文案函数，通常传页面 `t`
 */
export function buildWheelFieldsList(opts: {
  prefix: 'front' | 'rear'
  sizeOptions: CustomOrderSelectOpt[]
  holeOptions: CustomOrderSelectOpt[]
  oemBoltTypeOptions: CustomOrderSelectOpt[]
  translate: (key: string) => string
}): WheelFieldRowDef[] {
  const { prefix, sizeOptions, holeOptions, oemBoltTypeOptions, translate: tl } = opts
  return [
    {
      key: `${prefix}Size`,
      label: tl('customOrder.sizeIn'),
      type: 'select',
      options: sizeOptions,
      placeholder: tl('common.pleaseSelect'),
    },
    {
      key: `${prefix}Quantity`,
      label: tl('customOrder.qty'),
      type: 'input',
      placeholder: tl('common.pleaseEnter'),
    },
    {
      key: `${prefix}Width`,
      label: tl('customOrder.widthJ'),
      type: 'input',
      placeholder: tl('common.pleaseEnter'),
    },
    {
      key: `${prefix}Et`,
      label: tl('customOrder.etMm'),
      type: 'input',
      placeholder: tl('common.pleaseEnter'),
    },
    { key: `${prefix}Pcd`, label: tl('customOrder.pcd'), type: 'pcd', placeholder: '' },
    {
      key: `${prefix}Cb`,
      label: tl('customOrder.cbMm'),
      type: 'input',
      placeholder: tl('common.pleaseEnter'),
    },
    {
      key: `${prefix}BoltSeat`,
      label: tl('customOrder.bolt'),
      type: 'select',
      options: oemBoltTypeOptions,
      placeholder: tl('common.pleaseSelect'),
    },
    {
      key: `${prefix}Hole`,
      label: tl('customOrder.hole'),
      type: 'select',
      options: holeOptions,
      placeholder: tl('common.pleaseSelect'),
    },
    {
      key: `${prefix}Paint`,
      label: tl('customOrder.finish'),
      type: 'input',
      placeholder: tl('customOrder.finishPh'),
    },
  ]
}
