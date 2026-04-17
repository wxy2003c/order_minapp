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
  ],
})

export default router
