import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Repository } from 'typeorm';
import { Habit } from '../habits/entities/habit.entity';
import { HabitsService } from '../habits/habits.service';
import {
  AdjustMetricDto,
  CreateSleepSessionDto,
  CreateWorkoutDto,
  HealthFilterDto,
  LogWeightDto,
  SaveMoodDto,
  ToggleSleepDto,
  UpdateHealthProfileDto,
  UpdateHealthTargetsDto,
  UpdateSleepSessionDto,
  UpdateTodayMetricsDto,
} from './dto/health.dto';
import { HealthDailyMetric } from './entities/health-daily-metric.entity';
import { HealthMoodEntry } from './entities/health-mood-entry.entity';
import { HealthSettings } from './entities/health-settings.entity';
import { HealthSleepSession } from './entities/health-sleep-session.entity';
import { HealthWeightEntry } from './entities/health-weight-entry.entity';
import { HealthWorkout } from './entities/health-workout.entity';

const METRIC_STEPS = {
  water: 1,
  exercise: 5,
} as const;

@Injectable()
export class HealthService {
  constructor(
    private readonly habitsService: HabitsService,
    @InjectRepository(HealthSettings)
    private readonly settingsRepository: Repository<HealthSettings>,
    @InjectRepository(HealthDailyMetric)
    private readonly dailyMetricRepository: Repository<HealthDailyMetric>,
    @InjectRepository(HealthWeightEntry)
    private readonly weightRepository: Repository<HealthWeightEntry>,
    @InjectRepository(HealthWorkout)
    private readonly workoutRepository: Repository<HealthWorkout>,
    @InjectRepository(HealthMoodEntry)
    private readonly moodRepository: Repository<HealthMoodEntry>,
    @InjectRepository(HealthSleepSession)
    private readonly sleepSessionRepository: Repository<HealthSleepSession>,
  ) {}

  async getDashboard(userId: string, filter: HealthFilterDto) {
    const { start_date, end_date } = this.resolveDateRange(filter);
    const today = filter.today_date ?? this.formatDateLocal(new Date());

    const [
      settings,
      todayMetric,
      dailyHistory,
      weightLog,
      habits,
      workouts,
      moodEntries,
      moodToday,
      latestWeightEntry,
      sleepSessions,
    ] = await Promise.all([
      this.getOrCreateSettings(userId),
      this.getOrCreateTodayMetric(userId, today),
      this.dailyMetricRepository.find({
        where: { user_id: userId, date: Between(start_date, end_date) },
        order: { date: 'ASC' },
      }),
      this.weightRepository.find({
        where: { user_id: userId, date: Between(start_date, end_date) },
        order: { date: 'ASC' },
      }),
      this.habitsService.listForUser(userId),
      this.workoutRepository.find({
        where: { user_id: userId, date: Between(start_date, end_date) },
        order: { date: 'DESC', created_at: 'DESC' },
      }),
      this.moodRepository.find({
        where: { user_id: userId, date: Between(start_date, end_date) },
        order: { date: 'DESC' },
      }),
      this.moodRepository.findOne({ where: { user_id: userId, date: today } }),
      this.weightRepository.findOne({
        where: { user_id: userId },
        order: { date: 'DESC' },
      }),
      this.sleepSessionRepository.find({
        where: [
          { user_id: userId, ended_at: IsNull() },
          { user_id: userId, date: today },
        ],
        order: { started_at: 'ASC' },
      }),
    ]);

    const summary = this.computeSummary(habits, dailyHistory, workouts);

    return {
      filter: { start_date, end_date },
      health_score: this.computeHealthScore(settings, todayMetric, habits),
      latest_weight_kg: latestWeightEntry
        ? Number(latestWeightEntry.weight_kg)
        : null,
      summary,
      profile: {
        height_cm: settings.height_cm ? Number(settings.height_cm) : null,
        ideal_weight_kg: settings.ideal_weight_kg
          ? Number(settings.ideal_weight_kg)
          : null,
      },
      targets: {
        water_glasses: settings.water_glasses_target,
        sleep_hours: Number(settings.sleep_hours_target),
        exercise_minutes: settings.exercise_minutes_target,
      },
      today: {
        water_glasses: todayMetric.water_glasses,
        sleep_hours: Number(todayMetric.sleep_hours),
        exercise_minutes: todayMetric.exercise_minutes,
      },
      sleep_sessions: sleepSessions.map((session) =>
        this.serializeSleepSession(session),
      ),
      weight_log: weightLog.map((entry) => this.serializeWeight(entry)),
      daily_history: dailyHistory.map((entry) => this.serializeDailyMetric(entry)),
      habits: habits.map((habit) => this.habitsService.serializeHabit(habit)),
      workouts: workouts.map((workout) => this.serializeWorkout(workout)),
      mood_entries: moodEntries.map((entry) => this.serializeMood(entry)),
      mood_today: moodToday
        ? { mood: moodToday.mood, notes: moodToday.notes ?? '' }
        : { mood: '', notes: '' },
    };
  }

