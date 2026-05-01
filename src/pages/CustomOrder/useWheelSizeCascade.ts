/**
 * Wheel-Size 五级联动（品牌 → 车型 → 世代 → 年份 → 配置/trim）。
 *
 * - API 见 `@/api/wheelsline-size`；`wsLoadingStage` 用 0–4 标记当前请求的是哪一级，仅该级下拉显示 loading。
 * - `vehicleForm` 与页面 `vehicleForm` 必须为同一 reactive 引用，才能保证改品牌时清空下游字段与选项。
 */

import { ref } from 'vue'
import type { WheelSizeGenerationRow, WheelSizeOption } from '@/api/wheelsline-size'
import {
  fetchWheelSizeGenerations,
  fetchWheelSizeMakes,
  fetchWheelSizeModels,
  fetchWheelSizeModifications,
  resolveWheelSizeYearOptions,
  wheelSizeGenerationOptionLabel,
} from '@/api/wheelsline-size'

export interface SelectOptionLite {
  value: string | number
  label: string
}

export interface WheelCascadeVehicleMutable {
  brand: string
  model: string
  wheelGeneration: string
  wheelYear: string
  wheelModification: string
}

/** API 的年份/型号类选项转成 TgSelect 需要的 value/label */
function wheelOptToSelect(o: WheelSizeOption): SelectOptionLite {
  return { value: o.id, label: o.label }
}

/** 世代列表：slug 写入 `vehicleForm.wheelGeneration`；展示与接口 `year_ranges` 对齐 */
function generationRowsToSelectOptions(rows: WheelSizeGenerationRow[]): SelectOptionLite[] {
  return rows.map(g => ({
    value: g.slug,
    label: wheelSizeGenerationOptionLabel(g),
  }))
}

/**
 * @param wheelSizeEnabled 关闭时不应挂载本 composable 的异步逻辑；保留参数供类型一致。
 * @param vehicleForm 与预下单 `vehicleForm` 同一响应式对象，用于联动清空下游字段。
 */
