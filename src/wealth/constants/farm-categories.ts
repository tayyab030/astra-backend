export const WEALTH_FARM_EXPENSE_CATEGORIES = [
  { value: 'feed', label: 'Feed' },
  { value: 'vet', label: 'Veterinary / Health' },
  { value: 'labor', label: 'Labor / Salaries' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'transport', label: 'Transportation' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'livestock', label: 'Livestock Purchase' },
  { value: 'livestock_loss', label: 'Livestock Loss' },
  { value: 'other', label: 'Miscellaneous' },
] as const;

export const WEALTH_FARM_INCOME_CATEGORIES = [
  { value: 'milk_sales', label: 'Milk Sales' },
  { value: 'egg_sales', label: 'Egg Sales' },
  { value: 'livestock_sales', label: 'Livestock Sales' },
  { value: 'crop_sales', label: 'Crop Sales' },
] as const;

export const WEALTH_FARM_CATEGORIES = [
  ...WEALTH_FARM_EXPENSE_CATEGORIES,
  ...WEALTH_FARM_INCOME_CATEGORIES,
] as const;

export type WealthFarmExpenseCategoryValue =
  (typeof WEALTH_FARM_EXPENSE_CATEGORIES)[number]['value'];
export type WealthFarmIncomeCategoryValue =
  (typeof WEALTH_FARM_INCOME_CATEGORIES)[number]['value'];

export const WEALTH_FARM_EXPENSE_CATEGORY_VALUES =
  WEALTH_FARM_EXPENSE_CATEGORIES.map((category) => category.value);

export const WEALTH_FARM_INCOME_CATEGORY_VALUES =
  WEALTH_FARM_INCOME_CATEGORIES.map((category) => category.value);

export const WEALTH_FARM_CATEGORY_VALUES = [
  ...WEALTH_FARM_EXPENSE_CATEGORY_VALUES,
  ...WEALTH_FARM_INCOME_CATEGORY_VALUES,
];
