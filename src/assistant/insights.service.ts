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
    const periodMeta = resolveInsightPeriodMeta(period, timeZone);

    if (user.ai_insights === false) {
      return this.emptyResult(kind, periodMeta, generatedAt, false);
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

    const system = insightSystemPrompt(kind, periodMeta);
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
    if (scope === 'all') return context;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context)) {
      if (WEALTH_CONTEXT_KEYS.has(key)) continue;
      out[key] = value;
    }
    return out;
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

    const base: InsightsResult = {
      kind,
      period: periodMeta.period,
      period_key: periodMeta.period_key,
      period_label: periodMeta.label,
      covers_from: periodMeta.covers_from,
      covers_to: periodMeta.covers_to,
      cache_until: periodMeta.cache_until,
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
          score !== undefined && label
            ? { score, label }
            : undefined,
      };
    }

    if (kind === 'analytics') {
      return {
        ...base,
        daily: this.asTrimmedString(obj.daily),
        monthly: this.asTrimmedString(obj.monthly),
        cross_domain: this.asCrossDomain(obj.cross_domain),
        story: this.asTrimmedString(obj.story),
        predictions: this.asStringArray(obj.predictions),
        coach: this.asCoach(obj.coach),
        goal_prediction: this.asTrimmedString(obj.goal_prediction),
      };
    }

    return {
      ...base,
      items: this.asItems(obj.items),
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

  private asItems(value: unknown): InsightItem[] {
    if (!Array.isArray(value)) return [];
    const allowed: InsightItemType[] = [
      'success',
      'warning',
      'tip',
      'prediction',
    ];
    const items: InsightItem[] = [];
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim()) {
        items.push({ message: entry.trim() });
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
        allowed.includes(row.type as InsightItemType)
          ? (row.type as InsightItemType)
          : undefined;
      const title =
        typeof row.title === 'string' && row.title.trim()
          ? row.title.trim()
          : undefined;
      const horizonRaw =
        typeof row.horizon === 'string' ? row.horizon : undefined;
      const horizon = isInsightHorizon(horizonRaw) ? horizonRaw : undefined;
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
  ): { title: string; insight: string }[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const rows: { title: string; insight: string }[] = [];
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
      if (title && insight) rows.push({ title, insight });
    }
    return rows.length ? rows : undefined;
  }

  private asCoach(
    value: unknown,
  ): { label: string; text: string }[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const rows: { label: string; text: string }[] = [];
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as Record<string, unknown>;
      const label = typeof row.label === 'string' ? row.label.trim() : '';
      const text = typeof row.text === 'string' ? row.text.trim() : '';
      if (label && text) rows.push({ label, text });
    }
    return rows.length ? rows : undefined;
  }
}
