const STORAGE_KEY = 'app_api_lang'

/** 与后端约定的 `lang` 短码（BCP-47 primary 或项目约定） */
export type AppLang = 'en' | 'zh' | 'ru'

let apiLang: AppLang = 'en'

/**
 * Telegram `language_code` 与 IETF BCP-47 标签可能为 `en-US`、`zh-Hans`、`ru` 等；
 * 取首段 primary language subtag 再映射到应用支持的语言，默认 en。
 */
export function normalizeAppLangCode(code: string | undefined | null): AppLang {
  if (!code || typeof code !== 'string') {
    return 'en'
  }
  const trimmed = code.trim()
  if (!trimmed) {
    return 'en'
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
  return 'en'
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
