<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'

const model = defineModel<boolean>({ default: false })

withDefaults(
  defineProps<{
    ariaLabel?: string
    disabled?: boolean
  }>(),
  {
    ariaLabel: 'Toggle setting',
    disabled: false,
  },
)
</script>

<template>
  <SwitchRoot
    v-model="model"
    class="tg-switch"
    :aria-label="ariaLabel"
    :disabled="disabled"
  >
    <SwitchThumb class="tg-switch-thumb" />
  </SwitchRoot>
</template>
