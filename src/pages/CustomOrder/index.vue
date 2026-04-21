<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Icon } from '@iconify/vue'
import {
  TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger, DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle
} from 'reka-ui'
import TgButton from '@/components/TgButton.vue'
import TgSelect from '@/components/TgSelect.vue'
import TgSwitch from '@/components/TgSwitch.vue'
import TgFilepond from '@/components/TgFilepond.vue'

type OrderTab = 'vehicle' | 'creative' | 'address' | 'amount'

interface SelectOption {
  value: string | number
  label: string
}

const openOutline = ref<boolean>(false)

const activeTab = ref<OrderTab>('vehicle')
const vehicleExpanded = ref(false)

const brandOptions: SelectOption[] = [
  { value: 'audi', label: 'Audi' },
  { value: 'bmw', label: 'BMW' },
  { value: 'benz', label: 'Benz' },
]

const modelOptions: SelectOption[] = [
  { value: 'a5', label: 'A5(F5/2016-2020)/D9SSEL 2.0T 14 188HP' },
  { value: 'a4', label: 'A4(B9/2020-2024)/45 TFSI' },
]

const yesNoOptions: SelectOption[] = [
  { value: 'yes', label: '是' },
  { value: 'no', label: '否' },
]

const sizeOptions: SelectOption[] = [
  { value: '16', label: '16英寸' },
  { value: '18', label: '18英寸' },
  { value: '19', label: '19英寸' },
  { value: '20', label: '20英寸' },
]

const designModeOptions = [
  { id: 'creative', title: '型号库设计', icon: 'mdi:shape-outline' },
  { id: 'custom', title: '创意设计', icon: 'mdi:palette-outline' },
]

const structureOptions = ['单片', '双片', '三片', '越野']

const wheelColors = [
  { name: 'Black', hex: '#20212A' },
  { name: 'Blue', hex: '#3E5D8A' },
  { name: 'Bronze & Gold', hex: '#7A6138' },
  { name: 'Grey & Gunmet', hex: '#585A64' },
]

const tabItems = [
  { label: '车辆', value: 'vehicle' as const },
  { label: '创作', value: 'creative' as const },
  { label: '地址', value: 'address' as const },
  { label: '金额', value: 'amount' as const },
]

const vehicleForm = reactive({
  customerName: 'Mexicidad Dukoi',
  customerId: '6182608402',
  brand: 'audi',
  model: 'a5',
  forged: 'yes',
  mirrorPair: true,
  frontSize: '16',
  frontQuantity: '2',
  frontWidth: '10',
  frontEt: '30',
  frontPcdLeft: '5',
  frontPcdRight: '112',
  frontCb: '66.5',
  frontPaint: '',
  frontHole: '旋口',
  frontBoltSeat: '球座',
  rearSize: '16',
  rearQuantity: '2',
  rearWidth: '10',
  rearEt: '30',
  rearPcdLeft: '5',
  rearPcdRight: '112',
  rearCb: '66.5',
  rearPaint: '',
  rearHole: '旋口',
  rearBoltSeat: '球座',
  vin: '',
  plate: '',
  axleWeight: '',
  rimThickness: '',
})

const creativeForm = reactive({
  designMode: 'creative',
  /** 结构类型：默认不选，首次点选直接赋值，已选时切换走确认弹窗 */
  structure: '' as string,
  selectedColor: 'Black',
  wheelShapeFile: null as File | null,
  wheelLipFile: null as File | null,
  centerCapFile: null as File | null,
  wheelShapeNote: '',
  wheelColorNote: '',
  centerCapNote: '',
  centerCapTexture: '',
  specialRequest: '',
})

const addressForm = reactive({
  name: '',
  phone: '',
  email: '',
  country: 'russia',
  address: '',
  coupon: '',
  remark: '',
})

const countryOptions: SelectOption[] = [
  { value: 'russia', label: 'Russia' },
  { value: 'germany', label: 'Germany' },
  { value: 'uae', label: 'UAE' },
]

const holeOptions: SelectOption[] = [
  { value: '旋口', label: '旋口' },
  { value: '直孔', label: '直孔' },
]

const boltSeatOptions: SelectOption[] = [
  { value: '球座', label: '球座' },
  { value: '锥座', label: '锥座' },
]

function goNextFromVehicle() {
  activeTab.value = 'creative'
}

function goFromCreativeToAddress() {
  activeTab.value = 'address'
}

function goBackToVehicle() {
  activeTab.value = 'vehicle'
}