  async updateProfile(userId: string, dto: UpdateHealthProfileDto) {
    const settings = await this.getOrCreateSettings(userId);

    if (dto.height_cm !== undefined) {
      settings.height_cm = dto.height_cm;
    }

    const heightCm =
      settings.height_cm != null ? Number(settings.height_cm) : null;

    if (dto.ideal_weight_kg !== undefined) {
      if (dto.ideal_weight_kg === null) {
        settings.ideal_weight_kg = null;
      } else {
        this.assertIdealWeightInHealthyRange(dto.ideal_weight_kg, heightCm);
        settings.ideal_weight_kg = dto.ideal_weight_kg;
      }
    } else if (
      dto.height_cm !== undefined &&
      settings.ideal_weight_kg != null &&
      heightCm != null
    ) {
      // Height changed — drop ideal if it no longer sits in the healthy band.
      try {
        this.assertIdealWeightInHealthyRange(
          Number(settings.ideal_weight_kg),
          heightCm,
        );
      } catch {
        settings.ideal_weight_kg = null;
      }
    }

    const saved = await this.settingsRepository.save(settings);
    return {
      height_cm: saved.height_cm ? Number(saved.height_cm) : null,
      ideal_weight_kg: saved.ideal_weight_kg
        ? Number(saved.ideal_weight_kg)
        : null,
    };
  }

  /** WHO healthy BMI 18.5–24.9 → weight band for a given height. */
  private assertIdealWeightInHealthyRange(
    idealWeightKg: number,
    heightCm: number | null,
  ) {
    if (heightCm == null || heightCm <= 0) {
      throw new BadRequestException(
        'Add your height before setting an ideal weight',
      );
    }
    const heightM = heightCm / 100;
    const h2 = heightM * heightM;
    const minKg = Math.round(18.5 * h2 * 10) / 10;
    const maxKg = Math.round(24.9 * h2 * 10) / 10;
    if (idealWeightKg < minKg || idealWeightKg > maxKg) {
      throw new BadRequestException(
        `Ideal weight must be within the healthy range (${minKg.toFixed(1)}–${maxKg.toFixed(1)} kg)`,
      );
    }
  }

  async updateTargets(userId: string, dto: UpdateHealthTargetsDto) {
    const settings = await this.getOrCreateSettings(userId);
    if (dto.water_glasses !== undefined) {
      settings.water_glasses_target = dto.water_glasses;
    }
    if (dto.sleep_hours !== undefined) {
      settings.sleep_hours_target = dto.sleep_hours;
    }
    if (dto.exercise_minutes !== undefined) {
      settings.exercise_minutes_target = dto.exercise_minutes;
    }
    const saved = await this.settingsRepository.save(settings);
    return {
      water_glasses: saved.water_glasses_target,
      sleep_hours: Number(saved.sleep_hours_target),
      exercise_minutes: saved.exercise_minutes_target,
    };
  }

  async updateTodayMetrics(userId: string, dto: UpdateTodayMetricsDto) {
    const today = this.formatDateLocal(new Date());
    const metric = await this.getOrCreateTodayMetric(userId, today);

    if (dto.water_glasses !== undefined) metric.water_glasses = dto.water_glasses;
    if (dto.exercise_minutes !== undefined) metric.exercise_minutes = dto.exercise_minutes;

    const saved = await this.dailyMetricRepository.save(metric);
    return this.serializeTodayMetrics(saved);
  }

