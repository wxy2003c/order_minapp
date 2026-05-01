import { ref, type Ref } from 'vue'
import { en } from './messages/en'
import { zh } from './messages/zh'
import { ru } from './messages/ru'
import { normalizeAppLangCode, setApiLangFromCode, type AppLang } from './apiLang'

const catalogs: Record<AppLang, typeof en> = { en, zh, ru }

/**
 * 当前 UI 语言（`en` | `zh` | `ru`），与请求参数 `lang` 一致。
 * 由 `applyLanguageFromTelegram(languageCode)` 更新；本项目启动时传入 `undefined` 即默认中文。
 * `document.documentElement.lang` 仅作无障碍镜像写入，不作为语言检测来源。
 */
export const uiLocale: Ref<AppLang> = ref('zh')

function getByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split('.')
  let cur: any = obj
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') {
      return undefined
    }
    cur = (cur as Record<string, unknown>)[p]
  }
  return typeof cur === 'string' ? cur : undefined
}

/** 点路径文案，如 `phoneAuth.title`；缺省回退到 en 再回退 key */
export function t(key: string): string {
  const _l = uiLocale.value
  const c = catalogs[_l]
  const s = getByPath(c, key) ?? getByPath(catalogs.en, key)
  return s ?? key
}

/** 由应用语言推导 `<html lang="...">`，仅用于可访问性，不作为语言检测来源 */
function htmlLangForUi(lang: AppLang): string {
  if (lang === 'zh') {
    return 'zh-CN'
  }
  if (lang === 'ru') {
    return 'ru'
  }
  return 'en'
}

/**
 * 使用 Telegram 用户 `language_code`（原始 BCP-47 字符串，来自 `initDataUnsafe.user`）设置：
 * API `lang`、`uiLocale`、并镜像写入 `document.documentElement.lang`（不参与读取）。
 */
export function applyLanguageFromTelegram(languageCode: string | undefined | null): void {
  const lang = normalizeAppLangCode(languageCode)
  setApiLangFromCode(languageCode)
  uiLocale.value = lang
  if (typeof document !== 'undefined') {
    document.documentElement.lang = htmlLangForUi(lang)
  }
}

/** 在首屏等场景，把已确定的 `uiLocale` 同步到 `<html lang>`；语言本身须已从 TG 或下方 fallback 设好。 */
export function initUiLanguage(): void {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.lang = htmlLangForUi(uiLocale.value)
}
