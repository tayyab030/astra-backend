import { Injectable, Logger } from '@nestjs/common';
import { GroqChatService } from './groq/groq-chat.service';

const FALLBACK_QUOTE =
  'Success is the sum of small efforts repeated day in and day out.';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const QUOTE_SYSTEM_PROMPT =
  'You write one short original motivational quote for a personal productivity app called Astra. Themes: habits, focus, health, wealth, consistency. Return ONLY the quote text — no author, no quotation marks, no preamble. Max 20 words.';

export type DailyQuoteResult = {
  quote: string;
  date: string;
  source: 'groq' | 'cache' | 'fallback';
};

@Injectable()
export class DailyQuoteService {
  private readonly logger = new Logger(DailyQuoteService.name);
  private cache: { quote: string; fetchedAt: number } | null = null;

  constructor(private readonly groqChat: GroqChatService) {}

  private cleanQuote(raw: string) {
    return raw
      .trim()
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 180);
  }

  async getDailyQuote(): Promise<DailyQuoteResult> {
    const date = new Date().toISOString().slice(0, 10);
    const now = Date.now();

    if (
      this.cache?.quote &&
      now - this.cache.fetchedAt < TWELVE_HOURS_MS
    ) {
      return { quote: this.cache.quote, date, source: 'cache' };
    }

    try {
      const raw = await this.groqChat.completePrompt({
        system: QUOTE_SYSTEM_PROMPT,
        user: `Write a fresh motivational quote for slot ${Math.floor(now / TWELVE_HOURS_MS)}.`,
        temperature: 0.9,
        maxTokens: 80,
      });
      const quote = this.cleanQuote(raw) || FALLBACK_QUOTE;
      this.cache = { quote, fetchedAt: now };
      return { quote, date, source: 'groq' };
    } catch (error) {
      this.logger.warn(
        `Daily quote Groq failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return { quote: FALLBACK_QUOTE, date, source: 'fallback' };
    }
  }
}
