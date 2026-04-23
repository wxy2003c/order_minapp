<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { WheelSizeGenerationRow, WheelSizeOption } from '@/api/wheelsline-size'
import {
  fetchWheelSizeGenerations,
  fetchWheelSizeMakes,
  fetchWheelSizeModels,
  fetchWheelSizeModifications,
  isWheelSizeEnabled,
  resolveWheelSizeYearOptions,
} from '@/api/wheelsline-size'
import type { CarGroup } from '@/data/carSelection'
import { t } from '@/i18n/uiI18n'

/** 与示例一致：品牌 → 车型 → 世代 → 年份 → 配置，逐级解锁；数据均来自 Wheel-Size API */
interface Props {
  groups?: CarGroup[]
  brand: string
  model: string
  year: string
}

const props = withDefaults(defineProps<Props>(), {
  groups: undefined,
})

const emit = defineEmits<{
  'update:brand': [value: string]
  'update:model': [value: string]
  'update:year': [value: string]
  /** 级联选完最后一级（配置）后触发，供父级关闭弹层 */
  'complete': []
}>()

const useApi = computed(() => isWheelSizeEnabled())

const API_STEP_COUNT = 5

const apiSteps = computed(() => [
  { key: 'make' as const, title: t('carSelection.brands') },
  { key: 'model' as const, title: t('carSelection.models') },
  { key: 'generation' as const, title: t('carSelection.generations') },
  { key: 'year' as const, title: t('carSelection.years') },
  { key: 'modification' as const, title: t('carSelection.modifications') },
])

const apiActiveStep = ref(0)
/** 与示例各下拉「加载中」一致：仅当前正在请求的层级显示 loading，避免回退到品牌时整块被锁 */
const loadingStage = ref<number | null>(null)
/** i18n key: `ws.*` or `carSelection.*` */
const apiErrorKey = ref<string | null>(null)
/** 品牌列表是否已完成至少一次拉取（用于重试/空态提示） */
const makesFetched = ref(false)

const makeId = ref('')
const makeLabel = ref('')
const modelId = ref('')
const modelLabel = ref('')
const genSlug = ref('')
const genLabel = ref('')
const yearId = ref('')
const yearLabel = ref('')
const modId = ref('')
const modLabel = ref('')

const makeOptions = ref<WheelSizeOption[]>([])
const modelOptions = ref<WheelSizeOption[]>([])
const yearOptions = ref<WheelSizeOption[]>([])
const modOptions = ref<WheelSizeOption[]>([])
const generationsCache = ref<WheelSizeGenerationRow[]>([])
const genUiOptions = ref<WheelSizeOption[]>([])

function generationRowsToOptions(rows: WheelSizeGenerationRow[]): WheelSizeOption[] {
  return rows.map(g => ({
    id: g.slug,
    label: `${g.name} (${g.start}–${g.end})${g.platform ? ` · ${g.platform}` : ''}`,
  }))
}

function emitApiSummary() {
  emit('update:brand', makeLabel.value)
  emit('update:model', modelLabel.value)
  const tail = [genLabel.value, yearLabel.value, modLabel.value].filter(Boolean).join(' · ')
  emit('update:year', tail)
}

function normalizeForMatch(s: string | undefined | null) {
  if (s == null) return ''
  return String(s).replace(/\s+/g, ' ').trim()
}

function findMatchingOption(options: WheelSizeOption[], target: string | undefined): WheelSizeOption | undefined {
  if (!target?.trim()) return undefined
  const t = normalizeForMatch(target)
  const byExact = options.find(o => normalizeForMatch(o.label) === t)
  if (byExact) return byExact
  const byIncl = options.find(
    o => t.length >= 2
      && (normalizeForMatch(o.label).includes(t) || t.includes(normalizeForMatch(o.label))),
  )
  if (byIncl) return byIncl
  return options.find(o => String(o.id) === t)
}

function currentTailString() {
  return [genLabel.value, yearLabel.value, modLabel.value].filter(Boolean).join(' · ')
}

