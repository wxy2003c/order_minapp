<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Icon } from '@iconify/vue'
import {
    PopoverContent,
    PopoverPortal,
    PopoverRoot,
    PopoverTrigger,
} from 'reka-ui'
import TgButton from '@/components/TgButton.vue'
import TgSelect from '@/components/TgSelect.vue'

// 汽车分组类型（品牌 + 型号 + 年份）
interface CarGroup {
    brand: string
    models: string[]
    years: string[]
}

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

// 汽车品牌/型号/年份 数据源
const carGroups: CarGroup[] = [
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

// 结构选项
const structureOptions = ['全部', '单片', '双片', '锻造', '旋压']
// 爪型选项
const clawOptions = ['全部', '五爪', '十辐', 'Y 字', '网状']
// 左右旋选项
const directionOptions = ['全部', '支持', '不支持']
// 条幅数量
const stripOptions = ['18', '20', '22', '24']
// WL型号选项（你要的！）
const wlCodeOptions = ['WL001', 'WL002', 'WL003', 'WL004', 'WL005', 'WL006']

// 颜色选项
const colors: ColorOption[] = [
    { value: '曜黑', label: '曜黑', code: 'WL049', hex: '#090909' },
    { value: '亮黑', label: '亮黑', code: 'WL050', hex: '#1f1f1f' },
    { value: '枪灰', label: '枪灰', code: 'WL051', hex: '#43454d' },
    { value: '银钻', label: '银钻', code: 'WL052', hex: '#8b919d' },
    { value: '钛灰', label: '钛灰', code: 'WL053', hex: '#60646f' },
]

// 汽车选择初始值
const initialCar = {
    brand: carGroups[0].brand,
    model: carGroups[0].models[0],
    year: carGroups[0].years[0],
}

// 筛选表单初始值
const initialFilter = {
    structure: '全部',
    color: colors[0].value,
    modelCode: '',
    stripCount: '',
    clawType: '全部',
    rotateSupport: '全部',
    wlCode: '', // 新增 WL型号
}

// 选中的品牌
const activeBrand = ref(initialCar.brand)
// 选中的型号
const selectedModel = ref(initialCar.model)
// 选中的年份
const selectedYear = ref(initialCar.year)

// 筛选表单响应式对象
const filterForm = reactive({
    structure: initialFilter.structure,
    color: initialFilter.color,
    modelCode: initialFilter.modelCode,
    stripCount: initialFilter.stripCount,
    clawType: initialFilter.clawType,
    rotateSupport: initialFilter.rotateSupport,
    wlCode: initialFilter.wlCode, // 新增
})

// 当前选中品牌对应的车系
const activeCarGroup = computed(
    () => carGroups.find(item => item.brand === activeBrand.value) ?? carGroups[0],
)

// 当前选中的颜色
const selectedColor = computed(
    () => colors.find(item => item.value === filterForm.color) ?? colors[0],
)

// 弹窗宽度样式（跟随头部宽度）
const popoverPanelStyle = computed(() => (
    panelWidth.value
        ? {
            width: `${panelWidth.value}px`,
            maxWidth: `${panelWidth.value}px`,
        }
        : undefined
))

// 结构下拉选项
const structureSelectOptions = computed<SelectOption[]>(() =>
    structureOptions.map(item => ({ label: item, value: item })),
)

// 颜色下拉选项
const colorSelectOptions = computed<SelectOption[]>(() =>
    colors.map(item => ({ label: item.label, value: item.value })),
)

// 条幅数量下拉选项
const stripCountOptions = computed<SelectOption[]>(() =>
    stripOptions.map(item => ({ label: item, value: item })),
)

// 爪型下拉选项
const clawSelectOptions = computed<SelectOption[]>(() =>
    clawOptions.map(item => ({ label: item, value: item })),
)

// 左右旋下拉选项
const directionSelectOptions = computed<SelectOption[]>(() =>
    directionOptions.map(item => ({ label: item, value: item })),
)

// WL型号下拉选项（新增）
const wlCodeSelectOptions = computed<SelectOption[]>(() =>
    wlCodeOptions.map(item => ({ label: item, value: item })),
)

// 激活的标签列表（展示已选条件）
const activeTags = computed<ActiveTag[]>(() => {
    const tags: ActiveTag[] = []
    const currentGroup = activeCarGroup.value

    if (activeBrand.value !== initialCar.brand) {
        tags.push({ key: 'brand', label: `品牌: ${activeBrand.value}` })
    }

    if (selectedModel.value !== currentGroup.models[0]) {
        tags.push({ key: 'model', label: `型号: ${selectedModel.value}` })
    }

    if (selectedYear.value !== currentGroup.years[0]) {
        tags.push({ key: 'year', label: `年份: ${selectedYear.value}` })
    }

    if (filterForm.structure !== initialFilter.structure) {
        tags.push({ key: 'structure', label: `结构: ${filterForm.structure}` })
    }

    if (filterForm.color !== initialFilter.color) {
        tags.push({ key: 'color', label: `颜色: ${selectedColor.value.code} ${selectedColor.value.label}` })
    }

    if (filterForm.modelCode) {
        tags.push({ key: 'modelCode', label: `型号编号: ${filterForm.modelCode}` })
    }

    if (filterForm.stripCount) {
        tags.push({ key: 'stripCount', label: `条幅数量: ${filterForm.stripCount}` })
    }

    if (filterForm.clawType !== initialFilter.clawType) {
        tags.push({ key: 'clawType', label: `爪型: ${filterForm.clawType}` })
    }

    if (filterForm.rotateSupport !== initialFilter.rotateSupport) {
        tags.push({ key: 'rotateSupport', label: `左右旋: ${filterForm.rotateSupport}` })
    }

    // 新增 WL 标签
    if (filterForm.wlCode) {
        tags.push({ key: 'wlCode', label: `WL型号: ${filterForm.wlCode}` })
    }

    return tags
})

/**
 * 选择品牌
 * @param brand 品牌名称
 */
function handleBrandSelect(brand: string) {
    const target = carGroups.find(item => item.brand === brand)

    if (!target) return

    // 切换品牌 → 自动重置型号和年份为第一个
    activeBrand.value = target.brand
    selectedModel.value = target.models[0]
    selectedYear.value = target.years[0]
}

/**
 * 重置汽车选择（品牌/型号/年份）
 */
function resetCarSelections() {
    activeBrand.value = initialCar.brand
    selectedModel.value = initialCar.model
    selectedYear.value = initialCar.year
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
            selectedModel.value = activeCarGroup.value.models[0]
            break
        case 'year':
            selectedYear.value = activeCarGroup.value.years[0]
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

// 挂载后：监听宽度变化
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
            <PopoverRoot v-model:open="carPopoverOpen">
                <PopoverTrigger as-child>
                    <button type="button"
                        class="flex w-50 items-center justify-between px-4 py-3 text-left text-4 font-600 text-white outline-none transition">
                        <span class="truncate">{{ props.title }}</span>
                        <Icon icon="solar:alt-arrow-down-outline" width="18" height="18" class="transition"
                            :class="carPopoverOpen ? 'rotate-180' : ''" />
                    </button>
                </PopoverTrigger>

                <PopoverPortal>
                    <PopoverContent side="bottom" align="start" :side-offset="10" :collision-padding="16"
                        :style="popoverPanelStyle"
                        class="z-50 overflow-hidden rounded-[20px] border border-[#d9d9dc] bg-white p-0 text-[#242730] shadow-[0_20px_50px_rgba(0,0,0,0.28)] outline-none">
                        <div class="grid max-h-[24rem] grid-cols-3 overflow-hidden rounded-[20px]">
                            <!-- 品牌 -->
                            <div class="border-r border-[#ececf0]">
                                <div class="border-b border-[#ececf0] px-5 py-4 text-3.5 font-600 text-[#6b7280]">
                                    品牌
                                </div>
                                <div class="max-h-[20rem] overflow-y-auto py-2">
                                    <button v-for="item in carGroups" :key="item.brand" type="button"
                                        class="mx-2 mb-1 flex w-[calc(100%-1rem)] items-center rounded-xl px-3 py-3 text-left text-3.5 transition"
                                        :class="activeBrand === item.brand ? 'bg-[#242730] text-white' : 'text-[#303441] hover:bg-[#f4f5f7]'"
                                        @click="handleBrandSelect(item.brand)">
                                        <span class="truncate">{{ item.brand }}</span>
                                    </button>
                                </div>
                            </div>

                            <!-- 型号 -->
                            <div class="border-r border-[#ececf0]">
                                <div class="border-b border-[#ececf0] px-5 py-4 text-3.5 font-600 text-[#6b7280]">
                                    型号
                                </div>
                                <div class="max-h-[20rem] overflow-y-auto py-2">
                                    <button v-for="item in activeCarGroup.models" :key="item" type="button"
                                        class="mx-2 mb-1 flex w-[calc(100%-1rem)] items-center rounded-xl px-3 py-3 text-left text-3.5 transition"
                                        :class="selectedModel === item ? 'bg-[#242730] text-white' : 'text-[#303441] hover:bg-[#f4f5f7]'"
                                        @click="selectedModel = item">
                                        <span class="truncate">{{ item }}</span>
                                    </button>
                                </div>
                            </div>

                            <!-- 年份 -->
                            <div>
                                <div class="border-b border-[#ececf0] px-5 py-4 text-3.5 font-600 text-[#6b7280]">
                                    年份
                                </div>
                                <div class="max-h-[20rem] overflow-y-auto py-2">
                                    <button v-for="item in activeCarGroup.years" :key="item" type="button"
                                        class="mx-2 mb-1 flex w-[calc(100%-1rem)] items-center rounded-xl px-3 py-3 text-left text-3.5 transition"
                                        :class="selectedYear === item ? 'bg-[#242730] text-white' : 'text-[#303441] hover:bg-[#f4f5f7]'"
                                        @click="selectedYear = item">
                                        <span class="truncate">{{ item }}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </PopoverContent>
                </PopoverPortal>
            </PopoverRoot>

            <!-- 筛选弹窗 -->
            <PopoverRoot v-model:open="filterPopoverOpen">
                <PopoverTrigger as-child>
                    <button type="button"
                        class="flex w-28 items-center justify-between px-4 py-3 text-4 font-600 text-white outline-none transition">
                        <span>筛选</span>
                        <Icon icon="hugeicons:filter-horizontal" width="18" height="18" />
                    </button>
                </PopoverTrigger>

                <PopoverPortal>
                    <PopoverContent side="bottom" align="end" :side-offset="10" :collision-padding="16"
                        :style="popoverPanelStyle"
                        class="z-50 max-h-[calc(100vh-7rem)] overflow-hidden rounded-[20px] border border-[#d9d9dc] bg-white p-4 text-[#242730] shadow-[0_20px_50px_rgba(0,0,0,0.28)] outline-none">
                        <div class="max-h-[calc(100vh-9rem)] overflow-y-auto pr-1">
                            <div class="space-y-5">
                                <div class="text-5 font-700">
                                    筛选
                                </div>

                                <!-- 结构 -->
                                <div class="space-y-2">
                                    <div class="text-3.5 font-600">结构</div>
                                    <TgSelect v-model="filterForm.structure" :options="structureSelectOptions"
                                        :searchable="false" placeholder="请选择结构" />
                                </div>

                                <!-- 颜色 -->
                                <div class="space-y-3">
                                    <div class="text-3.5 font-600">颜色</div>
                                    <div class="relative">
                                        <span
                                            class="pointer-events-none absolute left-4 top-1/2 z-1 h-5 w-5 -translate-y-1/2 rounded-full border border-black/10"
                                            :style="{ backgroundColor: selectedColor.hex }" />
                                        <TgSelect v-model="filterForm.color" class="color-select"
                                            :options="colorSelectOptions" :searchable="false" placeholder="请选择颜色" />
                                    </div>

                                    <div class="text-center text-4 font-700">
                                        {{ selectedColor.code }} {{ selectedColor.label }}
                                    </div>

                                    <div class="flex items-center justify-between gap-3">
                                        <button v-for="item in colors" :key="item.value" type="button"
                                            class="relative h-12 w-12 rounded-full border transition"
                                            :class="filterForm.color === item.value ? 'border-[#242730] shadow-[0_0_0_3px_white,0_0_0_4px_#242730]' : 'border-transparent'"
                                            :style="{ backgroundColor: item.hex }"
                                            @click="filterForm.color = item.value" />
                                    </div>
                                </div>

                                <!-- 产品筛选 -->
                                <template v-if="props.ProductSelection">
                                    <div class="space-y-2">
                                        <div class="text-3.5 font-600">型号编号</div>
                                        <input v-model="filterForm.modelCode" type="text" placeholder="请输入型号编号"
                                            class="h-12 w-full rounded-2xl border border-[#d5d7dd] bg-white px-4 text-3.5 outline-none transition placeholder:text-[#b2b5bd] focus:border-[#242730]" />
                                    </div>

                                    <div class="space-y-2">
                                        <div class="text-3.5 font-600">条幅数量</div>
                                        <TgSelect v-model="filterForm.stripCount" :options="stripCountOptions"
                                            :searchable="false" placeholder="请选择条幅数量" />
                                    </div>

                                    <div class="space-y-2">
                                        <div class="text-3.5 font-600">爪型</div>
                                        <TgSelect v-model="filterForm.clawType" :options="clawSelectOptions"
                                            :searchable="false" placeholder="请选择爪型" />
                                    </div>

                                    <div class="space-y-2">
                                        <div class="text-3.5 font-600">是否支持左右旋</div>
                                        <TgSelect v-model="filterForm.rotateSupport" :options="directionSelectOptions"
                                            :searchable="false" placeholder="请选择" />
                                    </div>
                                </template>

                                <!-- 案例筛选 → WL型号（已完成！） -->
                                <template v-if="props.CaseSelection">
                                    <div class="space-y-2">
                                        <div class="text-3.5 font-600">WL型号</div>
                                        <TgSelect v-model="filterForm.wlCode" :options="wlCodeSelectOptions"
                                            :searchable="false" placeholder="请选择WL型号" />
                                    </div>
                                </template>

                                <!-- 底部按钮 -->
                                <div class="sticky bottom-0 flex gap-4 bg-white pt-2">
                                    <button type="button"
                                        class="h-12 flex-1 rounded-xl border border-[#242730] bg-white text-4 font-600 text-[#242730]"
                                        @click="closeFilterPopover">
                                        取消
                                    </button>
                                    <button type="button"
                                        class="h-12 flex-1 rounded-xl bg-[#242730] text-4 font-700 text-white"
                                        @click="applyFilters">
                                        确定
                                    </button>
                                </div>
                            </div>
                        </div>
                    </PopoverContent>
                </PopoverPortal>
            </PopoverRoot>
        </div>

        <!-- 筛选标签 -->
        <div class="mt-4 flex items-start justify-between gap-3">
            <div class="min-h-9 flex flex-1 flex-wrap gap-2">
                <div v-if="activeTags.length === 0"
                    class="flex items-center rounded-full bg-white/6 px-3 py-2 text-3 text-white/45">
                    暂无已筛选项
                </div>

                <button v-for="tag in activeTags" :key="tag.key" type="button"
                    class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-3 text-white/85 transition hover:bg-white/14"
                    @click="removeTag(tag.key)">
                    <span>{{ tag.label }}</span>
                    <Icon icon="mdi:close" width="14" height="14" />
                </button>
            </div>

            <TgButton type="button" variant="outline" shape="pill" @click="clearAllSelections">
                <span class="color-[#4F5869]">清空筛选</span>
            </TgButton>
        </div>
    </div>
</template>

<style scoped>
.color-select :deep(.multiselect__tags) {
    padding-left: 3rem;
}
</style>