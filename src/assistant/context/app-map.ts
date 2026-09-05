/**
 * Single source of truth for what exists in the Astra web and mobile clients.
 *
 * Rendered into the assistant's APP KNOWLEDGE block by `app-knowledge.builder.ts`
 * so Astra can answer "where is X" and "how do I add Y" with real screen names,
 * button labels, and deep links.
 *
 * Keep entries short: this ships in the system prompt of every chat message.
 * See `.cursor/rules/astra-ai-app-knowledge.mdc` before changing client UI.
 */

/** Omit `platform` when a surface exists identically on web and mobile. */
export type AppPlatform = 'web' | 'mobile';

export type AppAction = {
  /** The label the user actually sees on the button. */
  label: string;
  /** Deep link that opens the action. `?tab=` selects a tab, `?action=` opens a create form. */
  path: string;
};

export type AppSurface = {
  name: string;
  path: string;
  summary: string;
  platform?: AppPlatform;
  tabs?: string[];
  actions?: AppAction[];
  /** Extra facts worth answering, e.g. which settings tab holds which setting. */
  notes?: string[];
};

export const APP_DEEP_LINK_CONVENTION =
  '?tab=<tab> selects a tab and ?action=<name> opens a create form, e.g. /app/wealth?tab=transactions&action=add.';

