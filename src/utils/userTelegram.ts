/*
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @Date: 2026-04-16 14:04:06
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2026-04-17 09:43:17
 * @FilePath: \vite-project\src\utils\userTelegram.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import type {
  TelegramThemeColorKey,
  TelegramThemeParams,
  TelegramWebApp,
} from '@/types'

// Telegram 返回的主题字段和项目里使用的 CSS 变量做一层映射。
const themeVarMap: Record<TelegramThemeColorKey, string> = {
  // 强调文字颜色
  accent_text_color: '--tg-theme-accent-text-color',
  // 页面主背景色
  bg_color: '--tg-theme-bg-color',
  // 主按钮背景色
  button_color: '--tg-theme-button-color',
  // 主按钮文字色
  button_text_color: '--tg-theme-button-text-color',
  // 底部栏背景色
  bottom_bar_bg_color: '--tg-theme-bottom-bar-bg-color',
  // 危险/警告文字色
  destructive_text_color: '--tg-theme-destructive-text-color',
  // 顶部导航或头部背景色
  header_bg_color: '--tg-theme-header-bg-color',
  // 弱提示文字色
  hint_color: '--tg-theme-hint-color',
  // 链接文字色
  link_color: '--tg-theme-link-color',
  // 次级卡片/容器背景色
  secondary_bg_color: '--tg-theme-secondary-bg-color',
  // 分组/区块背景色
  section_bg_color: '--tg-theme-section-bg-color',
  // 分组标题文字色
  section_header_text_color: '--tg-theme-section-header-text-color',
  // 分组分隔线颜色
  section_separator_color: '--tg-theme-section-separator-color',
  // 副标题/说明文字色
  subtitle_text_color: '--tg-theme-subtitle-text-color',
  // 主文字颜色
  text_color: '--tg-theme-text-color',
}

// 非 Telegram 环境下，仍然提供一套接近官方视觉的兜底颜色。
export const telegramThemeFallbacks: Record<TelegramThemeColorKey, string> = {
  accent_text_color: '#3390ec',
  bg_color: '#f4f4f5',
  button_color: '#3390ec',
  button_text_color: '#ffffff',
  bottom_bar_bg_color: '#ffffff',
  destructive_text_color: '#ff3b30',
  header_bg_color: '#ffffff',
  hint_color: '#707579',
  link_color: '#3390ec',
  secondary_bg_color: '#ffffff',
  section_bg_color: '#ffffff',
  section_header_text_color: '#6d7883',
  section_separator_color: 'rgba(0, 0, 0, 0.08)',
  subtitle_text_color: '#707579',
  text_color: '#111827',
}

// 获取 Telegram WebApp 实例，并在拿到实例后立即通知 Telegram 页面已就绪。
export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') {
    return null
  }

  const tg = window.Telegram?.WebApp ?? null
  if (tg) {
    tg.ready()
  }

  return tg
}

// 把 Telegram 主题参数同步到全局 CSS 变量，供所有组件统一消费。
export function applyTelegramThemeParams(
  themeParams?: TelegramThemeParams | null,
): void {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement

  for (const key of Object.keys(themeVarMap) as TelegramThemeColorKey[]) {
    root.style.setProperty(
      themeVarMap[key],
      themeParams?.[key] ?? telegramThemeFallbacks[key],
    )
  }
}

// 根据 Telegram 的背景色推断当前是亮色还是暗色主题。
export function resolveTelegramColorScheme(
  themeParams?: TelegramThemeParams | null,
): 'light' | 'dark' {
  const bgColor = themeParams?.bg_color ?? telegramThemeFallbacks.bg_color
  const normalized = bgColor.replace('#', '')
  const hex = normalized.length === 3
    ? normalized
        .split('')
        .map((char) => `${char}${char}`)
        .join('')
    : normalized

  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000

  return brightness < 140 ? 'dark' : 'light'
}