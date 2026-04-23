<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import CarSelectionPanel from '@/components/CarSelectionPanel.vue'
import TgButton from '@/components/TgButton.vue'
import TgSelect from '@/components/TgSelect.vue'
import { carGroups, getDefaultCarSelection } from '@/data/carSelection'
import { STYLE_MOOD_TAGS, type StyleMoodTag } from '@/constants/styleMoodTags'
import { useProductBrowseStore } from '@/stores/productBrowse'
import { t } from '@/i18n/uiI18n'
// 颜色选项
interface ColorOption {
    value: string
    label: string
    code: string
    hex: string
}

// 下拉选项通用结构
interface SelectOption {
    value: string | number
    label: string
}

// 筛选标签 KEY 类型
type ActiveTagKey =
    | 'brand'
    | 'model'
    | 'year'
    | 'styleMood'
    | 'structure'
    | 'color'
    | 'modelCode'
    | 'stripCount'
    | 'clawType'
    | 'rotateSupport'
    | 'wlCode' // 新增 WL型号

// 激活的标签
interface ActiveTag {
    key: ActiveTagKey
    label: string
}

// 组件 Props 类型
interface PropsType {
    title: string
    ProductSelection?: boolean
    CaseSelection?: boolean
    /** 路由带入时预填标题区「品牌 / 型号 / 年份」 */
    initialBrand?: string
    initialModel?: string
    initialYear?: string
    /**
     * 非 Product 页：可由父级预填
     * Product 页：车型与风格以 Pinia `useProductBrowseStore` 为准，忽略下列初始值
     */
    initialStyleTag?: string
}

// 定义 Props
const props = defineProps<PropsType>()

// 汽车选择弹窗开关
const carPopoverOpen = ref(false)
// 筛选弹窗开关
const filterPopoverOpen = ref(false)
// 头部容器 DOM
const headerRef = ref<HTMLElement | null>(null)
// 弹窗宽度（跟随头部容器）
const panelWidth = ref(0)

// 条幅数量
const stripOptions = ['18', '20', '22', '24']
// WL型号选项（你要的！）
const wlCodeOptions = ['WL001', 'WL002', 'WL003', 'WL004', 'WL005', 'WL006']

const structureValueList = ['全部', '单片', '双片', '锻造', '旋压'] as const
function structureFilterLabel(v: string): string {
    const m: Record<string, string> = {
        全部: 'headerFilter.all',
        单片: 'orderStructure.one_piece',
        双片: 'orderStructure.two_piece',
        锻造: 'headerFilter.forged',
        旋压: 'headerFilter.flowFormed',
    }
    const k = m[v]
    return k ? t(k) : v
}

const clawValueList = ['全部', '五爪', '十辐', 'Y 字', '网状'] as const
function clawFilterLabel(v: string): string {
    const m: Record<string, string> = {
        全部: 'headerFilter.all',
        五爪: 'headerFilter.clawFive',
        十辐: 'headerFilter.clawTen',
        'Y 字': 'headerFilter.clawY',
        网状: 'headerFilter.clawMesh',
    }
    const k = m[v]
    return k ? t(k) : v
}

const directionValueList = ['全部', '支持', '不支持'] as const
function directionFilterLabel(v: string): string {
    const m: Record<string, string> = {
        全部: 'headerFilter.all',
        支持: 'headerFilter.dirYes',
        不支持: 'headerFilter.dirNo',
    }
    const k = m[v]
    return k ? t(k) : v
}

const colorData: Omit<ColorOption, 'label'>[] = [
    { value: '曜黑', code: 'WL049', hex: '#090909' },
    { value: '亮黑', code: 'WL050', hex: '#1f1f1f' },
    { value: '枪灰', code: 'WL051', hex: '#43454d' },
    { value: '银钻', code: 'WL052', hex: '#8b919d' },
    { value: '钛灰', code: 'WL053', hex: '#60646f' },
]

const colors = computed<ColorOption[]>(() =>
    colorData.map(c => ({
        ...c,
        label: t(`orderDetails.colorName_${c.code}` as 'orderDetails.colorName_WL049'),
    })),
)

