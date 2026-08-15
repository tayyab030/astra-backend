export const INSIGHT_PERIODS = ['mixed', 'weekly', 'monthly'] as const;

export type InsightPeriod = (typeof INSIGHT_PERIODS)[number];

export const DEFAULT_INSIGHT_PERIOD: InsightPeriod = 'mixed';

export const INSIGHT_HORIZONS = ['today', 'last_week', 'last_month'] as const;

export type InsightHorizon = (typeof INSIGHT_HORIZONS)[number];

export const INSIGHT_HORIZON_LABELS: Record<InsightHorizon, string> = {
  today: 'Today',
  last_week: 'Last week',
  last_month: 'Last month',
};

export function isInsightPeriod(
  value: string | null | undefined,
): value is InsightPeriod {
  return !!value && (INSIGHT_PERIODS as readonly string[]).includes(value);
}

export function isInsightHorizon(
  value: string | null | undefined,
): value is InsightHorizon {
  return !!value && (INSIGHT_HORIZONS as readonly string[]).includes(value);
}

export type InsightPeriodMeta = {
  period: InsightPeriod;
  /** Stable cache bucket, e.g. mixed:2026-08-15 or weekly:2026-08-11 */
  period_key: string;
  /** Inclusive coverage start (YYYY-MM-DD) in the user timezone */
  covers_from: string;
  /** Inclusive coverage end (YYYY-MM-DD) in the user timezone */
  covers_to: string;
  /** Human label for prompts/UI */
  label: string;
  /** ISO timestamp when this bucket expires */
  cache_until: string;
};

type ZonedYmd = {
  year: number;
  month: number;
  day: number;
  /** 0 = Sun … 6 = Sat (JS getDay style) */
  weekday: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function ymdString(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function parseYmd(value: string): ZonedYmd {
  const [y, m, d] = value.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return {
    year: y,
    month: m,
    day: d,
    weekday: utc.getUTCDay(),
  };
}

function addDaysYmd(ymd: string, days: number): string {
  const { year, month, day } = parseYmd(ymd);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return ymdString(
    utc.getUTCFullYear(),
    utc.getUTCMonth() + 1,
    utc.getUTCDate(),
  );
}

/** Calendar date + weekday in a timezone (en-CA gives YYYY-MM-DD). */
function zonedToday(now: Date, timeZone: string): ZonedYmd {
  const datePart = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const weekdayName = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(now);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const { year, month, day } = parseYmd(datePart);
  return { year, month, day, weekday: map[weekdayName] ?? 1 };
}

/** Next local midnight after `ymd` as an ISO instant. */
function localMidnightIso(
  ymd: string,
  timeZone: string,
  now: Date,
): string {
  const target = parseYmd(ymd);
  const guess = new Date(
    Date.UTC(target.year, target.month - 1, target.day, 0, 0, 0),
  );
  for (let i = -36; i <= 36; i++) {
    const candidate = new Date(guess.getTime() + i * 60 * 60 * 1000);
    const parts = zonedToday(candidate, timeZone);
    const hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        hour12: false,
      })
        .formatToParts(candidate)
        .find((p) => p.type === 'hour')?.value ?? '0',
    );
    if (
      parts.year === target.year &&
      parts.month === target.month &&
      parts.day === target.day &&
      hour === 0
    ) {
      return candidate.toISOString();
    }
  }
  void now;
  return new Date(
    Date.UTC(target.year, target.month - 1, target.day, 0, 0, 0),
  ).toISOString();
}

