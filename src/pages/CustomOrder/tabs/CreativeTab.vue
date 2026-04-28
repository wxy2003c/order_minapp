<script setup lang="ts">
/**
 * Tab「设计」：设计模式 / 结构、型号库、色卡轮色、自定义上传与特殊说明。
 */
import { Icon } from '@iconify/vue'
import TgButton from '@/components/TgButton.vue'
import TgFilepond from '@/components/TgFilepond.vue'
import { t } from '@/i18n/uiI18n'
import { useCustomOrderContext } from '../customOrderContext'

const o = useCustomOrderContext()
</script>

<template>
  <div class="outline-none">
    <div class="space-y-4 px-4 py-4">
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="item in o.designModeOptions"
          :key="item.id"
          type="button"
          class="rounded-2xl border px-4 py-5 text-left transition"
          :class="o.creativeForm.designMode === item.id ? 'border-[#88AEE4] bg-[#EFF5FF] shadow-[inset_0_0_0_1px_rgba(136,174,228,0.25)]' : 'border-[#ECECEC] bg-white'"
          @click="o.handelOutline(item, 0)">
          <Icon :icon="item.icon" width="22" height="22" class="text-[#6B7280]" />
          <div class="mt-4 text-4 font-700">{{ item.title }}</div>
        </button>
      </div>

      <div>
        <div class="mb-3 text-4 font-700">
          {{ t('customOrder.structure') }} <span class="text-[#EF4444]">*</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="item in o.structureValues"
            :key="item"
            type="button"
            class="rounded-2xl border px-4 py-5 text-left text-4 font-700 transition"
            :class="o.creativeForm.structure === item ? 'border-[#88AEE4] bg-[#EFF5FF] text-[#1F2937]' : 'border-[#ECECEC] bg-white text-[#4B5563]'"
            @click="o.handelOutline(item, 1)">
            {{ o.structureLabel(item) }}
          </button>
        </div>
      </div>

      <template v-if="o.creativeForm.designMode === 'creative'">
        <div>
          <div class="mb-2 text-4 font-700">{{ t('customOrder.wheelStyleSection') }}</div>

          <div
            v-if="!o.creativeForm.selectedStyleModel"
            class="rounded-2xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-5">
            <p class="text-center text-3 text-[#9CA3AF] leading-relaxed">
              {{ o.creativeForm.structure ? t('customOrder.wheelStylePickHint') : t('customOrder.wheelStyleNeedStructure') }}
            </p>
            <TgButton block class="mt-4" variant="primary" type="button" :disabled="!o.creativeForm.structure" @click="o.openStyleModelDrawer">
              {{ t('customOrder.wheelStyleChoose') }}
            </TgButton>
          </div>

          <div v-else class="flex items-stretch gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3">
            <div
              v-if="o.styleModelCoverUrl(o.creativeForm.selectedStyleModel.cover_image)"
              class="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#111827]">
              <img :src="o.styleModelCoverUrl(o.creativeForm.selectedStyleModel.cover_image)" class="h-full w-full object-cover" alt="">
            </div>
            <div class="min-w-0 flex-1 py-0.5">
              <div class="text-3.75 font-700 text-[#4478C8]">{{ o.creativeForm.selectedStyleModel.style_no }}</div>
              <div class="mt-0.5 text-3 text-[#6B7280]">
                {{ o.creativeForm.selectedStyleModel.structure_type }} / {{ o.creativeForm.selectedStyleModel.style_name }}
              </div>
              <div
                v-if="o.creativeForm.selectedStyleModel.style_tags?.length"
                class="mt-1 line-clamp-2 text-2.75 text-[#9CA3AF]">
                {{ o.creativeForm.selectedStyleModel.style_tags.join(' · ') }}
              </div>
            </div>
            <button type="button" class="shrink-0 self-center px-2 text-3 font-600 text-[#4478C8] active:opacity-70" @click="o.openStyleModelDrawer">
              {{ t('customOrder.reselect') }}
            </button>
          </div>
        </div>

        <div>
          <div class="text-4 font-700">{{ t('customOrder.wheelColor') }}</div>
          <div class="mt-4 overflow-hidden rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div v-if="o.selectedFinishPreview?.image_url" class="h-42 w-full overflow-hidden bg-[#F3F4F6]">
              <img :src="o.selectedFinishPreview.image_url" class="h-full w-full object-contain" alt="">
            </div>
            <div v-else class="h-42 w-full">
              <img
                src="@/assets/vue.svg"
                class="h-full w-full object-contain opacity-80"
                alt=""
                v-if="o.creativeForm.structure !== '越野'">
            </div>
            <div
              v-if="o.finishCardLoadError"
              class="mt-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-2 py-1.5 text-3 text-[#B91C1C]">
              {{ o.finishCardLoadError }}
            </div>
            <div v-else-if="o.finishCardLoading" class="mt-2 text-center text-3 text-[#9CA3AF]">
              {{ t('common.loading') }}
            </div>
            <div class="mt-4 flex flex-wrap justify-around gap-3 text-3 text-[#6B7280]">
              <button
                v-for="(g, i) in o.groupsWithItems"
                :key="`${g.sort}-${g.section_name}`"
                type="button"
                class="border-b pb-1"
                :class="o.selectedFinishGroupIndex === i ? 'border-[#2A2C33] text-[#111827]' : 'border-transparent'"
                :disabled="o.finishCardLoading"
                @click="o.selectFinishGroup(i)">
                {{ o.finishSectionLabel(g) }}
              </button>
            </div>
            <div class="mt-4 text-center text-4 font-700">
              {{ t('customOrder.sampleName') }}
            </div>
            <div class="mt-4 flex max-h-50 flex-wrap items-center justify-center gap-3 overflow-y-auto">
              <button
                v-for="item in o.currentFinishItems"
                :key="item.id"
                type="button"
                class="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border transition"
                :class="o.creativeForm.finishCardId === item.id
                  ? 'border-[#2A2C33] shadow-[0_0_0_3px_white,0_0_0_4px_#2A2C33]' : 'border-[#D1D5DB]'"
                :disabled="o.finishCardLoading"
                :title="o.finishItemDisplayLabel(item)"
                @click="o.applyFinishSelection(item)">
                <img v-if="item.image_url" :src="item.image_url" class="h-full w-full object-cover" alt="">
                <span v-else class="flex h-full w-full items-center justify-center bg-[#E5E7EB] text-2.5 text-[#6B7280]">
                  {{ item.code.length > 4 ? item.code.slice(0, 4) : item.code }}
                </span>
              </button>
            </div>
            <p v-if="!o.finishCardLoading && !o.currentFinishItems.length" class="mt-2 text-center text-3 text-[#9CA3AF]">
              {{ t('customOrder.emptyFinishSwatches') }}
            </p>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="space-y-4">
          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.wheelShape') }}</div>
            <div class="w-26 h-26">
              <TgFilepond
                v-model="o.creativeForm.wheelShapeFile"
                v-model:uploaded-url="o.creativeForm.wheelShapeUrl"
                :upload-form-fields="{ scene: 'orders' }"
                accept="image/*"
                aria-label="upload wheel shape" />
            </div>
          </div>

          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.wheelShapeDesc') }}</div>
            <input v-model="o.creativeForm.wheelShapeNote" type="text" class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
          </div>

          <div class="border-t border-[#F1F3F5] pt-4">
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.wheelLip') }}</div>
            <div class="w-26 h-26">
              <TgFilepond
                v-model="o.creativeForm.wheelLipFile"
                v-model:uploaded-url="o.creativeForm.wheelLipUrl"
                :upload-form-fields="{ scene: 'orders' }"
                accept="image/*"
                aria-label="upload wheel lip" />
            </div>
          </div>

          <div>
            <div class="mb-2 text-3.5 font-600">{{ t('customOrder.wheelColorDesc') }}</div>
            <input v-model="o.creativeForm.wheelColorNote" type="text" class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
          </div>
        </div>
      </template>

      <div class="mt-4 flex flex-col gap-4">
        <div class="border-t border-[#F1F3F5] pt-4">
          <div class="mb-2 text-3.5 font-600">{{ t('customOrder.centerCap') }}</div>
          <div class="w-26 h-26">
            <TgFilepond
              v-model="o.creativeForm.centerCapFile"
              v-model:uploaded-url="o.creativeForm.centerCapUrl"
              :upload-form-fields="{ scene: 'orders' }"
              accept="image/*"
              aria-label="upload center cap" />
          </div>
        </div>

        <div>
          <div class="mb-2 text-3.5 font-600">{{ t('customOrder.centerCapDesc') }}</div>
          <input v-model="o.creativeForm.centerCapNote" type="text" class="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-3.5 outline-none">
        </div>

        <div>
          <div class="mb-2 text-3.5 font-600">{{ t('customOrder.special') }}</div>
          <textarea
            v-model="o.creativeForm.specialRequest"
            rows="4"
            :placeholder="t('customOrder.specialPh')"
            class="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-3.5 outline-none placeholder:text-[#B6BBC5]" />
        </div>
      </div>
    </div>
  </div>
</template>
