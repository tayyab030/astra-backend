import type { PrayerTimingsResult } from '../../prayer/prayer.service';
import { TRACKABLE_PRAYER_LABELS } from '../../prayer/prayer.constants';

/**
 * Builds a compact PRAYER CONTEXT block for Astra live chat.
 */
export function buildPrayerContextBlock(
  timings: PrayerTimingsResult,
  todayCompleted?: Record<string, boolean> | null,
): string {
  const prayerLine = timings.prayers
    .map((prayer) => `${prayer.name} ${prayer.time}`)
    .join('; ');

  const extras = ['Imsak', 'Sunset', 'Midnight', 'Firstthird', 'Lastthird']
    .filter((key) => timings.timings[key])
    .map((key) => `${key} ${timings.timings[key]}`)
    .join('; ');

  const location =
    timings.location.label ||
    (timings.location.latitude != null && timings.location.longitude != null
      ? `${timings.location.latitude.toFixed(4)}, ${timings.location.longitude.toFixed(4)}`
      : 'unknown');

  let completionLine: string | null = null;
  if (todayCompleted) {
    const parts = Object.entries(TRACKABLE_PRAYER_LABELS).map(([key, label]) => {
      const done = todayCompleted[key] ? 'done' : 'not done';
      return `${label} ${done}`;
    });
    completionLine = `Today's tracking: ${parts.join('; ')}.`;
  }

  return [
    'PRAYER CONTEXT (live prayer times for the signed-in user only).',
    'Use these times when the user asks about salah, namaz, or prayer schedule today.',
    'Do not invent prayer times. If context is missing, say they need location and a calculation method on the Prayer page.',
    `Location: ${location}.`,
    `Calculation method: ${timings.method.name} (id ${timings.method.id}).`,
    `Gregorian date: ${timings.date.readable || timings.date.gregorian || 'today'}.`,
    timings.date.hijri ? `Hijri date: ${timings.date.hijri}.` : null,
    timings.timezone ? `Timezone: ${timings.timezone}.` : null,
    `Today's prayers: ${prayerLine || 'unavailable'}.`,
    extras ? `Also: ${extras}.` : null,
    completionLine,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildPrayerMissingContextBlock(options: {
  hasMethod: boolean;
  hasLocation: boolean;
}): string {
  const gaps: string[] = [];
  if (!options.hasMethod) {
    gaps.push('calculation method not selected yet');
  }
  if (!options.hasLocation) {
    gaps.push('location not available yet');
  }

  return [
    'PRAYER CONTEXT (incomplete).',
    `Prayer times are not loaded because: ${gaps.join('; ') || 'unknown'}.`,
    'Tell the user to open the Prayer page at /app/prayer, allow location, and choose a calculation method first.',
    'Do not invent prayer times.',
  ].join('\n');
}
