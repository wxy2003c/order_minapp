<script setup lang="ts">
withDefaults(defineProps<{
  count?: number
  tone?: 'light' | 'dark'
  imageClass?: string
  rows?: number
}>(), {
  count: 4,
  tone: 'light',
  imageClass: 'h-48 rounded-2xl',
  rows: 2,
})
</script>

<template>
  <div
    class="tg-list-skeleton"
    :class="tone === 'dark' ? 'tg-list-skeleton--dark' : 'tg-list-skeleton--light'"
  >
    <div v-for="n in count" :key="n" class="tg-list-skeleton-item">
      <div class="tg-skeleton w-full" :class="imageClass" />
      <div class="mt-3 space-y-2">
        <div v-if="rows >= 1" class="tg-skeleton h-4 w-2/5 rounded-full" />
        <div v-if="rows >= 2" class="tg-skeleton h-3 w-3/5 rounded-full" />
        <div v-if="rows >= 3" class="tg-skeleton h-3 w-1/3 rounded-full" />
      </div>
    </div>
  </div>
</template>
