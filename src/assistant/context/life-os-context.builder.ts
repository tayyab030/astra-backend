/** Compact LIFE OS context blocks for the signed-in user only. */

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function assistantDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatLocalDate(date);
}

export function assistantTodayDate(): string {
  return formatLocalDate(new Date());
}

function stripToPlain(text: string, max = 120): string {
  const plain = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1)}…`;
}

function secondsLabel(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

type TaskRow = {
  title: string;
  completed: boolean;
  priority: string;
  status: string;
  due_date: string | null;
  due_date_label?: string | null;
  project_title?: string | null;
  goal_title?: string | null;
};

type ProjectRow = {
  title: string;
  starred?: boolean;
  tasks_due_soon?: number;
  linked_tasks?: { total: number; completed: number; pending: number };
};

export function buildTasksContextBlock(
  summary: {
    total: number;
    upcoming: number;
    overdue: number;
    completed: number;
    undated: number;
  },
  tasks: TaskRow[],
  projects: ProjectRow[] = [],
): string {
  const open = tasks
    .filter((task) => !task.completed)
    .slice(0, 25)
    .map((task) => {
      const due = task.due_date_label || task.due_date || 'no due date';
      const link = task.project_title
        ? `project ${task.project_title}`
        : task.goal_title
          ? `goal ${task.goal_title}`
          : 'unlinked';
      return `${task.title} [${task.status}/${task.priority}, due ${due}, ${link}]`;
    })
    .join('; ');

  const projectLine = projects
    .slice(0, 15)
    .map((project) => {
      const count =
        typeof project.linked_tasks?.total === 'number'
          ? `${project.linked_tasks.total} tasks`
          : '';
      const soon =
        typeof project.tasks_due_soon === 'number' && project.tasks_due_soon > 0
          ? `${project.tasks_due_soon} due soon`
          : '';
      const extra = [count, soon].filter(Boolean).join(', ');
      return `${project.title}${project.starred ? ' ★' : ''}${extra ? ` (${extra})` : ''}`;
    })
    .join('; ');

  return [
    'TASKS CONTEXT (live data for the signed-in user only).',
    'Answer task and project questions from this block. Do not invent tasks.',
    `Summary: ${summary.total} total, ${summary.upcoming} upcoming, ${summary.overdue} overdue, ${summary.completed} completed, ${summary.undated} undated.`,
    open ? `Open tasks: ${open}` : 'Open tasks: none',
    projectLine ? `Projects: ${projectLine}` : 'Projects: none',
  ].join('\n');
}

type GoalRow = {
  title: string;
  category_label?: string;
  category?: string;
  priority: string;
  progress: number;
  streak: number;
  start_date: string;
  target_date: string;
  motivation?: string;
  milestones?: Array<{ title: string; completed: boolean; due_date: string }>;
  linked_tasks?: { total: number; completed: number; pending: number };
};

export function buildGoalsContextBlock(
  summary: {
    active_goals: number;
    high_priority_active: number;
    avg_progress: number;
    longest_streak: number;
    completed_goals: number;
  },
  goals: GoalRow[],
): string {
  const lines = goals.slice(0, 20).map((goal) => {
    const category = goal.category_label || goal.category || 'uncategorized';
    const milestones = (goal.milestones ?? [])
      .slice(0, 6)
      .map((m) => `${m.title}${m.completed ? ' ✓' : ''}`)
      .join(', ');
    const linked = goal.linked_tasks
      ? `linked tasks ${goal.linked_tasks.completed}/${goal.linked_tasks.total}`
      : null;
    return `${goal.title} (${category}, ${goal.priority}, ${goal.progress}%, streak ${goal.streak}, ${goal.start_date}→${goal.target_date}${linked ? `, ${linked}` : ''}${milestones ? `; milestones: ${milestones}` : ''})`;
  });

  return [
    'GOALS CONTEXT (live data for the signed-in user only).',
    'Answer goal questions from this block. Do not invent goals or progress.',
    `Summary: ${summary.active_goals} active, ${summary.completed_goals} completed, avg progress ${summary.avg_progress}%, high-priority active ${summary.high_priority_active}, longest streak ${summary.longest_streak}.`,
    lines.length ? `Goals: ${lines.join('; ')}` : 'Goals: none',
  ].join('\n');
}

type HabitRow = {
  name: string;
  streak: number;
  target: number;
  current: number;
  completed: boolean;
  frequency: string;
  domain?: string | null;
  priority?: string;
  cannot_do?: boolean;
};

export function buildHabitsContextBlock(habits: HabitRow[]): string {
  const lines = habits.slice(0, 30).map((habit) => {
    const status = habit.completed
      ? 'done today'
      : habit.cannot_do
        ? 'cannot do'
        : `${habit.current}/${habit.target}`;
    return `${habit.name} (${habit.frequency}, streak ${habit.streak}, ${status}${habit.domain ? `, ${habit.domain}` : ''}${habit.priority ? `, ${habit.priority}` : ''})`;
  });

  const done = habits.filter((h) => h.completed).length;

  return [
    'HABITS CONTEXT (live data for the signed-in user only).',
    'Answer habit questions from this block. Do not invent habits.',
    `Today: ${done}/${habits.length} completed.`,
    lines.length ? `Habits: ${lines.join('; ')}` : 'Habits: none',
  ].join('\n');
}

type HealthDashboardLike = {
  health_score?: number;
  latest_weight_kg: number | null;
  profile: { height_cm: number | null; ideal_weight_kg: number | null };
  targets: {
    water_glasses: number;
    sleep_hours: number;
    exercise_minutes: number;
  };
  today: {
    water_glasses: number;
    sleep_hours: number;
    exercise_minutes: number;
  };
  mood_today?: { mood: string; notes: string };
  weight_log?: Array<{ date: string; weight_kg: number }>;
  workouts?: Array<{ date: string; type?: string; duration?: number }>;
  summary?: Record<string, unknown>;
};

export function buildHealthContextBlock(dashboard: HealthDashboardLike): string {
  const recentWeights = (dashboard.weight_log ?? [])
    .slice(-7)
    .map((entry) => `${entry.date}: ${entry.weight_kg}kg`)
    .join('; ');

  const recentWorkouts = (dashboard.workouts ?? [])
    .slice(0, 8)
    .map((workout) => {
      const name = workout.type || 'Workout';
      const mins =
        typeof workout.duration === 'number' ? ` ${workout.duration}m` : '';
      return `${workout.date}: ${name}${mins}`;
    })
    .join('; ');

  const mood = dashboard.mood_today?.mood
    ? `Mood today: ${dashboard.mood_today.mood}${dashboard.mood_today.notes ? ` (${stripToPlain(dashboard.mood_today.notes, 80)})` : ''}.`
    : 'Mood today: not logged.';

  return [
    'HEALTH CONTEXT (live data for the signed-in user only).',
    'Answer health questions from this block. Do not invent metrics.',
    typeof dashboard.health_score === 'number'
      ? `Health score: ${dashboard.health_score}.`
      : null,
    `Profile: height ${dashboard.profile.height_cm ?? 'unknown'} cm, ideal weight ${dashboard.profile.ideal_weight_kg ?? 'unknown'} kg, latest weight ${dashboard.latest_weight_kg ?? 'unknown'} kg.`,
    `Targets: water ${dashboard.targets.water_glasses} glasses, sleep ${dashboard.targets.sleep_hours}h, exercise ${dashboard.targets.exercise_minutes}m.`,
    `Today: water ${dashboard.today.water_glasses}, sleep ${dashboard.today.sleep_hours}h, exercise ${dashboard.today.exercise_minutes}m.`,
    mood,
    recentWeights ? `Recent weights: ${recentWeights}` : 'Recent weights: none',
    recentWorkouts
      ? `Recent workouts: ${recentWorkouts}`
      : 'Recent workouts: none',
  ]
    .filter(Boolean)
    .join('\n');
}

type NoteRow = {
  title: string;
  note_type: string;
  category: string;
  tags?: string[];
  priority: string;
  status: string;
  is_favorite?: boolean;
  is_pinned?: boolean;
  content?: string;
  updated_at?: string;
};

export function buildNotesContextBlock(
  stats: { total_notes: number; notes_this_week?: number },
  notes: NoteRow[],
): string {
  const lines = notes.slice(0, 20).map((note) => {
    const tags = (note.tags ?? []).slice(0, 5).join(', ');
    const preview = note.content ? stripToPlain(note.content, 100) : '';
    return `${note.title} [${note.note_type}/${note.category}/${note.status}${note.is_pinned ? '/pinned' : ''}${note.is_favorite ? '/fav' : ''}${tags ? `; tags: ${tags}` : ''}${preview ? `; ${preview}` : ''}]`;
  });

  return [
    'NOTES CONTEXT (live data for the signed-in user only).',
    'Answer notes questions from titles and previews here. Do not invent notes.',
    `Stats: ${stats.total_notes} active notes${typeof stats.notes_this_week === 'number' ? `, ${stats.notes_this_week} this week` : ''}.`,
    lines.length ? `Recent notes: ${lines.join('; ')}` : 'Recent notes: none',
  ].join('\n');
}

type TimeEntryRow = {
  task_title: string;
  date: string;
  duration_seconds: number;
};

type TrackedTaskRow = {
  title?: string;
  task_title?: string;
  total_seconds_today?: number;
  tracked_seconds?: number;
  duration_seconds?: number;
};

export function buildTimeTrackContextBlock(dashboard: {
  filter: { start_date: string; end_date: string };
  weekly_target?: { hours_per_week: number };
  summary: {
    total_seconds: number;
    today_total_seconds: number;
    session_count: number;
  };
  entries: TimeEntryRow[];
  tracked_tasks?: TrackedTaskRow[];
}): string {
  const recent = [...dashboard.entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 15)
    .map(
      (entry) =>
        `${entry.date}: ${entry.task_title} ${secondsLabel(entry.duration_seconds)}`,
    )
    .join('; ');

  const tracked = (dashboard.tracked_tasks ?? [])
    .slice(0, 12)
    .map((task) => {
      const title = task.title || task.task_title || 'Task';
      const seconds =
        task.total_seconds_today ??
        task.tracked_seconds ??
        task.duration_seconds ??
        0;
      return `${title} ${secondsLabel(seconds)}`;
    })
    .join('; ');

  const target = dashboard.weekly_target?.hours_per_week;

  return [
    'TIME TRACK CONTEXT (live data for the signed-in user only).',
    'Answer time-tracking questions from this block. Do not invent sessions.',
    `Period: ${dashboard.filter.start_date} → ${dashboard.filter.end_date}.`,
    typeof target === 'number' ? `Weekly target: ${target}h.` : null,
    `Summary: ${secondsLabel(dashboard.summary.total_seconds)} in period, ${secondsLabel(dashboard.summary.today_total_seconds)} today, ${dashboard.summary.session_count} sessions.`,
    tracked ? `Tracked today: ${tracked}` : 'Tracked today: none',
    recent ? `Recent sessions: ${recent}` : 'Recent sessions: none',
  ]
    .filter(Boolean)
    .join('\n');
}
