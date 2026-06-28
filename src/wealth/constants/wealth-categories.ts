export const WEALTH_CATEGORIES = [
  { value: 'food', label: 'Food & Dining' },
  { value: 'transport', label: 'Transportation' },
  { value: 'housing', label: 'Housing' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'waste', label: 'Waste Spending' },
  { value: 'other', label: 'Other' },
  { value: 'income', label: 'Income' },
] as const;

export type WealthCategoryValue = (typeof WEALTH_CATEGORIES)[number]['value'];

export const WEALTH_CATEGORY_VALUES = WEALTH_CATEGORIES.map(
  (category) => category.value,
);

export function getCategoryLabel(value: string) {
  return (
    WEALTH_CATEGORIES.find((category) => category.value === value)?.label ??
    value
  );
}

export function getCategoryValue(label: string): WealthCategoryValue {
  return (
    WEALTH_CATEGORIES.find((category) => category.label === label)?.value ??
    'other'
  );
}
