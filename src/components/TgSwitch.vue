<script setup lang="ts">
const model = defineModel<boolean>()

const props = withDefaults(
  defineProps<{
    disabled?: boolean
  }>(),
  { disabled: false }
)
</script>

<template>
  <div role="switch" :aria-checked="model" :disabled="disabled" :class="[
    'relative h-6 w-11 rounded-full cursor-pointer transition-colors duration-200',
    model ? 'bg-blue-500' : 'bg-gray-300',
    disabled ? 'opacity-50 cursor-not-allowed' : ''
  ]" @click="model = !model">
    <div :class="[
      'absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform duration-200',
      model ? 'translate-x-5' : 'translate-x-0'
    ]" />
  </div>
</template>