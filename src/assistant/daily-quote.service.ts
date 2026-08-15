import { Injectable, Logger } from '@nestjs/common';
import { GroqChatService } from './groq/groq-chat.service';

const FALLBACK_QUOTE =
  'Success is the sum of small efforts repeated day in and day out.';

const FALLBACK_GOALS_QUOTE = 'A goal is a dream with a deadline.';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const QUOTE_SYSTEM_PROMPT =
  'You write one short original motivational quote for a personal productivity app called Astra. Themes: habits, focus, health, wealth, consistency. Return ONLY the quote text — no author, no quotation marks, no preamble. Max 20 words.';

const GOALS_QUOTE_SYSTEM_PROMPT =
  'You write one short original motivational quote about goals, ambition, milestones, and finishing what you start for a personal productivity app called Astra. Return ONLY the quote text — no author, no quotation marks, no preamble. Max 20 words.';

export type DailyQuoteResult = {
  quote: string;
  date: string;
  source: 'groq' | 'cache' | 'fallback';
};

@Injectable()
export class DailyQuoteService {
  private readonly logger = new Logger(DailyQuoteService.name);
  private cache: { quote: string; fetchedAt: number } | null = null;
  private goalsCache: { quote: string; fetchedAt: number } | null = null;

  constructor(private readonly groqChat: GroqChatService) {}

  private cleanQuote(raw: string) {
    return raw
      .trim()
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 180);
  }

  async getDailyQuote(): Promise<DailyQuoteResult> {
    return this.getCachedQuote({
      cacheKey: 'daily',
      system: QUOTE_SYSTEM_PROMPT,
      fallback: FALLBACK_QUOTE,
      userLabel: 'daily',
    });
  }

  async getGoalsQuote(): Promise<DailyQuoteResult> {
    return this.getCachedQuote({
      cacheKey: 'goals',
      system: GOALS_QUOTE_SYSTEM_PROMPT,
      fallback: FALLBACK_GOALS_QUOTE,
      userLabel: 'goals',
    });
  }

  private async getCachedQuote(options: {
    cacheKey: 'daily' | 'goals';
    system: string;
    fallback: string;
    userLabel: string;
  }): Promise<DailyQuoteResult> {
    const date = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const existing =
      options.cacheKey === 'goals' ? this.goalsCache : this.cache;

    if (existing?.quote && now - existing.fetchedAt < TWELVE_HOURS_MS) {
      return { quote: existing.quote, date, source: 'cache' };
    }

    try {
      const raw = await this.groqChat.completePrompt({
        system: options.system,
        user: `Write a fresh ${options.userLabel} motivational quote for slot ${Math.floor(now / TWELVE_HOURS_MS)}.`,
        temperature: 0.9,
        maxTokens: 80,
      });
      const quote = this.cleanQuote(raw) || options.fallback;
      const entry = { quote, fetchedAt: now };
      if (options.cacheKey === 'goals') {
        this.goalsCache = entry;
      } else {
        this.cache = entry;
      }
      return { quote, date, source: 'groq' };
    } catch (error) {
      this.logger.warn(
        `${options.userLabel} quote Groq failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return { quote: options.fallback, date, source: 'fallback' };
    }
  }
}
