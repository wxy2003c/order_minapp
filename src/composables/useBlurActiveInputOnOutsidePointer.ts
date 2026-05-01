import { onMounted, onUnmounted } from 'vue'

/**
 * iOS Safari / Telegram WebView：点击空白处常不把键盘收起（input 不失焦）。
 * 在 document 捕获阶段对「非表单目标」的统一处理里对当前 text-like 控件 `blur()`。
 */
function targetIsFormInteraction(el: EventTarget | null): boolean {
  if (!el || !(el instanceof Element)) return false
  if (el.closest('input, textarea, select, [contenteditable="true"]')) return true
  /** Naive：`NSelect` 筛选框、`NInput` 装饰层内的真实 input 已含于上式；保留组合框外壳避免误伤 */
  if (el.closest('[role="combobox"], [role="listbox"], [role="option"], .n-base-select-menu'))
    return true
  return false
}

function shouldBlurActiveField(el: HTMLElement): boolean {
  const tag = el.tagName
  if (tag !== 'INPUT' && tag !== 'TEXTAREA') return false
  if (tag === 'INPUT') {
    const t = (el as HTMLInputElement).type
    if (['button', 'checkbox', 'radio', 'submit', 'file', 'hidden', 'range', 'color'].includes(t))
      return false
  }
  return true
}

function blurActiveTextFieldIfNeeded(e: Event) {
  if (targetIsFormInteraction(e.target)) return
  const ae = document.activeElement
  if (!ae || !(ae instanceof HTMLElement)) return
  if (!shouldBlurActiveField(ae)) return
  ae.blur()
}

export function useBlurActiveInputOnOutsidePointer() {
  onMounted(() => {
    document.addEventListener('pointerdown', blurActiveTextFieldIfNeeded, { capture: true })
    document.addEventListener('touchstart', blurActiveTextFieldIfNeeded, { capture: true, passive: true })
  })
  onUnmounted(() => {
    document.removeEventListener('pointerdown', blurActiveTextFieldIfNeeded, { capture: true })
    document.removeEventListener('touchstart', blurActiveTextFieldIfNeeded, { capture: true })
  })
}
