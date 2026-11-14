import { Injectable, Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import {
  DEFAULT_AI_DATA_SCOPE,
  isAiDataScope,
  type AiDataScope,
} from '../auth/constants/ai-settings';
import {
  aiSettingsFingerprint,
  buildStrictAiRulesBlock,
} from './context/ai-settings-context.builder';
import {
  DEFAULT_INSIGHT_PERIOD,
  NEW_ACCOUNT_GRACE_HOURS,
  isInsightHorizon,
  isInsightPeriod,
  resolveInsightPeriodMeta,
  type InsightHorizon,
  type InsightPeriod,
  type InsightPeriodMeta,
} from './constants/insight-period';
import {
  insightSystemPrompt,
  insightUserPrompt,
  type InsightKind,
} from './constants/insights-prompts';
import { GroqChatService } from './groq/groq-chat.service';

export type InsightItemType = 'success' | 'warning' | 'tip' | 'prediction';

export type InsightItem = {
  message: string;
  type?: InsightItemType;
  title?: string;
  horizon?: InsightHorizon;
};

export type InsightsResult = {
  kind: InsightKind;
  period: InsightPeriod;
  period_key: string;
  period_label: string;
  covers_from: string;
  covers_to: string;
  cache_until: string;
  enabled: boolean;
  source: 'groq' | 'cache' | 'fallback';
  generated_at: string;
  unlocked_horizons?: InsightHorizon[];
  items?: InsightItem[];
  text?: string;
  forecast?: { score: number; label: string };
  daily?: string;
  monthly?: string;
  cross_domain?: { title: string; insight: string }[];
  story?: string;
  predictions?: string[];
  coach?: { label: string; text: string }[];
  goal_prediction?: string;
};

type CacheEntry = {
  result: InsightsResult;
  period_key: string;
  cache_until_ms: number;
};

/**
 * Key fragments that prove the user has actually recorded something.
 *
 * Clients always send a full context object, so a brand-new account arrives as
 * explicit zeros and empty arrays rather than missing keys. Scaffolding the
 * clients send regardless of activity (targets, goals, currency, life-score
 * category skeletons) is deliberately excluded, so only real activity counts.
 */
const EVIDENCE_KEY_FRAGMENTS = [
  'taskscompleted',
  'tasksdue',
  'taskspending',
  'overduetasks',
  'taskcount',
  'taskcompletionweek',
  'focushours',
  'sessioncount',
  'timetracked',
  'trackedminutes',
  'monthlyincome',
  'monthlyexpenses',
  'transactioncount',
  'transactions',
  'spending',
  'netsavings',
  'wastespending',
  'categorytotals',
  'expensecategories',
  'expensedistribution',
  'expensetop',
  'budgetsover',
  'waterglasses',
  'sleephours',
  'exerciseminutes',
  'latestweightkg',
  'recentweights',
  'recentworkoutcount',
  'moodtoday',
  'habitstotal',
  'habitscomplete',
  'longeststreak',
  'habitstreak',
  'tophabitstreaks',
  'dayhabits',
  'activegoals',
  'activecount',
  'completedgoals',
  'goalprogress',
  'notescreated',
  'notesthisweek',
  'notesinperiod',
  'badgesearned',
  'achievementsearned',
  'prayerscompleted',
  'prayerstoday',
  'prayercompletion',
  'ontimecount',
  'qazacount',
  'prayerstreak',
  'perfectdays',
  'todaystatuses',
  'todaycompleted',
];

/** String values that clients use to mean "nothing here yet". */
const PLACEHOLDER_VALUES = new Set([
  '',
  '-',
  '—',
  '0',
  'n/a',
  'na',
  'none',
  'null',
  'unknown',
]);

/**
 * Empty-account tone only when we recognise enough evidence keys.
 * Unknown shapes still generate normally so new modules are never silenced.
 */
const MIN_RECOGNIZED_EVIDENCE_KEYS = 3;

const WEALTH_CONTEXT_KEYS = new Set([
  'monthlyIncome',
  'monthlyExpenses',
  'periodNet',
  'wasteSpending',
  'categoryTotals',
  'spending',
  'budget',
  'netSavings',
  'expenseDistribution',
  'budgetsOver',
  'income',
  'expenses',
  'transactions',
]);

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly authService: AuthService,
    private readonly groqChat: GroqChatService,
  ) {}

  async generateInsights(
    userId: string,
    kind: InsightKind,
    context: Record<string, unknown> = {},
    periodInput?: string | null,
  ): Promise<InsightsResult> {
    const user = await this.authService.getMe(userId);
    const generatedAt = new Date().toISOString();
    const period: InsightPeriod = isInsightPeriod(periodInput)
      ? periodInput
      : DEFAULT_INSIGHT_PERIOD;
    const timeZone =
      typeof user.timezone === 'string' && user.timezone.trim()
        ? user.timezone.trim()
        : 'UTC';
    const periodMeta = resolveInsightPeriodMeta(
      period,
      timeZone,
      new Date(),
      user.created_at,
    );

    if (user.ai_insights === false) {
      return this.emptyResult(kind, periodMeta, generatedAt, false);
    }

    // New accounts: quiet for a few hours, then today-only until week/month unlock.
    if (periodMeta.unlocked_horizons.length === 0) {
      this.logger.log(
        `Insights held for ${userId} (${kind}): within ${NEW_ACCOUNT_GRACE_HOURS}h new-account quiet window.`,
      );
      return this.emptyResult(kind, periodMeta, generatedAt, true);
    }

    const dataScope: AiDataScope = isAiDataScope(user.ai_data_scope)
      ? user.ai_data_scope
      : DEFAULT_AI_DATA_SCOPE;

    const safeContext = this.sanitizeContext(context, dataScope);
    const currency =
      (typeof user.currency === 'string' && user.currency.trim()
        ? user.currency.trim().toUpperCase()
        : 'USD') || 'USD';
    if (!safeContext.currency) {
      safeContext.currency = currency;
      safeContext.currency_code = currency;
      safeContext.currency_instructions = `User currency is ${currency}. Write all money in ${currency}. Never use $ or USD unless currency is USD.`;
    }

    const emptyAccount = this.looksLikeEmptyAccount(safeContext);
    if (emptyAccount) {
      safeContext.account_stage = 'new_or_empty';
      safeContext.insight_tone =
        'Do not blame the user for empty or zero stats. Welcome them and suggest one small next step for today across Life OS modules.';
    }
    safeContext.unlocked_horizons = periodMeta.unlocked_horizons;

    const contextFingerprint = this.contextFingerprint(safeContext);
    const cacheKey = `${userId}:${kind}:${periodMeta.period_key}:${aiSettingsFingerprint(user)}:${contextFingerprint}`;
    const cached = this.cache.get(cacheKey);
    const untilMs = Date.parse(periodMeta.cache_until);
    if (
      cached &&
      cached.period_key === periodMeta.period_key &&
      Date.now() < cached.cache_until_ms
    ) {
      const cachedResult = cached.result;
      return {
        ...cachedResult,
        source: 'cache',
        items: cachedResult.items
          ? this.shuffle(cachedResult.items)
          : cachedResult.items,
      };
    }

    const system = insightSystemPrompt(kind, periodMeta, { emptyAccount });
    const userPrompt = insightUserPrompt(
      kind,
      JSON.stringify(safeContext).slice(0, 6000),
      periodMeta,
    );

    try {
      const raw = await this.groqChat.completePrompt({
        strictRules: buildStrictAiRulesBlock(user, 'insight'),
        system,
        user: userPrompt,
        temperature: 0.6,
        maxTokens:
          kind === 'analytics' || kind === 'dashboard' ? 1100 : 700,
      });
      const parsed = this.parseAndNormalize(
        kind,
        periodMeta,
        raw,
        generatedAt,
      );
      if (!this.hasContent(parsed)) {
        return this.emptyResult(kind, periodMeta, generatedAt, true, 'fallback');
      }
      const result: InsightsResult = { ...parsed, source: 'groq' };
      this.cache.set(cacheKey, {
        result,
        period_key: periodMeta.period_key,
        cache_until_ms: Number.isFinite(untilMs)
          ? untilMs
          : Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      return result;
    } catch (error) {
      this.logger.warn(
        `Insights Groq failed (${kind}/${period}): ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return this.emptyResult(kind, periodMeta, generatedAt, true, 'fallback');
    }
  }

  private emptyResult(
    kind: InsightKind,
    periodMeta: InsightPeriodMeta,
    generatedAt: string,
    enabled: boolean,
    source: InsightsResult['source'] = 'fallback',
  ): InsightsResult {
    return {
      kind,
      period: periodMeta.period,
      period_key: periodMeta.period_key,
      period_label: periodMeta.label,
      covers_from: periodMeta.covers_from,
      covers_to: periodMeta.covers_to,
      cache_until: periodMeta.cache_until,
      unlocked_horizons: periodMeta.unlocked_horizons,
      enabled,
      source,
      generated_at: generatedAt,
      items: [],
    };
  }

  private sanitizeContext(
    context: Record<string, unknown>,
    scope: AiDataScope,
  ): Record<string, unknown> {
    if (scope === 'all') return { ...context };
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context)) {
      if (WEALTH_CONTEXT_KEYS.has(key)) continue;
      out[key] = value;
    }
    return out;
  }

  private looksLikeEmptyAccount(context: Record<string, unknown>): boolean {
    const probe = { recognized: 0, positive: false };
    this.probeForUserData(context, probe, 0);
    return probe.recognized >= MIN_RECOGNIZED_EVIDENCE_KEYS && !probe.positive;
  }

  private probeForUserData(
    value: unknown,
    probe: { recognized: number; positive: boolean },
    depth: number,
  ): void {
    if (probe.positive || depth > 4 || !value || typeof value !== 'object') {
      return;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        this.probeForUserData(entry, probe, depth + 1);
      }
      return;
    }

    for (const [key, entry] of Object.entries(value)) {
      const normalized = key.toLowerCase().replace(/[^a-z]/g, '');
      if (EVIDENCE_KEY_FRAGMENTS.some((f) => normalized.includes(f))) {
        probe.recognized += 1;
        if (this.isPositiveSignal(entry)) {
          probe.positive = true;
          return;
        }
        continue;
      }
      this.probeForUserData(entry, probe, depth + 1);
    }
  }

  private isPositiveSignal(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return !PLACEHOLDER_VALUES.has(value.trim().toLowerCase());
    }
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') {
      const amount = (value as Record<string, unknown>).amount;
      if (typeof amount === 'number') {
        return Number.isFinite(amount) && amount !== 0;
      }
      return Object.keys(value).length > 0;
    }
    return false;
  }

  private contextFingerprint(context: Record<string, unknown>): string {
    try {
      const raw = JSON.stringify(context);
      let hash = 0;
      for (let i = 0; i < raw.length; i += 1) {
        hash = (hash * 31 + raw.charCodeAt(i)) | 0;
      }
      return Math.abs(hash).toString(36);
    } catch {
      return 'ctx';
    }
  }

  private parseAndNormalize(
    kind: InsightKind,
    periodMeta: InsightPeriodMeta,
    raw: string,
    generatedAt: string,
  ): InsightsResult {
    const json = this.extractJson(raw);
    if (!json || typeof json !== 'object') {
      return this.emptyResult(kind, periodMeta, generatedAt, true, 'fallback');
    }
    const obj = json as Record<string, unknown>;
    const allowed = new Set(periodMeta.unlocked_horizons);

    const base: InsightsResult = {
      kind,
      period: periodMeta.period,
      period_key: periodMeta.period_key,
      period_label: periodMeta.label,
      covers_from: periodMeta.covers_from,
      covers_to: periodMeta.covers_to,
      cache_until: periodMeta.cache_until,
      unlocked_horizons: periodMeta.unlocked_horizons,
      enabled: true,
      source: 'groq',
      generated_at: generatedAt,
    };

    if (kind === 'life_score') {
      const text = typeof obj.text === 'string' ? obj.text.trim() : '';
      const forecastRaw =
        obj.forecast && typeof obj.forecast === 'object'
          ? (obj.forecast as Record<string, unknown>)
          : null;
      const score =
        typeof forecastRaw?.score === 'number'
          ? Math.round(Math.min(100, Math.max(0, forecastRaw.score)))
          : undefined;
      const label =
        typeof forecastRaw?.label === 'string'
          ? forecastRaw.label.trim()
          : undefined;
      return {
        ...base,
        text: text || undefined,
        forecast:
          score !== undefined && label ? { score, label } : undefined,
      };
    }

    if (kind === 'analytics') {
      return {
        ...base,
        daily: this.asTrimmedString(obj.daily),
        monthly:
          allowed.has('last_month') || allowed.has('last_week')
            ? this.asTrimmedString(obj.monthly)
            : undefined,
        cross_domain: this.filterCrossDomainByHorizon(
          this.asCrossDomain(obj.cross_domain),
          allowed,
        ),
        story: this.asTrimmedString(obj.story),
        predictions: this.asStringArray(obj.predictions),
        coach: this.filterCoachByHorizon(this.asCoach(obj.coach), allowed),
        goal_prediction: this.asTrimmedString(obj.goal_prediction),
      };
    }

    return {
      ...base,
      items: this.asItems(obj.items, allowed),
    };
  }

  private hasContent(result: InsightsResult): boolean {
    if (result.kind === 'life_score') {
      return Boolean(result.text || result.forecast);
    }
    if (result.kind === 'analytics') {
      return Boolean(
        result.daily ||
          result.monthly ||
          result.story ||
          result.goal_prediction ||
          (result.cross_domain && result.cross_domain.length > 0) ||
          (result.predictions && result.predictions.length > 0) ||
          (result.coach && result.coach.length > 0),
      );
    }
    return Boolean(result.items && result.items.length > 0);
  }

  private extractJson(raw: string): unknown {
    const trimmed = raw.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(trimmed.slice(start, end + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  private asTrimmedString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const t = value.trim();
    return t || undefined;
  }

  private asStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const items = value
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.trim())
      .filter(Boolean);
    return items.length ? items : undefined;
  }

  private asItems(
    value: unknown,
    allowedHorizons: Set<InsightHorizon>,
  ): InsightItem[] {
    if (!Array.isArray(value)) return [];
    const allowedTypes: InsightItemType[] = [
      'success',
      'warning',
      'tip',
      'prediction',
    ];
    const items: InsightItem[] = [];
    const fallbackHorizon = allowedHorizons.has('today')
      ? 'today'
      : ([...allowedHorizons][0] as InsightHorizon | undefined);

    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim()) {
        items.push({
          message: entry.trim(),
          horizon: fallbackHorizon,
        });
        continue;
      }
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as Record<string, unknown>;
      const message =
        typeof row.message === 'string'
          ? row.message.trim()
          : typeof row.insight === 'string'
            ? row.insight.trim()
            : '';
      if (!message) continue;
      const type =
        typeof row.type === 'string' &&
        allowedTypes.includes(row.type as InsightItemType)
          ? (row.type as InsightItemType)
          : undefined;
      const title =
        typeof row.title === 'string' && row.title.trim()
          ? row.title.trim()
          : undefined;
      const horizonRaw =
        typeof row.horizon === 'string' ? row.horizon : undefined;
      let horizon = isInsightHorizon(horizonRaw) ? horizonRaw : undefined;
      if (horizon && !allowedHorizons.has(horizon)) {
        horizon = fallbackHorizon;
      }
      if (!horizon) horizon = fallbackHorizon;
      items.push({ message, type, title, horizon });
    }
    return this.shuffle(items);
  }

  private shuffle<T>(list: T[]): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  private asCrossDomain(
    value: unknown,
  ): { title: string; insight: string; horizon?: InsightHorizon }[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const rows: { title: string; insight: string; horizon?: InsightHorizon }[] =
      [];
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as Record<string, unknown>;
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      const insight =
        typeof row.insight === 'string'
          ? row.insight.trim()
          : typeof row.message === 'string'
            ? row.message.trim()
            : '';
      const horizonRaw =
        typeof row.horizon === 'string' ? row.horizon : undefined;
      const horizon = isInsightHorizon(horizonRaw) ? horizonRaw : undefined;
      if (title && insight) rows.push({ title, insight, horizon });
    }
    return rows.length ? rows : undefined;
  }

  private filterCrossDomainByHorizon(
    rows:
      | { title: string; insight: string; horizon?: InsightHorizon }[]
      | undefined,
    allowed: Set<InsightHorizon>,
  ): { title: string; insight: string }[] | undefined {
    if (!rows?.length) return undefined;
    const fallback = allowed.has('today')
      ? 'today'
      : ([...allowed][0] as InsightHorizon | undefined);
    const filtered = rows
      .map((row) => {
        const horizon =
          row.horizon && allowed.has(row.horizon) ? row.horizon : fallback;
        if (!horizon) return null;
        return { title: row.title, insight: row.insight };
      })
      .filter((row): row is { title: string; insight: string } => row != null);
    return filtered.length ? filtered : undefined;
  }

  private asCoach(
    value: unknown,
  ): { label: string; text: string; horizon?: InsightHorizon }[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const rows: { label: string; text: string; horizon?: InsightHorizon }[] =
      [];
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as Record<string, unknown>;
      const label = typeof row.label === 'string' ? row.label.trim() : '';
      const text = typeof row.text === 'string' ? row.text.trim() : '';
      const horizonRaw =
        typeof row.horizon === 'string' ? row.horizon : undefined;
      const horizon = isInsightHorizon(horizonRaw) ? horizonRaw : undefined;
      if (label && text) rows.push({ label, text, horizon });
    }
    return rows.length ? rows : undefined;
  }

  private filterCoachByHorizon(
    rows:
      | { label: string; text: string; horizon?: InsightHorizon }[]
      | undefined,
    allowed: Set<InsightHorizon>,
  ): { label: string; text: string }[] | undefined {
    if (!rows?.length) return undefined;
    const fallback = allowed.has('today')
      ? 'today'
      : ([...allowed][0] as InsightHorizon | undefined);
    const filtered = rows
      .map((row) => {
        const horizon =
          row.horizon && allowed.has(row.horizon) ? row.horizon : fallback;
        if (!horizon) return null;
        return { label: row.label, text: row.text };
      })
      .filter((row): row is { label: string; text: string } => row != null);
    return filtered.length ? filtered : undefined;
  }
}