function isSyncedWithProps() {
  if (!useApi.value) return true
  return (
    normalizeForMatch(props.brand) === normalizeForMatch(makeLabel.value) &&
    normalizeForMatch(props.model) === normalizeForMatch(modelLabel.value) &&
    normalizeForMatch(props.year || '') === normalizeForMatch(currentTailString())
  )
}

function buildPropsKey() {
  return [props.brand, props.model, props.year].map(x => (x || '').trim()).join('\0')
}

const isHydrating = ref(false)
/** 本次已在该 key 上完整跑过 hydrate（成功或放弃），避免拉不到接口时死循环 */
const hydrationSettledKey = ref('')

function clearFromMod() {
  modId.value = ''
  modLabel.value = ''
  modOptions.value = []
}

function clearFromYear() {
  yearId.value = ''
  yearLabel.value = ''
  yearOptions.value = []
  clearFromMod()
}

function clearGenSlugAndDown() {
  genSlug.value = ''
  genLabel.value = ''
  clearFromYear()
}

function clearGenerationCacheAndDown() {
  generationsCache.value = []
  genUiOptions.value = []
  clearGenSlugAndDown()
}

function clearModelAndDown() {
  modelId.value = ''
  modelLabel.value = ''
  clearGenerationCacheAndDown()
}

function clearMakeAndDown() {
  makeId.value = ''
  makeLabel.value = ''
  clearModelAndDown()
}

/**
 * 左侧某一「大类」是否可点：与示例一致——仅品牌可先点；选了品牌才解锁车型，以此类推。
 */
function apiStepUnlocked(idx: number) {
  if (!useApi.value) return false
  if (idx === 0) return true
  if (idx === 1) return !!makeId.value
  if (idx === 2) return !!makeId.value && !!modelId.value
  if (idx === 3) return !!makeId.value && !!modelId.value && !!genSlug.value
  return !!makeId.value && !!modelId.value && !!genSlug.value && !!yearId.value
}

async function loadMakes() {
  loadingStage.value = 0
  apiErrorKey.value = null
  try {
    const items = await fetchWheelSizeMakes()
    makeOptions.value = items
    if (!items.length) apiErrorKey.value = 'ws.emptyBrands'
  } catch {
    makeOptions.value = []
    apiErrorKey.value = 'ws.brandsFailed'
  } finally {
    makesFetched.value = true
    loadingStage.value = null
  }
}

async function loadModels(make: string) {
  modelOptions.value = []
  if (!make) return
  loadingStage.value = 1
  apiErrorKey.value = null
  try {
    modelOptions.value = await fetchWheelSizeModels(make)
    if (!modelOptions.value.length) apiErrorKey.value = 'ws.emptyModels'
  } catch {
    modelOptions.value = []
    apiErrorKey.value = 'ws.modelsFailed'
  } finally {
    loadingStage.value = null
  }
}

async function loadGenerations(make: string, model: string) {
  genUiOptions.value = []
  generationsCache.value = []
  if (!make || !model) return
  loadingStage.value = 2
  apiErrorKey.value = null
  try {
    const rows = await fetchWheelSizeGenerations(make, model)
    generationsCache.value = rows
    genUiOptions.value = generationRowsToOptions(rows)
    if (!genUiOptions.value.length) apiErrorKey.value = 'ws.emptyGenerations'
  } catch {
    generationsCache.value = []
    genUiOptions.value = []
    apiErrorKey.value = 'ws.generationsFailed'
  } finally {
    loadingStage.value = null
  }
}

async function loadYears(make: string, model: string, slug: string) {
  yearOptions.value = []
  if (!make || !model || !slug) return
  loadingStage.value = 3
  apiErrorKey.value = null
  try {
    const gen = generationsCache.value.find(x => x.slug === slug)
    const items = await resolveWheelSizeYearOptions(make, model, gen)
    yearOptions.value = items
    if (!yearOptions.value.length) apiErrorKey.value = 'ws.emptyYears'
  } catch {
    yearOptions.value = []
    apiErrorKey.value = 'ws.yearsFailed'
  } finally {
    loadingStage.value = null
  }
}

