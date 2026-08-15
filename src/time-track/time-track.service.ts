import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, Repository } from 'typeorm';
import { TasksService } from '../tasks/tasks.service';
import {
  AddTrackedTaskDto,
  CreateTimeEntryDto,
  TimeTrackFilterDto,
  UpdateTimeTrackSettingsDto,
} from './dto/time-track.dto';
import { TimeEntry } from './entities/time-entry.entity';
import { TimeTrackedTask } from './entities/time-tracked-task.entity';
import { TimeTrackSettings } from './entities/time-track-settings.entity';

const DEFAULT_WEEKLY_TARGET_HOURS = 40;

@Injectable()
export class TimeTrackService {
  constructor(
    @InjectRepository(TimeEntry)
    private readonly entryRepository: Repository<TimeEntry>,
    @InjectRepository(TimeTrackedTask)
    private readonly trackedTaskRepository: Repository<TimeTrackedTask>,
    @InjectRepository(TimeTrackSettings)
    private readonly settingsRepository: Repository<TimeTrackSettings>,
    private readonly tasksService: TasksService,
  ) {}

  async getDashboard(userId: string, filterDto: TimeTrackFilterDto) {
    const { start_date, end_date } = this.resolveDateRange(filterDto);
    // Single-day queries (timer "today") must use the client's calendar date.
    // toISOString() is UTC and skews "today" for timezones ahead of UTC.
    const today =
      start_date === end_date ? start_date : this.formatDateLocal(new Date());

    const [entries, trackedTasks, settings] = await Promise.all([
      this.findEntries(userId, start_date, end_date, filterDto.search),
      this.buildTrackedTasksForDate(userId, today),
      this.getOrCreateSettings(userId),
    ]);

    const todayEntries = entries.filter((entry) => entry.date === today);
    const totalSeconds = entries.reduce(
      (sum, entry) => sum + entry.duration_seconds,
      0,
    );
    const todayTotalSeconds = todayEntries.reduce(
      (sum, entry) => sum + entry.duration_seconds,
      0,
    );

    return {
      filter: { start_date, end_date },
      weekly_target: { hours_per_week: settings.weekly_target_hours },
      settings: this.serializeSettings(settings),
      tracked_tasks: trackedTasks,
      entries,
      summary: {
        total_seconds: totalSeconds,
        today_total_seconds: todayTotalSeconds,
        session_count: entries.length,
      },
    };
  }

  async createEntry(userId: string, dto: CreateTimeEntryDto) {
    const task = await this.tasksService.getTask(userId, dto.task_id);
    const startTime = new Date(dto.start_time);
    const endTime = dto.end_time ? new Date(dto.end_time) : new Date();

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException({
        start_time: ['Invalid start or end time.'],
      });
    }

    if (endTime.getTime() < startTime.getTime()) {
      throw new BadRequestException({
        end_time: ['End time must be after start time.'],
      });
    }

    const entry = this.entryRepository.create({
      user_id: userId,
      task_id: dto.task_id,
      task_title: task.title,
      date: dto.entry_date ?? this.formatDateLocal(startTime),
      start_time: startTime,
      end_time: endTime,
      duration_seconds: dto.duration_seconds,
    });

    const saved = await this.entryRepository.save(entry);
    const trackDate = dto.entry_date ?? this.formatDateLocal(startTime);
    await this.ensureTrackedTask(userId, dto.task_id, trackDate);

