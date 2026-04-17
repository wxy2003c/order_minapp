import { init } from '@tma.js/sdk-vue'
import { computed, onMounted, onUnmounted, readonly, ref } from 'vue'
import type { TelegramUser } from '@/types'
import {
  applyTelegramThemeParams,
  getTelegramWebApp,
  resolveTelegramColorScheme,
} from '@/utils/userTelegram'

// 统一管理 Telegram WebApp 的主题、环境状态和用户信息。
export function useTelegramTheme() {
  const isTelegram = ref(false)
  const colorScheme = ref<'light' | 'dark'>('light')
  const user = ref<TelegramUser | null>(null)

  // 每次进入页面或 Telegram 主题变化时，同步最新的主题变量和用户信息。
  const syncTelegramTheme = () => {
    const tg = getTelegramWebApp()

    applyTelegramThemeParams(tg?.themeParams)
    user.value = tg?.initDataUnsafe?.user ?? null
    colorScheme.value
      = tg?.colorScheme ?? resolveTelegramColorScheme(tg?.themeParams)

    document.documentElement.dataset.colorScheme = colorScheme.value
  }

  onMounted(() => {
    const tg = getTelegramWebApp()

    syncTelegramTheme()
    isTelegram.value = Boolean(tg)

    if (!tg) {
      return
    }

    try {
      // 初始化 SDK，方便后续接入 Telegram 的更多原生能力。
      init()
    }
    catch (error) {
      console.warn('Telegram SDK init failed, using native WebApp API only.', error)
    }

    tg.expand?.()
    tg.onEvent?.('themeChanged', syncTelegramTheme)
  })

  onUnmounted(() => {
    getTelegramWebApp()?.offEvent?.('themeChanged', syncTelegramTheme)
  })

  const isDark = computed(() => colorScheme.value === 'dark')

  return {
    colorScheme: readonly(colorScheme),
    isDark,
    isTelegram: readonly(isTelegram),
    user: readonly(user),
  }
}
