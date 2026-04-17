<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    value?: string
    as?: 'div' | 'button'
    danger?: boolean
  }>(),
  {
    description: '',
    value: '',
    as: 'div',
    danger: false,
  },
)

const className = computed(() => [
  'tg-cell',
  {
    'tg-cell--button': props.as === 'button',
    'tg-cell--danger': props.danger,
  },
])
</script>

<template>
  <component :is="as" :class="className">
    <div class="tg-cell-copy">
      <p class="tg-cell-title">{{ title }}</p>
      <p v-if="description" class="tg-cell-description">{{ description }}</p>
    </div>

    <div v-if="$slots.end || value" class="tg-cell-end">
      <slot name="end">
        <span class="tg-cell-value">{{ value }}</span>
      </slot>
    </div>
  </component>
</template>
