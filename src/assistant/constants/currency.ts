/** Currencies that use a familiar symbol prefix (e.g. $21). Others use CODE amount (e.g. PKR 23). */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function formatWealthAmount(amount: number, currencyCode: string) {
  const code = (currencyCode || 'USD').trim().toUpperCase() || 'USD';
  const absolute = Math.abs(amount);
  const number = absolute.toLocaleString('en', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const symbol = CURRENCY_SYMBOLS[code];
  const formatted = symbol ? `${symbol}${number}` : `${code} ${number}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
}