// 汽车选择初始值
const initialCar = getDefaultCarSelection()

// 筛选表单初始值
const initialFilter = {
    structure: '',
    color: colorData[0]!.value,
    modelCode: '',
    stripCount: '',
    clawType: '全部',
    rotateSupport: '全部',
    styleMood: '',
    wlCode: '', // 新增 WL型号
}

// 非 Product 页：本地车型；产品页与 Pinia 共用
const browseStore = useProductBrowseStore()
const { brand: storeBrand, model: storeModel, year: storeYear, styleMood: storeStyleMood } = storeToRefs(browseStore)
const localBrand = ref(initialCar.brand)
const localModel = ref(initialCar.model)
const localYear = ref(initialCar.year)

const activeBrand = computed({
    get: () => (props.ProductSelection ? storeBrand.value : localBrand.value),
    set: (v) => {
        if (props.ProductSelection) storeBrand.value = v
        else localBrand.value = v
    },
})
const selectedModel = computed({
    get: () => (props.ProductSelection ? storeModel.value : localModel.value),
    set: (v) => {
        if (props.ProductSelection) storeModel.value = v
        else localModel.value = v
    },
})
const selectedYear = computed({
    get: () => (props.ProductSelection ? storeYear.value : localYear.value),
    set: (v) => {
        if (props.ProductSelection) storeYear.value = v
        else localYear.value = v
    },
})

// 筛选表单响应式对象
const filterForm = reactive({
    structure: initialFilter.structure,
    color: initialFilter.color,
    modelCode: initialFilter.modelCode,
    stripCount: initialFilter.stripCount,
    clawType: initialFilter.clawType,
    rotateSupport: initialFilter.rotateSupport,
    styleMood: initialFilter.styleMood,
    wlCode: initialFilter.wlCode, // 新增
})

/** 产品筛选里「风格标签」与 Pinia 同步；非产品页用 filterForm */
const styleMoodField = computed({
    get: () => (props.ProductSelection ? storeStyleMood.value : filterForm.styleMood),
    set: (v) => {
        if (props.ProductSelection) storeStyleMood.value = v
        else filterForm.styleMood = v
    },
})

// 当前选中的颜色
const selectedColor = computed(
    () => colors.value.find(item => item.value === filterForm.color) ?? colors.value[0]!,
)

// 弹窗宽度样式（跟随头部宽度）；无宽度时给 {}，避免部分环境下 content-style=undefined 异常
const popoverPanelStyle = computed((): Record<string, string> => {
    if (!panelWidth.value)
        return {}
    return {
        width: `${panelWidth.value}px`,
        maxWidth: `${panelWidth.value}px`,
    }
})

function toggleCarPopover() {
    carPopoverOpen.value = !carPopoverOpen.value
    filterPopoverOpen.value = false
}

function toggleFilterPopover() {
    filterPopoverOpen.value = !filterPopoverOpen.value
    carPopoverOpen.value = false
}

function closeCarPopover() {
    carPopoverOpen.value = false
}

// 结构下拉选项
const structureSelectOptions = computed<SelectOption[]>(() =>
    structureValueList.map(v => ({ label: structureFilterLabel(v), value: v })),
)

// 颜色下拉选项
const colorSelectOptions = computed<SelectOption[]>(() =>
    colors.value.map(item => ({ label: item.label, value: item.value })),
)

// 条幅数量下拉选项
const stripCountOptions = computed<SelectOption[]>(() =>
    stripOptions.map(item => ({ label: item, value: item })),
)

// 爪型下拉选项
const clawSelectOptions = computed<SelectOption[]>(() =>
    clawValueList.map(v => ({ label: clawFilterLabel(v), value: v })),
)

// 左右旋下拉选项
const directionSelectOptions = computed<SelectOption[]>(() =>
    directionValueList.map(v => ({ label: directionFilterLabel(v), value: v })),
)

