import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import router from '@/router'
import { tryApplyOrderDeepLink } from '@/utils/telegramDeepLink'
import { getApiLang, initApiLangFromStorage } from '@/i18n/apiLang'
import { applyLanguageFromTelegram, initUiLanguage, uiLocale } from '@/i18n/uiI18n'
import { getTelegramWebApp } from '@/utils/userTelegram'
import '@unocss/reset/tailwind.css'
import 'uno.css'
import '@/style.css'

initApiLangFromStorage()

// 多语言只认 Telegram 客户端注入的 `initDataUnsafe.user.language_code`（BCP-47），不读 `document` / `html`
const tg = getTelegramWebApp()
const tgUser = tg?.initDataUnsafe?.user
const code = tgUser?.language_code

// 打开 Mini App 后在 Telegram 内置浏览器控制台可看到，把 `language_code` 原样发我即可
// eslint-disable-next-line no-console
console.log('[Telegram i18n] user.language_code (raw) =', code === undefined ? '(undefined)' : code)
// eslint-disable-next-line no-console
console.log('[Telegram i18n] initDataUnsafe.user =', tgUser)

if (typeof code === 'string' && code.trim()) {
  applyLanguageFromTelegram(code)
} else if (tg) {
  // 在 Mini App 内但暂无 language_code：与默认中文对齐
  applyLanguageFromTelegram(undefined)
} else {
  // 非 Telegram 环境：沿用上次在本地持久化的 `app_api_lang`
  uiLocale.value = getApiLang() as import('@/i18n/apiLang').AppLang
  initUiLanguage()
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

void router.isReady().then(() => {
  tryApplyOrderDeepLink(router)
})
