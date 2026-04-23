import { init } from '@tma.js/sdk-vue'
import { computed, onMounted, onUnmounted, readonly, ref } from 'vue'
import type { TelegramUser } from '@/types'
import { buildTelegramNaiveThemeOverrides } from '@/naive/telegramTheme'
import { applyLanguageFromTelegram } from '@/i18n/uiI18n'
import {
  applyTelegramThemeParams,
  clearPhoneAuthModalDismissedThisSession,
  getTelegramUserLanguageCode,
  getTelegramWebApp,
  resolveTelegramColorScheme,
} from '@/utils/userTelegram'
import type { TelegramThemeParams } from '@/types'

// 统一管理 Telegram WebApp 的主题、环境状态和用户信息。
export function useTelegramTheme() {
  const isTelegram = ref(false)
  const colorScheme = ref<'light' | 'dark'>('light')
  const user = ref<TelegramUser | null>(null)
  const themeParams = ref<TelegramThemeParams | null>(null)

  // 每次进入页面或 Telegram 主题变化时，同步最新的主题变量和用户信息。
  const syncTelegramTheme = () => {
    const tg = getTelegramWebApp()

    applyTelegramThemeParams(tg?.themeParams)
    themeParams.value = tg?.themeParams ?? null
    user.value = tg?.initDataUnsafe?.user ?? null
    colorScheme.value
      = tg?.colorScheme ?? resolveTelegramColorScheme(tg?.themeParams)

    document.documentElement.dataset.colorScheme = colorScheme.value
    const code = getTelegramUserLanguageCode()
    if (typeof code === 'string' && code.trim()) {
      applyLanguageFromTelegram(code)
    }
  }

  function onTelegramThemeChanged() {
    syncTelegramTheme()
  }

  const onTelegramMiniAppClose = () => {
    // 重进聊天再打开时恢复可提示手机号；避免 session 未析构时一直不再弹
    clearPhoneAuthModalDismissedThisSession()
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('Mini app close event (WebApp onEvent close)')
    }
  }

  const onTelegramBackButtonClick = () => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('Telegram BackButton clicked, closing Mini App')
    }
    getTelegramWebApp()?.close?.()
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
    tg.onEvent?.('themeChanged', onTelegramThemeChanged)
    tg.onEvent?.('close', onTelegramMiniAppClose)

    const bb = tg.BackButton
    if (bb) {
      bb.show?.()
      bb.onClick?.(onTelegramBackButtonClick)
    }
  })

  onUnmounted(() => {
    const tgw = getTelegramWebApp()
    tgw?.offEvent?.('themeChanged', onTelegramThemeChanged)
    tgw?.offEvent?.('close', onTelegramMiniAppClose)
    tgw?.BackButton?.offClick?.(onTelegramBackButtonClick)
    tgw?.BackButton?.hide?.()
  })

  const isDark = computed(() => colorScheme.value === 'dark')
  const naiveThemeOverrides = computed(() =>
    buildTelegramNaiveThemeOverrides(themeParams.value),
  )

  return {
    colorScheme: readonly(colorScheme),
    isDark,
    isTelegram: readonly(isTelegram),
    user: readonly(user),
    themeParams: readonly(themeParams),
    naiveThemeOverrides,
  }
}