function goBackToCreative() {
  activeTab.value = 'creative'
}

function goToAmount() {
  activeTab.value = 'amount'
}

function buildWheelFields(prefix: 'front' | 'rear') {
  return [
    { key: `${prefix}Size`, label: '尺寸 (吋)', type: 'select', options: sizeOptions, placeholder: '16英寸' },
    { key: `${prefix}Quantity`, label: '数量', type: 'input', placeholder: '2' },
    { key: `${prefix}Width`, label: '宽度 (J)', type: 'input', placeholder: '10' },
    { key: `${prefix}Et`, label: 'ET(MM)', type: 'input', placeholder: '30' },
    { key: `${prefix}Pcd`, label: 'PCD', type: 'pcd' },
    { key: `${prefix}Cb`, label: 'CB(MM)', type: 'input', placeholder: '66.5' },
    { key: `${prefix}BoltSeat`, label: '螺丝垫圈', type: 'select', options: boltSeatOptions, placeholder: '球座' },
    { key: `${prefix}Hole`, label: '孔型', type: 'select', options: holeOptions, placeholder: '旋口' },
    { key: `${prefix}Paint`, label: '表面处理', type: 'input', placeholder: '请告知表面工艺' },
  ] as const
}

const frontWheelFields = buildWheelFields('front')
const rearWheelFields = buildWheelFields('rear')

const OutlineValue = ref<any>({})
const types = ref<Number>(0)
// 切换创作 / 结构类型
const handelOutline = (values: any, type: Number) => {
  if (type === 0) {
    if (creativeForm.designMode === values?.id) return
  }
  if (type === 1) {
    const next = typeof values === 'string' ? values : String(values?.id ?? '')
    if (!creativeForm.structure) {
      creativeForm.structure = next
      return
    }
    if (creativeForm.structure === next) return
  }
  openOutline.value = true
  OutlineValue.value = values
  types.value = type
}
// 确认切换设计
const handelSublitOutline = () => {
  openOutline.value = false
  if (types.value === 0) {
    creativeForm.designMode = OutlineValue.value.id
  } else {
    creativeForm.structure = OutlineValue.value
  }
}
</script>