async function loadMods(make: string, model: string, year: string, gslug: string) {
  modOptions.value = []
  if (!make || !model || !year) return
  loadingStage.value = 4
  apiErrorKey.value = null
  try {
    modOptions.value = await fetchWheelSizeModifications(make, model, year, gslug || undefined)
    if (!modOptions.value.length) apiErrorKey.value = 'ws.emptyMods'
  } catch {
    modOptions.value = []
    apiErrorKey.value = 'ws.modsFailed'
  } finally {
    loadingStage.value = null
  }
}

/**
 * 左侧切换分类：只切换当前步骤、按需补拉列表，【不清空】本段已选值；清空只在右侧点选时发生。
 * 同一步重复点击不重复请求（列表已有则略过）。
 */
function onApiStepClick(idx: number) {
  if (!apiStepUnlocked(idx)) return
  if (apiActiveStep.value === idx) {
    if (idx === 0 && !makeOptions.value.length) void loadMakes()
    else if (idx === 1 && makeId.value && !modelOptions.value.length) void loadModels(makeId.value)
    else if (idx === 2 && makeId.value && modelId.value && !genUiOptions.value.length) void loadGenerations(makeId.value, modelId.value)
    else if (idx === 3 && makeId.value && modelId.value && genSlug.value && !yearOptions.value.length)
      void loadYears(makeId.value, modelId.value, genSlug.value)
    else if (idx === 4 && makeId.value && modelId.value && yearId.value && !modOptions.value.length)
      void loadMods(makeId.value, modelId.value, yearId.value, genSlug.value)
    return
  }
  apiActiveStep.value = idx
  if (idx === 0) {
    if (!makeOptions.value.length) void loadMakes()
  }
  else if (idx === 1) {
    if (makeId.value) {
      if (!modelOptions.value.length) void loadModels(makeId.value)
    }
  }
  else if (idx === 2) {
    if (makeId.value && modelId.value) {
      if (!genUiOptions.value.length) void loadGenerations(makeId.value, modelId.value)
    }
  }
  else if (idx === 3) {
    if (makeId.value && modelId.value && genSlug.value) {
      if (!yearOptions.value.length) void loadYears(makeId.value, modelId.value, genSlug.value)
    }
  }
  else if (idx === 4) {
    if (makeId.value && modelId.value && yearId.value) {
      if (!modOptions.value.length) void loadMods(makeId.value, modelId.value, yearId.value, genSlug.value)
    }
  }
}

function advanceApiStep() {
  apiActiveStep.value = Math.min(apiActiveStep.value + 1, API_STEP_COUNT - 1)
}

/** 当前右侧是否正在请求本级列表（与示例「加载中...」一致） */
const rightPanelLoading = computed(() => loadingStage.value === apiActiveStep.value)

/** 当前级是否允许点选右侧条目：必须已解锁进入该级，且该级不在 loading */
const canPickCurrentStep = computed(() => {
  const i = apiActiveStep.value
  if (!apiStepUnlocked(i)) return false
  if (rightPanelLoading.value) return false
  return true
})

async function onPickMake(opt: WheelSizeOption) {
  if (!canPickCurrentStep.value || apiActiveStep.value !== 0) return
  clearMakeAndDown()
  makeId.value = String(opt.id)
  makeLabel.value = opt.label
  emitApiSummary()
  advanceApiStep()
  await loadModels(makeId.value)
}

async function onPickModel(opt: WheelSizeOption) {
  if (!canPickCurrentStep.value || apiActiveStep.value !== 1) return
  clearModelAndDown()
  modelId.value = String(opt.id)
  modelLabel.value = opt.label
  emitApiSummary()
  advanceApiStep()
  await loadGenerations(makeId.value, modelId.value)
}

async function onPickGeneration(opt: WheelSizeOption) {
  if (!canPickCurrentStep.value || apiActiveStep.value !== 2) return
  clearGenSlugAndDown()
  genSlug.value = String(opt.id)
  genLabel.value = opt.label
  emitApiSummary()
  advanceApiStep()
  await loadYears(makeId.value, modelId.value, genSlug.value)
}

