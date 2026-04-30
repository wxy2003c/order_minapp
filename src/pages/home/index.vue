<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { NDrawer } from 'naive-ui'
import TgButton from '@/components/TgButton.vue'
import CarSelectionPanel from '@/components/CarSelectionPanel.vue'
import { STYLE_MOOD_TAGS } from '@/constants/styleMoodTags'
import { useProductBrowseStore } from '@/stores/productBrowse'
import { t } from '@/i18n/uiI18n'
import { fetchHomePage } from '@/api/rolesApi'
import type { HomePageData } from '@/api/rolesApi'
import { resolveOrderAssetUrl } from '@/utils/orderMedia'

const router = useRouter()
const browse = useProductBrowseStore()

const homeData = ref<HomePageData>({
  random_style_models: [],
  popular_style_models: [],
  customer_cases: [],
})
const loading = ref(true)

onMounted(async () => {
  try {
    homeData.value = await fetchHomePage()
  } finally {
    loading.value = false
  }
})

/** 首页「草稿」：仅选车/点风格，不写入 Pinia；点 Go 再写入并进产品页 */
const carBrand = ref('')
const carModel = ref('')
const carYear = ref('')

function selectStyleTag(tag: string) {
  browse.setStyleMood(tag)
  router.push({ path: '/product' })
}

const carSelectionSummary = computed(() => {
  if (!carBrand.value && !carModel.value && !carYear.value) return t('home.notSelected')
  return [carBrand.value, carModel.value, carYear.value].filter(Boolean).join(' · ') || t('home.notSelected')
})

const carPopoverOpen = ref(false)
function toggleCarPopover() { carPopoverOpen.value = !carPopoverOpen.value }
function closeCarPopover() { carPopoverOpen.value = false }

function goToProduct() {
  browse.setCar(carBrand.value, carModel.value, carYear.value)
  router.push({ path: '/product' })
}

function img(path: string | null | undefined): string | null {
  return resolveOrderAssetUrl(path)
}
</script>

