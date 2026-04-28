<script setup lang="ts">
/** Tab「地址」：收件人、国家、详细地址与优惠券/备注 */
import TgSelect from '@/components/TgSelect.vue'
import { t } from '@/i18n/uiI18n'
import { useCustomOrderContext } from '../customOrderContext'

const o = useCustomOrderContext()
</script>

<template>
  <div class="outline-none">
    <div class="space-y-3 px-4 py-4">
      <div>
        <div class="mb-2 text-3.5 font-600">{{ t('customOrder.name') }}</div>
        <input
          v-model="o.addressForm.name"
          type="text"
          :placeholder="t('common.pleaseEnter')"
          class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
      </div>
      <div>
        <div class="mb-2 text-3.5 font-600">{{ t('customOrder.phone') }}</div>
        <input
          v-model="o.addressForm.phone"
          type="text"
          :placeholder="t('common.pleaseEnter')"
          class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
      </div>
      <div>
        <div class="mb-2 text-3.5 font-600">{{ t('customOrder.email') }}</div>
        <input
          v-model="o.addressForm.email"
          type="text"
          :placeholder="t('common.pleaseEnter')"
          class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
      </div>
      <div>
        <div class="mb-2 text-3.5 font-600">{{ t('customOrder.country') }}</div>
        <TgSelect v-model="o.addressForm.country" :options="o.countryOptions" :searchable="false" placeholder="Russia" />
      </div>
      <div>
        <div class="mb-2 text-3.5 font-600">{{ t('customOrder.shipAddr') }}</div>
        <textarea
          v-model="o.addressForm.address"
          rows="4"
          :placeholder="t('common.pleaseEnter')"
          class="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-3.5 outline-none placeholder:text-[#B6BBC5]" />
      </div>
      <div>
        <div class="mb-2 text-3.5 font-600">{{ t('customOrder.coupon') }}</div>
        <input
          v-model="o.addressForm.coupon"
          type="text"
          :placeholder="t('common.pleaseEnter')"
          class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
      </div>
      <div>
        <div class="mb-2 text-3.5 font-600">{{ t('customOrder.remark') }}</div>
        <textarea
          v-model="o.addressForm.remark"
          rows="4"
          :placeholder="t('common.pleaseEnter')"
          class="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-3.5 outline-none placeholder:text-[#B6BBC5]" />
      </div>
    </div>
  </div>
</template>
