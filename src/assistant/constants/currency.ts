/** Currencies that use a familiar symbol prefix (e.g. $21). Others use CODE amount (e.g. PKR 23). */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';

let cachedRates: { rates: Record<string, number>; fetchedAt: number } | null =
  null;
const RATES_TTL_MS = 6 * 60 * 60 * 1000;

export async function fetchUsdExchangeRates(): Promise<Record<string, number>> {
  if (cachedRates && Date.now() - cachedRates.fetchedAt < RATES_TTL_MS) {
    return cachedRates.rates;
  }
  try {
    const response = await fetch(EXCHANGE_RATE_API);
    if (!response.ok) {
      return cachedRates?.rates ?? { USD: 1 };
    }
    const data = (await response.json()) as { rates?: Record<string, number> };
    const rates = data.rates ?? { USD: 1 };
    cachedRates = { rates, fetchedAt: Date.now() };
    return rates;
  } catch {
    return cachedRates?.rates ?? { USD: 1 };
  }
}

/** Convert a USD-base amount into the user's display currency. */
export function convertFromUsd(
  amountUsd: number,
  currencyCode: string,
  rates: Record<string, number>,
): number {
  const code = (currencyCode || 'USD').trim().toUpperCase() || 'USD';
  if (code === 'USD') return amountUsd;
  const rate = rates[code] ?? 1;
  return Math.round(amountUsd * rate * 100) / 100;
}

export function formatWealthAmount(
  amountUsd: number,
  currencyCode: string,
  rates: Record<string, number> = { USD: 1 },
) {
  const code = (currencyCode || 'USD').trim().toUpperCase() || 'USD';
  const converted = convertFromUsd(amountUsd, code, rates);
  const absolute = Math.abs(converted);
  const number = absolute.toLocaleString('en', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const symbol = CURRENCY_SYMBOLS[code];
  const formatted = symbol ? `${symbol}${number}` : `${code} ${number}`;
  if (converted < 0) return `-${formatted}`;
  return formatted;
}