    return this.serializeEntry(saved);
  }

  async deleteEntry(userId: string, entryId: string) {
    const entry = await this.findOwnedEntry(userId, entryId);
    const { task_id: taskId, date } = entry;

    const result = await this.entryRepository.delete({
      id: entryId,
      user_id: userId,
    });

    if (!result.affected) {
      throw new NotFoundException('Time entry not found');
    }

    const remainingEntries = await this.entryRepository.count({
      where: { user_id: userId, task_id: taskId, date },
    });

    if (remainingEntries === 0) {
      await this.trackedTaskRepository.delete({
        user_id: userId,
        task_id: taskId,
        track_date: date,
      });
    }

    return { message: 'Time entry deleted' };
  }

  async addTrackedTask(userId: string, dto: AddTrackedTaskDto) {
    await this.tasksService.getTask(userId, dto.task_id);
    const trackDate = dto.track_date ?? this.formatDateLocal(new Date());

    const existing = await this.trackedTaskRepository.findOne({
      where: {
        user_id: userId,
        task_id: dto.task_id,
        track_date: trackDate,
      },
    });

    if (existing) {
      return this.buildTrackedTaskResponse(userId, existing, trackDate);
    }

    const tracked = this.trackedTaskRepository.create({
      user_id: userId,
      task_id: dto.task_id,
      track_date: trackDate,
    });

    const saved = await this.trackedTaskRepository.save(tracked);
    return this.buildTrackedTaskResponse(userId, saved, trackDate);
  }

  async removeTrackedTask(
    userId: string,
    taskId: string,
    trackDate?: string,
  ) {
    const date = trackDate ?? this.formatDateLocal(new Date());

    await this.deleteTaskEntriesForDate(userId, taskId, date);

    await this.trackedTaskRepository.delete({
      user_id: userId,
      task_id: taskId,
      track_date: date,
    });

    return { message: 'Tracked task and time entries removed' };
  }

  async updateSettings(userId: string, dto: UpdateTimeTrackSettingsDto) {
    const settings = await this.getOrCreateSettings(userId);

    if (dto.hours_per_week !== undefined) {
      settings.weekly_target_hours = dto.hours_per_week;
    }

    if (dto.activity_bar_visible !== undefined) {
      settings.activity_bar_visible = dto.activity_bar_visible;
    }

    if (dto.last_selected_task_id !== undefined) {
      if (dto.last_selected_task_id === null) {
        settings.last_selected_task_id = null;
      } else {
        await this.tasksService.getTask(userId, dto.last_selected_task_id);
        settings.last_selected_task_id = dto.last_selected_task_id;
      }
    }

    const saved = await this.settingsRepository.save(settings);
    return this.serializeSettings(saved);
  }

  private async findEntries(
    userId: string,
    startDate: string,
    endDate: string,
    search?: string,
  ) {
    const entries = await this.entryRepository.find({
      where: {
        user_id: userId,
        date: Between(startDate, endDate),
        ...(search?.trim()
          ? { task_title: ILike(`%${search.trim()}%`) }
          : {}),
      },
      order: { start_time: 'DESC' },
    });

    return entries.map((entry) => this.serializeEntry(entry));
  }

  private async buildTrackedTasksForDate(userId: string, trackDate: string) {
    const tracked = await this.trackedTaskRepository.find({
      where: { user_id: userId, track_date: trackDate },
      order: { created_at: 'ASC' },
    });

    return Promise.all(
      tracked.map((item) => this.buildTrackedTaskResponse(userId, item, trackDate)),
    );
  }

  private async buildTrackedTaskResponse(
    userId: string,
    tracked: TimeTrackedTask,
    trackDate: string,
  ) {
    const task = await this.tasksService.getTask(userId, tracked.task_id);
    const entries = await this.entryRepository.find({
      where: {
        user_id: userId,
        task_id: tracked.task_id,
        date: trackDate,
      },
    });

    const totalSecondsToday = entries.reduce(
      (sum, entry) => sum + entry.duration_seconds,
      0,
    );

    return {
      task_id: tracked.task_id,
      title: task.title,
      project_title: task.project_title ?? null,
      project_color: task.project_color ?? null,
      goal_title: task.goal_title ?? null,
      goal_category_label: task.goal_category_label ?? null,
      link_type: task.link_type ?? 'none',
      due_date: task.due_date ?? null,
      due_date_label: task.due_date_label ?? null,
      priority: task.priority ?? 'medium',
      status: task.status ?? 'todo',
      total_seconds_today: totalSecondsToday,
      is_active: false,
    };
  }

  private async ensureTrackedTask(
    userId: string,
    taskId: string,
    trackDate: string,
  ) {
    const existing = await this.trackedTaskRepository.findOne({
      where: { user_id: userId, task_id: taskId, track_date: trackDate },
    });

    if (existing) return existing;

    const tracked = this.trackedTaskRepository.create({
      user_id: userId,
      task_id: taskId,
      track_date: trackDate,
    });

    return this.trackedTaskRepository.save(tracked);
  }

  private async getOrCreateSettings(userId: string) {
    let settings = await this.settingsRepository.findOne({
      where: { user_id: userId },
    });

    if (!settings) {
      settings = this.settingsRepository.create({
        user_id: userId,
        weekly_target_hours: DEFAULT_WEEKLY_TARGET_HOURS,
        activity_bar_visible: true,
        last_selected_task_id: null,
      });
      settings = await this.settingsRepository.save(settings);
    }

    return settings;
  }

  private serializeSettings(settings: TimeTrackSettings) {
    return {
      hours_per_week: settings.weekly_target_hours,
      activity_bar_visible: settings.activity_bar_visible,
      last_selected_task_id: settings.last_selected_task_id,
    };
  }

  private async deleteTaskEntriesForDate(
    userId: string,
    taskId: string,
    date: string,
  ) {
    await this.entryRepository.delete({
      user_id: userId,
      task_id: taskId,
      date,
    });
  }

  private async findOwnedEntry(userId: string, entryId: string) {
    const entry = await this.entryRepository.findOne({
      where: { id: entryId, user_id: userId },
    });

    if (!entry) {
      throw new NotFoundException('Time entry not found');
    }

    return entry;
  }

  private resolveDateRange(filterDto: TimeTrackFilterDto) {
    const start = filterDto.start_date;
    const end = filterDto.end_date;

    if (start > end) {
      throw new BadRequestException({
        end_date: ['End date must be on or after start date.'],
      });
    }

    return { start_date: start, end_date: end };
  }

  private serializeEntry(entry: TimeEntry) {
    return {
      id: entry.id,
      task_id: entry.task_id,
      task_title: entry.task_title,
      date: entry.date,
      start_time: entry.start_time.toISOString(),
      end_time: entry.end_time.toISOString(),
      duration_seconds: entry.duration_seconds,
    };
  }

  /** Calendar yyyy-MM-dd in the process local timezone (not UTC). */
  private formatDateLocal(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
