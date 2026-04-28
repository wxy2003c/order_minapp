<script setup lang="ts">
/**
 * Tab「车辆」：客户信息、Wheel-Size 或静态车型、可选展开项、前后轮规格表。
 * 数据与 handler 均来自 `useCustomOrderContext()`（由根页 provide）。
 */
import { Icon } from '@iconify/vue'
import TgSelect from '@/components/TgSelect.vue'
import TgSwitch from '@/components/TgSwitch.vue'
import { t } from '@/i18n/uiI18n'
import { useCustomOrderContext } from '../customOrderContext'

const o = useCustomOrderContext()
</script>

<template>
  <div class="outline-none">
    <div class="space-y-4 px-4 py-4">
      <div class="space-y-3">
        <div>
          <div class="mb-2 text-3.5 font-600">{{ t('customOrder.customerName') }}</div>
          <input
            v-model="o.vehicleForm.customerName"
            type="text"
            class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
        </div>
        <div>
          <div class="mb-2 text-3.5 font-600">{{ t('customOrder.customerId') }}</div>
          <input
            v-model="o.vehicleForm.customerId"
            type="text"
            class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
        </div>
      </div>

      <div class="overflow-hidden rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <img src="@/assets/vue.svg" class="h-34 w-full object-contain" alt="">
      </div>

      <div>
        <div class="text-4 font-700">{{ t('customOrder.selectVehicle') }}</div>
        <div class="mt-1 text-3 text-[#9CA3AF]">{{ t('customOrder.vehicleHint') }}</div>
      </div>

      <div class="space-y-3">
        <template v-if="o.wheelSizeEnabled">
          <div
            v-if="o.wsErrorKey"
            class="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-3.25 text-[#B91C1C]">
            {{ o.wsErrorKey ? t(o.wsErrorKey) : '' }}
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.brand') }} <span class="text-[#EF4444]">*</span></div>
            <TgSelect
              :key="`ws-make-${o.wsBrandOptions.length}`"
              :model-value="o.vehicleForm.brand"
              :options="o.wsBrandOptions"
              :searchable="true"
              :disabled="o.wsLoadingStage === 0"
              :placeholder="o.wsLoadingStage === 0 ? t('common.loading') : t('customOrder.phSelectBrand')"
              @update:model-value="o.onWheelBrandChange" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.model') }} <span class="text-[#EF4444]">*</span></div>
            <TgSelect
              :key="`ws-model-${o.wsModelOptions.length}`"
              :model-value="o.vehicleForm.model"
              :options="o.wsModelOptions"
              :searchable="true"
              :disabled="!o.vehicleForm.brand || o.wsLoadingStage === 1"
              :placeholder="!o.vehicleForm.brand ? t('common.selectBrandFirst') : o.wsLoadingStage === 1 ? t('common.loading') : t('customOrder.phSelectModel')"
              @update:model-value="o.onWheelModelChange" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.generation') }} <span class="text-[#EF4444]">*</span></div>
            <TgSelect
              :key="`ws-gen-${o.wsGenOptions.length}`"
              :model-value="o.vehicleForm.wheelGeneration"
              :options="o.wsGenOptions"
              :searchable="true"
              :disabled="!o.vehicleForm.model || o.wsLoadingStage === 2"
              :placeholder="!o.vehicleForm.model ? t('common.selectModelFirst') : o.wsLoadingStage === 2 ? t('common.loading') : t('customOrder.phSelectGen')"
              @update:model-value="o.onWheelGenerationChange" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.year') }} <span class="text-[#EF4444]">*</span></div>
            <TgSelect
              :key="`ws-year-${o.wsYearOptions.length}`"
              :model-value="o.vehicleForm.wheelYear"
              :options="o.wsYearOptions"
              :searchable="false"
              :disabled="!o.vehicleForm.wheelGeneration || o.wsLoadingStage === 3"
              :placeholder="!o.vehicleForm.wheelGeneration ? t('common.selectGenFirst') : o.wsLoadingStage === 3 ? t('common.loading') : t('customOrder.phSelectYear')"
              @update:model-value="o.onWheelYearChange" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.modification') }} <span class="text-[#EF4444]">*</span></div>
            <TgSelect
              :key="`ws-mod-${o.wsModOptions.length}`"
              :model-value="o.vehicleForm.wheelModification"
              :options="o.wsModOptions"
              :searchable="true"
              :disabled="!o.vehicleForm.wheelYear || o.wsLoadingStage === 4"
              :placeholder="!o.vehicleForm.wheelYear ? t('common.selectYearFirst') : o.wsLoadingStage === 4 ? t('common.loading') : t('customOrder.phSelectMod')"
              @update:model-value="o.onWheelModificationChange" />
          </div>
        </template>
        <template v-else>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.brand') }} <span class="text-[#EF4444]">*</span></div>
            <TgSelect v-model="o.vehicleForm.brand" :options="o.staticBrandOptions" :searchable="false" placeholder="Audi" />
          </div>
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.model') }} <span class="text-[#EF4444]">*</span></div>
            <TgSelect
              v-model="o.vehicleForm.model"
              :options="o.staticModelOptions"
              :searchable="false"
              :placeholder="t('customOrder.phSelectModelStatic')" />
          </div>
        </template>
        <div>
          <div class="mb-2 text-3.5 font-600">{{ t('customOrder.brakeDisc') }}</div>
          <input
            v-model="o.vehicleForm.brakeDisc"
            type="text"
            :placeholder="t('customOrder.brakeDiscPh')"
            class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
        </div>
      </div>

      <div v-if="o.vehicleExpanded" class="space-y-3">
        <div>
          <div class="mb-2 text-3.5 font-600">{{ t('customOrder.vin') }}</div>
          <input
            v-model="o.vehicleForm.vin"
            type="text"
            :placeholder="t('common.pleaseEnter')"
            class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
        </div>
        <div>
          <div class="mb-2 text-3.5 font-600">{{ t('customOrder.chassis') }}</div>
          <input
            v-model="o.vehicleForm.plate"
            type="text"
            :placeholder="t('customOrder.platePlaceholder')"
            class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
        </div>
        <div>
          <div class="mb-2 text-3.5 font-600">{{ t('customOrder.caliper') }}</div>
          <input
            v-model="o.vehicleForm.rimThickness"
            type="text"
            :placeholder="t('customOrder.caliperPh')"
            class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
        </div>
      </div>

      <button
        type="button"
        class="mx-auto flex items-center gap-1 text-3.5 font-600 text-[#3487FF]"
        @click="o.vehicleExpanded = !o.vehicleExpanded">
        <Icon :icon="o.vehicleExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'" color="#3487FF" width="16" height="16" />
        <span>{{ o.vehicleExpanded ? t('common.collapse') : t('common.expand') }}</span>
      </button>

      <div class="flex items-center gap-2">
        <TgSwitch v-model="o.vehicleForm.mirrorPair" aria-label="toggle same wheel config" />
        <div class="text-3.5 font-600">{{ t('customOrder.sameFrontRear') }}</div>
      </div>

      <div class="space-y-3">
        <div class="text-4 font-700">{{ t('customOrder.front') }}</div>
        <div v-for="field in o.frontWheelFields" :key="field.key">
          <div class="mb-2 text-3.5 font-600">
            {{ field.label }} <span v-if="o.isRequiredWheelFieldKey(field.key)" class="text-[#EF4444]">*</span>
          </div>

          <TgSelect
            v-if="field.type === 'select'"
            v-model="(o.vehicleForm as unknown as Record<string, string | number>)[field.key]"
            :options="field.options"
            :searchable="false"
            :placeholder="field.placeholder" />

          <div v-else-if="field.type === 'pcd'" class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <input v-model="o.vehicleForm.frontPcdLeft" type="text" class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
            <span class="text-4 text-[#6B7280]">x</span>
            <input v-model="o.vehicleForm.frontPcdRight" type="text" class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
          </div>

          <input
            v-else
            v-model="o.vehicleForm[field.key as keyof typeof o.vehicleForm]"
            type="text"
            :placeholder="field.placeholder"
            class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
        </div>
      </div>

      <div v-if="!o.vehicleForm.mirrorPair" class="space-y-3">
        <div class="border-t border-dashed border-[#E5E7EB] pt-4 text-4 font-700">{{ t('customOrder.rear') }}</div>
        <div v-for="field in o.rearWheelFields" :key="field.key">
          <div class="mb-2 text-3.5 font-600">
            {{ field.label }} <span v-if="o.isRequiredWheelFieldKey(field.key)" class="text-[#EF4444]">*</span>
          </div>

          <TgSelect
            v-if="field.type === 'select'"
            v-model="(o.vehicleForm as unknown as Record<string, string | number>)[field.key]"
            :options="field.options"
            :searchable="false"
            :placeholder="field.placeholder" />

          <div v-else-if="field.type === 'pcd'" class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <input v-model="o.vehicleForm.rearPcdLeft" type="text" class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
            <span class="text-4 text-[#6B7280]">x</span>
            <input v-model="o.vehicleForm.rearPcdRight" type="text" class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
          </div>

          <input
            v-else
            v-model="o.vehicleForm[field.key as keyof typeof o.vehicleForm] "
            type="text"
            :placeholder="field.placeholder"
            class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none placeholder:text-[#B6BBC5]">
        </div>
      </div>
    </div>
  </div>
</template>
