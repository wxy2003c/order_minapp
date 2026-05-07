/*
 * @Author: wxy2003c 774078984@qq.com
 * @Date: 2026-04-17 10:48:46
 * @LastEditors: wxy2003c 774078984@qq.com
 * @LastEditTime: 2026-05-06 10:16:47
 * @FilePath: \vite-project\src\router\index.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createRouter, createWebHashHistory } from 'vue-router'

const CHUNK_RELOAD_KEY = '__wl_chunk_reload'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: '首页',
      component: () => import('@/pages/home/index.vue'),
    },
    {
      path: '/product',
      name: '产品',
      component: () => import('@/pages/product/index.vue'),
    },
    {
      path: '/cases',
      name: '案例',
      component: () => import('@/pages/cases/index.vue'),
    },
    {
      path: '/profile',
      name: '我的',
      component: () => import('@/pages/profile/index.vue'),
    },
    {
      path: '/CasesDetails',
      name: '案例详情',
      component: () => import('@/pages/cases/details.vue'),
    },
    {
      path: '/ProductDetails',
      name: '产品详情',
      component: () => import('@/pages/product/details.vue'),
    },
    {
      path: '/CustomOrder',
      name: '创建订单',
      component: () => import('@/pages/CustomOrder/index.vue'),
    },
    {
      path: '/OrderCreate',
      redirect: { path: '/CustomOrder' },
    },
    {
      path: '/OrderDetails',
      name: '订单详情',
      component: () => import('@/pages/order/details.vue'),
    },
    {
      path: '/OrderList',
      name: '订单列表',
      component: () => import('@/pages/order/list.vue'),
    },
    {
      path: '/Evaluation',
      name: '订单评价',
      component: () => import('@/pages/Evaluation/index.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// iOS / TG WebView：路由懒加载 chunk 下载失败时自动重载一次，避免持续白屏
router.onError((err) => {
  const isChunkError = err?.message
    && (/loading chunk/i.test(err.message) || /failed to fetch dynamically imported/i.test(err.message) || /importing a module script failed/i.test(err.message))
  if (!isChunkError) return
  const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1'
  if (alreadyReloaded) {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    return
  }
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
  window.location.reload()
})

export default router
