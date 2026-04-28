<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useRouter } from 'vue-router'
import CarSelectionPanel from '@/components/CarSelectionPanel.vue'
import OrderListCard from '@/components/OrderListCard.vue'
import { carGroups, getDefaultCarSelection } from '@/data/carSelection'
import { fetchOrdersList, type OrderListItem } from '@/api/orders'
import { t } from '@/i18n/uiI18n'
import {
  loadMyVehicleSelection,
  saveMyVehicleSelection,
} from '@/utils/myVehicleStorage'
import { readStaffPlatformUid } from '@/utils/deeplinkStaffContext'
import { getTelegramUserId } from '@/utils/userTelegram'

const router = useRouter()
const initialCar = getDefaultCarSelection()
const storedCar = loadMyVehicleSelection()
const pickerOpen = ref(false)
const selectedBrand = ref(storedCar?.brand || initialCar.brand)
const selectedModel = ref(storedCar?.model || initialCar.model)
const selectedYear = ref(storedCar?.year || initialCar.year)

/** 在用户收起车型选择面板时写入本地（避免首页默认车款即写入并触发下单预填弹窗） */
watch(pickerOpen, (open, wasOpen) => {
  if (!open && wasOpen) {
    saveMyVehicleSelection({
      brand: String(selectedBrand.value ?? '').trim(),
      model: String(selectedModel.value ?? '').trim(),
      year: String(selectedYear.value ?? '').trim(),
    })
  }
})

const orders = ref<OrderListItem[]>([])
const listLoading = ref(false)
const listError = ref('')

const currentCarText = computed(() => `${selectedBrand.value} ${selectedModel.value}[${selectedYear.value}]`)

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
</script>

<template>
  <section class="relative min-h-full overflow-x-hidden bg-[#202126] text-white">
    <div v-if="pickerOpen" class="fixed inset-0 z-10 bg-black/35" @click="pickerOpen = false" />

    <div class="relative h-60 overflow-hidden">
      <div class="absolute z-2 h-full w-full bg-[rgba(0,0,0,0.62)]" />
      <img src="@/assets/image/my-bg.png" class="absolute z-1 h-full w-full" alt="">
      <div class="relative top-4 z-10 flex flex-col items-center justify-center">
        <div class="relative">
          <div class="h-28 w-28 rounded-full bg-white shadow-[0_10px_30px_rgba(255,255,255,0.12)]" />
          <button type="button"
            class="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-[#d7d8dc] bg-white text-[#424550]">
            <Icon icon="lucide:pencil-line" width="14" height="14" />
          </button>
        </div>

        <div class="mt-4 text-center">
          <div class="text-5 font-700">
            Александр Жихаев1034
          </div>
          <div class="mt-2 text-4 font-700 text-white/90">
            266086681
          </div>
        </div>
      </div>
    </div>

    <div class="relative z-20 mt-4 px-4 pb-6">
      <div class="relative">
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

        <div v-if="pickerOpen"
          class="absolute left-0 top-full z-20 mt-3 w-full overflow-hidden rounded-[16px] shadow-[0_24px_48px_rgba(0,0,0,0.28)]"
          @click.stop>
          <CarSelectionPanel v-model:brand="selectedBrand" v-model:model="selectedModel" v-model:year="selectedYear"
            :groups="carGroups" />
        </div>
      </div>

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
