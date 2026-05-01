<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NDrawer } from 'naive-ui'
import { useRouter } from 'vue-router'
import CarSelectionPanel from '@/components/CarSelectionPanel.vue'
import OrderListCard from '@/components/OrderListCard.vue'
import type { VehicleFormState } from '@/pages/CustomOrder/models'
import type { OrderListItem } from '@/utils/orderHelpers'
import { fetchOrdersList } from '@/api/rolesApi'
import { t } from '@/i18n/uiI18n'
import {
  loadMyVehicleSelection,
  saveMyVehicleSelection,
} from '@/utils/myVehicleStorage'
import { readStaffPlatformUid } from '@/utils/deeplinkStaffContext'
import { getTelegramDisplayName, getTelegramUserId, getTelegramPhotoUrl } from '@/utils/userTelegram'
import { uploadImage } from '@/api/upload'

/** 与定制单车辆 Tab 相同的五段字段（`wheel*` 与接口/缓存一致） */
type VehiclePick = Pick<
  VehicleFormState,
  'brand' | 'model' | 'wheelGeneration' | 'wheelYear' | 'wheelModification'
>

const router = useRouter()
const storedCar = loadMyVehicleSelection()
const pickerOpen = ref(false)

const vehicle = reactive<VehiclePick>({
  brand: storedCar?.brand ?? '',
  model: storedCar?.model ?? '',
  wheelGeneration: storedCar?.wheelGeneration ?? '',
  wheelYear: storedCar?.wheelYear ?? '',
  wheelModification: storedCar?.wheelModification ?? '',
})

/** CarSelectionPanel 仍用 `year` 传展示串「世代 · 年 · 配置」，与 `wheelYear`（id）不同 */
const selectionSummaryYear = ref(storedCar?.year ?? '')

/** 在用户收起车型选择面板时写入本地（避免首页默认车款即写入并触发下单预填弹窗） */
watch(pickerOpen, (open, wasOpen) => {
  if (!open && wasOpen) {
    saveMyVehicleSelection({
      brand: String(vehicle.brand ?? '').trim(),
      model: String(vehicle.model ?? '').trim(),
      wheelGeneration: String(vehicle.wheelGeneration ?? '').trim(),
      wheelYear: String(vehicle.wheelYear ?? '').trim(),
      wheelModification: String(vehicle.wheelModification ?? '').trim(),
      year: String(selectionSummaryYear.value ?? '').trim(),
    })
  }
})

const orders = ref<OrderListItem[]>([])
const listLoading = ref(false)
const listError = ref('')

const currentCarText = computed(() => {
  const b = String(vehicle.brand ?? '').trim()
  const m = String(vehicle.model ?? '').trim()
  const y = String(selectionSummaryYear.value ?? '').trim()
  if (!b && !m && !y) return t('home.notSelected')
  const head = [b, m].filter(Boolean).join(' ')
  return y ? `${head}[${y}]` : head
})

const profileDisplayName = computed(
  () => getTelegramDisplayName().trim() || '默认用户',
)
const profileTelegramId = computed(
  () => getTelegramUserId().trim() || '—',
)

const avatarUrl = ref(getTelegramPhotoUrl())
const avatarUploading = ref(false)

