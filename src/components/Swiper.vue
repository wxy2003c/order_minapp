<template>
    <section class="tg-card overflow-hidden p-0 relative">
        <!-- 轮播本体 -->
        <div class="embla relative" @mouseenter="stopAutoplay" @mouseleave="startAutoplay">
            <div ref="emblaRef" class="overflow-hidden">
                <div class="flex">
                    <div v-for="(banner, index) in banners" :key="banner.id" class="min-w-0 flex-[0_0_100%] bg-black">
                        <div
                            class="relative h-45 w-full overflow-hidden bg-[linear-gradient(135deg,var(--app-accent-soft),var(--app-surface))] px-5 py-5">
                            <img v-if="banner.image" :src="banner.image" :alt="banner.title"
                                class="h-full w-full object-cover" />
                            <div v-else class="flex h-full w-full flex-col justify-between">
                                <div>
                                    <p class="text-2 text-tg-link">Banner {{ index + 1 }}</p>
                                    <h2 class="mt-2 text-5 font-700 text-tg-text">
                                        {{ banner.title }}
                                    </h2>
                                    <p class="mt-2 max-w-60 text-3 leading-6 text-tg-subtitle">
                                        {{ banner.description }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 z-10">
                <button v-for="(_, index) in banners" :key="index" type="button"
                    class="h-2 w-2 rounded-full transition-all duration-300 bg-white"
                    :class="currentIndex === index ? 'w-5 bg-white' : ''" @click="emblaApi?.scrollTo(index)" />
            </div>
        </div>
    </section>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import useEmblaCarousel from 'embla-carousel-vue'

interface BannerItem {
    id: number
    title: string
    description: string
    image?: string
}

const banners: BannerItem[] = [
    {
        id: 1,
        title: 'Telegram Theme Banner',
        description: '全宽轮播，自动播放，颜色跟随 Telegram 主题。',
    },
    {
        id: 2,
        title: '产品推荐',
        description: '当前没有上传图片时，使用占位内容保持版面完整。',
    },
    {
        id: 3,
        title: '案例展示',
        description: '后续你只要把 image 字段换成真实图片地址即可。',
    },
]

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

    if (!emblaApi.value) {
        return
    }

    autoplayTimer = setInterval(() => {
        emblaApi.value?.scrollNext()
    }, 3000)
}

function syncCurrentIndex() {
    if (!emblaApi.value) {
        return
    }
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

onBeforeUnmount(() => {
    stopAutoplay()
    emblaApi.value?.off('select', syncCurrentIndex)
})
</script>
<style lang="scss" scoped></style>