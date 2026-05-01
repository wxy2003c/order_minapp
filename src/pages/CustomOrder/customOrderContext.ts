/**
 * 定制预下单 · Provide / Inject 上下文。
 *
 * 共享状态在 `useCustomOrderStore()`（Pinia）；`useCustomOrderSetup` 把 store（refs）与路由/滚动/Message 相关方法
 * 合并成 `ctx` 后 `provide(CUSTOM_ORDER_INJECTION_KEY, ctx)`。Tab 也可用 `useCustomOrderStore()` 直接读状态。
 *
 * 类型使用宽 `Record` 是为了同时服务模板与 inject，后续可逐步收紧为显式 interface。
 */

import { inject, type InjectionKey } from 'vue'

/** 根页 `const o = useCustomOrderSetup(pageRoot)` 与子 Tab `inject` 共用的大对象 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomOrderPageInstance = Record<string, any>

export type CustomOrderContext = CustomOrderPageInstance

/** 使用 Symbol 避免与别的 provide key 冲突 */
export const CUSTOM_ORDER_INJECTION_KEY: InjectionKey<CustomOrderContext> = Symbol('customOrder')

/** 必须在 `CustomOrder/index.vue`（或任何调用了 `useCustomOrderSetup` 的祖先）之下使用 */
export function useCustomOrderContext(): CustomOrderContext {
  const ctx = inject(CUSTOM_ORDER_INJECTION_KEY)
  if (ctx == null) throw new Error('[CustomOrder] missing provider')
  return ctx
}
