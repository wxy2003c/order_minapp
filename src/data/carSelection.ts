import type { VehicleFormState } from '@/pages/CustomOrder/models'

/** 历史遗留形状；静态列表已废弃，选型仅走 Wheel-Size API。 */
export interface CarGroup {
  brand: string
  models: string[]
  years: string[]
}

/** 与定制单 `vehicleForm` 相同的五段字段名 + 展示用 `year`（面板 `v-model:year`） */
export type CarSelectionValue = Pick<
  VehicleFormState,
  'brand' | 'model' | 'wheelGeneration' | 'wheelYear' | 'wheelModification'
> & {
  year: string
}

export function getDefaultCarSelection(): CarSelectionValue {
  return {
    brand: '',
    model: '',
    wheelGeneration: '',
    wheelYear: '',
    wheelModification: '',
    year: '',
  }
}
