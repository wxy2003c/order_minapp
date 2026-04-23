<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useRoute, useRouter } from 'vue-router'
import {
  orderStatusMeta,
  profileOrders,
  type OrderDetailActionKey,
  type OrderStatus,
} from '@/data/orders'
import TgButton from '@/components/TgButton.vue'
import { getTelegramWebApp } from '@/utils/userTelegram'
import { t } from '@/i18n/uiI18n'

const router = useRouter()
const route = useRoute()

const materialGroups = computed(() => [
  { titleKey: 'orderDetails.materialTitle', count: 3 },
  { titleKey: 'orderDetails.materialTitle', count: 3 },
  { titleKey: 'orderDetails.materialTitle', count: 3 },
])

const wheelColors = [
  { code: 'WL049', hex: '#252631' },
  { code: 'WL058', hex: '#94e3a6' },
  { code: 'WL028M', hex: '#b6b7af' },
]

const detailNoteKeys = ['orderDetails.mockNote1', 'orderDetails.mockNote2', 'orderDetails.mockNote3'] as const

const addressLines = [
  '1. Indesina Svetlota Str, 99, St Petersburg Industrial Park',
  '173001, Russian Federation',
]

const amountRows = computed(() => [
  { labelKey: 'orderDetails.designDeposit', value: '100.00' },
  { labelKey: 'orderDetails.production', value: '790.00' },
  { labelKey: 'orderDetails.finalPayment', value: '730.00' },
  { labelKey: 'orderDetails.other', value: '0.00' },
])

function wheelColorName(code: string): string {
  const k = `orderDetails.colorName_${code}` as const
  const s = t(k)
  return s === k ? code : s
}

const currentOrder = computed(() => {
  const orderId = typeof route.query.id === 'string' ? route.query.id : ''
  return profileOrders.find(item => item.id === orderId) ?? profileOrders[0]
})

const currentStatus = computed<OrderStatus>(() => currentOrder.value.status)
const statusMeta = computed(() => orderStatusMeta[currentStatus.value])

const showFactorySection = computed(() =>
  !['designing', 'pending_confirm', 'cancelled'].includes(currentOrder.value.status),
)

const supportUrl = (import.meta.env.VITE_SUPPORT_URL as string | undefined)?.trim() || 'https://t.me/'

function openSupport() {
  const w = getTelegramWebApp()
  try {
    w?.openLink?.(supportUrl, { try_instant_view: false })
  } catch {
    window.open(supportUrl, '_blank', 'noopener,noreferrer')
  }
}

