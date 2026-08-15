import { Injectable, Logger } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { WealthService } from '../../wealth/wealth.service';
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
      const now = new Date();
      const [user, dashboard] = await Promise.all([
        this.authService.getMe(userId),
        this.wealthService.getDashboard(userId, {
          mode: 'month',
          year: now.getFullYear(),
          month: now.getMonth() + 1,
        }),
      ]);

      const currency = (user.currency || 'USD').trim().toUpperCase() || 'USD';
      return [
        buildUserContextBlock(user),
        buildWealthContextBlock(dashboard, currency),
      ].join('\n\n');
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
