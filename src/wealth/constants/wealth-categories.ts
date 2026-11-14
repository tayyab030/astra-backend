import { BadRequestException } from '@nestjs/common';
import {
  WEALTH_FARM_CATEGORIES,
  WEALTH_FARM_CATEGORY_VALUES,
  WEALTH_FARM_EXPENSE_CATEGORIES,
  WEALTH_FARM_EXPENSE_CATEGORY_VALUES,
  WEALTH_FARM_INCOME_CATEGORIES,
  WEALTH_FARM_INCOME_CATEGORY_VALUES,
} from './farm-categories';
import {
  DEFAULT_WEALTH_SCOPE,
  type WealthScope,
} from './wealth-scope';

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

export function getExpenseCategoriesForScope(scope: WealthScope) {
  return scope === 'farm'
    ? WEALTH_FARM_EXPENSE_CATEGORIES
    : WEALTH_EXPENSE_CATEGORIES;
}

export function getIncomeCategoriesForScope(scope: WealthScope) {
  return scope === 'farm'
    ? WEALTH_FARM_INCOME_CATEGORIES
    : WEALTH_INCOME_CATEGORIES;
}

export function getCategoryValuesForScope(scope: WealthScope): string[] {
  if (scope === 'farm') {
    return [...WEALTH_FARM_CATEGORY_VALUES];
  }
  return [...WEALTH_CATEGORY_VALUES];
}

export function getExpenseCategoryValuesForScope(scope: WealthScope): string[] {
  return scope === 'farm'
    ? [...WEALTH_FARM_EXPENSE_CATEGORY_VALUES]
    : [...WEALTH_EXPENSE_CATEGORY_VALUES];
}

export function isIncomeCategory(value: string, scope?: WealthScope) {
  if (scope === 'farm') {
    return (WEALTH_FARM_INCOME_CATEGORY_VALUES as readonly string[]).includes(
      value,
    );
  }
  if (scope === 'personal') {
    return (INCOME_CATEGORY_VALUES as readonly string[]).includes(value);
  }
  return (
    (INCOME_CATEGORY_VALUES as readonly string[]).includes(value) ||
    (WEALTH_FARM_INCOME_CATEGORY_VALUES as readonly string[]).includes(value)
  );
}

export function assertCategoryAllowedForScope(
  category: string,
  scope: WealthScope,
  options?: { expenseOnly?: boolean },
) {
  const allowed = options?.expenseOnly
    ? getExpenseCategoryValuesForScope(scope)
    : getCategoryValuesForScope(scope);

  if (!allowed.includes(category)) {
    throw new BadRequestException({
      category: [`Invalid category for ${scope} scope.`],
    });
  }
}

export function getCategoryLabel(value: string, scope?: WealthScope) {
  if (value === LEGACY_INCOME_CATEGORY) {
    return 'Income';
  }

  if (scope === 'farm' || !scope) {
    const farmMatch = WEALTH_FARM_CATEGORIES.find(
      (category) => category.value === value,
    );
    if (farmMatch) return farmMatch.label;
  }

  if (scope === 'personal' || !scope) {
    const personalMatch = WEALTH_CATEGORIES.find(
      (category) => category.value === value,
    );
    if (personalMatch) return personalMatch.label;
  }

  return value;
}

export function getCategoryValue(
  label: string,
  scope: WealthScope = DEFAULT_WEALTH_SCOPE,
): string {
  const list =
    scope === 'farm' ? WEALTH_FARM_CATEGORIES : WEALTH_CATEGORIES;
  const match = list.find((category) => category.label === label);
  if (match) {
    return match.value;
  }

  if (scope === 'personal' && label === 'Income') {
    return LEGACY_INCOME_CATEGORY;
  }

  return 'other';
}

export { DEFAULT_WEALTH_SCOPE };
export type { WealthScope };