function handleDetailAction(key: OrderDetailActionKey) {
  const orderId = currentOrder.value.id
  switch (key) {
    case 'cancel_order':
      if (window.confirm(t('orderDetails.confirmCancel'))) {
        /* 接入取消订单 API */
      }
      return
    case 'edit_order':
      router.push({ path: '/CustomOrder', query: { orderId } })
      return
    case 'contact_support':
      openSupport()
      return
    case 'confirm_receive':
      if (window.confirm(t('orderDetails.confirmReceive'))) {
        /* 接入确认收货 API */
      }
      return
    case 'review':
      router.push('/Evaluation')
      return
    case 'reorder':
      router.push('/CustomOrder')
      return
    default: {
      const _exhaustive: never = key
      return _exhaustive
    }
  }
}
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
          <span :class="statusMeta.statusClass" class="color-[#528FFF]">{{ t(statusMeta.labelKey) }}</span>
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

    <section v-if="showFactorySection" class="mt-3 bg-white px-4 py-4">
      <div class="text-4 font-700">
        {{ t('orderDetails.factoryDrawings') }}
      </div>
      <div class="mt-3 space-y-4">
        <div v-for="(group, gi) in materialGroups" :key="gi">
          <div class="mb-2 text-3 text-[#9ea3ad]">
            {{ t(group.titleKey) }}
          </div>
          <div class="flex gap-3">
            <div v-for="index in group.count" :key="`${group.titleKey}-${index}`"
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
          {{ t('orderDetails.vehicleInfo') }}
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
              {{ t('orderDetails.transmission') }}
            </div>
            <div class="mt-1 text-3.5 font-600">
              MT
            </div>
          </div>
          <div>
            <div class="text-3 text-[#a3a7b0]">
              {{ t('orderDetails.sizeIn') }}
            </div>
            <div class="mt-1 text-3.5 font-600">
              19
            </div>
          </div>
          <div>
            <div class="text-3 text-[#a3a7b0]">
              {{ t('orderDetails.quantity') }}
            </div>
            <div class="mt-1 text-3.5 font-600">
              2
            </div>
          </div>
        </div>
      </div>

      <div class="pt-4">
        <div class="text-4 font-700">
          {{ t('orderDetails.designLib') }}
        </div>
        <div class="mt-4 flex flex-col gap-4">
          <div class="pb-3.5 border-b border-b-[#BBBBBB] flex items-center justify-between text-3.5">
            <div class="color-[#BBBBBB]">{{ t('orderDetails.structureType') }}</div>
            <div class="color-[#333333]">{{ t(`orderStructure.${currentOrder.structureKey}`) }}</div>
          </div>
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-[4px] bg-[#111216]">
            <Icon icon="mdi:wheel" width="20" height="20" class="text-white" />
          </div>
        </div>

        <div class="mt-4">
          <div class="text-3 text-[#a4a8b1]">
            {{ t('orderDetails.wheelColor') }}
          </div>
          <div class="mt-3 flex gap-3">
            <div v-for="item in wheelColors" :key="item.code" class="w-12 text-center">
              <div class="mx-auto h-10 w-10 rounded-[2px]" :style="{ backgroundColor: item.hex }" />
              <div class="mt-2 text-[10px] leading-4 text-[#6d727c]">
                {{ item.code }}
              </div>
            </div>
          </div>
          <div class="text-3.5 color-[#BBBBBB] mt-3.5">{{ t('orderDetails.colorDesc') }}</div>
          <div class="mt-3 space-y-1 text-3.2 leading-5 text-[#333333]">
            <div v-for="item in wheelColors" :key="`t-${item.code}`">
              {{ t('orderDetails.swatch') }}: {{ item.code }} {{ wheelColorName(item.code) }}
            </div>
          </div>
        </div>

        <div class="mt-4 space-y-4">
          <div v-for="(noteKey, index) in detailNoteKeys" :key="noteKey">
            <div class="mb-2 text-3 text-[#a4a8b1]">
              {{
                index === 0
                  ? t('orderDetails.centerCap')
                  : index === 1
                    ? t('orderDetails.frontEngrave')
                    : t('orderDetails.specialNote')
              }}
            </div>
            <div v-if="index !== 2">
              <div class="mb-2 h-10 w-10 rounded-[2px] bg-[#d8d8d8]" />
              <div class="text-3.5 color-[#BBBBBB] mt-3.5">{{
                index === 0
                  ? t('orderDetails.capDesc')
                  : index === 1
                    ? t('orderDetails.engraveDesc')
                    : t('orderDetails.noteDesc')
              }}</div>
            </div>
            <p class="text-3.2 leading-5.3 text-[#333333] mt-3.5">
              {{ t(noteKey) }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-3 bg-white px-4 py-4">
      <div class="text-4 font-700">
        {{ t('orderDetails.shippingAddr') }}
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
        <span class="text-[#a4a8b1]">{{ t('orderDetails.coupon') }}</span>
        <span class="font-600">GH09089</span>
      </div>
      <div class="mt-3 flex items-center justify-between gap-3 text-3.5">
        <span class="text-[#a4a8b1]">{{ t('orderDetails.remark') }}</span>
        <span class="font-600 text-right">{{ t('orderDetails.mockNote1') }}</span>
      </div>
    </section>

    <section class="mt-3 bg-white px-4 py-4">
      <div class="text-4 font-700">
        {{ t('orderDetails.bill') }}
      </div>
      <div class="mt-4 space-y-3 text-3.5">
        <div v-for="item in amountRows" :key="item.labelKey" class="flex items-center justify-between gap-3">
          <span class="text-[#8f949d]">{{ t(item.labelKey) }}</span>
          <span>{{ item.value }}</span>
        </div>
        <div class="flex items-center justify-between gap-3 border-t border-[#f0f1f4] pt-3 text-4 font-700">
          <span>{{ t('orderDetails.total') }}</span>
          <span class="text-[#da3342]">1,680.00 USD</span>
        </div>
      </div>
    </section>

    <div
      class="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 bg-white px-4 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
      <div class="flex gap-3">
        <TgButton
          v-for="action in statusMeta.detailActions"
          :key="action.key"
          type="button"
          :variant="action.variant === 'primary' ? 'primary' : 'outline'"
          :class="[
            '!h-12 !min-h-0 flex-1 !rounded-[4px] !text-4 !font-700',
            action.variant === 'outline' && '!bg-white !text-[color:var(--app-on-light)]',
          ]"
          @click="handleDetailAction(action.key)">
          {{ t(action.labelKey) }}
        </TgButton>
      </div>
    </div>
  </div>
</template>