async function onPickYear(opt: WheelSizeOption) {
  if (!canPickCurrentStep.value || apiActiveStep.value !== 3) return
  clearFromMod()
  yearId.value = String(opt.id)
  yearLabel.value = opt.label
  emitApiSummary()
  advanceApiStep()
  await loadMods(makeId.value, modelId.value, yearId.value, genSlug.value)
}

function onPickModification(opt: WheelSizeOption) {
  if (!canPickCurrentStep.value || apiActiveStep.value !== 4) return
  modId.value = String(opt.id)
  modLabel.value = opt.label
  emitApiSummary()
  if (useApi.value)
    emit('complete')
}

const apiRightOptions = computed<WheelSizeOption[]>(() => {
  const i = apiActiveStep.value
  if (i === 0) return makeOptions.value
  if (i === 1) return modelOptions.value
  if (i === 2) return genUiOptions.value
  if (i === 3) return yearOptions.value
  return modOptions.value
})

function isApiOptionSelected(opt: WheelSizeOption) {
  const id = String(opt.id)
  const i = apiActiveStep.value
  if (i === 0) return makeId.value === id
  if (i === 1) return modelId.value === id
  if (i === 2) return genSlug.value === id
  if (i === 3) return yearId.value === id
  return modId.value === id
}

function apiRightTitle() {
  return apiSteps.value[apiActiveStep.value]?.title ?? ''
}

function onPickFromRight(opt: WheelSizeOption) {
  const i = apiActiveStep.value
  if (i === 0) void onPickMake(opt)
  else if (i === 1) void onPickModel(opt)
  else if (i === 2) void onPickGeneration(opt)
  else if (i === 3) void onPickYear(opt)
  else onPickModification(opt)
}

async function ensureMakesLoaded() {
  if (makeOptions.value.length) return
  await loadMakes()
}

/**
 * 父级 v-model（如路由带入）与内部 API 状态对齐，打开弹层前即可在后台把列表与选中项拉好。
 * year 为「世代 · 年款/年份 · 配置」拼接；若仅一段则尽量按「世代或年段」在接口里对。
 */
