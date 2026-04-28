/**
 * 预下单页「车辆必填链 + 轮毂尺寸/表面处理」校验。
 *
 * - 不包含「结构类型」「金额」等非车辆/轮毂项；那些事在导航或 `submitPreorder` 里单独判断。
 * - 所有返回值均为 i18n 一句提示文案 key 经 `t()` 翻译后的可读字符串；无问题时返回 `null`。
 */

/** 与 naive-ui / 本项目 `t` 一致的点路径文案函数 */
export type CustomOrderTranslate = (key: string) => string

/** 与 `validateWheelSizeAndFinish` 一致：标签上展示必填 * */
export function isRequiredWheelFieldKey(key: string): boolean {
  return key === 'frontSize' || key === 'frontPaint' || key === 'rearSize' || key === 'rearPaint'
}

export type VehicleRequiredFields = {
  brand: string
  model: string
  wheelGeneration: string
  wheelYear: string
  wheelModification: string
}

export type WheelFinishFields = {
  frontSize: string
  frontPaint: string
  rearSize: string
  rearPaint: string
  mirrorPair: boolean
}

/**
 * 车型库 / 静态品牌车型：与标签 * 一致。
 * @param wheelSizeEnabled 为 true 时校验完整的 Wheel-Size 链（含配置）。
 */
export function validateVehicleRequired(
  wheelSizeEnabled: boolean,
  v: VehicleRequiredFields,
  t: CustomOrderTranslate,
): string | null {
  if (wheelSizeEnabled) {
    if (
      !String(v.brand ?? '').trim()
      || !String(v.model ?? '').trim()
      || !String(v.wheelGeneration ?? '').trim()
      || !String(v.wheelYear ?? '').trim()
      || !String(v.wheelModification ?? '').trim()
    )
      return t('customOrder.errVehicle')
  } else {
    if (!String(v.brand ?? '').trim() || !String(v.model ?? '').trim())
      return t('customOrder.errVehicleBrandModel')
  }
  return null
}

/** 尺寸（吋）与表面处理：前轮必填；分轮时后轮同两项必填 */
export function validateWheelSizeAndFinish(v: WheelFinishFields, t: CustomOrderTranslate): string | null {
  if (!String(v.frontSize ?? '').trim()) return t('customOrder.errMissingSize')
  if (!String(v.frontPaint ?? '').trim()) return t('customOrder.errMissingFinish')
  if (!v.mirrorPair) {
    if (!String(v.rearSize ?? '').trim()) return t('customOrder.errMissingRearSize')
    if (!String(v.rearPaint ?? '').trim()) return t('customOrder.errMissingRearFinish')
  }
  return null
}
