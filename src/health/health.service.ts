import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  AdjustMetricDto,
  CreateHabitDto,
  CreateWorkoutDto,
  HealthFilterDto,
  LogWeightDto,
  SaveMoodDto,
  UpdateHealthProfileDto,
  UpdateHealthTargetsDto,
  UpdateTodayMetricsDto,
} from './dto/health.dto';
import { HealthDailyMetric } from './entities/health-daily-metric.entity';
import { HealthHabit } from './entities/health-habit.entity';
import { HealthMoodEntry } from './entities/health-mood-entry.entity';
import { HealthSettings } from './entities/health-settings.entity';
import { HealthWeightEntry } from './entities/health-weight-entry.entity';
import { HealthWorkout } from './entities/health-workout.entity';

const METRIC_STEPS = {
  water: 1,
  sleep: 0.5,
  exercise: 5,
} as const;

@Injectable()
export class HealthService {
  constructor(
    @InjectRepository(HealthSettings)
    private readonly settingsRepository: Repository<HealthSettings>,
    @InjectRepository(HealthDailyMetric)
    private readonly dailyMetricRepository: Repository<HealthDailyMetric>,
    @InjectRepository(HealthWeightEntry)
    private readonly weightRepository: Repository<HealthWeightEntry>,
    @InjectRepository(HealthHabit)
    private readonly habitRepository: Repository<HealthHabit>,
    @InjectRepository(HealthWorkout)
    private readonly workoutRepository: Repository<HealthWorkout>,
    @InjectRepository(HealthMoodEntry)
    private readonly moodRepository: Repository<HealthMoodEntry>,
  ) {}

  async getDashboard(userId: string, filter: HealthFilterDto) {
    const { start_date, end_date } = this.resolveDateRange(filter);
    const today = filter.today_date ?? this.formatDateLocal(new Date());

    const [settings, todayMetric, dailyHistory, weightLog, habits, workouts, moodEntries, moodToday, latestWeightEntry] =
      await Promise.all([
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
        this.getHabits(userId),
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
      ]);

    const summary = this.computeSummary(habits, dailyHistory, workouts);

    return {
      filter: { start_date, end_date },
      health_score: this.computeHealthScore(settings, todayMetric, habits),
      latest_weight_kg: latestWeightEntry
        ? Number(latestWeightEntry.weight_kg)
        : null,
      summary,
      profile: { height_cm: settings.height_cm ? Number(settings.height_cm) : null },
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
      weight_log: weightLog.map((entry) => this.serializeWeight(entry)),
      daily_history: dailyHistory.map((entry) => this.serializeDailyMetric(entry)),
      habits: habits.map((habit) => this.serializeHabit(habit)),
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
    const saved = await this.settingsRepository.save(settings);
    return { height_cm: saved.height_cm ? Number(saved.height_cm) : null };
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
    if (dto.sleep_hours !== undefined) metric.sleep_hours = dto.sleep_hours;
    if (dto.exercise_minutes !== undefined) metric.exercise_minutes = dto.exercise_minutes;

    const saved = await this.dailyMetricRepository.save(metric);
    return {
      water_glasses: saved.water_glasses,
      sleep_hours: Number(saved.sleep_hours),
      exercise_minutes: saved.exercise_minutes,
    };
  }

  async adjustMetric(userId: string, dto: AdjustMetricDto) {
    const today = dto.date ?? this.formatDateLocal(new Date());
    const metric = await this.getOrCreateTodayMetric(userId, today);
    const step = METRIC_STEPS[dto.metric];
    const delta = step * dto.direction;

    if (dto.metric === 'water') {
      metric.water_glasses = Math.max(0, metric.water_glasses + delta);
    } else if (dto.metric === 'sleep') {
      metric.sleep_hours = Math.max(
        0,
        Math.round((Number(metric.sleep_hours) + delta) * 2) / 2,
      );
    } else {
      metric.exercise_minutes = Math.max(0, metric.exercise_minutes + delta);
    }

    const saved = await this.dailyMetricRepository.save(metric);
    return {
      water_glasses: saved.water_glasses,
      sleep_hours: Number(saved.sleep_hours),
      exercise_minutes: saved.exercise_minutes,
    };
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

  async toggleHabit(userId: string, habitId: string) {
    const habit = await this.findOwnedHabit(userId, habitId);
    habit.completed = !habit.completed;
    const saved = await this.habitRepository.save(habit);
    return this.serializeHabit(saved);
  }

  async createHabit(userId: string, dto: CreateHabitDto) {
    const habit = this.habitRepository.create({
      user_id: userId,
      name: dto.name,
      frequency: dto.frequency ?? 'daily',
      target: dto.target ?? 1,
      current: 0,
      streak: 0,
      completed: false,
    });
    const saved = await this.habitRepository.save(habit);
    return this.serializeHabit(saved);
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

  private async getHabits(userId: string) {
    return this.habitRepository.find({
      where: { user_id: userId },
      order: { created_at: 'ASC' },
    });
  }

  private async findOwnedHabit(userId: string, habitId: string) {
    const habit = await this.habitRepository.findOne({
      where: { id: habitId, user_id: userId },
    });
    if (!habit) throw new NotFoundException('Habit not found');
    return habit;
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
    habits: HealthHabit[],
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
    habits: HealthHabit[],
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

  private serializeHabit(habit: HealthHabit) {
    return {
      id: habit.id,
      name: habit.name,
      streak: habit.streak,
      target: Number(habit.target),
      current: Number(habit.current),
      completed: habit.completed,
      frequency: habit.frequency,
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