async function hydrateFromProps() {
  if (!useApi.value) return
  const k = buildPropsKey()
  if (isHydrating.value) return
  if (hydrationSettledKey.value === k && isSyncedWithProps()) {
    if (!makeOptions.value.length) void loadMakes()
    return
  }
  if (isSyncedWithProps()) {
    if (!makeOptions.value.length) void loadMakes()
    hydrationSettledKey.value = k
    return
  }
  isHydrating.value = true
  apiErrorKey.value = null
  try {
    const b = props.brand?.trim()
    const m = props.model?.trim()
    const tail = props.year?.trim() ?? ''
    // 父级未选品牌：必须清空内部状态，否则残留选项会经 emit 写回 Pinia，表现为「默认第一个品牌」
    if (!b) {
      clearMakeAndDown()
      apiActiveStep.value = 0
      await ensureMakesLoaded()
      hydrationSettledKey.value = k
      return
    }
    await loadMakes()
    const makeOpt = findMatchingOption(makeOptions.value, b)
    if (!makeOpt) {
      apiErrorKey.value = 'carSelection.hydrateBrandMismatch'
      hydrationSettledKey.value = k
      return
    }
    makeId.value = String(makeOpt.id)
    makeLabel.value = makeOpt.label
    if (!m) {
      apiActiveStep.value = 1
      await loadModels(makeId.value)
      emitApiSummary()
      hydrationSettledKey.value = k
      return
    }
    await loadModels(makeId.value)
    const modelOpt = findMatchingOption(modelOptions.value, m)
    if (!modelOpt) {
      apiActiveStep.value = 1
      apiErrorKey.value = 'carSelection.hydrateModelMismatch'
      emitApiSummary()
      hydrationSettledKey.value = k
      return
    }
    modelId.value = String(modelOpt.id)
    modelLabel.value = modelOpt.label
    if (!tail) {
      apiActiveStep.value = 2
      await loadGenerations(makeId.value, modelId.value)
      emitApiSummary()
      hydrationSettledKey.value = k
      return
    }
    await loadGenerations(makeId.value, modelId.value)
    const parts = tail.split(' · ').map(s => s.trim()).filter(Boolean)
    if (!parts.length) {
      apiActiveStep.value = 2
      emitApiSummary()
      hydrationSettledKey.value = k
      return
    }
    if (!genUiOptions.value.length) {
      apiActiveStep.value = 2
      emitApiSummary()
      hydrationSettledKey.value = k
      return
    }

    const pickGenYearMod = async (gPart: string, yPart?: string, modPart?: string) => {
      let go = findMatchingOption(genUiOptions.value, gPart)
      if (!go) go = genUiOptions.value[0]
      if (!go) return
      genSlug.value = String(go.id)
      genLabel.value = go.label
      await loadYears(makeId.value, modelId.value, genSlug.value)
      if (yPart) {
        const yOpt = findMatchingOption(yearOptions.value, yPart)
        if (yOpt) {
          yearId.value = String(yOpt.id)
          yearLabel.value = yOpt.label
          await loadMods(makeId.value, modelId.value, yearId.value, genSlug.value)
          if (modPart) {
            const mo = findMatchingOption(modOptions.value, modPart)
            if (mo) {
              modId.value = String(mo.id)
              modLabel.value = mo.label
            }
          }
        }
      }
    }

    if (parts.length === 1) {
      const one = parts[0] as string
      let go = findMatchingOption(genUiOptions.value, one)
      if (go) {
        await pickGenYearMod(one)
      } else {
        // 单段更可能是年段/首页静态度（无「世代·年·配」时）
        go = genUiOptions.value[0]
        if (go) {
          genSlug.value = String(go.id)
          genLabel.value = go.label
          await loadYears(makeId.value, modelId.value, genSlug.value)
          const yOpt = findMatchingOption(yearOptions.value, one) ?? yearOptions.value[0]
          if (yOpt) {
            yearId.value = String(yOpt.id)
            yearLabel.value = yOpt.label
            await loadMods(makeId.value, modelId.value, yearId.value, genSlug.value)
          }
        }
      }
    }
    else if (parts.length === 2) {
      await pickGenYearMod(parts[0] as string, parts[1])
    }
    else {
      await pickGenYearMod(
        parts[0] as string,
        parts[1] as string,
        parts[2] as string,
      )
    }

    if (modId.value) apiActiveStep.value = 4
    else if (yearId.value) apiActiveStep.value = 3
    else if (genSlug.value) apiActiveStep.value = 2
    else apiActiveStep.value = 1

    emitApiSummary()
    hydrationSettledKey.value = k
  }
  finally {
    isHydrating.value = false
  }
}

const lastHydrationPropsKey = ref('')

watch(
  () => [props.brand, props.model, props.year, useApi.value] as const,
  () => {
    const k = [props.brand, props.model, props.year].map(x => (x || '').trim()).join('\0')
    if (k !== lastHydrationPropsKey.value) {
      lastHydrationPropsKey.value = k
      hydrationSettledKey.value = ''
    }
    void hydrateFromProps()
  },
  { immediate: true, deep: true },
)

/** 上级被清空时，避免右侧仍停在已锁定的层级 */
watch(
  () => [apiActiveStep.value, makeId.value, modelId.value, genSlug.value, yearId.value, useApi.value] as const,
  () => {
    if (!useApi.value) return
    const step = apiActiveStep.value
    if (apiStepUnlocked(step)) return
    const unlocked = [0, 1, 2, 3, 4].filter(i => apiStepUnlocked(i))
    const last = unlocked.pop()
    if (last !== undefined && last !== step) apiActiveStep.value = last
  },
)

</script>

