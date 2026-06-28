export const WEALTH_EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Food & Dining' },
  { value: 'transport', label: 'Transportation' },
  { value: 'housing', label: 'Housing' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'waste', label: 'Waste Spending' },
  { value: 'other', label: 'Other' },
] as const;

export const WEALTH_INCOME_CATEGORIES = [
  { value: 'salary', label: 'Salary' },
  { value: 'freelancing', label: 'Freelancing' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'gift', label: 'Gift' },
  { value: 'income_other', label: 'Other' },
] as const;

/** @deprecated Legacy single income category — kept for existing records */
export const LEGACY_INCOME_CATEGORY = 'income' as const;

export const WEALTH_CATEGORIES = [
  ...WEALTH_EXPENSE_CATEGORIES,
  ...WEALTH_INCOME_CATEGORIES,
] as const;

export type WealthCategoryValue =
  | (typeof WEALTH_CATEGORIES)[number]['value']
  | typeof LEGACY_INCOME_CATEGORY;
export type WealthExpenseCategoryValue =
  (typeof WEALTH_EXPENSE_CATEGORIES)[number]['value'];
export type WealthIncomeCategoryValue =
  (typeof WEALTH_INCOME_CATEGORIES)[number]['value'];

export const WEALTH_CATEGORY_VALUES = [
  ...WEALTH_CATEGORIES.map((category) => category.value),
  LEGACY_INCOME_CATEGORY,
];

export const WEALTH_EXPENSE_CATEGORY_VALUES = WEALTH_EXPENSE_CATEGORIES.map(
  (category) => category.value,
);

export const INCOME_CATEGORY_VALUES = [
  ...WEALTH_INCOME_CATEGORIES.map((category) => category.value),
  LEGACY_INCOME_CATEGORY,
];

export function isIncomeCategory(value: string) {
  return (INCOME_CATEGORY_VALUES as readonly string[]).includes(value);
}

export function getCategoryLabel(value: string) {
  if (value === LEGACY_INCOME_CATEGORY) {
    return 'Income';
  }

  return (
    WEALTH_CATEGORIES.find((category) => category.value === value)?.label ??
    value
  );
}

export function getCategoryValue(label: string): WealthCategoryValue {
  const match = WEALTH_CATEGORIES.find((category) => category.label === label);
  if (match) {
    return match.value;
  }

  if (label === 'Income') {
    return LEGACY_INCOME_CATEGORY as WealthCategoryValue;
  }

  return 'other';
}