function formatRangeLabel(from: string, to: string): string {
  const a = parseYmd(from);
  const b = parseYmd(to);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  if (a.year === b.year && a.month === b.month) {
    return `${months[a.month - 1]} ${a.day}–${b.day}, ${a.year}`;
  }
  if (a.year === b.year) {
    return `${months[a.month - 1]} ${a.day} – ${months[b.month - 1]} ${b.day}, ${a.year}`;
  }
  return `${months[a.month - 1]} ${a.day}, ${a.year} – ${months[b.month - 1]} ${b.day}, ${b.year}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function previousMonthRange(today: ZonedYmd): {
  covers_from: string;
  covers_to: string;
  prevYear: number;
  prevMonth: number;
} {
  let prevYear = today.year;
  let prevMonth = today.month - 1;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  return {
    covers_from: ymdString(prevYear, prevMonth, 1),
    covers_to: ymdString(
      prevYear,
      prevMonth,
      lastDayOfMonth(prevYear, prevMonth),
    ),
    prevYear,
    prevMonth,
  };
}

/**
 * mixed: today + last week + last month in one pack (default UI).
 * weekly: last completed Mon–Sun; refreshes Mondays.
 * monthly: last calendar month; refreshes on the 1st.
 */
export function resolveInsightPeriodMeta(
  period: InsightPeriod,
  timeZone = 'UTC',
  now = new Date(),
): InsightPeriodMeta {
  const today = zonedToday(now, timeZone);
  const todayYmd = ymdString(today.year, today.month, today.day);

  if (period === 'mixed') {
    const daysSinceMonday = (today.weekday + 6) % 7;
    const thisMonday = addDaysYmd(todayYmd, -daysSinceMonday);
    const weekFrom = addDaysYmd(thisMonday, -7);
    const weekTo = addDaysYmd(thisMonday, -1);
    const month = previousMonthRange(today);
    const tomorrow = addDaysYmd(todayYmd, 1);
    return {
      period: 'mixed',
      period_key: `mixed:${todayYmd}`,
      covers_from: month.covers_from,
      covers_to: todayYmd,
      label: `Mixed (today, last week ${formatRangeLabel(weekFrom, weekTo)}, last month)`,
      cache_until: localMidnightIso(tomorrow, timeZone, now),
    };
  }

  if (period === 'weekly') {
    const daysSinceMonday = (today.weekday + 6) % 7;
    const thisMonday = addDaysYmd(todayYmd, -daysSinceMonday);
    const covers_from = addDaysYmd(thisMonday, -7);
    const covers_to = addDaysYmd(thisMonday, -1);
    const nextMonday = addDaysYmd(thisMonday, 7);
    return {
      period: 'weekly',
      period_key: `weekly:${thisMonday}`,
      covers_from,
      covers_to,
      label: `Last week (${formatRangeLabel(covers_from, covers_to)})`,
      cache_until: localMidnightIso(nextMonday, timeZone, now),
    };
  }

  const month = previousMonthRange(today);
  let nextYear = today.year;
  let nextMonth = today.month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const nextFirst = ymdString(nextYear, nextMonth, 1);
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return {
    period: 'monthly',
    period_key: `monthly:${month.prevYear}-${pad2(month.prevMonth)}`,
    covers_from: month.covers_from,
    covers_to: month.covers_to,
    label: `Last month (${months[month.prevMonth - 1]} ${month.prevYear})`,
    cache_until: localMidnightIso(nextFirst, timeZone, now),
  };
}

export function periodPromptGuidance(meta: InsightPeriodMeta): string {
  if (meta.period === 'mixed') {
    return [
      'Period: MIXED digest — each item MUST set horizon to exactly one of: today | last_week | last_month.',
      `Overall coverage window: ${meta.covers_from} to ${meta.covers_to}.`,
      'Include a balanced mix of horizons (not all the same). Frame each message to match its horizon.',
      'Do not put "Today"/"Last week"/"Last month" inside the message text — horizon is a separate field.',
      'Items will be randomly shuffled before display.',
    ].join(' ');
  }
  if (meta.period === 'weekly') {
    return [
      `Period: WEEKLY retrospective — ${meta.label}.`,
      `Coverage dates: ${meta.covers_from} to ${meta.covers_to} (last completed week, Mon–Sun).`,
      'Write insights about that past week only. Set every item horizon to last_week.',
      'This pack refreshes every Monday; keep advice stable for the week.',
    ].join(' ');
  }
  return [
    `Period: MONTHLY retrospective — ${meta.label}.`,
    `Coverage dates: ${meta.covers_from} to ${meta.covers_to} (last completed calendar month).`,
    'Write insights about that past month only. Set every item horizon to last_month.',
    'This pack refreshes on the 1st of each month; keep advice stable for the month.',
  ].join(' ');
}