<template>
  <div
    class="tg-light-surface grid max-h-[24rem] grid-cols-[minmax(0,7.75rem)_1fr] overflow-hidden rounded-[20px] bg-white text-[#242730] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
    <div class="flex flex-col border-r border-[#ececf0]">
      <div class="border-b border-[#ececf0] px-3 py-3 text-3.5 font-600 !text-[#6b7280]">
        {{ t('carSelection.category') }}
      </div>
      <div class="max-h-[20rem] flex-1 overflow-y-auto py-2">
        <button v-for="(step, idx) in apiSteps" :key="step.key" type="button" :disabled="!apiStepUnlocked(idx)"
          class="mx-2 mb-1 flex w-[calc(100%-1rem)] flex-col items-start rounded-xl px-2 py-2 text-left text-3 transition disabled:cursor-not-allowed disabled:opacity-40"
          :class="apiActiveStep === idx ? '!bg-[color:var(--app-accent)] !text-[color:var(--app-accent-text)]' : '!text-[#303441] hover:!bg-[#f4f5f7]'"
          @click="onApiStepClick(idx)">
          <span class="font-600">{{ step.title }}</span>
          <span v-if="idx === 0 && makeLabel" class="mt-0.5 max-w-full truncate text-2.75 opacity-80">{{ makeLabel
            }}</span>
          <span v-else-if="idx === 1 && modelLabel" class="mt-0.5 max-w-full truncate text-2.75 opacity-80">{{
            modelLabel }}</span>
          <span v-else-if="idx === 2 && genLabel" class="mt-0.5 max-w-full truncate text-2.75 opacity-80">{{ genLabel
            }}</span>
          <span v-else-if="idx === 3 && yearLabel" class="mt-0.5 max-w-full truncate text-2.75 opacity-80">{{ yearLabel
            }}</span>
          <span v-else-if="idx === 4 && modLabel" class="mt-0.5 max-w-full truncate text-2.75 opacity-80">{{ modLabel
            }}</span>
        </button>
      </div>
    </div>

    <div class="min-w-0 flex flex-col">
      <div class="border-b border-[#ececf0] px-4 py-3 text-3.5 font-600 !text-[#6b7280]">
        {{ apiRightTitle() }}
      </div>
      <div class="max-h-[20rem] flex-1 overflow-y-auto py-2">
        <div v-if="!useApi" class="px-4 py-8 text-center text-3.5 leading-relaxed !text-[#6b7280]">
          {{ t('carSelection.needWheelSizeEnv') }}
          <code class="rounded bg-[#f3f4f6] px-1 py-0.5 text-3 !text-[#374151]">VITE_WHEEL_SIZE_API_KEY</code>
          {{ t('carSelection.andGateway') }}
        </div>

        <template v-else>
          <div v-if="rightPanelLoading" class="px-4 py-8 text-center text-3.5 !text-[#9ca3af]">
            {{ t('common.loading') }}
          </div>
          <div v-else-if="apiErrorKey && !apiRightOptions.length" class="px-4 py-6 text-center text-3.5 !text-[#dc2626]">
            {{ t(apiErrorKey) }}
          </div>
          <template v-else>
            <button v-for="opt in apiRightOptions" :key="`${apiActiveStep}-${opt.id}`" type="button"
              :disabled="!canPickCurrentStep"
              class="mx-2 mb-1 flex w-[calc(100%-1rem)] items-center rounded-xl p-1.5 text-left text-3 transition disabled:cursor-not-allowed disabled:opacity-40"
              :class="isApiOptionSelected(opt) ? '!bg-[color:var(--app-accent)] !text-[color:var(--app-accent-text)]' : '!text-[#303441] hover:!bg-[#f4f5f7]'"
              @click="onPickFromRight(opt)">
              <span class="line-clamp-2 text-3">{{ opt.label }}</span>
            </button>
            <div v-if="!apiRightOptions.length && !rightPanelLoading"
              class="px-4 py-8 text-center text-3.5 !text-[#9ca3af]">
              {{ apiErrorKey ? t(apiErrorKey) : t('carSelection.emptyList') }}
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>
