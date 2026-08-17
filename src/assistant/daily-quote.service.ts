import { Injectable, Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import {
  aiSettingsFingerprint,
  buildStrictAiRulesBlock,
} from './context/ai-settings-context.builder';
import { GroqChatService } from './groq/groq-chat.service';

const FALLBACK_QUOTE =
  'Success is the sum of small efforts repeated day in and day out.';

const FALLBACK_GOALS_QUOTE = 'A goal is a dream with a deadline.';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const QUOTE_SYSTEM_PROMPT =
  'You write one short original motivational quote for a personal productivity app called Astra. Themes: habits, focus, health, wealth, consistency. Return ONLY the quote text — no author, no quotation marks, no preamble. Max 20 words. Follow STRICT AI RULES for personality and language.';

const GOALS_QUOTE_SYSTEM_PROMPT =
  'You write one short original motivational quote about goals, ambition, milestones, and finishing what you start for a personal productivity app called Astra. Return ONLY the quote text — no author, no quotation marks, no preamble. Max 20 words. Follow STRICT AI RULES for personality and language.';

export type DailyQuoteResult = {
  quote: string;
  date: string;
  source: 'groq' | 'cache' | 'fallback';
};

@Injectable()
export class DailyQuoteService {
  private readonly logger = new Logger(DailyQuoteService.name);
  private readonly cache = new Map<string, { quote: string; fetchedAt: number }>();

  constructor(
    private readonly groqChat: GroqChatService,
    private readonly authService: AuthService,
  ) {}

  private cleanQuote(raw: string) {
    return raw
      .trim()
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 180);
  }

  async getDailyQuote(userId: string): Promise<DailyQuoteResult> {
    return this.getCachedQuote({
      userId,
      kind: 'daily',
      system: QUOTE_SYSTEM_PROMPT,
      fallback: FALLBACK_QUOTE,
    });
  }

  async getGoalsQuote(userId: string): Promise<DailyQuoteResult> {
    return this.getCachedQuote({
      userId,
      kind: 'goals',
      system: GOALS_QUOTE_SYSTEM_PROMPT,
      fallback: FALLBACK_GOALS_QUOTE,
    });
  }

  private async getCachedQuote(options: {
    userId: string;
    kind: 'daily' | 'goals';
    system: string;
    fallback: string;
  }): Promise<DailyQuoteResult> {
    const date = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const user = await this.authService.getMe(options.userId);
    const fingerprint = aiSettingsFingerprint(user);
    const cacheKey = `${options.userId}:${options.kind}:${fingerprint}`;
    const existing = this.cache.get(cacheKey);

    if (existing?.quote && now - existing.fetchedAt < TWELVE_HOURS_MS) {
      return { quote: existing.quote, date, source: 'cache' };
    }

    try {
      const raw = await this.groqChat.completePrompt({
        strictRules: buildStrictAiRulesBlock(user, 'quote'),
        system: options.system,
        user: `Write a fresh ${options.kind} quote for slot ${Math.floor(now / TWELVE_HOURS_MS)}.`,
        temperature: 0.9,
        maxTokens: 80,
      });
      const quote = this.cleanQuote(raw) || options.fallback;
      this.cache.set(cacheKey, { quote, fetchedAt: now });
      return { quote, date, source: 'groq' };
    } catch (error) {
      this.logger.warn(
        `${options.kind} quote Groq failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return { quote: options.fallback, date, source: 'fallback' };
    }
  }
}
