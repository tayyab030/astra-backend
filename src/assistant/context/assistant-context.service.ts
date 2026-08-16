import { Injectable, Logger } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { WealthService } from '../../wealth/wealth.service';
import {
  buildStrictAiRulesBlock,
  shouldIncludeWealthContext,
} from './ai-settings-context.builder';
import { buildUserContextBlock } from './user-context.builder';
import { buildWealthContextBlock } from './wealth-context.builder';

@Injectable()
export class AssistantContextService {
  private readonly logger = new Logger(AssistantContextService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly wealthService: WealthService,
  ) {}

  async buildLiveContext(userId: string): Promise<string | null> {
    try {
      const user = await this.authService.getMe(userId);
      const parts: string[] = [
        buildUserContextBlock(user as Record<string, unknown>),
        buildStrictAiRulesBlock(user, 'conversation'),
      ];

      if (shouldIncludeWealthContext(user.ai_data_scope)) {
        try {
          const now = new Date();
          const dashboard = await this.wealthService.getDashboard(userId, {
            mode: 'month',
            year: now.getFullYear(),
            month: now.getMonth() + 1,
          });
          const currency =
            (user.currency || 'USD').trim().toUpperCase() || 'USD';
          parts.push(buildWealthContextBlock(dashboard, currency));
        } catch (error) {
          this.logger.warn(
            `Wealth context skipped for ${userId}: ${
              error instanceof Error ? error.message : 'unknown error'
            }`,
          );
        }
      }

      return parts.join('\n\n');
    } catch (error) {
      this.logger.warn(
        `Failed to build assistant context for ${userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return null;
    }
  }
}
