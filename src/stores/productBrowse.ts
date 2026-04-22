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
  /** 与 HeaderFilter 筛选里「风格标签」同字段 */
  const styleMood = ref('')

  const carLine = computed(() =>
    [brand.value, model.value, year.value].filter(Boolean).join(' · '),
  )

  function setCar(b: string, m: string, y: string) {
    brand.value = b
    model.value = m
    year.value = y
  }

  function setStyleMood(s: string) {
    styleMood.value = s
  }

  /** 清空车型（首页默认、筛选「清空」中车辆部分） */
  function clearCarSelection() {
    brand.value = ''
    model.value = ''
    year.value = ''
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
    styleMood,
    carLine,
    setCar,
    setStyleMood,
    clearCarSelection,
    clearStyleMood,
    resetCarAndStyleMood,
  }
})
