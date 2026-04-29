import type { VehicleFormState } from '@/pages/CustomOrder/models'

export interface CarGroup {
  brand: string
  models: string[]
  years: string[]
}

/** 与定制单 `vehicleForm` 相同的五段字段名 + 可选展示文案（面板 `v-model:year` / 旧缓存） */
export type CarSelectionValue = Pick<
  VehicleFormState,
  'brand' | 'model' | 'wheelGeneration' | 'wheelYear' | 'wheelModification'
> & {
  /**
   * Wheel-Size：CarSelectionPanel 展示的「世代 · 年 · 配置」拼接。
   * 静态 `carGroups`：年段文案。预填/接口以 `wheel*` 为准。
   */
  year: string
}

export const carGroups: CarGroup[] = [
  {
    brand: '奥迪',
    models: ['A5/F5', 'A4/B9', 'A6/C8', 'Q5/FY', 'RS5'],
    years: ['2012-2015', '2016...2020', '2021-2024'],
  },
  {
    brand: '阿尔法·罗密欧',
    models: ['Giulia 952', 'Giulia Veloce', 'Giulia Quadrifoglio', 'Giulia GTA', 'Giulia GTAm'],
    years: ['1995-2005', '2005-2010', '2010-2015', '2015-2020', '2020-2025'],
  },
  {
    brand: 'AITO',
    models: ['问界 M5', '问界 M7', '问界 M9', '问界 新M7', '问界 M8'],
    years: ['2018-2020', '2020-2022', '2022-2024', '2024-2026'],
  },
  {
    brand: '宝马',
    models: ['3 系 G20', '5 系 G60', 'X3 G45', 'X5 G05', 'M3 G80'],
    years: ['2008-2012', '2012-2016', '2016-2020', '2020-2025'],
  },
  {
    brand: '别克',
    models: ['君威 GS', '君越', '昂科威', '昂科旗'],
    years: ['2006-2010', '2010-2015', '2015-2020', '2020-2025'],
  },
  {
    brand: '保时捷',
    models: ['718 Cayman', '911 Carrera', 'Panamera', 'Macan'],
    years: ['2000-2005', '2005-2010', '2010-2015', '2015-2025'],
  },
  {
    brand: '奔驰',
    models: ['C 级 W206', 'E 级 W214', 'GLC X254', 'AMG GT'],
    years: ['2005-2010', '2010-2015', '2015-2020', '2020-2025'],
  },
  {
    brand: '比亚迪',
    models: ['汉 EV', '海豹 06', '唐 DM-i', '腾势 N7'],
    years: ['2016-2019', '2019-2022', '2022-2025'],
  },
  {
    brand: '标致',
    models: ['408X', '508L', '3008', '5008'],
    years: ['2008-2012', '2012-2016', '2016-2020', '2020-2025'],
  },
]

export function getDefaultCarSelection(groups: CarGroup[] = carGroups): CarSelectionValue {
  const [firstGroup] = groups

  return {
    brand: firstGroup?.brand ?? '',
    model: firstGroup?.models[0] ?? '',
    wheelGeneration: '',
    wheelYear: '',
    wheelModification: '',
    year: firstGroup?.years[0] ?? '',
  }
}
