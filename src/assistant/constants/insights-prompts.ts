import {
  type InsightPeriodMeta,
  periodPromptGuidance,
} from './insight-period';

export const INSIGHT_KINDS = [
  'dashboard',
  'analytics',
  'life_score',
  'habits',
  'goals',
  'wealth',
  'health',
] as const;

export type InsightKind = (typeof INSIGHT_KINDS)[number];

export function isInsightKind(value: string): value is InsightKind {
  return (INSIGHT_KINDS as readonly string[]).includes(value);
}

/**
 * Default ideal sleep window for coaching when context has no ideal_sleep.
 * Prefer context.ideal_sleep / bedtime+wake fields when the client sends them.
 */
export const DEFAULT_IDEAL_SLEEP = {
  bedtime: '22:00',
  wake: '04:00',
  label: '10:00 PM – 4:00 AM',
  hours: 6,
} as const;

const JSON_ONLY =
  'Return ONLY valid JSON matching the schema. No markdown, no code fences, no preamble.';

const LIFESTYLE_COACHING = [
  'Tone: caring Jarvis-style aide — calm, precise, look-after-yourself (never claim to be Jarvis).',
  'When live stats support it, coach on lifestyle: overwork and rest, sleep too little/too much or off-schedule, trips/dining (hope they enjoy), and overspending on food & dine (gently urge cutting back).',
  `Ideal sleep window: use context ideal_sleep (or bedtime/wake targets) if present; otherwise assume ${DEFAULT_IDEAL_SLEEP.label} (~${DEFAULT_IDEAL_SLEEP.hours}h).`,
  'When sleep sessions or hours exist, comment on both duration and timing vs that window (e.g. late bedtime, short night, oversleeping past wake).',
].join(' ');

const HORIZON_FIELD =
  'Each item MUST include "horizon":"today"|"last_week"|"last_month".';

export function insightSystemPrompt(
  kind: InsightKind,
  personalityTone: string,
  scopeGuidance: string,
  periodMeta: InsightPeriodMeta,
): string {
  const base = [
    "You are Astra, a personal life OS AI that writes short, specific insights from the user's live stats.",
    personalityTone,
    scopeGuidance,
    periodPromptGuidance(periodMeta),
    LIFESTYLE_COACHING,
    'Use only the provided context. Do not invent exact dollar amounts, dates, or counts that are not in the context.',
    'Be concise, actionable, and personalized. Prefer 1–2 sentences per item.',
    'Connect dots across domains when possible (e.g. low sleep → weaker focus → missed habits).',
    JSON_ONLY,
  ].join(' ');

  switch (kind) {
    case 'dashboard':
      return `${base} Schema: {"items":[{"message":"string","type":"success|warning|tip|prediction","title":"string","horizon":"today|last_week|last_month"}]}. Return exactly 6 items for a smart life OS briefing. ${HORIZON_FIELD} For mixed period: about 2 today, 2 last_week, 2 last_month. Cover productivity/tasks, focus, habits, wealth, health/sleep, and one lifestyle coach note. Prefer cross-domain reasoning.`;
    case 'habits':
      return `${base} Schema: {"items":[{"message":"string","title":"string","horizon":"today|last_week|last_month"}]}. Return exactly 4 habit coaching tips. ${HORIZON_FIELD} Mix horizons when period is mixed.`;
    case 'goals':
      return `${base} Schema: {"items":[{"message":"string","title":"string","horizon":"today|last_week|last_month"}]}. Return exactly 4 goal progress insights. ${HORIZON_FIELD} Mix horizons when period is mixed.`;
    case 'wealth':
      return `${base} Schema: {"items":[{"message":"string","type":"success|warning|tip|prediction","title":"string","horizon":"today|last_week|last_month"}]}. Return exactly 5 financial insights. ${HORIZON_FIELD} Mix horizons when period is mixed. Call out food & dine waste gently when category data shows it.`;
    case 'health':
      return `${base} Schema: {"items":[{"message":"string","title":"string","horizon":"today|last_week|last_month"}]}. Return exactly 4 health/wellness insights. ${HORIZON_FIELD} Mix horizons when period is mixed. At least one should address sleep vs the ideal window (${DEFAULT_IDEAL_SLEEP.label}) when sleep data is present.`;
    case 'life_score':
      return `${base} Schema: {"text":"string","forecast":{"score":number,"label":"string"},"horizon":"today|last_week|last_month"}. text is one short AI insight about the life score. Include horizon for the text focus. forecast.score is 0–100 projected score; forecast.label is a short timeline phrase like "At current pace, ~2 months".`;
    case 'analytics':
      return `${base} Schema: {"daily":"string","monthly":"string","cross_domain":[{"title":"string","insight":"string","horizon":"today|last_week|last_month"}],"story":"string","predictions":["string"],"coach":[{"label":"string","text":"string","horizon":"today|last_week|last_month"}],"goal_prediction":"string"}. cross_domain: exactly 4 items with horizon. predictions: exactly 3. coach: exactly 3 with horizon. Mix horizons across cross_domain and coach when period is mixed.`;
    default:
      return base;
  }
}

export function insightUserPrompt(
  kind: InsightKind,
  contextJson: string,
  periodMeta: InsightPeriodMeta,
): string {
  return [
    `Generate ${kind} insights for period=${periodMeta.period} (${periodMeta.label}).`,
    `Coverage: ${periodMeta.covers_from} → ${periodMeta.covers_to}.`,
    `User context JSON:\n${contextJson}`,
    `Ideal sleep fallback (if not in JSON): bedtime ${DEFAULT_IDEAL_SLEEP.bedtime}, wake ${DEFAULT_IDEAL_SLEEP.wake}.`,
  ].join('\n');
}
