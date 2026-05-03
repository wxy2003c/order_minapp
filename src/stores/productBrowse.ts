import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * 首页 → 产品列表 共用的「车型 + 风格标签」
 * 不依赖路由 query，切页保留，直至清空筛选或重选/重置车型与风格
 * 车型默认**空**，需用户自己选
 */
export const useProductBrowseStore = defineStore('productBrowse', () => {
  const brand = ref('')
  const model = ref('')
  const year = ref('')
  const wheelGeneration = ref('')
  const wheelYear = ref('')
  const wheelModification = ref('')
  /** 与产品页筛选里「风格标签」同字段 */
  const styleMood = ref('')

  const carLine = computed(() =>
    [brand.value, model.value, year.value].filter(Boolean).join(' · '),
  )

  function setCar(
    b: string,
    m: string,
    y: string,
    opts?: { wheelGeneration?: string; wheelYear?: string; wheelModification?: string },
  ) {
    brand.value = b
    model.value = m
    year.value = y
    wheelGeneration.value = opts?.wheelGeneration ?? ''
    wheelYear.value = opts?.wheelYear ?? ''
    wheelModification.value = opts?.wheelModification ?? ''
  }

  function setWheelSizeSelection(g: string, y: string, m: string) {
    wheelGeneration.value = g
    wheelYear.value = y
    wheelModification.value = m
  }

  function setStyleMood(s: string) {
    styleMood.value = s
  }

  /** 清空车型（首页默认、筛选「清空」中车辆部分） */
  function clearCarSelection() {
    brand.value = ''
    model.value = ''
    year.value = ''
    wheelGeneration.value = ''
    wheelYear.value = ''
    wheelModification.value = ''
  }

  function clearStyleMood() {
    styleMood.value = ''
  }

  /** 清空车型 + 风格 */
  function resetCarAndStyleMood() {
    clearCarSelection()
    clearStyleMood()
  }

  return {
    brand,
    model,
    year,
    wheelGeneration,
    wheelYear,
    wheelModification,
    styleMood,
    carLine,
    setCar,
    setWheelSizeSelection,
    setStyleMood,
    clearCarSelection,
    clearStyleMood,
    resetCarAndStyleMood,
  }
})
