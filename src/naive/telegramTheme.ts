import type { GlobalThemeOverrides } from 'naive-ui'
import type { TelegramThemeParams, TelegramThemeColorKey } from '@/types'
import { pickTgColor } from '@/utils/userTelegram'

/**
 * Naive 在内部用 seemly 对 primary 等做运算，不能传 `var(--*)` 或 `color-mix(var(...))`。
 * 这里全部使用 Telegram 下发的实色或 fallback 表中的 hex / rgba 字符串。
 */
export function buildTelegramNaiveThemeOverrides(
  params: TelegramThemeParams | null | undefined,
): GlobalThemeOverrides {
  const c = (key: TelegramThemeColorKey) => pickTgColor(params, key)

  return {
    common: {
      primaryColor: c('button_color'),
      primaryColorSuppl: c('link_color'),
      bodyColor: c('bg_color'),
      textColor1: c('text_color'),
      textColor2: c('subtitle_text_color'),
      textColor3: c('hint_color'),
      borderColor: c('section_separator_color'),
      dividerColor: c('section_separator_color'),
      actionColor: c('hint_color'),
      placeholderColor: c('hint_color'),
    },
    Input: {
      color: c('secondary_bg_color'),
      colorFocus: c('secondary_bg_color'),
      textColor: c('text_color'),
      border: `1px solid ${c('section_separator_color')}`,
    },
    Card: {
      color: c('secondary_bg_color'),
    },
    Popover: {
      color: c('secondary_bg_color'),
    },
    Modal: {
      color: c('secondary_bg_color'),
    },
    /** 避免 NButton 在部分组合下字色与背景对比不足（尤其 secondary + TG 主题） */
    Button: {
      textColor: c('text_color'),
      textColorHover: c('text_color'),
      textColorPressed: c('text_color'),
      textColorFocus: c('text_color'),
      textColorPrimary: c('button_text_color'),
      textColorHoverPrimary: c('button_text_color'),
      textColorPressedPrimary: c('button_text_color'),
      textColorFocusPrimary: c('button_text_color'),
      textColorError: '#ffffff',
      textColorHoverError: '#ffffff',
      textColorPressedError: '#ffffff',
      textColorFocusError: '#ffffff',
    },
  }
}
