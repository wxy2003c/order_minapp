<script setup lang="ts">
import { computed } from 'vue'
import { NConfigProvider, NMessageProvider, darkTheme, enUS, dateEnUS, zhCN, dateZhCN, ruRU, dateRuRU, type GlobalTheme } from 'naive-ui'
import TgBackButton from '@/components/TgBackButton.vue'
import { useBlurActiveInputOnOutsidePointer } from '@/composables/useBlurActiveInputOnOutsidePointer'
import { useTelegramTheme } from '@/composables/useTelegramTheme'
import { uiLocale } from '@/i18n/uiI18n'
useBlurActiveInputOnOutsidePointer()

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
</script>

<template>
  <NConfigProvider
    :theme="mergedTheme"
    :theme-overrides="naiveThemeOverrides"
    :locale="naiveLocale"
    :date-locale="naiveDateLocale"
  >
    <NMessageProvider placement="top" :max="3">
      <main class="min-h-screen h-screen bg-tg-bg text-tg-text">
        <div class="relative h-full w-full">
          <TgBackButton />
          <RouterView class="pb-24" />
          <NavBar />
        </div>
      </main>
    </NMessageProvider>
  </NConfigProvider>
</template>