<template>
  <div class="pos-relative min-h-full w-full overflow-hidden bg-[#202126] p-4">
    <img src="@/assets/image/navLogo.png" class="h-14 w-65" alt="">

    <!-- 轮播图 random_style_models -->
    <Swiper class="mt-3" :items="homeData.random_style_models" />

    <!-- 选车 + Go -->
    <div class="mt-3 flex-items-center flex gap-2">
      <div class="flex-1">
        <button type="button"
          class="flex h-full flex-items-center min-h-12 w-full items-center justify-between gap-2 border border-white/20 rounded-2xl bg-white/5 px-4 py-2.5 text-left text-3.5 text-white/95 outline-none transition active:bg-white/10"
          @click.stop="toggleCarPopover">
          <div class="min-w-0 flex-1">
            <div class="text-3 text-white/50">{{ t('home.selectCar') }}</div>
            <div class="mt-0.5 truncate text-2.75 text-white/70 max-w-50 overflow-hidden text-ellipsis whitespace-nowrap">
              {{ carSelectionSummary }}
            </div>
          </div>
          <Icon icon="solar:alt-arrow-down-outline" class="shrink-0 text-white/60 transition" width="18" height="18"
            :class="carPopoverOpen ? 'rotate-180' : ''" />
        </button>
      </div>
      <TgButton type="button" variant="white" shape="pill" @click="goToProduct">
        <span>{{ t('common.go') }}</span>
      </TgButton>
    </div>

    <NDrawer v-model:show="carPopoverOpen" :height="'min(88vh, 720px)'" placement="bottom" :trap-focus="false"
      :block-scroll="true" :native-scrollbar="false"
      :content-style="{ height: '100%', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }">
      <div
        class="tg-light-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[20px] border-t shadow-[var(--app-shadow)] outline-none"
        style="border-color: var(--tg-theme-section-separator-color)">
        <CarSelectionPanel class="min-h-0 flex-1" v-model:brand="carBrand" v-model:model="carModel"
          v-model:year="carYear" @complete="closeCarPopover" />
      </div>
    </NDrawer>

    <!-- 风格标签 -->
    <div
      class="mt-3 flex w-full flex-nowrap items-stretch gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button v-for="tag in STYLE_MOOD_TAGS" :key="tag" type="button"
        class="shrink-0 rounded-2xl border px-3.5 py-2.5 text-3.5 font-600 leading-none transition border-[#ECECEC] bg-white text-[#4F5869]"
        @click="selectStyleTag(tag)">
        {{ tag }}
      </button>
    </div>

    <!-- 产品推荐 popular_style_models -->
    <div class="mt-5">
      <div class="flex flex-items-center mb-3">
        <div class="flex-1 text-3 color-[#BCCAE4]">{{ t('home.productRec') }}</div>
        <div class="flex flex-items-center">
          <span class="text-3 color-[#BCCAE4]">{{ t('common.all') }}</span>
          <Icon icon="cuida:caret-right-outline" width="18" height="18" color="#BCCAE4" />
        </div>
      </div>
      <!-- 骨架屏 -->
      <div v-if="loading" class="grid grid-cols-2 gap-3">
        <div v-for="i in 4" :key="i" class="w-full">
          <div class="h-21 w-full rounded-lg bg-white/10 animate-pulse" />
          <div class="mt-1.5 h-3 w-16 rounded bg-white/10 animate-pulse" />
        </div>
      </div>
      <div v-else class="grid grid-cols-2 gap-3">
        <div v-for="item in homeData.popular_style_models" :key="item.id" class="w-full">
          <div class="relative h-21 w-full overflow-hidden rounded-lg bg-white/5">
            <img v-if="img(item.effect_image)" :src="img(item.effect_image)!" :alt="item.style_name"
              class="h-full w-full object-cover" />
          </div>
          <div class="mt-1.5 text-3 color-[#BCCAE4]">{{ item.style_no }}</div>
          <div class="text-2.75 text-white/50">{{ item.style_name }}</div>
        </div>
      </div>
    </div>

    <!-- 客户案例 customer_cases -->
    <div class="mt-5">
      <div class="flex flex-items-center mb-3">
        <div class="flex-1 text-3 color-[#BCCAE4]">{{ t('home.customerCases') }}</div>
        <div class="flex flex-items-center">
          <span class="text-3 color-[#BCCAE4]">{{ t('common.all') }}</span>
          <Icon icon="cuida:caret-right-outline" width="18" height="18" color="#BCCAE4" />
        </div>
      </div>
      <div v-if="loading" class="flex flex-col gap-3">
        <div v-for="i in 2" :key="i">
          <div class="h-42 w-full rounded-xl bg-white/10 animate-pulse" />
          <div class="mt-2 h-4 w-32 rounded bg-white/10 animate-pulse" />
        </div>
      </div>
      <div v-else class="flex flex-col gap-5">
        <div v-for="c in homeData.customer_cases" :key="c.id">
          <div class="relative h-42 w-full overflow-hidden rounded-xl bg-white/5">
            <img v-if="img(c.cover_image)" :src="img(c.cover_image)!" :alt="c.display_title"
              class="h-full w-full object-cover" />
          </div>
          <div class="mt-2 text-4 font-600 color-[#BCCAE4]">{{ c.display_title }}</div>
          <div class="mt-1 text-3 text-white/50">
            {{ c.car_brand }} {{ c.car_model }} {{ c.car_year }} · {{ c.style_no }}
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷下单按钮 -->
    <div
      class="pos-fixed right-5 top-1/2 h-12 w-12 flex flex-items-center justify-center rounded-50% border -translate-y-1/2"
      style="border-color: var(--tg-theme-section-separator-color); background: var(--tg-theme-secondary-bg-color)"
      @click="router.push('/CustomOrder')">
      <Icon icon="mdi:plus" width="22" height="22" :style="{ color: 'var(--tg-theme-text-color)' }" />
    </div>
  </div>
</template>
