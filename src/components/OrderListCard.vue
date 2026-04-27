<!--
 * @Author: wxy2003c 774078984@qq.com
 * @Date: 2026-04-27 10:52:22
 * @LastEditors: wxy2003c 774078984@qq.com
 * @LastEditTime: 2026-04-27 13:42:12
 * @FilePath: \vite-project\src\components\OrderListCard.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { computed } from 'vue'
import type { OrderListItem } from '@/api/orders'
import { t } from '@/i18n/uiI18n'
import {
  orderRowAvatarSrc,
  orderRowDateText,
  orderRowDisplayName,
  orderRowSpecsText,
  orderRowThumbSrc,
} from '@/utils/orderListCardDisplay'

const props = defineProps<{
  row: OrderListItem
  /** 列表页 `li`、个人中心 `article` 等 */
  as?: 'li' | 'article' | 'div'
}>()

const emit = defineEmits<{
  click: [row: OrderListItem]
}>()

const rootTag = computed(() => props.as ?? 'div')

const specsText = computed(() => orderRowSpecsText(props.row))

function structureLabel(row: OrderListItem): string {
  const raw = String((row.specs as Record<string, unknown> | undefined)?.['结构'] ?? '').trim()
  if (!raw) return '—'
  if (raw.includes('双片')) return t('orderStructure.two_piece')
  if (raw.includes('三片')) return t('orderStructure.three_piece')
  if (raw.includes('越野')) return t('orderStructure.off_road')
  if (raw.includes('单片')) return t('orderStructure.one_piece')
  return raw
}

function onClick() {
  emit('click', props.row)
}
</script>

<template>
  <component
    :is="rootTag"
    class="relative cursor-pointer overflow-hidden rounded-2xl border border-[#ECECF0] bg-white p-3.5 text-[#111827] shadow-sm active:opacity-95"
    @click="onClick">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1 text-3.25 leading-snug">
        <span class="font-600">{{ structureLabel(row) }}</span>
        <span class="ml-1.5 text-[#9CA3AF]">{{ row.order_no }}</span>
      </div>
      <span
        class="shrink-0 rounded-md bg-[#F3F4F6] px-2.5 py-1 text-2.75 leading-none text-[#6B7280]">
        {{ row.status_label || row.status }}
      </span>
    </div>
    <div class="mt-3 flex gap-3">
      <div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#ECECEF]">
        <img
          v-if="orderRowThumbSrc(row)"
          :src="orderRowThumbSrc(row) || undefined"
          class="h-full w-full object-cover"
          alt="">
      </div>
      <div class="min-w-0 flex-1 self-center">
        <p class="line-clamp-2 text-3.5 font-700">
          {{ row.car || '—' }}
        </p>
        <p
          v-if="specsText"
          class="mt-1 min-w-0 line-clamp-2 break-words text-3 text-[#9CA3AF]">
          {{ specsText }}
        </p>
      </div>
    </div>
    <div class="mt-3 border-t border-[#F0F0F0] pt-2.5">
      <div class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <div class="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#E5E7EB]">
            <img
              v-if="orderRowAvatarSrc(row)"
              :src="orderRowAvatarSrc(row) || undefined"
              class="h-full w-full object-cover"
              alt="">
          </div>
          <span class="truncate text-3">{{ orderRowDisplayName(row) }}</span>
        </div>
        <time class="shrink-0 text-2.75 text-[#9CA3AF]">{{ orderRowDateText(row) }}</time>
      </div>
    </div>
  </component>
</template>
