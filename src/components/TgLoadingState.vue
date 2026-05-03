<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
  actionLabel?: string
  tone?: 'light' | 'dark'
  compact?: boolean
  spinning?: boolean
}>(), {
  tone: 'light',
  compact: false,
  spinning: false,
})

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div
    class="tg-state"
    :class="[
      tone === 'dark' ? 'tg-state--dark' : 'tg-state--light',
      compact ? 'tg-state--compact' : '',
    ]"
  >
    <div v-if="spinning" class="tg-spinner" aria-hidden="true" />
    <div v-else class="tg-state-dot" aria-hidden="true" />
    <div v-if="title" class="tg-state-title">{{ title }}</div>
    <div v-if="description" class="tg-state-desc">{{ description }}</div>
    <button
      v-if="actionLabel"
      type="button"
      class="tg-state-action"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
