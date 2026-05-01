/*
 * @Author: wxy2003c 774078984@qq.com
 * @Date: 2026-04-21 17:09:44
 * @LastEditors: wxy2003c 774078984@qq.com
 * @LastEditTime: 2026-04-29 10:46:09
 * @FilePath: \vite-project\src\constants\navBarRoutes.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/** 与 `NavBar.vue` 底部 Tab 一致的路由 path；这些页面不显示全局返回按钮 */
export const NAV_BAR_TAB_PATHS = ['/', '/product', '/cases', '/profile'] as const

export function isNavBarTabRoute(path: string): boolean {
  return (NAV_BAR_TAB_PATHS as readonly string[]).includes(path)
}
