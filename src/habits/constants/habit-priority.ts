export const HABIT_PRIORITIES = ['high', 'medium', 'low'] as const;

export type HabitPriority = (typeof HABIT_PRIORITIES)[number];

export const DEFAULT_HABIT_PRIORITY: HabitPriority = 'medium';

export function isHabitPriority(
  value: string | null | undefined,
): value is HabitPriority {
  return !!value && (HABIT_PRIORITIES as readonly string[]).includes(value);
}

/** Map legacy is_required flag into priority when priority is missing. */
export function priorityFromLegacyRequired(
  isRequired: boolean | null | undefined,
): HabitPriority {
  return isRequired === false ? 'low' : 'medium';
}