// WL型号下拉选项（新增）
const wlCodeSelectOptions = computed<SelectOption[]>(() =>
    wlCodeOptions.map(item => ({ label: item, value: item })),
)

const styleMoodI18nKey: Record<StyleMoodTag, string> = {
  运动: 'styleMoodTags.sport',
  性能赛道: 'styleMoodTags.performance',
  'OEM风格': 'styleMoodTags.oem',
  豪华商务: 'styleMoodTags.luxury',
  越野: 'styleMoodTags.offroad',
  复古: 'styleMoodTags.retro',
}

function styleMoodLabel(v: string): string {
  const k = styleMoodI18nKey[v as StyleMoodTag]
  return k ? t(k) : v
}

const styleMoodSelectOptions = computed<SelectOption[]>(() =>
  STYLE_MOOD_TAGS.map(item => ({ label: styleMoodLabel(item), value: item })),
)

// 激活的标签列表（展示已选条件）
const activeTags = computed<ActiveTag[]>(() => {
    const tags: ActiveTag[] = []

    if (props.ProductSelection) {
        if (activeBrand.value)
            tags.push({ key: 'brand', label: ` ${activeBrand.value}` })
        if (selectedModel.value)
            tags.push({ key: 'model', label: ` ${selectedModel.value}` })
        if (selectedYear.value)
            tags.push({ key: 'year', label: ` ${selectedYear.value}` })
    } else {
        if (activeBrand.value !== initialCar.brand) {
            tags.push({ key: 'brand', label: ` ${activeBrand.value}` })
        }
        if (selectedModel.value !== initialCar.model) {
            tags.push({ key: 'model', label: ` ${selectedModel.value}` })
        }
        if (selectedYear.value !== initialCar.year) {
            tags.push({ key: 'year', label: ` ${selectedYear.value}` })
        }
    }

    if (filterForm.structure !== initialFilter.structure) {
        tags.push({ key: 'structure', label: ` ${structureFilterLabel(filterForm.structure)}` })
    }

    if (filterForm.color !== initialFilter.color) {
        tags.push({ key: 'color', label: `${selectedColor.value.code} ${selectedColor.value.label}` })
    }

    if (filterForm.modelCode) {
        tags.push({ key: 'modelCode', label: ` ${filterForm.modelCode}` })
    }

    if (filterForm.stripCount) {
        tags.push({ key: 'stripCount', label: `${filterForm.stripCount}` })
    }

    if (props.ProductSelection && styleMoodField.value) {
        tags.push({ key: 'styleMood', label: ` ${styleMoodLabel(styleMoodField.value)}` })
    }

    if (filterForm.clawType !== initialFilter.clawType) {
        tags.push({ key: 'clawType', label: `${clawFilterLabel(filterForm.clawType)}` })
    }

    if (filterForm.rotateSupport !== initialFilter.rotateSupport) {
        tags.push({ key: 'rotateSupport', label: ` ${directionFilterLabel(filterForm.rotateSupport)}` })
    }

    // 新增 WL 标签
    if (filterForm.wlCode) {
        tags.push({ key: 'wlCode', label: ` ${filterForm.wlCode}` })
    }

    return tags
})

/** 头部「车型」入口与首页一致：展示当前品牌 / 型号 / 年款(含配置链) */
const carHeaderSummary = computed(() => {
    if (!activeBrand.value && !selectedModel.value && !selectedYear.value)
        return ''
    return [activeBrand.value, selectedModel.value, selectedYear.value].filter(Boolean).join(' · ')
})

/**
 * 重置汽车选择（品牌/型号/年份）
 */
function resetCarSelections() {
    if (props.ProductSelection) {
        browseStore.clearCarSelection()
    } else {
        localBrand.value = initialCar.brand
        localModel.value = initialCar.model
        localYear.value = initialCar.year
    }
}

/**
 * 重置所有筛选条件
 */
