<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

const props = withDefaults(defineProps<{
  src?: string | null
  alt?: string
  imgClass?: string
  placeholderClass?: string
}>(), {
  alt: '',
  imgClass: '',
  placeholderClass: '',
})

const loaded = ref(false)
const failed = ref(false)

watch(
  () => props.src,
  () => {
    loaded.value = false
    failed.value = false
  },
)
</script>

<template>
  <div class="relative h-full w-full overflow-hidden">
    <div
      v-if="!src || !loaded || failed"
      class="tg-skeleton absolute inset-0 flex items-center justify-center"
      :class="placeholderClass"
    >
      <Icon v-if="!src || failed" icon="mdi:image-outline" width="42" height="42" class="opacity-30" />
    </div>
    <img
      v-if="src && !failed"
      :src="src"
      :alt="alt"
      class="h-full w-full object-cover transition-opacity duration-200"
      :class="[imgClass, loaded ? 'opacity-100' : 'opacity-0']"
      loading="lazy"
      decoding="async"
      @load="loaded = true"
      @error="failed = true"
    >
  </div>
</template>
