<!--
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @Date: 2026-04-17 13:55:30
 * @LastEditors: wxy2003c 774078984@qq.com
 * @LastEditTime: 2026-04-29 10:45:20
 * @FilePath: \vite-project\src\components\NavBar.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script lang="ts" setup>
import { computed } from 'vue'
import { isNavBarTabRoute } from '@/constants/navBarRoutes'
import { t } from '@/i18n/uiI18n'

const route = useRoute()
const tabs = computed(() => [
  { label: t('nav.home'), path: '/', icon: 'home' },
  { label: t('nav.product'), path: '/product', icon: 'product' },
  { label: t('nav.cases'), path: '/cases', icon: 'cases' },
  { label: t('nav.profile'), path: '/profile', icon: 'profile' },
])

const activeTabIndex = computed(() => {
    const index = tabs.value.findIndex(item => item.path === route.path)
    return index === -1 ? 0 : index
})

const showNavBar = computed(() => isNavBarTabRoute(route.path))

</script>

<template>
    <nav v-if="showNavBar"
        class="fixed bottom-3 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 overflow-hidden rounded-[99999px] border border-[color:var(--app-divider)] bg-tg-bottom-bar p-1 shadow-[var(--app-shadow)]">
        <div class="relative">
            <span
                class="pointer-events-none absolute inset-y-0 left-0 w-1/4 rounded-full bg-tg-accent transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                :style="{ transform: `translateX(${activeTabIndex * 100}%)` }" />
            <ul class="relative z-10 m-0 grid list-none grid-cols-4 p-0">
                <li v-for="item in tabs" :key="item.path" class="min-w-0">
                    <RouterLink :to="item.path"
                        class="flex flex-col items-center justify-center gap-1 rounded-full px-1 py-2 text-2 font-600 transition-colors"
                        :class="route.path === item.path ? 'text-tg-accent-text' : 'text-tg-hint'">
                        <svg v-if="item.icon === 'home'" viewBox="0 0 24 24" fill="none" class="h-5 w-5"
                            stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                            aria-hidden="true">
                            <path d="M3.75 10.5 12 4l8.25 6.5" />
                            <path d="M5.25 9.75v9h13.5v-9" />
                            <path d="M10 18.75v-4.5h4v4.5" />
                        </svg>
                        <svg v-else-if="item.icon === 'product'" viewBox="0 0 24 24" fill="none" class="h-5 w-5"
                            stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                            aria-hidden="true">
                            <path d="M12 3.75 19.5 8 12 12.25 4.5 8 12 3.75Z" />
                            <path d="M19.5 8v8L12 20.25 4.5 16V8" />
                            <path d="M12 12.25v8" />
                        </svg>
                        <svg v-else-if="item.icon === 'cases'" viewBox="0 0 24 24" fill="none" class="h-5 w-5"
                            stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                            aria-hidden="true">
                            <rect x="3.75" y="5.25" width="16.5" height="13.5" rx="2.5" />
                            <path d="M7.5 14.25 10.25 11.5 13 14.25 15.25 12l3 3" />
                            <circle cx="9" cy="9" r="1.25" />
                        </svg>
                        <svg v-else viewBox="0 0 24 24" fill="none" class="h-5 w-5" stroke="currentColor"
                            stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" aria-hidden="true">
                            <circle cx="12" cy="8.25" r="3.25" />
                            <path d="M5.5 19.25a6.5 6.5 0 0 1 13 0" />
                        </svg>
                        <span class="truncate whitespace-nowrap leading-none">
                            {{ item.label }}
                        </span>
                    </RouterLink>
                </li>
            </ul>
        </div>
    </nav>
</template>