  async adjustMetric(userId: string, dto: AdjustMetricDto) {
    const today = dto.date ?? this.formatDateLocal(new Date());
    const metric = await this.getOrCreateTodayMetric(userId, today);
    const step = METRIC_STEPS[dto.metric];
    const delta = step * dto.direction;

    if (dto.metric === 'water') {
      metric.water_glasses = Math.max(0, metric.water_glasses + delta);
    } else {
      metric.exercise_minutes = Math.max(0, metric.exercise_minutes + delta);
    }

    const saved = await this.dailyMetricRepository.save(metric);
    return this.serializeTodayMetrics(saved);
  }

  async toggleSleep(userId: string, dto: ToggleSleepDto) {
    const tappedAt = dto.timestamp ? new Date(dto.timestamp) : new Date();
    if (Number.isNaN(tappedAt.getTime())) {
      throw new BadRequestException('Invalid timestamp');
    }
    const localDate = dto.local_date ?? this.formatDateLocal(tappedAt);

    const active = await this.sleepSessionRepository.findOne({
      where: { user_id: userId, ended_at: IsNull() },
      order: { started_at: 'DESC' },
    });

    if (active) {
      if (tappedAt.getTime() <= new Date(active.started_at).getTime()) {
        throw new BadRequestException('Wake time must be after bedtime');
      }
      const previousDate = active.date;
      active.ended_at = tappedAt;
      // Count sleep toward the day you wake up
      active.date = localDate;
      const saved = await this.sleepSessionRepository.save(active);
      await this.syncSleepHoursForDate(userId, previousDate);
      if (previousDate !== localDate) {
        await this.syncSleepHoursForDate(userId, localDate);
      }
      return this.serializeSleepSession(saved);
    }

    const session = this.sleepSessionRepository.create({
      user_id: userId,
      date: localDate,
      started_at: tappedAt,
      ended_at: null,
    });
    const saved = await this.sleepSessionRepository.save(session);
    return this.serializeSleepSession(saved);
  }

  async createSleepSession(userId: string, dto: CreateSleepSessionDto) {
    if (dto.start_time === dto.end_time) {
      throw new BadRequestException('Sleep start and end times must differ');
    }

    const date = dto.date ?? this.formatDateLocal(new Date());
    const { startedAt, endedAt } = this.buildSleepWindow(
      date,
      dto.start_time,
      dto.end_time,
    );

    const session = this.sleepSessionRepository.create({
      user_id: userId,
      date,
      started_at: startedAt,
      ended_at: endedAt,
    });
    const saved = await this.sleepSessionRepository.save(session);
    await this.syncSleepHoursForDate(userId, date);
    return this.serializeSleepSession(saved);
  }

  async updateSleepSession(
    userId: string,
    sessionId: string,
    dto: UpdateSleepSessionDto,
  ) {
    const session = await this.findOwnedSleepSession(userId, sessionId);
    if (!session.ended_at) {
      throw new BadRequestException('Finish or cancel active sleep before editing');
    }

    const previousDate = session.date;
    const date = dto.date ?? session.date;
    const startTime =
      dto.start_time ?? this.formatClock(session.started_at);
    const endTime = dto.end_time ?? this.formatClock(session.ended_at);

    if (startTime === endTime) {
      throw new BadRequestException('Sleep start and end times must differ');
    }

    const { startedAt, endedAt } = this.buildSleepWindow(
      date,
      startTime,
      endTime,
    );
    session.date = date;
    session.started_at = startedAt;
    session.ended_at = endedAt;

    const saved = await this.sleepSessionRepository.save(session);
    await this.syncSleepHoursForDate(userId, previousDate);
    if (previousDate !== date) {
      await this.syncSleepHoursForDate(userId, date);
    }
    return this.serializeSleepSession(saved);
  }

