/// <reference types="vite/client" />

/**
 * Vite 在 **build 时** 把 `VITE_*` 编译进 JS；服务器上仅放静态文件不会自动带上你本机 `.env`。
 * 部署到 Telegram 小程若报「签名错误」，先确认 CI/构建机已设置 `VITE_API_SECRET_RAW`（与后端验签明文一致）。
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_SECRET_RAW?: string
  readonly VITE_API_KEY?: string
  readonly VITE_ORDER_ASSET_ORIGIN?: string
  readonly VITE_WHEEL_SIZE_API_KEY?: string
  readonly VITE_WHEEL_SIZE_API_BASE_URL?: string
  readonly VITE_WHEEL_SIZE_API_REGION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, any>
  export default component
}

declare module '*.svg' {
  const src: string
  export default src
}
