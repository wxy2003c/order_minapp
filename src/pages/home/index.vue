<script lang="ts" setup>
import TgButton from '@/components/TgButton.vue'
import CarSelectionPanel from '@/components/CarSelectionPanel.vue'
import { STYLE_MOOD_TAGS } from '@/constants/styleMoodTags'
import { useProductBrowseStore } from '@/stores/productBrowse'
import { Icon } from '@iconify/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { carGroups } from '@/data/carSelection'
import { t } from '@/i18n/uiI18n'
import {
  getPhoneAuthModalDismissedThisSession,
  getStoredTelegramContact,
  getTelegramWebApp,
  setPhoneAuthModalDismissedThisSession,
  setStoredTelegramContact,
} from '@/utils/userTelegram'

const router = useRouter()
const browse = useProductBrowseStore()

const phoneAuthModalOpen = ref(false)

/** 用户关闭弹层（遮罩/X）且未授权：本会话内不再自动弹出；Mini App `close` 事件会清标记，下次从聊天进入可再提示 */
watch(phoneAuthModalOpen, (open) => {
  if (open) {
    return
  }
  if (getStoredTelegramContact()) {
    return
  }
  setPhoneAuthModalDismissedThisSession()
})

function getUserPhone() {
  const w = getTelegramWebApp()
  if (!w?.requestContact) {
    window.alert(t('phoneAuth.notSupported'))
    return
  }
  w.requestContact((success, contact) => {
    if (!success) {
      window.alert(t('phoneAuth.reject'))
      return
    }
    const raw
      = typeof contact === 'string' ? contact : JSON.stringify(contact ?? null)
    setStoredTelegramContact(raw)
    phoneAuthModalOpen.value = false
  })
}

/** 首页「草稿」：仅选车/点风格，不写入 Pinia；点 Go 再写入并进产品页 */
const carBrand = ref('')
const carModel = ref('')
const carYear = ref('')

function selectStyleTag(tag: string) {
  browse.setStyleMood(tag)
  router.push({ path: '/product' })
}

const carSelectionSummary = computed(() => {
  if (!carBrand.value && !carModel.value && !carYear.value) {
    return t('home.notSelected')
  }
  return [carBrand.value, carModel.value, carYear.value].filter(Boolean).join(' · ') || t('home.notSelected')
})

/** 与 HeaderFilter 汽车弹层一致：Popover + CarSelectionPanel */
const carPopoverOpen = ref(false)
const carEntryRef = ref<HTMLElement | null>(null)
const panelWidth = ref(0)

const popoverPanelStyle = computed((): Record<string, string> => {
  const base: Record<string, string> = {
    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
  }
  if (!panelWidth.value) return base
  return {
    ...base,
    width: `${panelWidth.value}px`,
    maxWidth: `${panelWidth.value}px`,
  }
})

function updatePanelWidth() {
  panelWidth.value = carEntryRef.value?.getBoundingClientRect().width ?? 0
}

function toggleCarPopover() {
  carPopoverOpen.value = !carPopoverOpen.value
}

function closeCarPopover() {
  carPopoverOpen.value = false
}

