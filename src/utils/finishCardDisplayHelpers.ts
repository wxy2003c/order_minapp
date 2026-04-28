/**
 * 色卡（finish-cards API）条目与分组的展示用字符串。
 *
 * 与 `creativeForm` 提交的 `finishCardOrderNote`、`wheel_color_desc`、UI 中区段 Tab 标题相关；
 * `AppLang` 决定优先展示 `name_cn` / `name_en` 等行为。
 */

import type { AppLang } from '@/i18n/apiLang'
import type { FinishCardGroup, FinishCardItem } from '@/api/finishCards'

/** 分组标题：跟随当前界面语言选 section 名 */
export function finishSectionLabel(
  g: FinishCardGroup,
  uiLocale: AppLang,
): string {
  if (uiLocale === 'en' && g.section_name_en) return g.section_name_en
  if (uiLocale === 'ru' && g.section_name_en) return g.section_name_en
  return g.section_name || g.section_name_en || g.group_name
}

/** 条目在列表里的展示名（单行摘要） */
export function finishItemDisplayLabel(item: FinishCardItem, uiLocale: AppLang): string {
  const d = (item.description || '').toString()
  if (uiLocale === 'en') {
    return (item.name_en || item.name_cn || d || item.code).toString().split('\n').pop() || item.code
  }
  if (uiLocale === 'zh') {
    return (item.name_cn || item.name_en || d || item.code).toString().split('\n')[0] || item.code
  }
  return (item.name_en || item.name_cn || d || item.code).toString().split('\n')[0] || item.code
}

/** 写入订单备注的简短码 + 标签 */
export function buildFinishOrderNote(item: FinishCardItem, uiLocale: AppLang): string {
  const label = finishItemDisplayLabel(item, uiLocale)
  return [item.code, label].filter(Boolean).join(' · ')
}

/**
 * 提交 `wheel_color_desc`：分区名 + 条目展示名 + 工艺/色调（若有）。
 */
export function buildWheelColorSelectionDesc(
  item: FinishCardItem,
  group: FinishCardGroup | undefined,
  uiLocale: AppLang,
): string {
  const parts: string[] = []
  if (group) {
    const sec = finishSectionLabel(group, uiLocale)
    if (sec) parts.push(sec)
  }
  const label = finishItemDisplayLabel(item, uiLocale)
  if (label) parts.push(label)
  for (const x of [item.tone_label, item.process_label]) {
    const s = String(x ?? '').trim()
    if (s && !parts.includes(s)) parts.push(s)
  }
  return parts.join(' · ')
}
