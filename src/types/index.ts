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
}

export interface TelegramWebApp {
  ready(): void
  expand?(): void
  /** 在 Telegram 内打开 http(s) 链接；非 TG 环境可回退为 window.open */
  openLink?(url: string, options?: { try_instant_view?: boolean }): void
  openTelegramLink?(url: string): void
  initData?: string
  initDataUnsafe?: TelegramInitDataUnsafe
  colorScheme?: 'light' | 'dark'
  themeParams?: TelegramThemeParams
  onEvent?(eventType: 'themeChanged', callback: () => void): void
  offEvent?(eventType: 'themeChanged', callback: () => void): void
}

export interface Telegram {
  WebApp?: TelegramWebApp
}

declare global {
  interface Window {
    Telegram?: Telegram
  }
}