function resetFilterSelections() {
    filterForm.structure = initialFilter.structure
    filterForm.color = initialFilter.color
    filterForm.modelCode = initialFilter.modelCode
    filterForm.stripCount = initialFilter.stripCount
    filterForm.clawType = initialFilter.clawType
    filterForm.rotateSupport = initialFilter.rotateSupport
    if (props.ProductSelection) browseStore.clearStyleMood()
    else filterForm.styleMood = initialFilter.styleMood
    filterForm.wlCode = initialFilter.wlCode
}

/**
 * 清空所有选择（汽车 + 筛选）
 */
function clearAllSelections() {
    resetCarSelections()
    resetFilterSelections()
}

/**
 * 关闭筛选弹窗
 */
function closeFilterPopover() {
    filterPopoverOpen.value = false
}

/**
 * 应用筛选并关闭弹窗
 */
function applyFilters() {
    filterPopoverOpen.value = false
}

/**
 * 删除单个筛选标签
 * @param key 筛选项的 key
 */
function removeTag(key: ActiveTagKey) {
    switch (key) {
        case 'brand':
            resetCarSelections()
            break
        case 'model':
            if (props.ProductSelection) {
                selectedModel.value = ''
                selectedYear.value = ''
            } else {
                selectedModel.value = initialCar.model
            }
            break
        case 'year':
            if (props.ProductSelection) selectedYear.value = ''
            else selectedYear.value = initialCar.year
            break
        case 'styleMood':
            if (props.ProductSelection) browseStore.clearStyleMood()
            else filterForm.styleMood = initialFilter.styleMood
            break
        case 'structure':
            filterForm.structure = initialFilter.structure
            break
        case 'color':
            filterForm.color = initialFilter.color
            break
        case 'modelCode':
            filterForm.modelCode = initialFilter.modelCode
            break
        case 'stripCount':
            filterForm.stripCount = initialFilter.stripCount
            break
        case 'clawType':
            filterForm.clawType = initialFilter.clawType
            break
        case 'rotateSupport':
            filterForm.rotateSupport = initialFilter.rotateSupport
            break
        case 'wlCode':
            filterForm.wlCode = initialFilter.wlCode
            break
    }
}

/**
 * 更新弹窗宽度 = 头部容器宽度
 */
function updatePanelWidth() {
    panelWidth.value = headerRef.value?.getBoundingClientRect().width ?? 0
}

let resizeObserver: ResizeObserver | null = null

/** 路由 query / 父组件 props 变化时同步到本地（含首次进入） */
function applyInitialFromProps() {
    if (props.ProductSelection) return
    const b = props.initialBrand?.trim()
    const m = props.initialModel?.trim()
    const y = props.initialYear?.trim()
    if (b)
        localBrand.value = b
    if (m)
        localModel.value = m
    if (y)
        localYear.value = y

    const s = props.initialStyleTag?.trim()
    if (s)
        filterForm.styleMood = s
}

watch(
    () => [props.initialBrand, props.initialModel, props.initialYear, props.initialStyleTag] as const,
    () => {
        applyInitialFromProps()
        void nextTick(() => updatePanelWidth())
    },
    { deep: true, immediate: true },
)

// 挂载后量头部宽度（首次 props 同步已由 watch immediate 处理）
onMounted(async () => {
    await nextTick()
    updatePanelWidth()

    if (!headerRef.value || typeof ResizeObserver === 'undefined') return

    resizeObserver = new ResizeObserver(() => {
        updatePanelWidth()
    })

    resizeObserver.observe(headerRef.value)
})

// 销毁前：取消监听
onBeforeUnmount(() => {
    resizeObserver?.disconnect()
})
</script>

