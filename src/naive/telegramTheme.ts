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
    /** NSelect / 跟随器内菜单：全部用 TG 实色，避免暗色下 teleport 后仍吃错 token */
    Select: {
      peers: {
        InternalSelection: {
          textColor: c('text_color'),
          placeholderColor: c('hint_color'),
          color: c('secondary_bg_color'),
          colorDisabled: c('secondary_bg_color'),
          colorActive: c('secondary_bg_color'),
          border: `1px solid ${c('section_separator_color')}`,
          borderHover: `1px solid ${c('link_color')}`,
          borderActive: `1px solid ${c('button_color')}`,
          borderFocus: `1px solid ${c('link_color')}`,
          arrowColor: c('hint_color'),
          arrowColorDisabled: c('hint_color'),
          textColorDisabled: c('hint_color'),
          placeholderColorDisabled: c('hint_color'),
        },
        InternalSelectMenu: {
          color: c('secondary_bg_color'),
          borderRadius: '8px',
        },
      },
    },
    Dropdown: {
      color: c('secondary_bg_color'),
      borderRadius: '8px',
    },
    /** 仍使用 Naive 内建按钮/弹层等时的字色（TgButton 不依赖此段） */
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