async function onAvatarFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  avatarUploading.value = true
  try {
    const result = await uploadImage(file, { formFields: { scene: '' } })
    if (result.url) avatarUrl.value = result.url
  } finally {
    avatarUploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

function openOrderDetails(orderId: string | number) {
  router.push({
    path: '/OrderDetails',
    query: { orderId: String(orderId) },
  })
}

function onProfileOrderCard(row: OrderListItem) {
  openOrderDetails(row.id)
}

function goAllOrders() {
  router.push('/OrderList')
}

async function loadProfileOrders() {
  listLoading.value = true
  listError.value = ''
  try {
    const uid = readStaffPlatformUid().trim() || getTelegramUserId()
    const res = await fetchOrdersList({
      user_id: uid || undefined,
      page: 1,
      page_size: 8,
    })
    orders.value = res.items ?? []
  } catch (e) {
    listError.value = e instanceof Error ? e.message : t('profile.ordersLoadFailed')
    orders.value = []
  } finally {
    listLoading.value = false
  }
}

onMounted(() => {
  void loadProfileOrders()
})

function closeVehiclePicker() {
  pickerOpen.value = false
}
</script>

<template>
  <section class="relative min-h-full overflow-x-hidden bg-[#202126] text-white">
    <div class="relative h-60 overflow-hidden">
      <div class="absolute z-2 h-full w-full bg-[rgba(0,0,0,0.62)]" />
      <img src="@/assets/image/my-bg.png" class="absolute z-1 h-full w-full" alt="">
      <div class="relative top-4 z-10 flex flex-col items-center justify-center">
        <div class="relative">
          <!-- 头像：优先 TG photo_url / 上传图，无则用户图标占位 -->
          <div class="h-28 w-28 overflow-hidden rounded-full bg-white shadow-[0_10px_30px_rgba(255,255,255,0.12)]">
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              class="h-full w-full object-cover"
              alt="avatar"
            />
            <div v-else class="flex h-full w-full items-center justify-center bg-[#c8ccd6]">
              <Icon icon="lucide:user-round" width="52" height="52" class="text-white/80" />
            </div>
          </div>
          <!-- 点击触发隐藏 input 上传 -->
          <label
            class="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-[#d7d8dc] bg-white text-[#424550]"
            :class="avatarUploading ? 'opacity-50 pointer-events-none' : ''"
          >
            <Icon v-if="!avatarUploading" icon="lucide:pencil-line" width="14" height="14" />
            <Icon v-else icon="eos-icons:loading" width="14" height="14" class="animate-spin" />
            <input
              type="file"
              accept="image/*"
              class="hidden"
              @change="onAvatarFileChange"
            />
          </label>
        </div>

        <div class="mt-4 text-center">
          <div class="text-5 font-700">
            {{ profileDisplayName }}
          </div>
          <div class="mt-2 text-4 font-700 text-white/90">
            {{ profileTelegramId }}
          </div>
        </div>
      </div>
    </div>

    <div class="relative z-20 mt-4 px-4">
      <div
        class="flex items-center gap-3 rounded-[16px] bg-[#6d6d70] px-4 py-5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
        <div class="min-w-22 text-5 font-700">
          {{ t('profile.myCar') }}
        </div>
        <div class="min-w-0 flex-1 text-center text-4.5 font-600">
          <span class="block truncate">{{ currentCarText }}</span>
        </div>
        <button type="button" class="flex h-7 w-7 shrink-0 items-center justify-center text-white"
          @click="pickerOpen = !pickerOpen">
          <Icon icon="lucide:pencil-line" width="18" height="18" />
        </button>
      </div>

      <NDrawer
        v-model:show="pickerOpen"
        :height="'min(88vh, 720px)'"
        placement="bottom"
        :trap-focus="false"
        :block-scroll="true"
        :native-scrollbar="false"
        :content-style="{
          height: '100%',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }"
      >
        <div
          class="tg-light-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[20px] border-t shadow-[var(--app-shadow)] outline-none"
          style="border-color: var(--tg-theme-section-separator-color)">
          <CarSelectionPanel
            class="min-h-0 flex-1"
            v-model:brand="vehicle.brand"
            v-model:model="vehicle.model"
            v-model:year="selectionSummaryYear"
            v-model:wheel-generation="vehicle.wheelGeneration"
            v-model:wheel-year="vehicle.wheelYear"
            v-model:wheel-modification="vehicle.wheelModification"
            @complete="closeVehiclePicker"
          />
        </div>
      </NDrawer>

      <p v-if="listError" class="mt-4 rounded-[12px] border border-[#fecaca]/40 bg-[#450a0a]/30 px-3 py-2 text-3.25 text-[#fecaca]">
        {{ listError }}
      </p>
      <div v-else-if="listLoading" class="mt-4 py-6 text-center text-3.5 text-white/60">
        {{ t('common.loading') }}
      </div>
      <div v-else class="mt-4 flex flex-col gap-3">
        <OrderListCard
          v-for="order in orders"
          :key="order.id"
          as="article"
          :row="order"
          @click="onProfileOrderCard" />
      </div>

      <button type="button"
        class="mt-4 w-full rounded-[16px] border border-white/20 bg-white/10 py-3.5 text-4 font-600 text-white active:bg-white/20"
        @click="goAllOrders">
        {{ t('profile.viewAll') }}
      </button>
    </div>
  </section>
</template>