<template>
  <div class="min-h-full w-full overflow-x-hidden overflow-y-auto bg-[#FAFAFA] pb-32 text-[#1F2937]">
    <TabsRoot v-model="activeTab" class="min-h-full">
      <div class="sticky top-0 z-20 border-b border-[#ECECEC] bg-white px-4 pb-2 pt-4">
        <img src="@/assets/image/navLogo.png" class="h-8 w-34 object-contain" alt="">
        <TabsList class="relative mt-3 grid grid-cols-4">
          <TabsTrigger v-for="item in tabItems" :key="item.value" :value="item.value"
            class="relative py-3 text-3.5 font-600 color-[#4B5563] outline-none data-[state=active]:color-[#111827]">
            {{ item.label }}
          </TabsTrigger>
          <TabsIndicator class="absolute bottom-0 h-0.5 rounded-full bg-[#2A2C33] transition-all duration-200" />
        </TabsList>
      </div>

      <TabsContent value="vehicle" class="outline-none">
        <div class="space-y-4 px-4 py-4">
          <div class="space-y-3">
            <div>
              <div class="mb-2 text-3.5 font-600">客户昵称</div>
              <input v-model="vehicleForm.customerName" type="text"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
            </div>
            <div>
              <div class="mb-2 text-3.5 font-600">客户ID</div>
              <input v-model="vehicleForm.customerId" type="text"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
            </div>
          </div>

          <div class="overflow-hidden rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <img src="@/assets/vue.svg" class="h-34 w-full object-contain" alt="">
          </div>

          <div>
            <div class="text-4 font-700">选择车辆</div>
            <div class="mt-1 text-3 text-[#9CA3AF]">数据来源第三方，我们会根据您的设计需求进行调整</div>
          </div>

          <div class="space-y-3">
            <div>
              <div class="mb-2 text-3.5 font-600">品牌</div>
              <TgSelect v-model="vehicleForm.brand" :options="brandOptions" :searchable="false" placeholder="Audi" />
            </div>
            <div>
              <div class="mb-2 text-3.5 font-600">型号</div>
              <TgSelect v-model="vehicleForm.model" :options="modelOptions" :searchable="false" placeholder="请选择型号" />
            </div>
            <div>
              <div class="mb-2 text-3.5 font-600">是否为原厂/锻车?</div>
              <TgSelect v-model="vehicleForm.forged" :options="yesNoOptions" :searchable="false" placeholder="是" />
            </div>
          </div>

          <div v-if="vehicleExpanded" class="space-y-3">
            <div>
              <div class="mb-2 text-3.5 font-600">VIN(选填)</div>
              <input v-model="vehicleForm.vin" type="text" placeholder="请输入VIN"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
            </div>
            <div>
              <div class="mb-2 text-3.5 font-600">底盘号(选填)</div>
              <input v-model="vehicleForm.plate" type="text" placeholder="请输入配型号"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
            </div>
            <div>
              <div class="mb-2 text-3.5 font-600">卡钳(选填)</div>
              <input v-model="vehicleForm.rimThickness" type="text" placeholder="请输入卡钳"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
            </div>
          </div>

          <button type="button" class="mx-auto flex items-center gap-1 text-3.5 font-600 text-[#3487FF]"
            @click="vehicleExpanded = !vehicleExpanded">
            <Icon :icon="vehicleExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'" color="#3487FF" width="16"
              height="16" />
            <span>{{ vehicleExpanded ? '收起' : '展开' }}</span>
          </button>


          <div class="flex items-center gap-2">
            <TgSwitch v-model="vehicleForm.mirrorPair" aria-label="toggle same wheel config" />
            <div class="text-3.5 font-600">前后轮保持一致</div>
          </div>

          <div class="space-y-3">
            <div class="text-4 font-700">前轮配置</div>
            <div v-for="field in frontWheelFields" :key="field.key">
              <div class="mb-2 text-3.5 font-600">{{ field.label }}</div>

              <TgSelect v-if="field.type === 'select'"
                v-model="vehicleForm[field.key as keyof typeof vehicleForm] as string" :options="field.options"
                :searchable="false" :placeholder="field.placeholder" />

              <div v-else-if="field.type === 'pcd'" class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <input v-model="vehicleForm.frontPcdLeft" type="text"
                  class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
                <span class="text-4 text-[#6B7280]">x</span>
                <input v-model="vehicleForm.frontPcdRight" type="text"
                  class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
              </div>

              <input v-else v-model="vehicleForm[field.key as keyof typeof vehicleForm] as string" type="text"
                :placeholder="field.placeholder"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
            </div>
          </div>

          <div v-if="!vehicleForm.mirrorPair" class="space-y-3">
            <div class="border-t border-dashed border-[#E5E7EB] pt-4 text-4 font-700">后轮配置</div>
            <div v-for="field in rearWheelFields" :key="field.key">
              <div class="mb-2 text-3.5 font-600">{{ field.label }}</div>

              <TgSelect v-if="field.type === 'select'"
                v-model="vehicleForm[field.key as keyof typeof vehicleForm] as string" :options="field.options"
                :searchable="false" :placeholder="field.placeholder" />

              <div v-else-if="field.type === 'pcd'" class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <input v-model="vehicleForm.rearPcdLeft" type="text"
                  class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
                <span class="text-4 text-[#6B7280]">x</span>
                <input v-model="vehicleForm.rearPcdRight" type="text"
                  class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
              </div>

              <input v-else v-model="vehicleForm[field.key as keyof typeof vehicleForm] as string" type="text"
                :placeholder="field.placeholder"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="creative" class="outline-none">
        <div class="space-y-4 px-4 py-4">
          <div class="grid grid-cols-2 gap-3">
            <button v-for="item in designModeOptions" :key="item.id" type="button"
              class="rounded-2xl border px-4 py-5 text-left transition"
              :class="creativeForm.designMode === item.id ? 'border-[#88AEE4] bg-[#EFF5FF] shadow-[inset_0_0_0_1px_rgba(136,174,228,0.25)]' : 'border-[#ECECEC] bg-white'"
              @click="handelOutline(item, 0)">
              <Icon :icon="item.icon" width="22" height="22" class="text-[#6B7280]" />
              <div class="mt-4 text-4 font-700">{{ item.title }}</div>
            </button>
          </div>

          <div>
            <div class="mb-3 text-4 font-700">结构类型</div>
            <div class="grid grid-cols-2 gap-3">
              <button v-for="item in structureOptions" :key="item" type="button"
                class="rounded-2xl border px-4 py-5 text-left text-4 font-700 transition"
                :class="creativeForm.structure === item ? 'border-[#88AEE4] bg-[#EFF5FF] text-[#1F2937]' : 'border-[#ECECEC] bg-white text-[#4B5563]'"
                @click="handelOutline(item, 1)">
                {{ item }}
              </button>
            </div>
          </div>

          <template v-if="creativeForm.designMode === 'creative'">
            <div class="rounded-3xl bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div class="flex gap-3">
                <div class="h-24 w-24 overflow-hidden rounded-2xl bg-[#111111]">
                  <img src="@/assets/vue.svg" class="h-full w-full object-contain p-3" alt="">
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-4 font-700">WL-M-053</div>
                  <div class="mt-1 text-3 text-[#6B7280]">
                    <template v-if="creativeForm.structure">{{ creativeForm.structure }} | 1PC-053</template>
                    <template v-else>请选择结构类型</template>
                  </div>
                  <div class="mt-1 text-3 text-[#9CA3AF]">前后轮配置</div>
                  <div v-if="creativeForm.structure" class="mt-3 flex flex-wrap gap-2">
                    <span
                      class="inline-flex items-center rounded-full bg-[#EFF5FF] px-2.5 py-1 text-3 font-600 text-[#4478C8]">Y型</span>
                    <span
                      class="inline-flex items-center rounded-full bg-[#EFF5FF] px-2.5 py-1 text-3 font-600 text-[#4478C8]">{{ creativeForm.structure }}</span>
                  </div>
                </div>
              </div>
              <button type="button" class="mt-3 inline-flex items-center gap-1 text-3.5 font-600 text-[#6B7280]">
                <Icon icon="mdi:refresh" width="16" height="16" />
                <span>重新选择</span>
              </button>
            </div>

            <div>
              <div class="text-4 font-700">轮毂颜色</div>
              <div class="mt-4 overflow-hidden rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <img src="@/assets/vue.svg" class="h-42 w-full object-contain opacity-80" alt=""
                  v-if="creativeForm.structure != '越野'">
                <div class="mt-4 flex flex-wrap justify-around gap-3 text-3 text-[#6B7280]">
                  <button v-for="item in wheelColors" :key="item.name" type="button" class="border-b pb-1"
                    :class="creativeForm.selectedColor === item.name ? 'border-[#2A2C33] text-[#111827]' : 'border-transparent'"
                    @click="creativeForm.selectedColor = item.name">
                    {{ item.name }}
                  </button>
                </div>
                <div class="mt-4 text-center text-4 font-700">
                  WL049 曜黑
                </div>
                <div class="mt-4 flex items-center justify-center gap-3">
                  <button v-for="item in wheelColors" :key="`${item.name}-dot`" type="button"
                    class="h-10 w-10 rounded-full border transition"
                    :class="creativeForm.selectedColor === item.name ? 'border-[#2A2C33] shadow-[0_0_0_3px_white,0_0_0_4px_#2A2C33]' : 'border-transparent'"
                    :style="{ backgroundColor: item.hex }" @click="creativeForm.selectedColor = item.name" />
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="space-y-4">
              <div>
                <div class="mb-2 text-3.5 font-600">轮毂造型</div>
                <div class="w-26 h-26">
                  <TgFilepond v-model="creativeForm.wheelShapeFile" accept="image/*" aria-label="upload wheel shape" />
                </div>
              </div>

              <div>
                <div class="mb-2 text-3.5 font-600">轮毂造型描述</div>
                <input v-model="creativeForm.wheelShapeNote" type="text"
                  class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
              </div>

              <div class="border-t border-[#F1F3F5] pt-4">
                <div class="mb-2 text-3.5 font-600">轮毂唇边</div>
                <div class="w-26 h-26">
                  <TgFilepond v-model="creativeForm.wheelLipFile" accept="image/*" aria-label="upload wheel lip" />
                </div>
              </div>

              <div>
                <div class="mb-2 text-3.5 font-600">轮毂颜色描述</div>
                <input v-model="creativeForm.wheelColorNote" type="text"
                  class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
              </div>
            </div>
          </template>

          <div class="mt-4 flex flex-col gap-4">
            <div class="border-t border-[#F1F3F5] pt-4">
              <div class="mb-2 text-3.5 font-600">中心盖</div>
              <div class="w-26 h-26">
                <TgFilepond v-model="creativeForm.centerCapFile" accept="image/*" aria-label="upload center cap" />
              </div>
            </div>

            <div>
              <div class="mb-2 text-3.5 font-600">中心盖描述</div>
              <input v-model="creativeForm.centerCapNote" type="text"
                class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
            </div>

            <div>
              <div class="mb-2 text-3.5 font-600">特殊要求 / 说明</div>
              <textarea v-model="creativeForm.specialRequest" rows="4" placeholder="请输入特殊要求 / 说明"
                class="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-3.5 outline-none placeholder:text-[#B6BBC5]" />
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="address" class="outline-none">
        <div class="space-y-3 px-4 py-4">
          <div>
            <div class="mb-2 text-3.5 font-600">姓名</div>
            <input v-model="addressForm.name" type="text" placeholder="请输入"
              class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">手机</div>
            <input v-model="addressForm.phone" type="text" placeholder="请输入"
              class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">邮箱</div>
            <input v-model="addressForm.email" type="text" placeholder="请输入"
              class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">国家</div>
            <TgSelect v-model="addressForm.country" :options="countryOptions" :searchable="false"
              placeholder="Russia" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">收货地址</div>
            <textarea v-model="addressForm.address" rows="4" placeholder="请输入"
              class="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-3.5 outline-none placeholder:text-[#B6BBC5]" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">优惠码（选填）</div>
            <input v-model="addressForm.coupon" type="text" placeholder="请输入"
              class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">备注（选填）</div>
            <textarea v-model="addressForm.remark" rows="4" placeholder="请输入"
              class="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-3.5 outline-none placeholder:text-[#B6BBC5]" />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="amount" class="outline-none">
        <div class="px-4 py-10">
          <div
            class="rounded-3xl border border-dashed border-[#D1D5DB] bg-white px-5 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div class="text-5 font-700">金额</div>
            <div class="mt-2 text-3.5 text-[#9CA3AF]">这个界面先留空，后面再接价格与费用明细。</div>
          </div>
        </div>
      </TabsContent>
    </TabsRoot>

    <DialogRoot v-model:open="openOutline" :modal="false">
      <DialogPortal>
        <DialogOverlay class="bg-blackA9 data-[state=open]:animate-overlayShow fixed inset-0 z-30" />
        <DialogContent
          class="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none z-[100]">
          <DialogTitle class="text-mauve12 text-center m-0 text-[17px] font-semibold">
            提示
          </DialogTitle>
          <DialogDescription class="text-mauve11 mt-[10px] mb-5 text-sm leading-normal">
            {{
              types === 0
                ? '切换设计类型，将会清除当前已有设计，还需要继续吗？'
                : '切换结构类型需要重新选择型号，还需要继续吗？'
            }}
          </DialogDescription>
          <div class="mt-[25px] flex justify-between">
            <DialogClose as-child>
              <button
                class="bg-[#000000] color-white text-green11 text-sm hover:bg-[#000000] focus:shadow-[#000000] inline-flex h-[35px] items-center justify-center rounded-lg px-[15px] font-semibold leading-none focus:shadow-[0_0_0_2px] focus:outline-none">
                取消
              </button>
              <button @click="handelSublitOutline"
                class="bg-[#3487FF] color-white text-green11 text-sm hover:bg-[#3487FF] focus:shadow-[#3487FF] inline-flex h-[35px] items-center justify-center rounded-lg px-[15px] font-semibold leading-none focus:shadow-[0_0_0_2px] focus:outline-none">
                确认
              </button>
            </DialogClose>
          </div>
          <DialogClose
            class="text-grass11 hover:bg-green4 focus:shadow-green7 absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
            aria-label="Close">
            <Icon icon="lucide:x" />
          </DialogClose>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <div
      class="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-[#ECECEC] bg-white px-4 py-4">
      <div v-if="activeTab === 'vehicle'">
        <TgButton block variant="primary" @click="goNextFromVehicle">
          创作
        </TgButton>
      </div>

      <div v-else-if="activeTab === 'creative'" class="grid grid-cols-2 gap-3">
        <TgButton block variant="outline" @click="goBackToVehicle">
          车辆
        </TgButton>
        <TgButton block variant="primary" @click="goFromCreativeToAddress">
          地址
        </TgButton>
      </div>

      <div v-else-if="activeTab === 'address'" class="grid grid-cols-2 gap-3">
        <TgButton block variant="outline" @click="goBackToCreative">
          创作
        </TgButton>
        <TgButton block variant="primary" @click="goToAmount">
          金额
        </TgButton>
      </div>

      <div v-else>
        <TgButton block variant="outline" @click="goBackToCreative">
          返回编辑
        </TgButton>
      </div>
    </div>
  </div>
</template>
