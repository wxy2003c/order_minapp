/*
 * @Author: wxy2003c 774078984@qq.com
 * @Date: 2026-04-23 16:42:06
 * @LastEditors: wxy2003c 774078984@qq.com
 * @LastEditTime: 2026-04-24 13:54:05
 * @FilePath: \vite-project\src\i18n\apiLang.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const STORAGE_KEY = 'app_api_lang'

/** 与后端约定的 `lang` 短码（BCP-47 primary 或项目约定） */
export type AppLang = 'en' | 'zh' | 'ru'

let apiLang: AppLang = 'zh'

/**
 * Telegram `language_code` 与 IETF BCP-47 标签可能为 `en-US`、`zh-Hans`、`ru` 等；
 * 取首段 primary language subtag 再映射到应用支持的语言；**无/空码时默认中文**。
 */
export function normalizeAppLangCode(code: string | undefined | null): AppLang {
  if (!code || typeof code !== 'string') {
    return 'zh'
  }
  const trimmed = code.trim()
  if (!trimmed) {
    return 'zh'
  }
  const primary = trimmed.split(/[-_]/)[0]!.toLowerCase()

  // 中文：zh 及常见汉语变体
  if (
    primary === 'zh'
    || primary === 'yue'
    || primary === 'cmn'
    || primary === 'wuu'
    || primary === 'nan'
  ) {
    return 'zh'
  }
  if (primary === 'en') {
    return 'en'
  }
  if (primary === 'ru') {
    return 'ru'
  }
  return 'zh'
}

export function getApiLang(): string {
  return apiLang
}

export function setApiLangFromCode(code: string | undefined | null): void {
  apiLang = normalizeAppLangCode(code)
  try {
    localStorage.setItem(STORAGE_KEY, apiLang)
  } catch {
    /* ignore */
  }
}

export function initApiLangFromStorage(): void {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s === 'en' || s === 'zh' || s === 'ru') {
      apiLang = s
    }
  } catch {
    /* ignore */
  }
}
