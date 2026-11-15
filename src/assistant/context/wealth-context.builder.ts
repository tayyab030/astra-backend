import { CURRENCY_SYMBOLS, formatWealthAmount } from '../constants/currency';

type WealthDashboardLike = {
  filter:
    | { mode: 'month'; year: number; month: number }
    | { mode: 'year'; start_year: number; end_year: number };
  net_worth: number;
  monthly_income: number;
  monthly_expenses: number;
  net_savings: number;
  waste_spending: number;
  transactions: Array<{
    description: string;
    amount: number;
    category: string;
    date: string;
  }>;
  category_totals: Array<{ label: string; total: number }>;
  category_budgets: Array<{
    label: string;
    limit: number;
    spent: number;
    remaining: number;
    status: string;
  }>;
};

export type WealthContextOptions = {
  /** personal = Life OS wealth; farm = FarmPilot / farm ledger */
  scope?: 'personal' | 'farm';
  /**
   * When true, amounts are already in the user currency (no USD FX).
   * Farm wealth is always as-entered.
   */
  asEntered?: boolean;
};

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString('en', {
    month: 'long',
    year: 'numeric',
  });
}

function formatAsEntered(amount: number, currencyCode: string) {
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

export function buildWealthContextBlock(
  dashboard: WealthDashboardLike,
  currencyCode: string,
  rates: Record<string, number> = { USD: 1 },
  options: WealthContextOptions = {},
): string {
  const currency = (currencyCode || 'USD').trim().toUpperCase() || 'USD';
  const scope = options.scope ?? 'personal';
  const asEntered = options.asEntered ?? scope === 'farm';
  const money = (value: number) =>
    asEntered
      ? formatAsEntered(value, currency)
      : formatWealthAmount(value, currency, rates);

  const filter =
    dashboard.filter.mode === 'month'
      ? monthLabel(dashboard.filter.year, dashboard.filter.month)
      : `${dashboard.filter.start_year}–${dashboard.filter.end_year}`;

  const categories = [...dashboard.category_totals]
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    .slice(0, 10)
    .map((item) => `${item.label}: ${money(item.total)}`)
    .join('; ');

  const budgets = dashboard.category_budgets
    .slice(0, 12)
    .map(
      (budget) =>
        `${budget.label}: spent ${money(budget.spent)} of ${money(budget.limit)} (${budget.status}, ${money(budget.remaining)} remaining)`,
    )
    .join('; ');

  const recent = [...dashboard.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20)
    .map(
      (tx) =>
        `${tx.date}: ${tx.description || 'Transaction'} (${tx.category}) ${money(tx.amount)}`,
    )
    .join('; ');

  const scopeTitle =
    scope === 'farm' ? 'FARM WEALTH CONTEXT' : 'PERSONAL WEALTH CONTEXT';
  const scopeHint =
    scope === 'farm'
      ? 'This is the farm ledger (FarmPilot): livestock purchases/losses, feed, farm sales, etc. Keep it separate from personal wealth.'
      : 'This is personal Life OS wealth. Keep it separate from farm wealth.';

  return [
    `${scopeTitle} (live data for the signed-in user only).`,
    scopeHint,
    'This block belongs exclusively to the authenticated user of this session.',
    'Never use it to describe another person\'s finances.',
    'Use only these figures for wealth questions in this scope. Do not invent missing numbers.',
    'Net worth here means all-time income minus all-time expenses in this scope.',
    asEntered
      ? `All amounts below are as entered in ${currency} (no FX conversion).`
      : `All amounts below are already converted to the user currency ${currency}.`,
    `Always write money using ${currency} (e.g. ${currency === 'USD' ? '$21' : `${currency} 23`}). Never use $ or USD unless currency is USD.`,
    `Currency code: ${currency}.`,
    `Wealth scope: ${scope}.`,
    `Period: ${filter}`,
    `Net worth (all-time income minus expenses): ${money(dashboard.net_worth)}`,
    `Period income: ${money(dashboard.monthly_income)}`,
    `Period expenses: ${money(dashboard.monthly_expenses)}`,
    `Period net savings: ${money(dashboard.net_savings)}`,
    `Waste spending: ${money(dashboard.waste_spending)}`,
    categories ? `Category totals: ${categories}` : 'Category totals: none',
    budgets ? `Budgets: ${budgets}` : 'Budgets: none set',
    recent ? `Recent transactions: ${recent}` : 'Recent transactions: none',
  ].join('\n');
}
