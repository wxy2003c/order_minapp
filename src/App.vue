<!--
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @Date: 2026-04-16 14:05:26
 * @LastEditors: wxy2003c 774078984@qq.com
 * @LastEditTime: 2026-04-21 10:22:01
 * @FilePath: \vite-project\src\App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { computed } from 'vue'
import { NConfigProvider, NMessageProvider, darkTheme, enUS, dateEnUS, zhCN, dateZhCN, ruRU, dateRuRU, type GlobalTheme } from 'naive-ui'
import TgBackButton from '@/components/TgBackButton.vue'
import { useTelegramTheme } from '@/composables/useTelegramTheme'
import { uiLocale } from '@/i18n/uiI18n'

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
