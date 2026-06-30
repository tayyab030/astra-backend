import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goal } from '../goals/entities/goal.entity';
import { getGoalCategoryLabel } from '../goals/constants/goal-categories';
import { TaskFilterValue } from './constants/task-meta';
import { CreateTaskDto } from './dto/create-task.dto';
import { TasksFilterDto } from './dto/tasks-filter.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Project } from './entities/project.entity';
import { Task } from './entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,
  ) {}

  async listTasks(userId: string, filterDto: TasksFilterDto = {}) {
    const statusFilter = (filterDto.filter ?? 'all') as TaskFilterValue;

    const tasks = await this.taskRepository.find({
      where: { user_id: userId },
      relations: { project: true, goal: true },
      order: { completed: 'ASC', due_date: 'ASC', created_at: 'DESC' },
    });

    const scoped = this.applyGoalFilter(
      this.applyProjectFilter(
        this.applyPeriodFilter(tasks, filterDto.period),
        filterDto.project_id,
      ),
      filterDto.goal_id,
    );
    const filtered = this.applyTaskFilter(scoped, statusFilter);

    return {
      summary: this.buildSummary(scoped),
      tasks: filtered.map((task) => this.serializeTask(task)),
    };
  }

  async getTask(userId: string, taskId: string) {
    const task = await this.findOwnedTask(userId, taskId);
    return this.serializeTask(task);
  }

  async createTask(userId: string, dto: CreateTaskDto) {
    const links = this.resolveTaskLinks(dto.project_id, dto.goal_id);
    await this.validateTaskLinks(userId, links.project_id, links.goal_id);

    const task = this.taskRepository.create({
      user_id: userId,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      due_date: this.normalizeDueDate(dto.due_date),
      priority: dto.priority ?? 'medium',
      status: dto.status ?? 'todo',
      completed: false,
      project_id: links.project_id,
      goal_id: links.goal_id,
    });

    const saved = await this.taskRepository.save(task);
    const withRelations = await this.findOwnedTask(userId, saved.id);

    return {
      message: 'Task created successfully',
      ...this.serializeTask(withRelations),
    };
  }

  async updateTask(userId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.findOwnedTask(userId, taskId);

    const nextProjectId =
      dto.project_id !== undefined ? dto.project_id : task.project_id;
    const nextGoalId = dto.goal_id !== undefined ? dto.goal_id : task.goal_id;
    const links = this.resolveTaskLinks(nextProjectId, nextGoalId);
    await this.validateTaskLinks(userId, links.project_id, links.goal_id);

    if (dto.title !== undefined) task.title = dto.title.trim();
    if (dto.description !== undefined) {
      task.description = dto.description.trim() || null;
    }
    if (dto.due_date !== undefined) {
      task.due_date = this.normalizeDueDate(dto.due_date);
    }
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.completed !== undefined) task.completed = dto.completed;
    task.project_id = links.project_id;
    task.goal_id = links.goal_id;

    if (dto.completed === true && task.status === 'todo') {
      task.status = 'done';
    }
    if (dto.completed === false && task.status === 'done') {
      task.status = 'todo';
    }

    await this.taskRepository.update(taskId, {
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      priority: task.priority,
      status: task.status,
      completed: task.completed,
      project_id: task.project_id,
      goal_id: task.goal_id,
    });

    const updated = await this.findOwnedTask(userId, taskId);

    return {
      message: 'Task updated successfully',
      ...this.serializeTask(updated),
    };
  }

  async deleteTask(userId: string, taskId: string) {
    const task = await this.findOwnedTask(userId, taskId);
    await this.taskRepository.remove(task);
    return { message: 'Task deleted successfully' };
  }

  async getLinkedTaskCounts(userId: string, goalIds: string[]) {
    const counts = new Map<
      string,
      { total: number; completed: number; pending: number }
    >();
    if (goalIds.length === 0) return counts;

    const rows = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.goal_id', 'goal_id')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN task.completed = true THEN 1 ELSE 0 END)',
        'completed',
      )
      .addSelect(
        'SUM(CASE WHEN task.completed = false THEN 1 ELSE 0 END)',
        'pending',
      )
      .where('task.user_id = :userId', { userId })
      .andWhere('task.goal_id IN (:...goalIds)', { goalIds })
      .groupBy('task.goal_id')
      .getRawMany<{
        goal_id: string;
        total: string;
        completed: string;
        pending: string;
      }>();

    for (const row of rows) {
      counts.set(row.goal_id, {
        total: Number(row.total),
        completed: Number(row.completed),
        pending: Number(row.pending),
      });
    }

    return counts;
  }

  async getProjectTaskCounts(userId: string, projectIds: string[]) {
    const counts = new Map<
      string,
      { total: number; completed: number; pending: number }
    >();
    if (projectIds.length === 0) return counts;

    const rows = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.project_id', 'project_id')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN task.completed = true THEN 1 ELSE 0 END)',
        'completed',
      )
      .addSelect(
        'SUM(CASE WHEN task.completed = false THEN 1 ELSE 0 END)',
        'pending',
      )
      .where('task.user_id = :userId', { userId })
      .andWhere('task.project_id IN (:...projectIds)', { projectIds })
      .groupBy('task.project_id')
      .getRawMany<{
        project_id: string;
        total: string;
        completed: string;
        pending: string;
      }>();

    for (const row of rows) {
      counts.set(row.project_id, {
        total: Number(row.total),
        completed: Number(row.completed),
        pending: Number(row.pending),
      });
    }

    return counts;
  }

  async listProjectTasks(userId: string, projectId: string) {
    await this.findOwnedProject(userId, projectId);

    const tasks = await this.taskRepository.find({
      where: { user_id: userId, project_id: projectId },
      relations: { project: true, goal: true },
      order: { due_date: 'ASC', created_at: 'DESC' },
    });

    return tasks.map((task) => this.serializeTask(task));
  }

  async getTasksDueSoonCounts(userId: string, projectIds: string[]) {
    const counts = new Map<string, number>();
    if (projectIds.length === 0) return counts;

    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 7);
    const todayStr = today.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const rows = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.project_id', 'project_id')
      .addSelect('COUNT(*)', 'count')
      .where('task.user_id = :userId', { userId })
      .andWhere('task.project_id IN (:...projectIds)', { projectIds })
      .andWhere('task.completed = false')
      .andWhere('task.due_date IS NOT NULL')
      .andWhere('task.due_date >= :todayStr', { todayStr })
      .andWhere('task.due_date <= :endStr', { endStr })
      .groupBy('task.project_id')
      .getRawMany<{ project_id: string; count: string }>();

    for (const row of rows) {
      counts.set(row.project_id, Number(row.count));
    }

    return counts;
  }

  serializeTask(task: Task) {
    const linkType = task.project_id
      ? 'project'
      : task.goal_id
        ? 'goal'
        : 'none';

    return {
      id: task.id,
      title: task.title,
      description: task.description ?? '',
      due_date: task.due_date,
      due_date_label: this.formatDueDateLabel(task.due_date),
      completed: task.completed,
      priority: task.priority,
      status: task.status,
      link_type: linkType,
      project_id: task.project_id,
      project_title: task.project?.title ?? null,
      project_color: task.project?.color ?? null,
      goal_id: task.goal_id,
      goal_title: task.goal?.title ?? null,
      goal_category: task.goal?.category ?? null,
      goal_category_label: task.goal
        ? getGoalCategoryLabel(task.goal.category)
        : null,
      project: task.project?.title ?? '',
      projectColor: task.project?.color ?? null,
      tags: this.buildTaskTags(task),
    };
  }

  private buildTaskTags(task: Task) {
    const priorityColors: Record<string, string> = {
      high: '#dc2626',
      medium: '#0891b2',
      low: '#475569',
    };

    return [
      {
        id: 'priority',
        name: task.priority.charAt(0).toUpperCase() + task.priority.slice(1),
        color: priorityColors[task.priority] ?? '#475569',
      },
    ];
  }

  private applyPeriodFilter(tasks: Task[], period?: 'week' | 'month' | 'year') {
    if (!period) return tasks;

    const { start, end } = this.getPeriodBounds(period);
    return tasks.filter(
      (task) =>
        task.due_date === null ||
        (task.due_date >= start && task.due_date <= end),
    );
  }

  private applyGoalFilter(tasks: Task[], goalId?: string) {
    if (!goalId) return tasks;
    if (goalId === 'none') {
      return tasks.filter((task) => task.goal_id === null);
    }
    return tasks.filter((task) => task.goal_id === goalId);
  }

  private applyProjectFilter(tasks: Task[], projectId?: string) {
    if (!projectId) return tasks;
    return tasks.filter((task) => task.project_id === projectId);
  }

  private getPeriodBounds(period: 'week' | 'month' | 'year') {
    const now = new Date();

    if (period === 'year') {
      const year = now.getFullYear();
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    }

    if (period === 'month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const monthValue = String(month + 1).padStart(2, '0');
      return {
        start: `${year}-${monthValue}-01`,
        end: `${year}-${monthValue}-${String(lastDay).padStart(2, '0')}`,
      };
    }

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + mondayOffset);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return {
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
    };
  }

  private applyTaskFilter(tasks: Task[], filter: TaskFilterValue) {
    const today = this.todayString();

    if (filter === 'completed') {
      return tasks.filter((task) => task.completed);
    }

    if (filter === 'overdue') {
      return tasks.filter(
        (task) =>
          !task.completed && task.due_date !== null && task.due_date < today,
      );
    }

    if (filter === 'upcoming') {
      return tasks.filter(
        (task) =>
          !task.completed &&
          task.due_date !== null &&
          task.due_date >= today,
      );
    }

    if (filter === 'undated') {
      return tasks.filter(
        (task) => !task.completed && task.due_date === null,
      );
    }

    return tasks;
  }

  private buildSummary(tasks: Task[]) {
    const today = this.todayString();
    const completed = tasks.filter((task) => task.completed).length;
    const overdue = tasks.filter(
      (task) =>
        !task.completed && task.due_date !== null && task.due_date < today,
    ).length;
    const upcoming = tasks.filter(
      (task) =>
        !task.completed &&
        task.due_date !== null &&
        task.due_date >= today,
    ).length;
    const undated = tasks.filter(
      (task) => !task.completed && task.due_date === null,
    ).length;

    return {
      total: tasks.length,
      upcoming,
      overdue,
      completed,
      undated,
    };
  }

  private resolveTaskLinks(
    projectId?: string | null,
    goalId?: string | null,
  ) {
    const normalizedProjectId = projectId || null;
    const normalizedGoalId = goalId || null;

    if (normalizedProjectId && normalizedGoalId) {
      throw new BadRequestException({
        link: ['Task cannot be linked to both a project and a goal.'],
      });
    }

    return {
      project_id: normalizedProjectId,
      goal_id: normalizedGoalId,
    };
  }

  private async validateTaskLinks(
    userId: string,
    projectId: string | null,
    goalId: string | null,
  ) {
    if (projectId) {
      await this.findOwnedProject(userId, projectId);
    }

    if (goalId) {
      const goal = await this.goalRepository.findOne({
        where: { id: goalId, user_id: userId },
      });

      if (!goal) {
        throw new NotFoundException({ detail: 'Goal not found.' });
      }
    }
  }

  private async findOwnedProject(userId: string, projectId: string) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, user_id: userId },
    });

    if (!project) {
      throw new NotFoundException({ detail: 'Project not found.' });
    }

    return project;
  }

  private async findOwnedTask(userId: string, taskId: string) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, user_id: userId },
      relations: { project: true, goal: true },
    });

    if (!task) {
      throw new NotFoundException({ detail: 'Task not found.' });
    }

    return task;
  }

  private normalizeDueDate(value?: string | null) {
    if (!value) return null;
    return value.slice(0, 10);
  }

  private todayString() {
    return new Date().toISOString().slice(0, 10);
  }

  formatDueDateLabel(dueDate: string | null) {
    if (!dueDate) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${dueDate}T00:00:00`);
    const diffDays = Math.round(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1 && diffDays < 7) {
      return target.toLocaleDateString('en-US', { weekday: 'long' });
    }

    return target.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}
