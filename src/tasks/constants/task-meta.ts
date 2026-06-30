export const TASK_PRIORITIES = ['high', 'medium', 'low'] as const;

export type TaskPriorityValue = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const;

export type TaskStatusValue = (typeof TASK_STATUSES)[number];

export const TASK_FILTER_VALUES = [
  'all',
  'upcoming',
  'overdue',
  'completed',
  'undated',
] as const;

export type TaskFilterValue = (typeof TASK_FILTER_VALUES)[number];
