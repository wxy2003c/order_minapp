<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useRouter } from 'vue-router'
import CarSelectionPanel from '@/components/CarSelectionPanel.vue'
import { carGroups, getDefaultCarSelection } from '@/data/carSelection'
import { orderStatusMeta, profileOrders } from '@/data/orders'
import { t } from '@/i18n/uiI18n'
import {OrderList} from '@/api/orders'
const router = useRouter()
const initialCar = getDefaultCarSelection()
const pickerOpen = ref(false)
const selectedBrand = ref(initialCar.brand)
const selectedModel = ref(initialCar.model)
const selectedYear = ref(initialCar.year)
const searchParams = reactive({
  phone:'15566886688',
  page:1,
  page_size:10
})  // 订单搜索参数
const currentCarText = computed(() => `${selectedBrand.value} ${selectedModel.value}[${selectedYear.value}]`)

function openOrderDetails(orderId: string) {
  router.push({
    path: '/OrderDetails',
    query: {
      id: orderId,
    },
  })
}

// 订单列表
async function pagesOrder() {
   const res = await OrderList(searchParams)
   console.log(res);
}

onMounted(()=>{
  pagesOrder()
})
</script>

<template>
  <section class="relative min-h-full overflow-x-hidden bg-[#202126] text-white">
    <div v-if="pickerOpen" class="fixed inset-0 z-10 bg-black/35" @click="pickerOpen = false" />

    <div class="relative h-60 overflow-hidden">
      <div class="absolute z-2 bg-[rgba(0,0,0,0.62)] w-full h-full" />
      <img src="@/assets/image/my-bg.png" class="w-full h-full absolute z-1" alt="">
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

    <div class="relative mt-4 z-20 px-4 pb-6">
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

      <div class="mt-4 flex flex-col gap-4">
        <article v-for="order in profileOrders" :key="order.id"
          class="cursor-pointer rounded-[16px] bg-white p-4 text-[#2f3137] shadow-[0_10px_26px_rgba(0,0,0,0.12)]"
          @click="openOrderDetails(order.id)">
          <div class="flex items-center justify-between gap-3 text-3.5">
            <div class="flex min-w-0 items-center gap-3">
              <span class="shrink-0 font-600">{{ t(`orderStructure.${order.structureKey}`) }}</span>
              <span class="truncate text-[#5f636d]">{{ order.id }}</span>
            </div>
            <span class="rounded-full bg-[#f3f4f7] px-3 py-1" :class="orderStatusMeta[order.status].statusClass">
              {{ t(`orderStatus.${order.status}`) }}
            </span>
          </div>

          <div class="mt-4 flex gap-4">
            <div class="h-18 w-18 shrink-0 rounded-[12px] border border-[#e4e5ea] bg-[#f7f7f8]" />
            <div class="min-w-0">
              <div class="line-clamp-2 text-4.2 font-700 leading-5.5 text-[#33363d]">
                {{ order.title }}
              </div>
              <div class="mt-3 text-3.6 text-[#b4b7bf]">
                {{ order.spec }}
              </div>
            </div>
          </div>

          <div
            class="mt-4 flex items-center justify-between gap-3 border-t border-[#ececf0] pt-4 text-4 text-[#666a74]">
            <div class="flex min-w-0 items-center gap-3">
              <span class="h-8 w-8 shrink-0 rounded-full border border-[#d7d9de] bg-white" />
              <span class="truncate">{{ order.customer }}</span>
            </div>
            <span class="shrink-0 text-[#b0b3bc]">{{ order.time }}</span>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>