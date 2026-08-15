export const NOTE_TYPES = [
  'quick-notes',
  'knowledge',
  'research',
  'ideas',
  'decision-journal',
  'lessons-learned',
  'meetings',
  'daily-journal',
  'vision',
  'book-notes',
] as const;

export const NOTE_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export const NOTE_STATUSES = [
  'draft',
  'active',
  'completed',
  'archived',
  'deleted',
] as const;

export const NOTE_VISIBILITIES = ['private', 'shared', 'public'] as const;

export const NOTE_SORT_FIELDS = [
  'updated_at',
  'created_at',
  'title',
  'priority',
] as const;
