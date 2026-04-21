/** 与 `NavBar.vue` 底部 Tab 一致的路由 path；这些页面不显示全局返回按钮 */
export const NAV_BAR_TAB_PATHS = ['/home', '/product', '/cases', '/profile'] as const

export function isNavBarTabRoute(path: string): boolean {
  return (NAV_BAR_TAB_PATHS as readonly string[]).includes(path)
}
