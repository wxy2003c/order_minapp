/*
 * @Author: wxy2003c 774078984@qq.com
 * @Date: 2026-04-15 14:44:28
 * @LastEditors: wxy2003c 774078984@qq.com
 * @LastEditTime: 2026-05-07 14:45:59
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
import { fetchUserDetail } from '@/api/rolesApi'
import { getTelegramUserLanguageCode, initTelegramAppDisplay } from '@/utils/userTelegram'

initApiLangFromStorage()
initTelegramAppDisplay()

// 默认英文；在 Telegram 内按 SDK `initDataUnsafe.user.language_code` 映射为 en/zh/ru
applyLanguageFromTelegram(getTelegramUserLanguageCode())
initUiLanguage()

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

router.afterEach((to) => {
  const sd = useStaffDeeplinkStore()
  sd.onRouteFullPathChange(to.fullPath)
})

;(async () => {
  await router.isReady()
  await tryApplyTelegramStaffDeepLink(router)
  // 立即挂载，避免 iOS 白屏等待权限接口；权限在后台加载，订单接口分发前会自动 await
  app.mount('#app')
  void fetchUserDetail().catch(() => null)
})()

