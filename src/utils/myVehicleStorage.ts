/**
 * 个人中心「我的车辆」：按用户 id 存 localStorage，供定制单页预填车型链。
 */
import type { CarSelectionValue } from '@/data/carSelection'
import { getTelegramUserId } from '@/utils/userTelegram'

const STORAGE_PREFIX = 'vite_profile_my_vehicle:'

export function myVehicleStorageKey(): string {
  return `${STORAGE_PREFIX}${getTelegramUserId()}`
}

/** 是否与 CarSelectionPanel 数据结构一致（品牌 / 车型 / 年款文案） */
export type MyVehicleCache = CarSelectionValue

export function loadMyVehicleSelection(): MyVehicleCache | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(myVehicleStorageKey())
    if (!raw?.trim()) return null
    const o = JSON.parse(raw) as Partial<MyVehicleCache>
    const brand = typeof o.brand === 'string' ? o.brand.trim() : ''
    const model = typeof o.model === 'string' ? o.model.trim() : ''
    const year = typeof o.year === 'string' ? o.year.trim() : ''
    const wheelGeneration = typeof o.wheelGeneration === 'string' ? o.wheelGeneration.trim() : ''
    const wheelYear = typeof o.wheelYear === 'string' ? o.wheelYear.trim() : ''
    const wheelModification = typeof o.wheelModification === 'string' ? o.wheelModification.trim() : ''
    if (!brand && !model && !year && !wheelGeneration && !wheelYear) return null
    return {
      brand,
      model,
      year,
      ...(wheelGeneration ? { wheelGeneration } : {}),
      ...(wheelYear ? { wheelYear } : {}),
      ...(wheelModification ? { wheelModification } : {}),
    }
  } catch {
    return null
  }
}

export function saveMyVehicleSelection(v: MyVehicleCache): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      myVehicleStorageKey(),
      JSON.stringify({
        brand: String(v.brand ?? '').trim(),
        model: String(v.model ?? '').trim(),
        year: String(v.year ?? '').trim(),
        wheelGeneration: String(v.wheelGeneration ?? '').trim(),
        wheelYear: String(v.wheelYear ?? '').trim(),
        wheelModification: String(v.wheelModification ?? '').trim(),
      }),
    )
  } catch {
    /* ignore quota / privacy mode */
  }
}
