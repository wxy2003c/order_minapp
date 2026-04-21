<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useRoute } from 'vue-router'
import { orderStatusMeta, profileOrders, type OrderStatus } from '@/data/orders'

const route = useRoute()

const materialGroups = [
  { title: '正式图', count: 3 },
  { title: '正式图', count: 3 },
  { title: '正式图', count: 3 },
]

const wheelColors = [
  { name: '曜黑', code: 'WL049', hex: '#252631' },
  { name: '薄荷绿', code: 'WL058', hex: '#94e3a6' },
  { name: '银灰', code: 'WL028M', hex: '#b6b7af' },
]

const detailNotes = [
  '这里填写客制化设计要求与图纸需求内容这里填写客制化设计要求与图纸需求内容',
  '这里填写唇边客制化设计要求与图纸需求内容这里填写客制化设计要求与图纸需求内容',
  '这里填写底盖客制化设计要求与图纸需求内容这里填写底盖客制化设计要求与图纸需求内容',
]

const addressLines = [
  '1. Indesina Svetlota Str, 99, St Petersburg Industrial Park',
  '173001, Russian Federation',
]

const amountRows = [
  { label: '设计定金', value: '100.00' },
  { label: '生产金', value: '790.00' },
  { label: '尾款', value: '730.00' },
  { label: '其他', value: '0.00' },
]

const currentOrder = computed(() => {
  const orderId = typeof route.query.id === 'string' ? route.query.id : ''
  return profileOrders.find(item => item.id === orderId) ?? profileOrders[0]
})

const currentStatus = computed<OrderStatus>(() => currentOrder.value.status)
const statusMeta = computed(() => orderStatusMeta[currentStatus.value])
</script>

