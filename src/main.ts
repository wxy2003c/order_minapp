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
import { tryApplyTelegramStaffDeepLink } from '@/composables/TelegramParams'
import { useStaffDeeplinkStore } from '@/stores/staffDeeplink'
import { initApiLangFromStorage } from '@/i18n/apiLang'
import { applyLanguageFromTelegram, initUiLanguage } from '@/i18n/uiI18n'
import '@unocss/reset/tailwind.css'
import 'uno.css'
import '@/style.css'

initApiLangFromStorage()

// 默认界面与 API 均为中文；不因 Telegram `language_code` 自动切换语言
applyLanguageFromTelegram(undefined)
initUiLanguage()

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

router.afterEach((to) => {
  const sd = useStaffDeeplinkStore()
  sd.onRouteFullPathChange(to.fullPath)

  const isDetail = to.path === '/OrderDetails'
  const platform = String(sd.platformUid ?? '').trim()
  const custTg = String(sd.customerTelegramId ?? '').trim()
  /** 代客链路：详情页 API 的 `user_id` 用本人 Telegram，客户在 query 里传 `telegram_id` */
  sd.setHttpUserIdUsesSelfTelegram(isDetail && !!platform && !!custTg)
})

;(async () => {
  await router.isReady()
  tryApplyTelegramStaffDeepLink(router)
  app.mount('#app')
})()

