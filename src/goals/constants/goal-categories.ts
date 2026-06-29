export const GOAL_CATEGORIES = [
  { value: 'wealth', label: 'Wealth' },
  { value: 'health', label: 'Health' },
  { value: 'work', label: 'Work' },
  { value: 'knowledge', label: 'Knowledge' },
  { value: 'relationships', label: 'Relationships' },
] as const;

export const GOAL_PRIORITIES = ['high', 'medium', 'low'] as const;

export type GoalCategoryValue = (typeof GOAL_CATEGORIES)[number]['value'];
export type GoalPriorityValue = (typeof GOAL_PRIORITIES)[number];

export const GOAL_CATEGORY_VALUES = GOAL_CATEGORIES.map(
  (category) => category.value,
);

export function getGoalCategoryLabel(value: string) {
  return (
    GOAL_CATEGORIES.find((category) => category.value === value)?.label ??
    value
  );
}
