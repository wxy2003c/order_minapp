export const telegramThemeKeys = [
  'accent_text_color',
  'bg_color',
  'button_color',
  'button_text_color',
  'bottom_bar_bg_color',
  'destructive_text_color',
  'header_bg_color',
  'hint_color',
  'link_color',
  'secondary_bg_color',
  'section_bg_color',
  'section_header_text_color',
  'section_separator_color',
  'subtitle_text_color',
  'text_color',
] as const

export type TelegramThemeColorKey = (typeof telegramThemeKeys)[number]

export type TelegramThemeParams = Partial<Record<TelegramThemeColorKey, string>>

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

export interface TelegramInitDataUnsafe {
  user?: TelegramUser
  /** `t.me/bot?startapp=...` 等进入时由客户端注入 */
  start_param?: string
}

export interface TelegramBackButton {
  isVisible: boolean
  show(): void
  hide(): void
  onClick(callback: () => void): void
  offClick?(callback: () => void): void
}

export interface TelegramWebApp {
  ready(): void
  expand?(): void
  /** 关闭 Mini App 客户端 */
  close?(): void
  /**
   * 向用户请求通讯录/手机号相关授权（由客户端调起，返回加密数据，需由机器人后端按 Telegram 规则解密）
   * @see https://core.telegram.org/bots/webapps#initializing-mini-apps
   */
  requestContact?(callback: (success: boolean, contact: unknown) => void): void
  /** 在 Telegram 内打开 http(s) 链接；非 TG 环境可回退为 window.open */
  openLink?(url: string, options?: { try_instant_view?: boolean }): void
  openTelegramLink?(url: string): void
  initData?: string
  initDataUnsafe?: TelegramInitDataUnsafe
  colorScheme?: 'light' | 'dark'
  themeParams?: TelegramThemeParams
  /** 原生左上角返回，与站内 Router 的返回按钮是两套 UI */
  BackButton?: TelegramBackButton
  onEvent?(eventType: 'themeChanged' | 'close', callback: () => void): void
  offEvent?(eventType: 'themeChanged' | 'close', callback: () => void): void
}

export interface Telegram {
  WebApp?: TelegramWebApp
}

declare global {
  interface Window {
    Telegram?: Telegram
  }
}