<template>
    <div ref="headerRef" class="mt-4">
        <div class="flex items-center justify-between gap-3 border-b border-b-[#BBBBBB]">
            <!-- 汽车选择弹窗 -->
            <NPopover v-model:show="carPopoverOpen" trigger="manual" :animated="false" display-directive="show"
                placement="bottom-start" :show-arrow="false" :content-style="popoverPanelStyle"
                arrow-wrapper-class="p-0">
                <template #trigger>
                    <button type="button"
                        class="flex min-w-0 w-50 max-w-[min(12.5rem,50vw)] items-center justify-between gap-2 px-4 py-3 text-left outline-none transition"
                        @click.stop="toggleCarPopover">
                        <div v-if="props.ProductSelection" class="min-w-0 flex-1">
                            <div class="text-3 text-white/55">{{ props.title }}</div>
                            <div
                                class="mt-0.5 truncate text-3.25 text-white/90 font-600 w-full max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap">
                                {{ carHeaderSummary || '' }}
                            </div>
                        </div>
                        <span v-else
                            class="truncate text-4 font-600 text-white w-full max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap">
                            {{ props.title }}
                        </span>
                        <Icon icon="solar:alt-arrow-down-outline" width="18" height="18"
                            class="shrink-0 transition text-white" :class="carPopoverOpen ? 'rotate-180' : ''" />
                    </button>
                </template>
                <div
                    class="tg-light-surface z-50 overflow-hidden rounded-[20px] border border-[#d9d9dc] bg-white p-0 text-[#242730] shadow-[0_20px_50px_rgba(0,0,0,0.28)] outline-none">
                    <CarSelectionPanel v-model:brand="activeBrand" v-model:model="selectedModel"
                        v-model:year="selectedYear" :groups="carGroups" @complete="closeCarPopover" />
                </div>
            </NPopover>

            <!-- 筛选弹窗 -->
            <NPopover v-model:show="filterPopoverOpen" trigger="manual" :animated="false" display-directive="if"
                placement="bottom-end" :show-arrow="false" :content-style="popoverPanelStyle">
                <template #trigger>
                    <button type="button"
                        class="flex w-28 items-center justify-between px-4 py-3 text-4 font-600 text-white outline-none transition"
                        @click.stop="toggleFilterPopover">
                        <span>{{ t('headerFilter.filter') }}</span>
                        <Icon icon="hugeicons:filter-horizontal" width="18" height="18" />
                    </button>
                </template>
                <div
                    class="tg-light-surface z-50 flex max-h-[min(70vh,40rem)] flex-col overflow-hidden rounded-[20px] border border-[#d9d9dc] bg-white text-[#242730] shadow-[0_20px_50px_rgba(0,0,0,0.28)] outline-none">
                    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-2">
                        <div class="space-y-5">
                            <div class="text-5 font-700">
                                {{ t('headerFilter.filter') }}
                            </div>

                            <!-- 结构 -->
                            <div class="space-y-2">
                                <div class="text-3.5 font-600">{{ t('headerFilter.structure') }}</div>
                                <TgSelect v-model="filterForm.structure" :options="structureSelectOptions"
                                    :searchable="false" :placeholder="t('headerFilter.phStructure')" />
                            </div>

                            <!-- 颜色 -->
                            <div class="space-y-3">
                                <div class="text-3.5 font-600">{{ t('headerFilter.color') }}</div>
                                <div class="relative">
                                    <span
                                        class="pointer-events-none absolute left-15 top-1/2 z-1 h-5 w-5 -translate-y-1/2 rounded-full border border-black/10"
                                        :style="{ backgroundColor: selectedColor.hex }" />
                                    <TgSelect v-model="filterForm.color" class="color-select"
                                        :options="colorSelectOptions" :searchable="false" :placeholder="t('headerFilter.phColor')" />
                                </div>

                                <div class="text-center text-4 font-700">
                                    {{ selectedColor.code }} {{ selectedColor.label }}
                                </div>

                                <div class="flex items-center justify-between gap-3">
                                    <button v-for="item in colors" :key="item.value" type="button"
                                        class="relative h-12 w-12 rounded-full border transition"
                                        :class="filterForm.color === item.value ? 'border-[#242730] shadow-[0_0_0_3px_white,0_0_0_4px_#242730]' : 'border-transparent'"
                                        :style="{ backgroundColor: item.hex }" @click="filterForm.color = item.value" />
                                </div>
                            </div>

                            <!-- 产品筛选 -->
                            <template v-if="props.ProductSelection">
                                <div class="space-y-2">
                                    <div class="text-3.5 font-600">{{ t('headerFilter.modelCode') }}</div>
                                    <input v-model="filterForm.modelCode" type="text" :placeholder="t('headerFilter.phModelCode')"
                                        class="h-12 w-full rounded-2xl border border-[#d5d7dd] bg-white px-4 text-3.5 outline-none transition placeholder:text-[#b2b5bd] focus:border-[#242730]" />
                                </div>

                                <div class="space-y-2">
                                    <div class="text-3.5 font-600">{{ t('headerFilter.stripCount') }}</div>
                                    <TgSelect v-model="filterForm.stripCount" :options="stripCountOptions"
                                        :searchable="false" :placeholder="t('headerFilter.phStripCount')" />
                                </div>

                                <div class="space-y-2">
                                    <div class="text-3.5 font-600">{{ t('headerFilter.claw') }}</div>
                                    <TgSelect v-model="filterForm.clawType" :options="clawSelectOptions"
                                        :searchable="false" :placeholder="t('headerFilter.phClaw')" />
                                </div>

                                <div class="space-y-2">
                                    <div class="text-3.5 font-600">{{ t('headerFilter.rotateSupport') }}</div>
                                    <TgSelect v-model="filterForm.rotateSupport" :options="directionSelectOptions"
                                        :searchable="false" :placeholder="t('headerFilter.phRotate')" />
                                </div>
                                <div class="space-y-2">
                                    <div class="text-3.5 font-600">{{ t('headerFilter.styleMood') }}</div>
                                    <TgSelect v-model="styleMoodField" :options="styleMoodSelectOptions"
                                        :searchable="false" :placeholder="t('headerFilter.phStyleMood')" />
                                </div>
                            </template>

                            <template v-if="props.CaseSelection">
                                <div class="space-y-2">
                                    <div class="text-3.5 font-600">{{ t('headerFilter.wlCode') }}</div>
                                    <TgSelect v-model="filterForm.wlCode" :options="wlCodeSelectOptions"
                                        :searchable="false" :placeholder="t('headerFilter.phWlCode')" />
                                </div>
                            </template>
                        </div>
                    </div>
                    <!-- 底部固定：不参与中间区域滚动 -->
                    <div
                        class="shrink-0 border-t border-[#ececf0] bg-white px-4 pt-3 pb-4">
                        <div class="flex gap-4">
                            <button type="button"
                                class="tg-btn-outline-light h-12 flex-1 rounded-xl border text-4 font-600"
                                @click="closeFilterPopover">
                                {{ t('common.cancel') }}
                            </button>
                            <button type="button"
                                class="tg-btn-primary h-12 flex-1 rounded-xl border text-4 font-700"
                                @click="applyFilters">
                                {{ t('common.confirm') }}
                            </button>
                        </div>
                    </div>
                </div>
            </NPopover>
        </div>

        <!-- 筛选标签 -->
        <div class="mt-4 flex items-start justify-between gap-3">
            <div class="min-h-9 flex flex-1 flex-wrap gap-2 tg-on-dark-surface">
                <div v-if="activeTags.length === 0"
                    class="flex items-center rounded-full bg-white/6 px-3 py-2 text-3 !text-[#8b9cb0]">
                    {{ t('headerFilter.noActiveFilters') }}
                </div>

                <button v-for="tag in activeTags" :key="tag.key" type="button"
                    class="inline-flex items-center gap-1.5 rounded-full !bg-white/12 px-3 py-2 text-3 !text-[#E4EBF4] !ring-1 !ring-white/10 transition hover:!bg-white/18"
                    @click="removeTag(tag.key)">
                    <span class="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap">{{ tag.label }}</span>
                    <Icon icon="mdi:close" width="14" height="14" class="shrink-0 !text-[#b0c0d2]" />
                </button>
            </div>

            <TgButton type="button" variant="outline" shape="pill" @click="clearAllSelections">
                <span class="color-[#4F5869]">{{ t('headerFilter.clearFilters') }}</span>
            </TgButton>
        </div>
    </div>
</template>

<style></style>