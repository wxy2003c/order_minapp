<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { NConfigProvider, NMessageProvider, darkTheme, enUS, dateEnUS, zhCN, dateZhCN, ruRU, dateRuRU, type GlobalTheme } from 'naive-ui'
import TgBackButton from '@/components/TgBackButton.vue'
import { useBlurActiveInputOnOutsidePointer } from '@/composables/useBlurActiveInputOnOutsidePointer'
import { useTelegramTheme } from '@/composables/useTelegramTheme'
import { uiLocale } from '@/i18n/uiI18n'
import { getTelegramWebApp } from '@/utils/userTelegram'
useBlurActiveInputOnOutsidePointer()

const route = useRoute()
const { isDark, naiveThemeOverrides } = useTelegramTheme()
const mergedTheme = computed<GlobalTheme | null>(() => (isDark.value ? darkTheme : null))
const naiveLocale = computed(() => {
  const l = uiLocale.value
  if (l === 'zh') return zhCN
  if (l === 'ru') return ruRU
  return enUS
})
const naiveDateLocale = computed(() => {
  const l = uiLocale.value
  if (l === 'zh') return dateZhCN
  if (l === 'ru') return dateRuRU
  return dateEnUS
})

const brandBrowseRoutes = new Set(['/', '/product', '/cases'])

function applyTelegramChrome(path: string) {
  const tg = getTelegramWebApp()
  if (!tg) return
  const isBrandBrowse = brandBrowseRoutes.has(path)
  const color = isBrandBrowse ? '#202126' : '#FAFAFA'
  try {
    tg.setHeaderColor?.(color)
    tg.setBackgroundColor?.(color)
    tg.setBottomBarColor?.(color)
  } catch {
    /* Older clients may reject dynamic chrome colors. */
  }
}

watch(() => route.path, applyTelegramChrome, { immediate: true })
</script>

<template>
  <NConfigProvider
    :theme="mergedTheme"
    :theme-overrides="naiveThemeOverrides"
    :locale="naiveLocale"
    :date-locale="naiveDateLocale"
  >
    <NMessageProvider placement="top" :max="3">
      <main class="min-h-screen h-screen bg-[#FAFAFA] text-tg-text">
        <div class="relative h-full w-full">
          <TgBackButton />
          <RouterView class="pb-24" />
          <NavBar />
        </div>
      </main>
    </NMessageProvider>
  </NConfigProvider>
</template>
