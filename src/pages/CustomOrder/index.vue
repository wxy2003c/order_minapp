<script setup lang="ts">
/**
 * CustomOrder 根：挂载滚动容器 ref、拉起整页逻辑（`useCustomOrderSetup`），模板只保留顶栏/四 Tab shell/Modal/抽屉/底部操作条。
 */
import { ref } from "vue";
import { t } from "@/i18n/uiI18n";
import StyleModelPickerDrawer from "@/components/StyleModelPickerDrawer.vue";
import TgButton from "@/components/TgButton.vue";
import AmountTab from "./tabs/AmountTab.vue";
import AddressTab from "./tabs/AddressTab.vue";
import CreativeTab from "./tabs/CreativeTab.vue";
import VehicleTab from "./tabs/VehicleTab.vue";
import { useCustomOrderSetup } from "./useCustomOrderSetup";
import type { CustomOrderPageInstance } from "./customOrderContext";

const pageRoot = ref<HTMLElement | null>(null);
const o: CustomOrderPageInstance = useCustomOrderSetup(pageRoot);
</script>

<template>
  <div ref="pageRoot" class="min-h-full w-full overflow-x-hidden overflow-y-auto bg-[#FAFAFA] pb-32 text-[#1F2937] pos-relative">
    <div v-if="o.orderEditLoading" class="py-2 text-3.25 text-[#6B7280]">
      {{ t("common.loading") }}
    </div>
    <div v-else-if="o.orderEditError" class="p y-2 text-3.25 text-[#B91C1C]">
      {{ o.orderEditError }}
    </div>
    <div class="sticky top-0 z-20 border-b border-[#ECECEC] bg-white pb-2 pt-7">
      <div class="relative mt-3 grid grid-cols-4">
        <button v-for="item in o.tabItems" :key="item.value" type="button" :class="[
          'relative py-3 text-3.5 font-600 outline-none transition-colors',
          o.activeTab === item.value ? 'text-[#111827]' : 'text-[#4B5563]',
        ]" @click="o.trySelectTab(item.value)">
          {{ item.label }}
          <span v-show="o.activeTab === item.value"
            class="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[#2A2C33]" />
        </button>
      </div>

      <VehicleTab v-show="o.activeTab === 'vehicle'" />
      <CreativeTab v-show="o.activeTab === 'creative'" />
      <AddressTab v-show="o.activeTab === 'address'" />
      <AmountTab v-show="o.activeTab === 'amount'" />
    </div>

    <NModal v-model:show="o.openOutline" preset="card" :style="{ maxWidth: 'min(90vw, 450px)' }" :mask-closable="true"
      :closable="true">
      <template #header>
        <div class="text-center text-[17px] font-semibold">
          {{ t("common.tip") }}
        </div>
      </template>
      <div class="text-sm text-[#4B5563] leading-normal">
        {{
          o.types === 0
            ? t("customOrder.outlineDesign")
            : t("customOrder.outlineStructure")
        }}
      </div>
      <template #footer>
        <div class="mt-2 flex w-full justify-between gap-3">
          <TgButton class="!min-w-0 flex-1" variant="outline" type="button" @click="o.openOutline = false">
            {{ t("common.cancel") }}
          </TgButton>
          <TgButton class="!min-w-0 flex-1" type="button" @click="o.handelSublitOutline">
            {{ t("common.confirm") }}
          </TgButton>
        </div>
      </template>
    </NModal>

    <NModal v-model:show="o.myVehiclePrefillModalOpen" preset="card" :mask-closable="true" :closable="true"
      :style="{ maxWidth: 'min(90vw, 420px)' }">
      <template #header>
        <div class="text-center text-[17px] font-semibold">
          {{ t("customOrder.myVehiclePrefillTitle") }}
        </div>
      </template>
      <div class="text-sm text-[#4B5563] leading-normal">
        {{ t("customOrder.myVehiclePrefillBody") }}
      </div>
      <template #footer>
        <div class="mt-2 flex w-full justify-between gap-3">
          <TgButton class="!min-w-0 flex-1" variant="outline" type="button" @click="o.onMyVehiclePrefillCancel">
            {{ t("common.cancel") }}
          </TgButton>
          <TgButton class="!min-w-0 flex-1" type="button" @click="o.onMyVehiclePrefillConfirm">
            {{ t("common.confirm") }}
          </TgButton>
        </div>
      </template>
    </NModal>

    <NModal v-model:show="o.postSubmitModalOpen" preset="card" :mask-closable="false" :closable="false"
      :style="{ maxWidth: 'min(90vw, 420px)' }">
      <template #header>
        <div class="text-center text-[17px] font-semibold">
          {{ t("customOrder.postSubmitTitle") }}
        </div>
      </template>
      <div class="text-sm text-[#4B5563] leading-normal">
        {{ t("customOrder.postSubmitSubtitle") }}
      </div>
      <template #footer>
        <div class="mt-3 flex w-full flex-col gap-3 sm:flex-row sm:justify-between">
          <TgButton block class="!min-h-11 flex-1" variant="outline" type="button" @click="o.onPostSubmitContinue">
            {{ t("customOrder.postSubmitContinue") }}
          </TgButton>
          <TgButton block class="!min-h-11 flex-1" type="button" variant="primary" @click="o.onPostSubmitViewDetail">
            {{ t("customOrder.postSubmitViewDetail") }}
          </TgButton>
        </div>
      </template>
    </NModal>

    <NModal v-model:show="o.continueFillClearModalOpen" preset="card" :mask-closable="false" :closable="false"
      :style="{ maxWidth: 'min(90vw, 420px)' }">
      <template #header>
        <div class="text-center text-[17px] font-semibold">
          {{ t("customOrder.continueFillClearTitle") }}
        </div>
      </template>
      <div class="text-sm text-[#4B5563] leading-normal">
        {{ t("customOrder.continueFillClearBody") }}
      </div>
      <template #footer>
        <div class="mt-3 flex w-full flex-col gap-3 sm:flex-row sm:justify-between">
          <TgButton block class="!min-h-11 flex-1" variant="outline" type="button" @click="o.onContinueFillKeepContent">
            {{ t("customOrder.continueFillKeep") }}
          </TgButton>
          <TgButton block class="!min-h-11 flex-1" type="button" variant="primary" @click="o.onContinueFillClearAll">
            {{ t("customOrder.continueFillClearAll") }}
          </TgButton>
        </div>
      </template>
    </NModal>

    <StyleModelPickerDrawer v-model:show="o.styleModelDrawerOpen" :structure-type="o.creativeForm.structure"
      @confirm="o.onStyleModelConfirm" />

    <div
      class="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-[#ECECEC] bg-white px-4 py-4">
      <div v-if="o.activeTab === 'vehicle'">
        <TgButton block @click="o.goNextFromVehicle">
          {{ t("customOrder.footVehicle") }}
        </TgButton>
      </div>

      <div v-else-if="o.activeTab === 'creative'" class="grid grid-cols-2 gap-3">
        <TgButton block variant="outline" @click="o.goBackToVehicle">
          {{ t("customOrder.footCreative1") }}
        </TgButton>
        <TgButton block variant="primary" @click="o.goFromCreativeToAddress">
          {{ t("customOrder.footCreative2") }}
        </TgButton>
      </div>

      <div v-else-if="o.activeTab === 'address'" class="grid grid-cols-2 gap-3">
        <TgButton block variant="outline" @click="o.goBackToCreative">
          {{ t("customOrder.footAddr1") }}
        </TgButton>
        <TgButton block variant="primary" @click="o.goToAmount">
          {{ t("customOrder.footAddr2") }}
        </TgButton>
      </div>

      <div v-else class="grid grid-cols-2 gap-3">
        <TgButton block variant="outline" @click="o.goBackToCreative">
          {{ t("customOrder.backEdit") }}
        </TgButton>
        <TgButton block variant="primary" :disabled="o.orderSubmitting" @click="o.submitPreorder">
          {{
            o.orderSubmitting
              ? t("common.submitting")
              : o.editOrderId
                ? t("customOrder.submitUpdate")
                : t("customOrder.submit")
          }}
        </TgButton>
      </div>
    </div>
  </div>
</template>
