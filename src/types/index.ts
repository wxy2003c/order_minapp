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
  /** 展开到最大高度（不隐藏顶栏） */
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
  onEvent?(eventType: 'themeChanged' | 'close' | 'fullscreen_changed' | 'fullscreen_failed', callback: () => void): void
  offEvent?(eventType: 'themeChanged' | 'close' | 'fullscreen_changed' | 'fullscreen_failed', callback: () => void): void

  /**
   * 当前运行平台：
   * - 移动端：`'android'` | `'android_x'` | `'ios'` | `'weba'`
   * - 桌面端：`'tdesktop'` | `'macos'` | `'web'`
   * - 未知：`'unknown'`
   */
  platform?: string

  /**
   * 请求真正全屏：隐藏 Telegram 顶部头栏，Mini App 占满整个屏幕。
   * Bot API 9.0+，旧客户端静默忽略。
   * @see https://core.telegram.org/bots/webapps#full-and-lightweight-mode
   */
  requestFullscreen?(): void
  /** 退出全屏，恢复 Telegram 顶栏显示。Bot API 9.0+ */
  exitFullscreen?(): void
  /** 当前是否处于全屏模式。Bot API 9.0+ */
  isFullscreen?: boolean

  /**
   * 禁用向下拖拽手势（防止误触关闭或触发系统层叠其他 Mini App）。
   * Bot API 7.7+，旧客户端静默忽略。
   */
  disableVerticalSwipes?(): void
  /** 恢复向下拖拽手势。Bot API 7.7+ */
  enableVerticalSwipes?(): void

  /**
   * 锁定屏幕方向，防止旋转打断操作。Bot API 9.0+
   */
  lockOrientation?(): void
  unlockOrientation?(): void
}

export interface Telegram {
  WebApp?: TelegramWebApp
}

declare global {
  interface Window {
    Telegram?: Telegram
  }
}