let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  await nextTick()
  updatePanelWidth()
  if (carEntryRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => updatePanelWidth())
    resizeObserver.observe(carEntryRef.value)
  }

  const w = getTelegramWebApp()
  if (
    w
    && typeof w.requestContact === 'function'
    && !getStoredTelegramContact()
    && !getPhoneAuthModalDismissedThisSession()
  ) {
    phoneAuthModalOpen.value = true
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

/** 将当前首页选择写入 Pinia 后再进产品页；未点 Go 时产品页不会带上这里的草稿 */
function goToProduct() {
  browse.setCar(carBrand.value, carModel.value, carYear.value)
  router.push({ path: '/product' })
}
</script>

<template>
  <div class="pos-relative min-h-full w-full overflow-hidden bg-[#202126] p-4">
    <img src="@/assets/image/navLogo.png" class="h-14 w-65" alt="">
    <Swiper class="mt-3" />

    <div class="mt-3 flex-items-center flex gap-2">
      <div ref="carEntryRef" class="flex-1">
        <NPopover v-model:show="carPopoverOpen" trigger="manual" :animated="false" display-directive="show"
          placement="bottom-start" :show-arrow="false" :content-style="popoverPanelStyle" arrow-wrapper-class="p-0">
          <template #trigger>
            <button type="button"
              class="flex h-full flex-items-center min-h-12 w-full items-center justify-between gap-2 border border-white/20 rounded-2xl bg-white/5 px-4 py-2.5 text-left text-3.5 text-white/95 outline-none transition active:bg-white/10"
              @click.stop="toggleCarPopover">
              <div class="min-w-0 flex-1">
                <div class="text-3 text-white/50">{{ t('home.selectCar') }}</div>
                <div
                  class="mt-0.5 truncate text-2.75 text-white/70 max-w-50 overflow-hidden text-ellipsis whitespace-nowrap">
                  {{ carSelectionSummary }}
                </div>
              </div>
              <Icon icon="solar:alt-arrow-down-outline" class="shrink-0 text-white/60 transition" width="18" height="18"
                :class="carPopoverOpen ? 'rotate-180' : ''" />
            </button>
          </template>
          <div
            class="tg-light-surface z-50 overflow-hidden rounded-[20px] border p-0 shadow-[var(--app-shadow)] outline-none"
            style="border-color: var(--tg-theme-section-separator-color)">
            <CarSelectionPanel v-model:brand="carBrand" v-model:model="carModel" v-model:year="carYear"
              :groups="carGroups" @complete="closeCarPopover" />
          </div>
        </NPopover>
      </div>
      <TgButton type="button" variant="white" shape="pill" @click="goToProduct">
        <span>{{ t('common.go') }}</span>
      </TgButton>
    </div>

    <!-- 本地风格高亮，与产品页「风格」一致要等点 Go 写入 Pinia -->
    <div
      class="mt-3 flex w-full flex-nowrap items-stretch gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button v-for="tag in STYLE_MOOD_TAGS" :key="tag" type="button"
        class="shrink-0 rounded-2xl border px-3.5 py-2.5 text-3.5 font-600 leading-none transition border-[#ECECEC] bg-white text-[#4F5869]"
        @click="selectStyleTag(tag)">
        {{ tag }}
      </button>
    </div>

    <div class="mt-5">
      <div class="flex flex-items-center">
        <div class="flex-1 text-3 color-[#BCCAE4]">{{ t('home.productRec') }}</div>
        <div class="flex flex-items-center">
          <span class="text-3 color-[#BCCAE4]">{{ t('common.all') }}</span>
          <Icon icon="cuida:caret-right-outline" width="18" height="18" color="#BCCAE4" />
        </div>
      </div>
      <div class="mt-3 grid grid-cols-2 gap-3">
        <div v-for="index in 4" :key="index" class="w-full">
          <img src="@/assets/vue.svg" class="h-21 w-full" alt="">
          <div class="mt-1.5 text-3 color-[#BCCAE4]">WL-M-054</div>
        </div>
      </div>
    </div>
    <div class="mt-5">
      <div class="flex flex-items-center">
        <div class="flex-1 text-3 color-[#BCCAE4]">{{ t('home.customerCases') }}</div>
        <div class="flex flex-items-center">
          <span class="text-3 color-[#BCCAE4]">{{ t('common.all') }}</span>
          <Icon icon="cuida:caret-right-outline" width="18" height="18" color="#BCCAE4" />
        </div>
      </div>
      <div class="mt-4 flex flex-col gap-3">
        <img src="@/assets/vite.svg" class="h-42 w-full" alt="">
        <div class="mt-3 text-4 color-[#BCCAE4]">BMW M340D G21</div>
        <div class="mt-2 text-3 color-[#BCCAE4]">{{ t('home.carSummaryPlaceholder') }}</div>
      </div>
    </div>

    <div
      class="pos-fixed right-5 top-1/2 h-12 w-12 flex flex-items-center justify-center rounded-50% border -translate-y-1/2"
      style="border-color: var(--tg-theme-section-separator-color); background: var(--tg-theme-secondary-bg-color)"
      @click="router.push('/OrderCreate')">
      <Icon
        icon="mdi:plus"
        width="22"
        height="22"
        :style="{ color: 'var(--tg-theme-text-color)' }"
      />
    </div>

    <NModal v-model:show="phoneAuthModalOpen" preset="card" :style="{ maxWidth: 'min(90vw, 400px)' }"
      :mask-closable="true" :closable="true">
      <template #header>
        <div class="w-full text-center text-4 font-600 text-[#1F2937]">
          {{ t('phoneAuth.title') }}
        </div>
      </template>
      <p class="text-3.5 leading-relaxed text-[#4B5563]">
        {{ t('phoneAuth.body') }}
      </p>
      <template #footer>
        <TgButton block type="button" @click="getUserPhone">
          {{ t('phoneAuth.action') }}
        </TgButton>
      </template>
    </NModal>
  </div>
</template>