  async deleteSleepSession(userId: string, sessionId: string) {
    const session = await this.findOwnedSleepSession(userId, sessionId);
    const date = session.date;
    await this.sleepSessionRepository.remove(session);
    await this.syncSleepHoursForDate(userId, date);
    return { success: true };
  }

  async logWeight(userId: string, dto: LogWeightDto) {
    const date = dto.date ?? this.formatDateLocal(new Date());
    let entry = await this.weightRepository.findOne({
      where: { user_id: userId, date },
    });

    if (entry) {
      entry.weight_kg = dto.weight_kg;
    } else {
      entry = this.weightRepository.create({
        user_id: userId,
        date,
        weight_kg: dto.weight_kg,
      });
    }

    const saved = await this.weightRepository.save(entry);
    return this.serializeWeight(saved);
  }

  async createWorkout(userId: string, dto: CreateWorkoutDto) {
    const workout = this.workoutRepository.create({
      user_id: userId,
      type: dto.type,
      duration: dto.duration,
      calories: dto.calories ?? 0,
      date: dto.date ?? this.formatDateLocal(new Date()),
    });
    const saved = await this.workoutRepository.save(workout);
    return this.serializeWorkout(saved);
  }

  async saveMood(userId: string, dto: SaveMoodDto) {
    const date = dto.date ?? this.formatDateLocal(new Date());
    let entry = await this.moodRepository.findOne({
      where: { user_id: userId, date },
    });

    if (entry) {
      entry.mood = dto.mood;
      entry.notes = dto.notes ?? null;
    } else {
      entry = this.moodRepository.create({
        user_id: userId,
        date,
        mood: dto.mood,
        notes: dto.notes ?? null,
      });
    }

    const saved = await this.moodRepository.save(entry);
    return this.serializeMood(saved);
  }

  private async getOrCreateSettings(userId: string) {
    let settings = await this.settingsRepository.findOne({
      where: { user_id: userId },
    });

    if (!settings) {
      settings = this.settingsRepository.create({
        user_id: userId,
        height_cm: null,
        ideal_weight_kg: null,
      });
      settings = await this.settingsRepository.save(settings);
    }

    return settings;
  }

  private async getOrCreateTodayMetric(userId: string, date: string) {
    let metric = await this.dailyMetricRepository.findOne({
      where: { user_id: userId, date },
    });

    if (!metric) {
      metric = this.dailyMetricRepository.create({
        user_id: userId,
        date,
        water_glasses: 0,
        sleep_hours: 0,
        exercise_minutes: 0,
      });
      metric = await this.dailyMetricRepository.save(metric);
    }

    return metric;
  }

  private resolveDateRange(filter: HealthFilterDto) {
    const start = filter.start_date;
    const end = filter.end_date;
    if (start > end) {
      throw new BadRequestException({
        end_date: ['End date must be on or after start date.'],
      });
    }
    return { start_date: start, end_date: end };
  }

