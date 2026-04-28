<script setup lang="ts">
/** Tab「金额」：总价、币种与提交结果/错误展示 */
import TgSelect from '@/components/TgSelect.vue'
import { t } from '@/i18n/uiI18n'
import { useCustomOrderContext } from '../customOrderContext'

const o = useCustomOrderContext()
</script>

<template>
  <div class="outline-none">
    <div class="space-y-4 px-4 py-6">
      <div class="text-4 font-700">{{ t('customOrder.amountTitle') }}</div>
      <div class="text-3 text-[#9CA3AF]">{{ t('customOrder.amountHint') }}</div>
      <div class="space-y-3 rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div>
          <div class="mb-2 text-3.5 font-600">{{ t('customOrder.total') }} <span class="text-[#EF4444]">*</span></div>
          <input
            v-model="o.amountForm.basePrice"
            type="text"
            inputmode="decimal"
            :placeholder="t('customOrder.numberPh')"
            class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
        </div>
        <div>
          <div class="mb-2 text-3.5 font-600">{{ t('customOrder.currency') }} <span class="text-[#EF4444]">*</span></div>
          <TgSelect v-model="o.amountForm.currency" :options="o.currencyOptions" :searchable="false" :placeholder="t('common.pleaseSelect')" />
        </div>
      </div>
      <div v-if="o.orderSubmitError" class="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-3.5 text-[#B91C1C]">
        {{ o.orderSubmitError }}
      </div>
    </div>
  </div>
</template>
