<template>
  <section class="tg-card overflow-hidden p-0 relative">
    <div class="embla relative" @mouseenter="stopAutoplay" @mouseleave="startAutoplay">
      <div ref="emblaRef" class="overflow-hidden">
        <div class="flex">
          <div
            v-for="item in items"
            :key="item.id"
            class="min-w-0 flex-[0_0_100%] bg-black"
          >
            <div class="relative h-45 w-full overflow-hidden bg-[linear-gradient(135deg,var(--app-accent-soft),var(--app-surface))]">
              <img
                v-if="resolveImg(item.effect_image)"
                :src="resolveImg(item.effect_image)!"
                :alt="item.style_name"
                class="h-full w-full object-cover"
              />
              <div v-else class="flex h-full w-full flex-col justify-end px-5 py-5">
                <p class="text-4 font-700 text-tg-text">{{ item.style_name }}</p>
                <p class="mt-1 text-3 text-tg-subtitle">{{ item.style_no }}</p>
              </div>
              <!-- 渐变遮罩 + 型号文字 -->
              <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-6">
                <p class="text-3.5 font-600 text-white">{{ item.style_name }}</p>
                <p class="text-2.75 text-white/70">{{ item.style_no }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 z-10">
        <button
          v-for="(_, index) in items"
          :key="index"
          type="button"
          class="h-2 rounded-full transition-all duration-300 bg-white"
          :class="currentIndex === index ? 'w-5' : 'w-2'"
          @click="emblaApi?.scrollTo(index)"
        />
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import useEmblaCarousel from 'embla-carousel-vue'
import { resolveOrderAssetUrl } from '@/utils/orderMedia'
import type { HomeStyleModelItem } from '@/api/rolesApi'

const props = withDefaults(
  defineProps<{ items?: HomeStyleModelItem[] }>(),
  { items: () => [] },
)

function resolveImg(path: string | null | undefined): string | null {
  return resolveOrderAssetUrl(path)
}

const currentIndex = ref(0)
const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
void emblaRef

let autoplayTimer: ReturnType<typeof setInterval> | null = null

function stopAutoplay() {
  if (autoplayTimer !== null) {
    clearInterval(autoplayTimer)
    autoplayTimer = null
  }
}

function startAutoplay() {
  stopAutoplay()
  if (!emblaApi.value) return
  autoplayTimer = setInterval(() => emblaApi.value?.scrollNext(), 3000)
}

function syncCurrentIndex() {
  if (!emblaApi.value) return
  currentIndex.value = emblaApi.value.selectedScrollSnap()
}

watch(
  emblaApi,
  (api, previousApi) => {
    previousApi?.off('select', syncCurrentIndex)
    if (!api) return
    syncCurrentIndex()
    api.on('select', syncCurrentIndex)
    startAutoplay()
  },
  { immediate: true },
)

watch(
  () => props.items.length,
  () => {
    emblaApi.value?.reInit()
    startAutoplay()
  },
)

onBeforeUnmount(() => {
  stopAutoplay()
  emblaApi.value?.off('select', syncCurrentIndex)
})
</script>
