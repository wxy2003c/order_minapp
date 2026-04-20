<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

const model = defineModel<File | null>({ default: null })

const props = withDefaults(
  defineProps<{
    ariaLabel?: string
    accept?: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    ariaLabel: 'Upload image',
    accept: 'image/*',
    size: 'md',
  },
)

const inputRef = ref<HTMLInputElement | null>(null)
const previewUrl = ref('')

const wrapperClass = computed(() => [
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#D9DDE5] bg-[#CFCFD2] text-[#2A2C33] transition active:scale-[0.98]',
  props.size === 'sm' && 'h-20 w-20',
  props.size === 'md' && 'h-24 w-24',
  props.size === 'lg' && 'h-28 w-28',
])

function revokePreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

watch(
  model,
  (file) => {
    revokePreview()

    if (file) {
      previewUrl.value = URL.createObjectURL(file)
    }
  },
  { immediate: true },
)

function openPicker() {
  inputRef.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] ?? null

  model.value = file

  if (!file) {
    target.value = ''
  }
}

function clearFile() {
  model.value = null

  if (inputRef.value) {
    inputRef.value.value = ''
  }
}

onBeforeUnmount(() => {
  revokePreview()
})
</script>

<template>
  <div class="inline-flex flex-col">
    <input
      ref="inputRef"
      type="file"
      class="hidden"
      :accept="accept"
      @change="handleFileChange"
    >

    <div class="relative inline-flex">
      <button
        type="button"
        :aria-label="ariaLabel"
        :class="wrapperClass"
        @click="openPicker"
      >
        <img
          v-if="previewUrl"
          :src="previewUrl"
          alt=""
          class="h-full w-full object-cover"
        >
        <Icon v-else icon="mdi:plus" width="28" height="28" />
      </button>

      <button
        v-if="model"
        type="button"
        class="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white shadow-[0_2px_6px_rgba(0,0,0,0.18)]"
        @click="clearFile"
      >
        <Icon icon="mdi:close" width="12" height="12" />
      </button>
    </div>
  </div>
</template>
