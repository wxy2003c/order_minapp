<script setup lang="ts">
import { NSwitch } from 'naive-ui'

const model = defineModel<boolean>({ default: false })

withDefaults(
  defineProps<{
    disabled?: boolean
  }>(),
  { disabled: false },
)
</script>

<template>
  <NSwitch
    v-model:value="model"
    :disabled="disabled"
    :rail-style="() => ({ background: model ? 'var(--tg-theme-button-color)' : undefined })"
  />
</template>
