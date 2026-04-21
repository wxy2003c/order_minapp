<script setup lang="ts">
import { computed } from 'vue'
import { carGroups, type CarGroup } from '@/data/carSelection'

interface Props {
  groups?: CarGroup[]
  brand: string
  model: string
  year: string
}

const props = withDefaults(defineProps<Props>(), {
  groups: () => carGroups,
})

const emit = defineEmits<{
  'update:brand': [value: string]
  'update:model': [value: string]
  'update:year': [value: string]
}>()

const activeCarGroup = computed(
  () => props.groups.find(item => item.brand === props.brand) ?? props.groups[0],
)

function handleBrandSelect(brand: string) {
  const target = props.groups.find(item => item.brand === brand)

  if (!target) return

  emit('update:brand', target.brand)
  emit('update:model', target.models[0] ?? '')
  emit('update:year', target.years[0] ?? '')
}
</script>

<template>
  <div class="grid max-h-[24rem] grid-cols-3 overflow-hidden rounded-[20px] bg-white text-[#242730]">
    <div class="border-r border-[#ececf0]">
      <div class="border-b border-[#ececf0] px-5 py-4 text-3.5 font-600 text-[#6b7280]">
        品牌
      </div>
      <div class="max-h-[20rem] overflow-y-auto py-2">
        <button
          v-for="item in props.groups"
          :key="item.brand"
          type="button"
          class="mx-2 mb-1 flex w-[calc(100%-1rem)] items-center rounded-xl px-3 py-3 text-left text-3.5 transition"
          :class="brand === item.brand ? 'bg-[#242730] text-white' : 'text-[#303441] hover:bg-[#f4f5f7]'"
          @click="handleBrandSelect(item.brand)"
        >
          <span class="truncate">{{ item.brand }}</span>
        </button>
      </div>
    </div>

    <div class="border-r border-[#ececf0]">
      <div class="border-b border-[#ececf0] px-5 py-4 text-3.5 font-600 text-[#6b7280]">
        型号
      </div>
      <div class="max-h-[20rem] overflow-y-auto py-2">
        <button
          v-for="item in activeCarGroup.models"
          :key="item"
          type="button"
          class="mx-2 mb-1 flex w-[calc(100%-1rem)] items-center rounded-xl px-3 py-3 text-left text-3.5 transition"
          :class="model === item ? 'bg-[#242730] text-white' : 'text-[#303441] hover:bg-[#f4f5f7]'"
          @click="emit('update:model', item)"
        >
          <span class="truncate">{{ item }}</span>
        </button>
      </div>
    </div>

    <div>
      <div class="border-b border-[#ececf0] px-5 py-4 text-3.5 font-600 text-[#6b7280]">
        年份
      </div>
      <div class="max-h-[20rem] overflow-y-auto py-2">
        <button
          v-for="item in activeCarGroup.years"
          :key="item"
          type="button"
          class="mx-2 mb-1 flex w-[calc(100%-1rem)] items-center rounded-xl px-3 py-3 text-left text-3.5 transition"
          :class="year === item ? 'bg-[#242730] text-white' : 'text-[#303441] hover:bg-[#f4f5f7]'"
          @click="emit('update:year', item)"
        >
          <span class="truncate">{{ item }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
