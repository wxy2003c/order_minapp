/*
 * @Author: wxy2003c 774078984@qq.com
 * @Date: 2026-04-15 14:44:28
 * @LastEditors: wxy2003c 774078984@qq.com
 * @LastEditTime: 2026-04-27 10:25:25
 * @FilePath: \vite-project\src\main.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import router from '@/router'
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

