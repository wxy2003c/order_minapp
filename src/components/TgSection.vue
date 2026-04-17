<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <section class="tg-section">
    <div class="tg-section-head">
      <p class="tg-section-title">{{ title }}</p>
      <p v-if="description" class="tg-section-caption">{{ description }}</p>
    </div>

    <div v-if="$slots.default" class="tg-section-body">
      <slot />
    </div>
  </section>
</template>
