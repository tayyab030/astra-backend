import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getGoalCategoryLabel } from './constants/goal-categories';
import { CreateGoalDto } from './dto/create-goal.dto';
import { GoalsFilterDto } from './dto/goals-filter.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { GoalMilestone } from './entities/goal-milestone.entity';
import { Goal } from './entities/goal.entity';

type ResolvedFilter =
  | { mode: 'month'; year: number; month: number }
  | { mode: 'year'; start_year: number; end_year: number };

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,
    @InjectRepository(GoalMilestone)
    private readonly milestoneRepository: Repository<GoalMilestone>,
  ) {}

  async getDashboard(userId: string, filterDto: GoalsFilterDto) {
    const filter = this.resolveFilter(filterDto);
    const goals = await this.listFilteredGoals(userId, filter);

    return {
      filter,
      summary: this.buildSummary(goals),
      goals: goals.map((goal) => this.serializeGoal(goal)),
    };
  }

  async createGoal(userId: string, dto: CreateGoalDto) {
    if (dto.target_date < dto.start_date) {
      throw new BadRequestException({
        target_date: ['Target date must be on or after the start date.'],
      });
    }

    const milestones = dto.milestones ?? [];
    const progress =
      milestones.length > 0
        ? this.calculateProgressFromMilestones(
            milestones.map((milestone, index) => ({
              completed: false,
              sort_order: index,
            })),
          )
        : (dto.progress ?? 0);

    const goal = this.goalRepository.create({
      user_id: userId,
      title: dto.title.trim(),
      category: dto.category,
      priority: dto.priority,
      motivation: dto.motivation?.trim() ?? null,
      start_date: dto.start_date,
      target_date: dto.target_date,
      progress,
      milestones: milestones.map((milestone, index) =>
        this.milestoneRepository.create({
          title: milestone.title.trim(),
          due_date: milestone.due_date,
          completed: false,
          sort_order: index,
        }),
      ),
    });

    const saved = await this.goalRepository.save(goal);
    const withMilestones = await this.findOwnedGoal(userId, saved.id);
    return this.serializeGoal(withMilestones);
  }

  async updateGoal(userId: string, goalId: string, dto: UpdateGoalDto) {
    const goal = await this.findOwnedGoal(userId, goalId);
    const startDate = dto.start_date ?? goal.start_date;
    const targetDate = dto.target_date ?? goal.target_date;

    if (targetDate < startDate) {
      throw new BadRequestException({
        target_date: ['Target date must be on or after the start date.'],
      });
    }

    if (dto.title !== undefined) goal.title = dto.title.trim();
    if (dto.category !== undefined) goal.category = dto.category;
    if (dto.priority !== undefined) goal.priority = dto.priority;
    if (dto.motivation !== undefined) {
      goal.motivation = dto.motivation?.trim() ? dto.motivation.trim() : null;
    }
    if (dto.start_date !== undefined) goal.start_date = dto.start_date;
    if (dto.target_date !== undefined) goal.target_date = dto.target_date;

    if (dto.progress !== undefined && goal.milestones.length === 0) {
      goal.progress = dto.progress;
    }

    if (goal.milestones.length > 0) {
      goal.progress = this.calculateProgressFromMilestones(goal.milestones);
    }

    await this.goalRepository.update(goalId, {
      title: goal.title,
      category: goal.category,
      priority: goal.priority,
      motivation: goal.motivation,
      start_date: goal.start_date,
      target_date: goal.target_date,
      progress: goal.progress,
    });

    const updated = await this.findOwnedGoal(userId, goalId);
    return this.serializeGoal(updated);
  }

  async deleteGoal(userId: string, goalId: string) {
    const goal = await this.findOwnedGoal(userId, goalId);
    await this.goalRepository.remove(goal);
    return { message: 'Goal deleted' };
  }

  async updateMilestone(
    userId: string,
    goalId: string,
    milestoneId: string,
    dto: UpdateMilestoneDto,
  ) {
    const goal = await this.findOwnedGoal(userId, goalId);
    const milestone = goal.milestones.find((entry) => entry.id === milestoneId);

    if (!milestone) {
      throw new NotFoundException({ detail: 'Milestone not found.' });
    }

    if (dto.title !== undefined) milestone.title = dto.title.trim();
    if (dto.due_date !== undefined) milestone.due_date = dto.due_date;
    if (dto.completed !== undefined) milestone.completed = dto.completed;

    await this.milestoneRepository.save(milestone);

    const updated = await this.findOwnedGoal(userId, goalId);
    const progress = this.calculateProgressFromMilestones(updated.milestones);
    await this.goalRepository.update(goalId, { progress });
    updated.progress = progress;

    return this.serializeGoal(updated);
  }

  async createMilestone(
    userId: string,
    goalId: string,
    dto: { title: string; due_date: string },
  ) {
    const goal = await this.findOwnedGoal(userId, goalId);
    const milestone = this.milestoneRepository.create({
      title: dto.title.trim(),
      due_date: dto.due_date,
      completed: false,
      sort_order: goal.milestones.length,
    });

    goal.milestones = [...goal.milestones, milestone];
    goal.progress = this.calculateProgressFromMilestones(goal.milestones);
    await this.goalRepository.save(goal);

    const updated = await this.findOwnedGoal(userId, goalId);
    return this.serializeGoal(updated);
  }

  async deleteMilestone(userId: string, goalId: string, milestoneId: string) {
    const goal = await this.findOwnedGoal(userId, goalId);
    const milestone = goal.milestones.find((entry) => entry.id === milestoneId);

    if (!milestone) {
      throw new NotFoundException({ detail: 'Milestone not found.' });
    }

    await this.milestoneRepository.remove(milestone);

    const remaining = goal.milestones.filter((entry) => entry.id !== milestoneId);
    const progress = this.calculateProgressFromMilestones(remaining);
    await this.goalRepository.update(goalId, { progress });

    const updated = await this.findOwnedGoal(userId, goalId);
    updated.progress = progress;
    return this.serializeGoal(updated);
  }

  private resolveFilter(filterDto: GoalsFilterDto): ResolvedFilter {
    const now = new Date();
    const mode = filterDto.mode ?? 'month';

    if (mode === 'year') {
      const startYear = filterDto.start_year ?? now.getFullYear();
      const endYear = filterDto.end_year ?? startYear;

      if (endYear < startYear) {
        throw new BadRequestException({
          end_year: ['End year must be greater than or equal to start year.'],
        });
      }

      return { mode: 'year', start_year: startYear, end_year: endYear };
    }

    return {
      mode: 'month',
      year: filterDto.year ?? now.getFullYear(),
      month: filterDto.month ?? now.getMonth() + 1,
    };
  }

  private async listFilteredGoals(userId: string, filter: ResolvedFilter) {
    const query = this.goalRepository
      .createQueryBuilder('goal')
      .leftJoinAndSelect('goal.milestones', 'milestone')
      .where('goal.user_id = :userId', { userId })
      .orderBy('goal.target_date', 'ASC')
      .addOrderBy('milestone.sort_order', 'ASC');

    if (filter.mode === 'month') {
      const periodStart = `${filter.year}-${String(filter.month).padStart(2, '0')}-01`;
      const lastDay = new Date(filter.year, filter.month, 0).getDate();
      const periodEnd = `${filter.year}-${String(filter.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      query
        .andWhere('goal.start_date <= :periodEnd', { periodEnd })
        .andWhere('goal.target_date >= :periodStart', { periodStart });
    } else {
      const periodStart = `${filter.start_year}-01-01`;
      const periodEnd = `${filter.end_year}-12-31`;

      query
        .andWhere('goal.start_date <= :periodEnd', { periodEnd })
        .andWhere('goal.target_date >= :periodStart', { periodStart });
    }

    return query.getMany();
  }

  private buildSummary(goals: Goal[]) {
    const activeGoals = goals.filter((goal) => goal.progress < 100);
    const completedGoals = goals.filter((goal) => goal.progress >= 100);
    const avgProgress =
      goals.length > 0
        ? Math.round(
            goals.reduce((total, goal) => total + goal.progress, 0) /
              goals.length,
          )
        : 0;
    const longestStreak =
      goals.length > 0
        ? Math.max(...goals.map((goal) => goal.streak))
        : 0;

    return {
      active_goals: activeGoals.length,
      high_priority_active: activeGoals.filter(
        (goal) => goal.priority === 'high',
      ).length,
      avg_progress: avgProgress,
      longest_streak: longestStreak,
      completed_goals: completedGoals.length,
    };
  }

  private calculateProgressFromMilestones(
    milestones: Pick<GoalMilestone, 'completed'>[],
  ) {
    if (milestones.length === 0) {
      return 0;
    }

    const completedCount = milestones.filter(
      (milestone) => milestone.completed,
    ).length;

    return Math.round((completedCount / milestones.length) * 100);
  }

  private async findOwnedGoal(userId: string, goalId: string) {
    const goal = await this.goalRepository.findOne({
      where: { id: goalId, user_id: userId },
      relations: { milestones: true },
      order: { milestones: { sort_order: 'ASC' } },
    });

    if (!goal) {
      throw new NotFoundException({ detail: 'Goal not found.' });
    }

    return goal;
  }

  private serializeGoal(goal: Goal) {
    const milestones = [...(goal.milestones ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );

    return {
      id: goal.id,
      title: goal.title,
      category: goal.category,
      category_label: getGoalCategoryLabel(goal.category),
      priority: goal.priority,
      motivation: goal.motivation ?? '',
      start_date: goal.start_date,
      target_date: goal.target_date,
      progress: goal.progress,
      streak: goal.streak,
      linked_tasks: goal.linked_tasks,
      milestones: milestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        due_date: milestone.due_date,
        completed: milestone.completed,
      })),
    };
  }
}
