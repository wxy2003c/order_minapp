/**
 * 轮径/尺寸与后端一致：只传数字（如 `22`），表单项/详情中若含「英寸」、in 等会剥掉再比较或提交。
 */
export function normalizeInchDiamString(input: string | null | undefined): string {
  const s = String(input ?? '').trim()
  if (!s) return ''
  const m = s.match(/(\d+(?:\.\d+)?)/)
  return m ? m[1]! : ''
}
