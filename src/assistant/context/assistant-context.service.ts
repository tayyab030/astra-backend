import { Injectable, Logger } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { WealthService } from '../../wealth/wealth.service';
import { PrayerService } from '../../prayer/prayer.service';
import { TasksService } from '../../tasks/tasks.service';
import { ProjectsService } from '../../tasks/projects.service';
import { GoalsService } from '../../goals/goals.service';
import { HabitsService } from '../../habits/habits.service';
import { HealthService } from '../../health/health.service';
import { NotesService } from '../../notes/notes.service';
import { TimeTrackService } from '../../time-track/time-track.service';
import {
  buildStrictAiRulesBlock,
} from './ai-settings-context.builder';
import { buildAppKnowledgeBlock } from './app-knowledge.builder';
import { buildUserContextBlock } from './user-context.builder';
import { buildWealthContextBlock } from './wealth-context.builder';
import {
  buildPrayerContextBlock,
  buildPrayerMissingContextBlock,
} from './prayer-context.builder';
import {
  assistantDateDaysAgo,
  assistantTodayDate,
  buildGoalsContextBlock,
  buildHabitsContextBlock,
  buildHealthContextBlock,
  buildNotesContextBlock,
  buildTasksContextBlock,
  buildTimeTrackContextBlock,
} from './life-os-context.builder';
import { fetchUsdExchangeRates } from '../constants/currency';

/**
 * Assembles live Groq context for the authenticated user only.
 * Never accepts another user id; callers must pass JWT `sub`.
 */
@Injectable()
export class AssistantContextService {
  private readonly logger = new Logger(AssistantContextService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly wealthService: WealthService,
    private readonly prayerService: PrayerService,
    private readonly tasksService: TasksService,
    private readonly projectsService: ProjectsService,
    private readonly goalsService: GoalsService,
    private readonly habitsService: HabitsService,
    private readonly healthService: HealthService,
    private readonly notesService: NotesService,
    private readonly timeTrackService: TimeTrackService,
  ) {}

  async buildLiveContext(userId: string): Promise<string | null> {
    try {
      const user = await this.authService.getMe(userId);
      const parts: string[] = [
        buildUserContextBlock(user as Record<string, unknown>),
        buildStrictAiRulesBlock(user, 'conversation'),
        buildAppKnowledgeBlock(),
      ];

      const today = assistantTodayDate();
      const healthStart = assistantDateDaysAgo(14);
      const timeStart = assistantDateDaysAgo(7);

      const [
        tasksResult,
        projectsResult,
        goalsResult,
        habitsResult,
        healthResult,
        notesResult,
        timeResult,
        wealthResult,
        prayerResult,
      ] = await Promise.all([
        this.safeLoad('tasks', userId, () =>
          this.tasksService.listTasks(userId, { filter: 'all' }),
        ),
        this.safeLoad('projects', userId, () =>
          this.projectsService.listProjects(userId),
        ),
        this.safeLoad('goals', userId, () =>
          this.goalsService.getAssistantSnapshot(userId),
        ),
        this.safeLoad('habits', userId, () =>
          this.habitsService.listSerialized(userId),
        ),
        this.safeLoad('health', userId, () =>
          this.healthService.getDashboard(userId, {
            start_date: healthStart,
            end_date: today,
            today_date: today,
          }),
        ),
        this.safeLoad('notes', userId, () =>
          this.notesService.getDashboard(userId, { page: 1, page_size: 20 }),
        ),
        this.safeLoad('time-track', userId, () =>
          this.timeTrackService.getDashboard(userId, {
            start_date: timeStart,
            end_date: today,
          }),
        ),
        this.safeLoad('wealth', userId, async () => {
          const now = new Date();
          return this.wealthService.getDashboard(userId, {
            mode: 'month',
            year: now.getFullYear(),
            month: now.getMonth() + 1,
          });
        }),
        this.safeLoad('prayer', userId, () =>
          this.prayerService.getTodayTimingsForUser(userId),
        ),
      ]);

      if (tasksResult) {
        parts.push(
          buildTasksContextBlock(
            tasksResult.summary,
            tasksResult.tasks,
            projectsResult ?? [],
          ),
        );
      }

      if (goalsResult) {
        parts.push(
          buildGoalsContextBlock(goalsResult.summary, goalsResult.goals),
        );
      }

      if (habitsResult) {
        parts.push(buildHabitsContextBlock(habitsResult));
      }

      if (healthResult) {
        parts.push(buildHealthContextBlock(healthResult));
      }

      if (notesResult) {
        parts.push(
          buildNotesContextBlock(notesResult.stats, notesResult.notes),
        );
      }

      if (timeResult) {
        parts.push(buildTimeTrackContextBlock(timeResult));
      }

      if (wealthResult) {
        try {
          const currency =
            (user.currency || 'USD').trim().toUpperCase() || 'USD';
          const rates = await fetchUsdExchangeRates();
          parts.push(buildWealthContextBlock(wealthResult, currency, rates));
        } catch (error) {
          this.logger.warn(
            `Wealth context format skipped for ${userId}: ${
              error instanceof Error ? error.message : 'unknown error'
            }`,
          );
        }
      }

      if (prayerResult) {
        const { prefs, timings, todayCompleted } = prayerResult;
        if (timings) {
          parts.push(buildPrayerContextBlock(timings, todayCompleted));
        } else {
          parts.push(
            buildPrayerMissingContextBlock({
              hasMethod: prefs.method != null,
              hasLocation: prefs.latitude != null && prefs.longitude != null,
            }),
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

  private async safeLoad<T>(
    label: string,
    userId: string,
    loader: () => Promise<T>,
  ): Promise<T | null> {
    try {
      return await loader();
    } catch (error) {
      this.logger.warn(
        `${label} context skipped for ${userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return null;
    }
  }
}
