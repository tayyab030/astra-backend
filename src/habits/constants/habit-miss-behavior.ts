export const HABIT_MISS_BEHAVIORS = ['carry', 'reset'] as const;

export type HabitMissBehavior = (typeof HABIT_MISS_BEHAVIORS)[number];

/** Missed days stay due until done (or marked cannot-do). Completing late is marked late. */
export const DEFAULT_HABIT_MISS_BEHAVIOR: HabitMissBehavior = 'carry';

export function isHabitMissBehavior(
  value: string | null | undefined,
): value is HabitMissBehavior {
  return !!value && (HABIT_MISS_BEHAVIORS as readonly string[]).includes(value);
}