export function useWheelSizeCascade(
  wheelSizeEnabled: boolean,
  vehicleForm: WheelCascadeVehicleMutable,
) {
  const wsBrandOptions = ref<SelectOptionLite[]>([])
  const wsModelOptions = ref<SelectOptionLite[]>([])
  const wsGenOptions = ref<SelectOptionLite[]>([])
  const wsYearOptions = ref<SelectOptionLite[]>([])
  const wsModOptions = ref<SelectOptionLite[]>([])
  const wsGenerationsCache = ref<WheelSizeGenerationRow[]>([])
  /** 与 CarSelectionPanel 一致：仅当前请求层级显示 loading */
  const wsLoadingStage = ref<number | null>(null)
  /** i18n key under `ws.*` */
  const wsErrorKey = ref<string | null>(null)

  /** 拉取全部品牌（含首屏 onMounted）；失败时 wsErrorKey 走 `ws.*` i18n */
  async function loadWheelMakes() {
    if (!wheelSizeEnabled) return
    wsLoadingStage.value = 0
    wsErrorKey.value = null
    try {
      const items = await fetchWheelSizeMakes()
      wsBrandOptions.value = items.map(wheelOptToSelect)
      if (!items.length) wsErrorKey.value = 'ws.emptyBrands'
    } catch {
      wsBrandOptions.value = []
      wsErrorKey.value = 'ws.brandsFailed'
    } finally {
      wsLoadingStage.value = null
    }
  }

  /** 某品牌下车系列表（依赖品牌） */
  async function loadWheelModels(make: string) {
    wsModelOptions.value = []
    if (!make) return
    wsLoadingStage.value = 1
    wsErrorKey.value = null
    try {
      const items = await fetchWheelSizeModels(make)
      wsModelOptions.value = items.map(wheelOptToSelect)
      if (!items.length) wsErrorKey.value = 'ws.emptyModels'
    } catch {
      wsModelOptions.value = []
      wsErrorKey.value = 'ws.modelsFailed'
    } finally {
      wsLoadingStage.value = null
    }
  }

  /** 世代行缓存到 `wsGenerationsCache`，供解析年份时用同一条世代记录 */
  async function loadWheelGenerations(make: string, model: string) {
    wsGenOptions.value = []
    wsGenerationsCache.value = []
    if (!make || !model) return
    wsLoadingStage.value = 2
    wsErrorKey.value = null
    try {
      const rows = await fetchWheelSizeGenerations(make, model)
      wsGenerationsCache.value = rows
      wsGenOptions.value = generationRowsToSelectOptions(rows)
      if (!rows.length) wsErrorKey.value = 'ws.emptyGenerations'
    } catch {
      wsGenerationsCache.value = []
      wsGenOptions.value = []
      wsErrorKey.value = 'ws.generationsFailed'
    } finally {
      wsLoadingStage.value = null
    }
  }

  /** `genSlug` 即 `wheelGeneration`，用于在 cache 里找 `WheelSizeGenerationRow` */
  async function loadWheelYears(make: string, model: string, genSlug: string) {
    wsYearOptions.value = []
    if (!make || !model || !genSlug) return
    wsLoadingStage.value = 3
    wsErrorKey.value = null
    try {
      const gen = wsGenerationsCache.value.find(
        x => String(x.slug).toLowerCase() === genSlug.toLowerCase(),
      )
      const items = await resolveWheelSizeYearOptions(make, model, gen)
      wsYearOptions.value = items.map(wheelOptToSelect)
      if (!items.length) wsErrorKey.value = 'ws.emptyYears'
    } catch {
      wsYearOptions.value = []
      wsErrorKey.value = 'ws.yearsFailed'
    } finally {
      wsLoadingStage.value = null
    }
  }

  /** trim/配置，`year` 为上一列选中的 value（字符串化） */
  async function loadWheelMods(make: string, model: string, year: string, genSlug: string) {
    wsModOptions.value = []
    if (!make || !model || !year) return
    wsLoadingStage.value = 4
    wsErrorKey.value = null
    try {
      const items = await fetchWheelSizeModifications(make, model, year, genSlug || undefined)
      wsModOptions.value = items.map(wheelOptToSelect)
      if (!items.length) wsErrorKey.value = 'ws.emptyMods'
    } catch {
      wsModOptions.value = []
      wsErrorKey.value = 'ws.modsFailed'
    } finally {
      wsLoadingStage.value = null
    }
  }

  /** 改品牌：清空下级字段与选项，再拉型号 */
  async function onWheelBrandChange(v: string | number) {
    const make = String(v ?? '')
    vehicleForm.brand = make
    vehicleForm.model = ''
    vehicleForm.wheelGeneration = ''
    vehicleForm.wheelYear = ''
    vehicleForm.wheelModification = ''
    wsModelOptions.value = []
    wsGenOptions.value = []
    wsYearOptions.value = []
    wsModOptions.value = []
    wsGenerationsCache.value = []
    if (!make) return
    await loadWheelModels(make)
  }

  /** 改型号：清空世代及以下，重新拉世代 */
  async function onWheelModelChange(v: string | number) {
    const model = String(v ?? '')
    vehicleForm.model = model
    vehicleForm.wheelGeneration = ''
    vehicleForm.wheelYear = ''
    vehicleForm.wheelModification = ''
    wsGenOptions.value = []
    wsYearOptions.value = []
    wsModOptions.value = []
    wsGenerationsCache.value = []
    if (!vehicleForm.brand || !model) return
    await loadWheelGenerations(vehicleForm.brand, model)
  }

  /** 改世代：清空年份与配置，重新拉年份 */
  async function onWheelGenerationChange(v: string | number) {
    const slug = String(v ?? '')
    vehicleForm.wheelGeneration = slug
    vehicleForm.wheelYear = ''
    vehicleForm.wheelModification = ''
    wsYearOptions.value = []
    wsModOptions.value = []
    if (!vehicleForm.brand || !vehicleForm.model || !slug) return
    await loadWheelYears(vehicleForm.brand, vehicleForm.model, slug)
  }

  /** 改年份：清空配置，重新拉 trim */
  async function onWheelYearChange(v: string | number) {
    const y = String(v ?? '')
    vehicleForm.wheelYear = y
    vehicleForm.wheelModification = ''
    wsModOptions.value = []
    if (!vehicleForm.brand || !vehicleForm.model || !y) return
    await loadWheelMods(vehicleForm.brand, vehicleForm.model, y, vehicleForm.wheelGeneration)
  }

  /** 终点列，仅存 slug/id，无需再请求 */
  function onWheelModificationChange(v: string | number) {
    vehicleForm.wheelModification = String(v ?? '')
  }

  return {
    // 下拉数据源 + 世代原始行（供年份解析）
    wsBrandOptions,
    wsModelOptions,
    wsGenOptions,
    wsYearOptions,
    wsModOptions,
    wsGenerationsCache,
    wsLoadingStage,
    wsErrorKey,
    loadWheelMakes,
    loadWheelModels,
    loadWheelGenerations,
    loadWheelYears,
    loadWheelMods,
    onWheelBrandChange,
    onWheelModelChange,
    onWheelGenerationChange,
    onWheelYearChange,
    onWheelModificationChange,
  }
}