  private formatDateLocal(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private computeHealthScore(
    settings: HealthSettings,
    today: HealthDailyMetric,
    habits: Habit[],
  ) {
    const waterScore = settings.water_glasses_target
      ? Math.min(
          100,
          (today.water_glasses / settings.water_glasses_target) * 100,
        )
      : 0;
    const sleepScore = Number(settings.sleep_hours_target)
      ? Math.min(
          100,
          (Number(today.sleep_hours) / Number(settings.sleep_hours_target)) *
            100,
        )
      : 0;
    const exerciseScore = settings.exercise_minutes_target
      ? Math.min(
          100,
          (today.exercise_minutes / settings.exercise_minutes_target) * 100,
        )
      : 0;

    const scores = [waterScore, sleepScore, exerciseScore];

    if (habits.length > 0) {
      scores.push(
        (habits.filter((h) => h.completed).length / habits.length) * 100,
      );
    }

    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  private computeSummary(
    habits: Habit[],
    dailyHistory: HealthDailyMetric[],
    workouts: HealthWorkout[],
  ) {
    const longestHabitStreak = habits.reduce(
      (max, habit) => Math.max(max, habit.streak),
      0,
    );

    const sleepEntries = dailyHistory.filter(
      (entry) => Number(entry.sleep_hours) > 0,
    );
    const periodAvgSleepHours = sleepEntries.length
      ? Math.round(
          (sleepEntries.reduce(
            (sum, entry) => sum + Number(entry.sleep_hours),
            0,
          ) /
            sleepEntries.length) *
            10,
        ) / 10
      : 0;

    const trackedExercise = dailyHistory.reduce(
      (sum, entry) => sum + entry.exercise_minutes,
      0,
    );
    const loggedWorkoutMinutes = workouts.reduce(
      (sum, workout) => sum + workout.duration,
      0,
    );

    return {
      longest_habit_streak: longestHabitStreak,
      period_exercise_minutes: trackedExercise + loggedWorkoutMinutes,
      period_avg_sleep_hours: periodAvgSleepHours,
    };
  }

  private async findOwnedSleepSession(userId: string, sessionId: string) {
    const session = await this.sleepSessionRepository.findOne({
      where: { id: sessionId, user_id: userId },
    });
    if (!session) throw new NotFoundException('Sleep session not found');
    return session;
  }

  private buildSleepWindow(date: string, startTime: string, endTime: string) {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    const overnight = endMinutes <= startMinutes;
    const startedAt = this.combineLocalDateAndTime(
      date,
      startTime,
      overnight ? -1 : 0,
    );
    const endedAt = this.combineLocalDateAndTime(date, endTime, 0);
    return { startedAt, endedAt };
  }

  private timeToMinutes(time: string) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private combineLocalDateAndTime(
    date: string,
    time: string,
    dayOffset = 0,
  ) {
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    return new Date(year, month - 1, day + dayOffset, hours, minutes, 0, 0);
  }

  private async syncSleepHoursForDate(userId: string, date: string) {
    const sessions = await this.sleepSessionRepository.find({
      where: { user_id: userId, date },
    });
    const totalHours = sessions.reduce((sum, session) => {
      if (!session.ended_at) return sum;
      return sum + this.computeSleepHours(session.started_at, session.ended_at);
    }, 0);
    const metric = await this.getOrCreateTodayMetric(userId, date);
    metric.sleep_hours = Math.round(totalHours * 2) / 2;
    await this.dailyMetricRepository.save(metric);
  }

  private computeSleepHours(startedAt: Date, endedAt: Date) {
    const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
    return Math.max(0, ms / (1000 * 60 * 60));
  }

  private formatClock(value: Date) {
    const date = new Date(value);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private serializeTodayMetrics(entry: HealthDailyMetric) {
    return {
      water_glasses: entry.water_glasses,
      sleep_hours: Number(entry.sleep_hours),
      exercise_minutes: entry.exercise_minutes,
    };
  }

  private serializeSleepSession(session: HealthSleepSession) {
    const isActive = !session.ended_at;
    const hours = session.ended_at
      ? Math.round(
          this.computeSleepHours(session.started_at, session.ended_at) * 2,
        ) / 2
      : null;
    return {
      id: session.id,
      date: session.date,
      started_at: new Date(session.started_at).toISOString(),
      ended_at: session.ended_at
        ? new Date(session.ended_at).toISOString()
        : null,
      start_time: this.formatClock(session.started_at),
      end_time: session.ended_at ? this.formatClock(session.ended_at) : null,
      hours,
      is_active: isActive,
    };
  }

  private serializeWeight(entry: HealthWeightEntry) {
    return {
      id: entry.id,
      date: entry.date,
      weight_kg: Number(entry.weight_kg),
    };
  }

  private serializeDailyMetric(entry: HealthDailyMetric) {
    return {
      date: entry.date,
      water_glasses: entry.water_glasses,
      sleep_hours: Number(entry.sleep_hours),
      exercise_minutes: entry.exercise_minutes,
    };
  }

  private serializeWorkout(workout: HealthWorkout) {
    return {
      id: workout.id,
      type: workout.type,
      duration: workout.duration,
      calories: workout.calories,
      date: workout.date,
    };
  }

  private serializeMood(entry: HealthMoodEntry) {
    return {
      id: entry.id,
      date: entry.date,
      mood: entry.mood,
      notes: entry.notes ?? '',
    };
  }
}
