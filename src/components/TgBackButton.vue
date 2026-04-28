<!--
 * @Author: wxy2003c 774078984@qq.com
 * @Date: 2026-04-21 17:09:44
 * @LastEditors: wxy2003c 774078984@qq.com
 * @LastEditTime: 2026-04-21 17:16:35
 * @FilePath: \vite-project\src\components\TgBackButton.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useRoute, useRouter } from 'vue-router'
import { isNavBarTabRoute } from '@/constants/navBarRoutes'
import { t } from '@/i18n/uiI18n'
import { useStaffDeeplinkStore } from '@/stores/staffDeeplink'

const route = useRoute()
const router = useRouter()
const staffDeeplink = useStaffDeeplinkStore()

const visible = computed(
  () => !isNavBarTabRoute(route.path) && staffDeeplink.allowHistoryBack,
)

function goBack() {
  if (typeof window !== 'undefined' && window.history.length > 1)
    void router.back()
  else
    void router.push('/home')
}
</script>

<template>
  <button
    v-if="visible"
    type="button"
    class="tg-floating-back fixed left-3 top-3 z-[38] flex h-10 w-10 items-center justify-center rounded-full transition [isolation:isolate] [transform:translateZ(0)] active:scale-95"
    :aria-label="t('backButton.aria')"
    @click="goBack"
  >
    <Icon
      icon="mdi:arrow-left"
      width="22"
      height="22"
      class="text-[color:var(--tg-theme-text-color)]"
      color="currentColor"
    />
  </button>
</template>