export const APP_MODULES: AppSurface[] = [
  {
    name: 'Dashboard',
    path: '/app/dashboard',
    summary:
      'home screen with greeting, GPS current location, daily quote, life score badge, stat cards, habits snapshot, expense chart, AI insights, and the Quick Actions grid',
    notes: [
      'The Quick Actions grid is the fastest route to every create form listed below.',
      'Current location uses device GPS (when permission is granted) and appears under the greeting on mobile.',
    ],
  },
  {
    name: 'Tasks',
    path: '/app/tasks',
    summary:
      'task hub with My Tasks, a preview of goals, and the projects grid',
    tabs: ['Upcoming', 'Overdue', 'No date', 'Completed'],
    actions: [
      { label: 'Create task', path: '/app/tasks?action=create' },
      { label: 'Create Project', path: '/app/tasks' },
    ],
    notes: [
      'Task fields: title, description, due date, priority, status, optional link to a project or goal.',
      'Edit and delete via the pencil and trash icons on a task row.',
    ],
  },
  {
    name: 'Project and goal tasks',
    path: '/app/tasks/{projectId} and /app/tasks/goals/{goalId}',
    summary:
      'tasks for one project or one goal, opened by tapping its card on the Tasks page',
    tabs: ['List', 'Board', 'Calendar', 'Dashboard'],
    actions: [{ label: 'Create Task', path: '/app/tasks/{projectId}' }],
  },
  {
    name: 'Time Track',
    path: '/app/time-track',
    summary: 'start and stop timers on tasks and review tracked time',
    tabs: ['Timer', 'Dashboard', 'Reports', 'Patterns', 'Weekly', 'Settings'],
    actions: [
      {
        label: 'Add Task',
        path: '/app/time-track?tab=timer&action=add-task',
      },
    ],
    notes: [
      'Delete a time record from the Reports tab.',
      'Weekly hour target lives on the Weekly tab; the floating activity bar is toggled on the Settings tab.',
    ],
  },
  {
    name: 'Goals',
    path: '/app/goals',
    summary:
      'goal dashboard with filters, summary cards, AI insights, and the life balance wheel',
    actions: [{ label: 'Add Goal', path: '/app/goals?action=add' }],
    notes: [
      'Goal fields: title, category (Wealth, Health, Work, Knowledge, Relationships), priority, motivation, start and target dates, milestones.',
      'Edit and delete via the goal card menu.',
    ],
  },
  {
    name: 'Wealth',
    path: '/app/wealth',
    summary: 'money hub for transactions, budgets, and category breakdowns',
    tabs: ['Overview', 'Budget', 'Categories', 'Transactions'],
    actions: [
      {
        label: 'Add Transaction',
        path: '/app/wealth?tab=transactions&action=add',
      },
      { label: 'Set Limit', path: '/app/wealth?tab=budget&action=set-limit' },
    ],
    notes: [
      'Transaction fields: description, amount, category, date.',
      'Budget limit fields: category, amount, period (month or year).',
    ],
  },
  {
    name: 'Health',
    path: '/app/health',
    summary: 'weight, water, sleep, exercise, workouts, and mood tracking',
    tabs: [
      'Overview',
      'Weight',
      'Tracking',
      'Exercise',
      'Wellness',
      'Insights (web only)',
    ],
    actions: [
      { label: "Log today's weight", path: '/app/health?tab=weight' },
      {
        label: 'Log Workout',
        path: '/app/health?tab=exercise&action=log-workout',
      },
      { label: 'Save Mood Check-in', path: '/app/health?tab=wellness' },
      { label: 'Add sleep', path: '/app/health?tab=tracking' },
    ],
    notes: [
      'Water, sleep, and exercise use stepper cards on the Tracking tab.',
      'Height, ideal weight, and BMI are on the Weight tab.',
      'Workout fields: type (Cardio, Strength, Flexibility, Sports, Yoga), duration, optional calories.',
    ],
  },
  {
    name: 'Habits',
    path: '/app/habits',
    summary: 'daily habit tracking with date navigation and missed-habit review',
    tabs: ['Overview', 'Habits', 'Missed'],
    actions: [{ label: 'Add Habit', path: '/app/habits?action=add' }],
    notes: [
      'Create either a single habit or a habit pack.',
      'Habit fields: name, metric type (checkbox, count, duration), schedule, priority, and miss behaviour (carry or reset).',
      'Tick the checkbox on a habit row to complete it.',
    ],
  },
  {
    name: 'Prayer',
    path: '/app/prayer',
    summary:
      'daily salah times, completion tracking, and Adhan alerts from Aladhan GPS location',
    tabs: ['Times', 'Track', 'Analysis'],
    notes: [
      'Tabs: Times (?tab=times), Track (?tab=track), Analysis (?tab=analysis).',
      'Use the Calculation method dropdown on Times to pick a method (e.g. University of Islamic Sciences, Karachi). Times appear after a method is selected.',
      'Uses the same device/browser location source as the Dashboard. If location is missing or denied, the page shows an empty state.',
      'Times shows Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha, Imsak, Midnight, First Third, and Tahajjud (Last Third), plus Hijri date when available.',
      'Adhan toggle on Times (and Track) enables local notifications for selected prayers (Fajr–Isha by default; Tahajjud optional).',
      'Track: mark Fajr, Dhuhr, Asr, Maghrib, Isha, and Tahajjud (Lastthird) complete for today or past days. Future prayer times are locked; after a prayer starts you choose On time or Qaza. Tahajjud is only trackable between Last Third and Fajr.',
      'Analysis: completion % and bar chart for the last 7 or 30 days.',
      'Current prayer card appears only while a prayer window is active, with time left until the next.',
    ],
  },
  {
    name: 'Notes',
    path: '/app/notes',
    summary: 'note library organised by type, with filters and an editor',
    tabs: [
      'All Notes',
      'Quick Notes',
      'Knowledge',
      'Research',
      'Ideas',
      'Decision Journal',
      'Lessons Learned',
      'Meetings',
      'Daily Journal',
      'Vision',
      'Book Notes',
      'Archive',
    ],
    actions: [
      { label: 'New Note', path: '/app/notes?action=create' },
      {
        label: 'Quick Note',
        path: '/app/notes?tab=quick-notes&action=create',
      },
    ],
    notes: [
      'Sidebar filters: Favorites, Pinned, Has Reminder, Has Attachments, Recycle Bin.',
    ],
  },
  {
    name: 'Assistant',
    path: '/app/assistant',
    summary:
      'this chat, with conversation history, voice input, and spoken replies',
    actions: [{ label: 'New chat', path: '/app/assistant' }],
    notes: ['Rename and delete conversations from the history sidebar.'],
  },
  {
    name: 'Communication',
    path: '/app/communication',
    platform: 'mobile',
    summary: 'on-device alert inbox with a shortcut to alert preferences',
  },
  {
    name: 'Analytics',
    path: '/app/analytics',
    summary: 'cross-module analytics with AI insight panels',
    tabs: ['Daily', 'Weekly', 'Monthly'],
  },
  {
    name: 'Life Score',
    path: '/app/life-score',
    summary: 'weighted life score breakdown by day, week, or month',
  },
  {
    name: 'Settings',
    path: '/app/settings',
    summary: 'account control centre',
    tabs: [
      'Profile',
      'Theme',
      'Modules',
      'Alerts',
      'AI',
      'Security',
      'Connect (web only)',
      'Billing (web only)',
      'Advanced (web only)',
      'Help (web only)',
    ],
    notes: [
      'Name, timezone, and currency: /app/settings?tab=profile.',
      'Theme (Light, Mist, Dark, Neon, Ocean, Forest, Ember, Aurora): /app/settings?tab=personalization.',
      'Module weights and enabling or hiding modules: /app/settings?tab=modules.',
      'Notification channels, categories, digest frequency, quiet hours: /app/settings?tab=notifications.',
      'AI speaker voice, voice mode, AI personality, smart insights, data analysis scope, AI language: /app/settings?tab=ai.',
      'Change password, manage devices, export data, delete account: /app/settings?tab=security.',
    ],
  },
];

export const APP_AUTH_SURFACES: AppSurface[] = [
  {
    name: 'Sign in',
    path: '/auth/login',
    platform: 'web',
    summary: 'web sign-in page',
  },
  {
    name: 'Sign in',
    path: '/',
    platform: 'mobile',
    summary: 'mobile sign-in is the app launch screen, not /auth/login',
  },
  { name: 'Sign up', path: '/auth/signup', summary: 'create an account' },
  {
    name: 'Forgot password',
    path: '/auth/forgot-password',
    summary: 'request a reset email',
  },
  {
    name: 'Reset password',
    path: '/auth/reset-password',
    summary: 'set a new password from an emailed link',
  },
  {
    name: 'Verify OTP',
    path: '/auth/verify-otp',
    summary: 'enter the emailed verification code',
  },
  {
    name: 'Delete account',
    path: '/auth/delete-account',
    platform: 'web',
    summary:
      'confirm account deletion from the emailed link; start it from Settings, Security tab',
  },
];

export const APP_PUBLIC_SURFACES: AppSurface[] = [
  {
    name: 'Marketing pages',
    path: '/, /product, /features, /pricing',
    platform: 'web',
    summary: 'signed-out marketing and pricing pages',
  },
];
