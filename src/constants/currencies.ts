export interface CurrencyOption {
  code: string
  label: string
  symbol: string
}

export const DEFAULT_CURRENCIES: CurrencyOption[] = [
  { code: 'CNY', label: 'CNY', symbol: '¥' },
  { code: 'USD', label: 'USD', symbol: '$' },
  { code: 'EUR', label: 'EUR', symbol: '€' },
  { code: 'RUB', label: 'RUB', symbol: '₽' },
  { code: 'USDT', label: 'USDT', symbol: '₮' },
]

/** 与 `TgSelect` 的 `{ value, label }` 一致 */
export function currenciesToSelectOptions(
  list: CurrencyOption[] = DEFAULT_CURRENCIES,
): { value: string; label: string }[] {
  return list.map(c => ({
    value: c.code,
    label: `${c.symbol} ${c.label}`.trim(),
  }))
}
