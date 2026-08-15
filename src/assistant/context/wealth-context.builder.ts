import { formatWealthAmount } from '../constants/currency';

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

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString('en', {
    month: 'long',
    year: 'numeric',
  });
}

export function buildWealthContextBlock(
  dashboard: WealthDashboardLike,
  currencyCode: string,
): string {
  const currency = (currencyCode || 'USD').trim().toUpperCase() || 'USD';
  const money = (value: number) => formatWealthAmount(value, currency);

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
    .slice(0, 12)
    .map(
      (tx) =>
        `${tx.date}: ${tx.description || 'Transaction'} (${tx.category}) ${money(tx.amount)}`,
    )
    .join('; ');

  return [
    'WEALTH CONTEXT (live data for the signed-in user only).',
    'This block belongs exclusively to the authenticated user of this session.',
    'Never use it to describe another person\'s finances.',
    'Use only these figures for wealth questions. Do not invent missing numbers.',
    'Net worth here means all-time income minus all-time expenses in Astra.',
    `All amounts use the user currency ${currency}. Format like $21 or PKR 23.`,
    `Currency code: ${currency}.`,
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
