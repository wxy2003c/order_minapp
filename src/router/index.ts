/*
 * @Author: wxy2003c 774078984@qq.com
 * @Date: 2026-04-17 10:48:46
 * @LastEditors: wxy2003c 774078984@qq.com
 * @LastEditTime: 2026-04-21 11:05:03
 * @FilePath: \vite-project\src\router\index.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/home',
    },
    {
      path: '/home',
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
      path: '/OrderDetails',
      name: '订单详情',
      component: () => import('@/pages/order/details.vue'),
    },
    {
      path: '/Evaluation',
      name: '订单评价',
      component: () => import('@/pages/Evaluation/index.vue'),
    },
  ],
})

export default router