<template>
  <div class="min-h-full w-full overflow-x-hidden overflow-y-auto bg-[#f7f7f7] pb-28 text-[#22252b]">
    <div class="bg-white px-4 pb-5 pt-4">
      <div class="flex items-center justify-between gap-3">
        <img src="@/assets/image/navLogo.png" class="h-8 w-34 object-contain" alt="">
      </div>

      <div class="mt-4 flex items-center justify-between gap-3 border-b border-[#f0f1f4] pb-3">
        <div class="flex items-center gap-2 text-3.5">
          <Icon :icon="statusMeta.icon" width="15" height="15" :class="statusMeta.statusClass" color="#528FFF"/>
          <span :class="statusMeta.statusClass" class="color-[#528FFF]">{{ statusMeta.label }}</span>
        </div>
        <div class="text-3 text-[#BBBBBB] flex flex-items-center gap-2">
          <Icon icon="lucide:copy" width="14" height="14" /> <span>{{ currentOrder.id }}</span>
        </div>
      </div>

      <div class="mt-4 flex items-center gap-3">
        <span class="h-6 w-6 shrink-0 rounded-full border border-[#d7d9df] bg-white" />
        <span class="flex-1 truncate text-3.5 text-[#555b67]">{{ currentOrder.customer }}</span>
        <span class="text-3 text-[#8eaef4]">UID {{ currentOrder.customerId }}</span>
      </div>
    </div>

    <section class="mt-3 bg-white px-4 py-4" v-if="currentOrder.status != '设计中' && currentOrder.status != '待确认' && currentOrder.status!='已取消'">
      <div class="text-4 font-700">
        工厂设计图纸
      </div>
      <div class="mt-3 space-y-4">
        <div v-for="group in materialGroups" :key="group.title">
          <div class="mb-2 text-3 text-[#9ea3ad]">
            {{ group.title }}
          </div>
          <div class="flex gap-3">
            <div v-for="index in group.count" :key="`${group.title}-${index}`"
              class="flex items-center justify-center rounded-[4px] bg-[#121318] w-12.5 h-12.5">
              <Icon icon="mdi:wheel" width="20" height="20" class="text-white" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-3 bg-white px-4 py-4">
      <div class="flex items-center justify-center rounded-[12px] bg-[#fafafa] px-4 py-3">
        <div
          class="relative h-34 w-full max-w-70 overflow-hidden rounded-[10px] bg-[linear-gradient(135deg,#e5e7eb_0%,#f5f6f8_40%,#d9dde5_100%)]">
          <div class="absolute left-[10%] top-[48%] h-10 w-10 rounded-full border-[6px] border-[#2a2d35]" />
          <div class="absolute right-[12%] top-[48%] h-10 w-10 rounded-full border-[6px] border-[#2a2d35]" />
          <div class="absolute left-[18%] top-[40%] h-14 w-[64%] rounded-[40px_48px_18px_18px] bg-[#2c2f38]" />
          <div class="absolute left-[24%] top-[34%] h-9 w-[31%] skew-x-[-16deg] rounded-t-[18px] bg-[#2c2f38]" />
          <div class="absolute left-[52%] top-[35%] h-8 w-[20%] skew-x-[-18deg] rounded-tr-[16px] bg-[#2c2f38]" />
        </div>
      </div>

      <div class="mt-4 border-b border-[#f0f1f4] pb-4">
        <div class="text-4 font-700">
          车型信息
        </div>
        <div class="mt-3 text-4.5 font-700">
          Audi
        </div>
        <div class="mt-1 text-3.5 leading-5.5 text-[#5f6470]">
          {{ currentOrder.title }}
        </div>
        <div class="mt-3 grid grid-cols-3 gap-3 border-t border-[#f3f4f6] pt-3 text-center">
          <div>
            <div class="text-3 text-[#a3a7b0]">
              变速箱
            </div>
            <div class="mt-1 text-3.5 font-600">
              MT
            </div>
          </div>
          <div>
            <div class="text-3 text-[#a3a7b0]">
              尺寸(吋)
            </div>
            <div class="mt-1 text-3.5 font-600">
              19
            </div>
          </div>
          <div>
            <div class="text-3 text-[#a3a7b0]">
              数量
            </div>
            <div class="mt-1 text-3.5 font-600">
              2
            </div>
          </div>
        </div>
      </div>

      <div class="pt-4">
        <div class="text-4 font-700">
          型号库设计
        </div>
        <div class="mt-4 flex flex-col gap-4">
          <div class="pb-3.5 border-b border-b-[#BBBBBB] flex items-center justify-between text-3.5">
            <div class="color-[#BBBBBB]">结构类型</div>
            <div class="color-[#333333]">{{ currentOrder.type }}</div>
          </div>
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-[4px] bg-[#111216]">
            <Icon icon="mdi:wheel" width="20" height="20" class="text-white" />
          </div>
        </div>

        <div class="mt-4">
          <div class="text-3 text-[#a4a8b1]">
            轮毂颜色
          </div>
          <div class="mt-3 flex gap-3">
            <div v-for="item in wheelColors" :key="item.code" class="w-12 text-center">
              <div class="mx-auto h-10 w-10 rounded-[2px]" :style="{ backgroundColor: item.hex }" />
              <div class="mt-2 text-[10px] leading-4 text-[#6d727c]">
                {{ item.code }}
              </div>
            </div>
          </div>
          <div class="text-3.5 color-[#BBBBBB] mt-3.5">轮毂颜色描述</div>
          <div class="mt-3 space-y-1 text-3.2 leading-5 text-[#333333]">
            <div v-for="item in wheelColors" :key="item.name">
              色板: {{ item.code }} {{ item.name }}
            </div>
          </div>
        </div>

        <div class="mt-4 space-y-4">
          <div v-for="(note, index) in detailNotes" :key="index">
            <div class="mb-2 text-3 text-[#a4a8b1]">
              {{ index === 0 ? '中心盖' : index === 1 ? '正面刻字' : '特殊要求/说明' }}
            </div>
            <div v-if="index !== 2" >
              <div class="mb-2 h-10 w-10 rounded-[2px] bg-[#d8d8d8]" />
              <div class="text-3.5 color-[#BBBBBB] mt-3.5">{{ index === 0 ? '中心盖描述' : index === 1 ?
                '正面刻字描述' : '特殊要求/说明描述' }}</div>
            </div>
            <p class="text-3.2 leading-5.3 text-[#333333] mt-3.5">
              {{ note }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-3 bg-white px-4 py-4">
      <div class="text-4 font-700">
        收货地址
      </div>
      <div class="mt-3 text-3.5 font-600">
        Dani Pro
      </div>
      <div class="mt-1 text-3 text-[#8a9099]">
        +7 9805558055 | 5190xboxdani@gmail.com
      </div>
      <div class="mt-3 space-y-1 text-3.2 leading-5.2 text-[#5d6370]">
        <div v-for="line in addressLines" :key="line">
          {{ line }}
        </div>
      </div>
      <div class="mt-4 flex items-center justify-between gap-3 text-3.5">
        <span class="text-[#a4a8b1]">优惠码</span>
        <span class="font-600">GH09089</span>
      </div>
      <div class="mt-3 flex items-center justify-between gap-3 text-3.5">
        <span class="text-[#a4a8b1]">备注</span>
        <span class="font-600 text-right">这里是备注设计备注</span>
      </div>
    </section>

    <section class="mt-3 bg-white px-4 py-4">
      <div class="text-4 font-700">
        账单
      </div>
      <div class="mt-4 space-y-3 text-3.5">
        <div v-for="item in amountRows" :key="item.label" class="flex items-center justify-between gap-3">
          <span class="text-[#8f949d]">{{ item.label }}</span>
          <span>{{ item.value }}</span>
        </div>
        <div class="flex items-center justify-between gap-3 border-t border-[#f0f1f4] pt-3 text-4 font-700">
          <span>总金额</span>
          <span class="text-[#da3342]">1,680.00 USD</span>
        </div>
      </div>
    </section>

    <div
      class="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 bg-white px-4 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
      <button type="button" class="h-12 w-full rounded-[4px] border text-4 font-700" :class="statusMeta.buttonVariant === 'primary'
        ? 'border-[#2d2f36] bg-[#2d2f36] text-white'
        : 'border-[#2d2f36] bg-white text-[#2d2f36]'">
        {{ statusMeta.buttonLabel }}
      </button>
    </div>
  </div>
</template>
