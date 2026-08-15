import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AdjustHabitDto,
  CreateHabitDto,
  CreateHabitPackDto,
  ToggleHabitDto,
  UpdateHabitDto,
  UpsertHabitLogDto,
} from './dto/habits.dto';
import {
  DEFAULT_HABIT_PRIORITY,
  isHabitPriority,
  priorityFromLegacyRequired,
  type HabitPriority,
} from './constants/habit-priority';
import {
  DEFAULT_HABIT_MISS_BEHAVIOR,
  isHabitMissBehavior,
  type HabitMissBehavior,
} from './constants/habit-miss-behavior';
import { HabitDayLog } from './entities/habit-day-log.entity';
import { Habit } from './entities/habit.entity';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

type DayRelative = 'today' | 'yesterday' | 'tomorrow' | 'past' | 'future';
type DayStatus = 'done' | 'late' | 'pending' | 'missed' | 'upcoming';

type HabitDayItem = ReturnType<HabitsService['serializeHabit']> & {
  status: DayStatus;
  occurrence_date: string;
  is_overdue_carry: boolean;
  /** User marked this occurrence as cannot do. */
  is_locked_missed: boolean;
  cannot_do: boolean;
  is_late: boolean;
  overdue_from: string | null;
  can_complete: boolean;
  can_undo: boolean;
  can_add_reason: boolean;
};

@Injectable()
export class HabitsService {
  constructor(
    @InjectRepository(Habit)
    private readonly habitRepository: Repository<Habit>,
    @InjectRepository(HabitDayLog)
    private readonly logRepository: Repository<HabitDayLog>,
  ) {}

  async listForUser(userId: string) {
    return this.habitRepository.find({
      where: { user_id: userId },
      order: { created_at: 'ASC' },
    });
  }

  async listSerialized(userId: string) {
    const today = this.formatDateLocal(new Date());
    const habits = await this.listForUser(userId);
    const logs = await this.logRepository.find({
      where: {
        user_id: userId,
        date: today,
        habit_id: In(habits.map((habit) => habit.id)),
      },
    });
    const logByHabit = new Map(logs.map((log) => [log.habit_id, log]));

    return habits.map((habit) => {
      const log = logByHabit.get(habit.id);
      return this.serializeHabit(habit, log);
    });
  }

  serializeHabit(habit: Habit, log?: HabitDayLog | null) {
    const current = log ? Number(log.current) : Number(habit.current);
    const completed = log ? log.completed : habit.completed;
    const frequency = this.normalizeFrequency(habit.frequency);
    const priority = this.resolvePriority(habit);
    const missBehavior = this.resolveMissBehavior(habit);
    return {
      id: habit.id,
      name: habit.name,
      streak: habit.streak,
      target: Number(habit.target),
      current,
      completed,
      frequency,
      repeat_days: this.resolveRepeatDays(habit),
      period_target: habit.period_target ?? 1,
      interval_days: habit.interval_days ?? 1,
      time_of_day: habit.time_of_day ?? 'anytime',
      reminder_time: habit.reminder_time ?? null,
      start_date: habit.start_date ?? null,
      end_date: habit.end_date ?? null,
      domain: habit.domain ?? 'custom',
      metric_type: habit.metric_type ?? 'boolean',
      unit: habit.unit ?? null,
      group_key: habit.group_key ?? null,
      group_name: habit.group_name ?? null,
      priority,
      miss_behavior: missBehavior,
      /** @deprecated Use priority. true for high/medium, false for low. */
      is_required: priority !== 'low',
      cannot_do: Boolean(log?.cannot_do),
      is_late: Boolean(log?.is_late),
      delay_reason: log?.delay_reason ?? null,
    };
  }

  async getDayView(userId: string, date: string) {

    this.assertDateString(date);

    const today = this.formatDateLocal(new Date());

    const relative = this.resolveRelative(date, today);

    const weekday = this.weekdayFromDateString(date);



    const habits = await this.listForUser(userId);

    if (relative === 'today') {

      await this.applyResetMissStreakBreaks(userId, habits, today);

    }



    const scheduled = habits.filter((habit) =>

      this.isScheduledOnDate(habit, date, weekday),

    );



    const logs = scheduled.length

      ? await this.logRepository.find({

          where: {

            user_id: userId,

            date,

            habit_id: In(scheduled.map((habit) => habit.id)),

          },

        })

      : [];

    const logByHabit = new Map(logs.map((log) => [log.habit_id, log]));



    const dayItems = scheduled.map((habit) => {

      const log = logByHabit.get(habit.id) ?? null;

      const completed = Boolean(log?.completed);

      const cannotDo = Boolean(log?.cannot_do);

      const isLate = Boolean(log?.is_late);

      const current = log ? Number(log.current) : 0;

      const status = this.resolveStatus({

        relative,

        completed,

        cannotDo,

        isLate,

      });

      const future = this.isFutureRelative(relative);



      return {

        ...this.serializeHabit(habit, log),

        current,

        completed,

        status,

        occurrence_date: date,

        is_overdue_carry: false,

        is_locked_missed: cannotDo,

        cannot_do: cannotDo,

        is_late: isLate,

        overdue_from: null as string | null,

        can_complete: !future && !cannotDo,

        can_undo: completed && !future,

        delay_reason: log?.delay_reason ?? null,

        can_add_reason: !future && !completed,

      };

    });



    // On today: surface yesterday's incomplete *carry* habits only.

    const showCarry = relative === 'today';

    const carryMissedItems = showCarry

      ? await this.buildCarryMissedItems(userId, habits, today)

      : [];



    const items = [...carryMissedItems, ...dayItems];



    return {

      date,

      today,

      relative,

      weekday,

      summary: {

        total: items.length,

        done: items.filter((item) => item.completed).length,

        late_done: items.filter((item) => item.completed && item.is_late)

          .length,

        high_total: items.filter((item) => item.priority === 'high').length,

        high_done: items.filter(

          (item) => item.priority === 'high' && item.completed,

        ).length,

        medium_total: items.filter((item) => item.priority === 'medium').length,

        medium_done: items.filter(

          (item) => item.priority === 'medium' && item.completed,

        ).length,

        low_total: items.filter((item) => item.priority === 'low').length,

        low_done: items.filter(

          (item) => item.priority === 'low' && item.completed,

        ).length,

        locked_missed_count: items.filter((item) => item.cannot_do).length,

        overdue_count: carryMissedItems.filter((item) => !item.cannot_do)

          .length,

        required_total: items.filter((item) => item.priority !== 'low').length,

        required_done: items.filter(

          (item) => item.priority !== 'low' && item.completed,

        ).length,

        missed_required: items.filter(

          (item) =>

            (item.status === 'missed' || item.cannot_do) &&

            item.priority !== 'low',

        ).length,

        missed_optional: items.filter(

          (item) =>

            (item.status === 'missed' || item.cannot_do) &&

            item.priority === 'low',

        ).length,

        expired_optional_count: items.filter((item) => item.cannot_do).length,

      },

      items,

    };

  }



  /** Reset-type: miss yesterday breaks streak; does not carry to today. */

  private async applyResetMissStreakBreaks(

    userId: string,

    habits: Habit[],

    today: string,

  ) {

    const resetHabits = habits.filter(

      (habit) =>

        this.resolveMissBehavior(habit) === 'reset' && (habit.streak ?? 0) > 0,

    );

    if (!resetHabits.length) return;



    const yesterday = this.addDays(today, -1);

    const weekday = this.weekdayFromDateString(yesterday);

    const candidates = resetHabits.filter((habit) => {

      const frequency = this.normalizeFrequency(habit.frequency);

      if (frequency === 'daily' || frequency === 'interval') {

        return this.isStrictDueOnDate(habit, yesterday, weekday);

      }

      return this.isScheduledOnDate(habit, yesterday, weekday);

    });

    if (!candidates.length) return;



    const logs = await this.logRepository.find({

      where: {

        user_id: userId,

        date: yesterday,

        habit_id: In(candidates.map((habit) => habit.id)),

      },

    });

    const logByHabit = new Map(logs.map((log) => [log.habit_id, log]));



    for (const habit of candidates) {

      const log = logByHabit.get(habit.id);

      if (log?.completed) continue;

      habit.streak = 0;

      await this.habitRepository.save(habit);

    }

  }



  /**

   * Carry-type habits missed yesterday — shown on today with today's list.

   * Completing them marks the occurrence late. Reset-type habits are excluded.

   */

  private async buildCarryMissedItems(

    userId: string,

    habits: Habit[],

    today: string,

  ): Promise<HabitDayItem[]> {

    const carryHabits = habits.filter(

      (habit) => this.resolveMissBehavior(habit) === 'carry',

    );

    if (!carryHabits.length) return [];



    const yesterday = this.addDays(today, -1);

    const candidates: Array<{ habit: Habit; occurrenceDate: string }> = [];



    for (const habit of carryHabits) {

      const frequency = this.normalizeFrequency(habit.frequency);

      if (frequency === 'daily' || frequency === 'interval') {

        const weekday = this.weekdayFromDateString(yesterday);

        if (this.isStrictDueOnDate(habit, yesterday, weekday)) {

          candidates.push({ habit, occurrenceDate: yesterday });

        }

      } else if (frequency === 'weekly') {

        const range = this.previousCalendarWeek(today);

        if (range && this.isActiveOnDate(habit, range.end)) {

          candidates.push({ habit, occurrenceDate: range.end });

        }

      } else if (frequency === 'monthly') {

        const range = this.previousCalendarMonth(today);

        if (range && this.isActiveOnDate(habit, range.end)) {

          candidates.push({ habit, occurrenceDate: range.end });

        }

      }

    }



    if (!candidates.length) return [];



    const habitIds = [...new Set(candidates.map((row) => row.habit.id))];

    const lookbackStart = this.addDays(today, -40);

    const logs = await this.logRepository

      .createQueryBuilder('log')

      .where('log.user_id = :userId', { userId })

      .andWhere('log.habit_id IN (:...habitIds)', { habitIds })

      .andWhere('log.date >= :lookbackStart', { lookbackStart })

      .andWhere('log.date < :today', { today })

      .getMany();



    const logKey = (habitId: string, date: string) => `${habitId}:${date}`;

    const logByHabitDate = new Map(

      logs.map((log) => [logKey(log.habit_id, log.date), log]),

    );

    const completedByHabitDate = new Map(

      logs

        .filter((log) => log.completed)

        .map((log) => [logKey(log.habit_id, log.date), true] as const),

    );



    const items: HabitDayItem[] = [];

    for (const { habit, occurrenceDate } of candidates) {

      const frequency = this.normalizeFrequency(habit.frequency);



      if (frequency === 'weekly' || frequency === 'monthly') {

        const range =

          frequency === 'weekly'

            ? this.previousCalendarWeek(today)

            : this.previousCalendarMonth(today);

        if (!range) continue;



        const periodLogs = logs.filter(

          (log) =>

            log.habit_id === habit.id &&

            log.date >= range.start &&

            log.date <= range.end,

        );

        const doneCount = periodLogs.filter((log) => log.completed).length;

        const target = Math.max(1, habit.period_target ?? 1);

        if (doneCount >= target) continue;



        let occurrence = range.end;

        let cursor = range.end;

        while (cursor >= range.start) {

          const dayLog = logByHabitDate.get(logKey(habit.id, cursor));

          if (!dayLog?.completed) {

            occurrence = cursor;

            break;

          }

          cursor = this.addDays(cursor, -1);

        }



        const log = logByHabitDate.get(logKey(habit.id, occurrence)) ?? null;

        const cannotDo = Boolean(log?.cannot_do);

        items.push({

          ...this.serializeHabit(habit, log),

          current: log ? Number(log.current) : 0,

          completed: false,

          status: 'missed' as DayStatus,

          occurrence_date: occurrence,

          is_overdue_carry: !cannotDo,

          is_locked_missed: cannotDo,

          cannot_do: cannotDo,

          is_late: Boolean(log?.is_late),

          overdue_from: occurrence,

          can_complete: !cannotDo,

          can_undo: false,

          delay_reason: log?.delay_reason ?? null,

          can_add_reason: true,

        });

        continue;

      }



      if (completedByHabitDate.get(logKey(habit.id, occurrenceDate))) continue;

      const log = logByHabitDate.get(logKey(habit.id, occurrenceDate)) ?? null;

      const cannotDo = Boolean(log?.cannot_do);

      items.push({

        ...this.serializeHabit(habit, log),

        current: log ? Number(log.current) : 0,

        completed: false,

        status: 'missed' as DayStatus,

        occurrence_date: occurrenceDate,

        is_overdue_carry: !cannotDo,

        is_locked_missed: cannotDo,

        cannot_do: cannotDo,

        is_late: Boolean(log?.is_late),

        overdue_from: occurrenceDate,

        can_complete: !cannotDo,

        can_undo: false,

        delay_reason: log?.delay_reason ?? null,

        can_add_reason: true,

      });

    }



    items.sort((a, b) => a.overdue_from!.localeCompare(b.overdue_from!));

    return items;

  }



  /**
   * Day-level due check — unlike weekly/monthly "available any day",
   * only true schedule points count as overdue candidates.
   */
  private isStrictDueOnDate(habit: Habit, date: string, weekday: number) {
    if (!this.isActiveOnDate(habit, date)) return false;
    const frequency = this.normalizeFrequency(habit.frequency);

    if (frequency === 'daily') {
      return this.resolveRepeatDays(habit).includes(weekday);
    }

    if (frequency === 'interval') {
      const start = habit.start_date ?? date;
      const daysSinceStart = this.diffDays(start, date);
      const interval = Math.max(1, habit.interval_days ?? 1);
      return daysSinceStart >= 0 && daysSinceStart % interval === 0;
    }

    return false;
  }

  /** Previous Sun–Sat week fully before today. */
  private previousCalendarWeek(today: string) {
    const weekday = this.weekdayFromDateString(today);
    const thisWeekStart = this.addDays(today, -weekday);
    const end = this.addDays(thisWeekStart, -1);
    const start = this.addDays(end, -6);
    return { start, end };
  }

  /** Previous calendar month fully before today. */
  private previousCalendarMonth(today: string) {
    const [year, month] = today.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const start = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const end = this.addDays(
      `${year}-${String(month).padStart(2, '0')}-01`,
      -1,
    );
    return { start, end };
  }

  async toggleHabit(userId: string, habitId: string, dto: ToggleHabitDto = {}) {
    const date = dto.date ?? this.formatDateLocal(new Date());
    const habit = await this.findOwnedHabit(userId, habitId);

    if (dto.cannot_do !== undefined) {
      return this.upsertLog(userId, habit, date, {
        cannot_do: dto.cannot_do,
        delay_reason: dto.delay_reason,
      });
    }

    if (dto.is_late === true) {
      return this.upsertLog(userId, habit, date, {
        completed: true,
        is_late: true,
        value: Number(habit.target),
        delay_reason: dto.delay_reason,
      });
    }

    const existing = await this.findLog(userId, habitId, date);
    const nextCompleted = !(existing?.completed ?? false);

    return this.upsertLog(userId, habit, date, {
      completed: nextCompleted,
      value: nextCompleted ? Number(habit.target) : 0,
      is_late: nextCompleted ? dto.is_late : false,
      delay_reason: dto.delay_reason,
    });
  }

  async adjustHabit(userId: string, habitId: string, dto: AdjustHabitDto) {
    const date = dto.date ?? this.formatDateLocal(new Date());
    const habit = await this.findOwnedHabit(userId, habitId);

    if (dto.cannot_do !== undefined) {
      return this.upsertLog(userId, habit, date, {
        cannot_do: dto.cannot_do,
        delay_reason: dto.delay_reason,
      });
    }

    if (dto.is_late === true && habit.metric_type === 'boolean') {
      return this.upsertLog(userId, habit, date, {
        completed: true,
        is_late: true,
        value: Number(habit.target),
        delay_reason: dto.delay_reason,
      });
    }

    if (habit.metric_type === 'boolean') {
      throw new BadRequestException('Use toggle for checkbox habits');
    }

    const existing = await this.findLog(userId, habitId, date);
    const step = dto.step ?? (habit.metric_type === 'duration' ? 5 : 1);
    let next = existing ? Number(existing.current) : 0;

    if (dto.value !== undefined) {
      next = dto.value;
    } else if (dto.direction !== undefined) {
      next = Math.max(0, next + step * dto.direction);
    } else {
      throw new BadRequestException('Provide direction or value');
    }

    next = Math.round(next * 10) / 10;
    const completed = next >= Number(habit.target);
    return this.upsertLog(userId, habit, date, {
      value: next,
      completed,
      is_late: completed ? dto.is_late : false,
      delay_reason: dto.delay_reason,
    });
  }

  async upsertHabitLog(
    userId: string,
    habitId: string,
    dto: UpsertHabitLogDto,
  ) {
    const habit = await this.findOwnedHabit(userId, habitId);
    return this.upsertLog(userId, habit, dto.date, {
      completed: dto.completed,
      cannot_do: dto.cannot_do,
      is_late: dto.is_late,
      value: dto.value,
      direction: dto.direction,
      step: dto.step,
      delay_reason: dto.delay_reason,
    });
  }

  async createHabit(userId: string, dto: CreateHabitDto) {
    const metricType = dto.metric_type ?? 'boolean';
    const frequency = this.normalizeFrequency(dto.frequency ?? 'daily');
    const schedule = this.buildScheduleFields(frequency, dto);
    const startDate = dto.start_date ?? this.formatDateLocal(new Date());
    if (dto.end_date) {
      this.assertDateString(dto.end_date);
      if (dto.end_date < startDate) {
        throw new BadRequestException('end_date must be on or after start_date');
      }
    }
    const habit = this.habitRepository.create({
      user_id: userId,
      name: dto.name.trim(),
      ...schedule,
      start_date: startDate,
      end_date: dto.end_date ?? null,
      target: dto.target ?? 1,
      current: 0,
      streak: 0,
      completed: false,
      domain: dto.domain ?? 'custom',
      metric_type: metricType,
      unit: dto.unit ?? null,
      group_key: dto.group_key ?? null,
      group_name: dto.group_name ?? null,
      ...this.priorityFields(this.resolveIncomingPriority(dto)),
      miss_behavior: this.resolveIncomingMissBehavior(dto.miss_behavior),
      time_of_day: dto.time_of_day ?? 'anytime',
      reminder_time: dto.reminder_time ?? null,
    });
    const saved = await this.habitRepository.save(habit);
    return this.serializeHabit(saved);
  }

  async createHabitPack(userId: string, dto: CreateHabitPackDto) {
    const packName = dto.name.trim();
    if (!packName) {
      throw new BadRequestException('Pack name is required');
    }

    const packMiss = this.resolveIncomingMissBehavior(dto.miss_behavior);
    const items = dto.items
      .map((item) => ({
        name: item.name.trim(),
        priority: this.resolveIncomingPriority(item),
        miss_behavior: this.resolveIncomingMissBehavior(
          item.miss_behavior ?? packMiss,
        ),
      }))
      .filter((item) => item.name.length > 0);

    if (items.length === 0) {
      throw new BadRequestException('Add at least one habit item');
    }

    const frequency = this.normalizeFrequency(dto.frequency ?? 'daily');
    const schedule = this.buildScheduleFields(frequency, dto);
    const startDate = dto.start_date ?? this.formatDateLocal(new Date());
    const groupKey = `pack-${Date.now()}`;
    const created: Habit[] = [];

    for (const item of items) {
      const habit = this.habitRepository.create({
        user_id: userId,
        name: item.name,
        ...schedule,
        start_date: startDate,
        target: 1,
        current: 0,
        streak: 0,
        completed: false,
        domain: 'custom',
        metric_type: 'boolean',
        unit: null,
        group_key: groupKey,
        group_name: packName,
        ...this.priorityFields(item.priority),
        miss_behavior: item.miss_behavior,
        time_of_day: dto.time_of_day ?? 'anytime',
        reminder_time: dto.reminder_time ?? null,
      });
      created.push(await this.habitRepository.save(habit));
    }

    return created.map((habit) => this.serializeHabit(habit));
  }

  async updateHabit(userId: string, habitId: string, dto: UpdateHabitDto) {
    const habit = await this.findOwnedHabit(userId, habitId);
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Habit name is required');
      habit.name = name;
    }
    if (
      dto.frequency !== undefined ||
      dto.repeat_days !== undefined ||
      dto.period_target !== undefined ||
      dto.interval_days !== undefined
    ) {
      const frequency = this.normalizeFrequency(
        dto.frequency ?? habit.frequency,
      );
      const schedule = this.buildScheduleFields(frequency, {
        repeat_days: dto.repeat_days ?? habit.repeat_days ?? undefined,
        period_target: dto.period_target ?? habit.period_target,
        interval_days: dto.interval_days ?? habit.interval_days,
      });
      habit.frequency = schedule.frequency;
      habit.repeat_days = schedule.repeat_days;
      habit.period_target = schedule.period_target;
      habit.interval_days = schedule.interval_days;
    }
    if (dto.target !== undefined) habit.target = dto.target;
    if (dto.domain !== undefined) habit.domain = dto.domain;
    if (dto.metric_type !== undefined) habit.metric_type = dto.metric_type;
    if (dto.unit !== undefined) habit.unit = dto.unit;
    if (dto.priority !== undefined || dto.is_required !== undefined) {
      Object.assign(
        habit,
        this.priorityFields(
          this.resolveIncomingPriority({
            priority: dto.priority,
            is_required: dto.is_required,
          }),
        ),
      );
    }
    if (dto.miss_behavior !== undefined) {
      habit.miss_behavior = this.resolveIncomingMissBehavior(dto.miss_behavior);
    }
    if (dto.time_of_day !== undefined) habit.time_of_day = dto.time_of_day;
    if (dto.reminder_time !== undefined) {
      habit.reminder_time = dto.reminder_time;
    }
    if (dto.start_date !== undefined) {
      this.assertDateString(dto.start_date);
      habit.start_date = dto.start_date;
    }
    if (dto.end_date !== undefined) {
      if (dto.end_date === null) {
        habit.end_date = null;
      } else {
        this.assertDateString(dto.end_date);
        const start = dto.start_date ?? habit.start_date;
        if (start && dto.end_date < start) {
          throw new BadRequestException('end_date must be on or after start_date');
        }
        habit.end_date = dto.end_date;
      }
    }
    habit.completed = Number(habit.current) >= Number(habit.target);
    const saved = await this.habitRepository.save(habit);
    return this.serializeHabit(saved);
  }

  async deleteHabit(userId: string, habitId: string) {
    const habit = await this.findOwnedHabit(userId, habitId);
    await this.logRepository.delete({ habit_id: habitId, user_id: userId });
    await this.habitRepository.remove(habit);
    return { success: true };
  }

  private async upsertLog(

    userId: string,

    habit: Habit,

    date: string,

    opts: {

      completed?: boolean;

      cannot_do?: boolean;

      is_late?: boolean;

      value?: number;

      direction?: -1 | 1;

      step?: number;

      delay_reason?: string;

    },

  ) {

    this.assertDateString(date);

    const today = this.formatDateLocal(new Date());

    const relative = this.resolveRelative(date, today);

    const weekday = this.weekdayFromDateString(date);



    if (relative === 'future') {

      throw new BadRequestException('Cannot log habits on a future date');

    }

    if (!this.isActiveOnDate(habit, date)) {

      throw new BadRequestException(

        habit.end_date && date > habit.end_date

          ? 'This habit has ended'

          : 'This habit has not started yet',

      );

    }

    if (!this.isScheduledOnDate(habit, date, weekday)) {

      throw new BadRequestException('This habit is not scheduled on that day');

    }



    let log = await this.findLog(userId, habit.id, date);

    const wasCompleted = Boolean(log?.completed);

    let nextCannotDo = Boolean(log?.cannot_do);

    let nextIsLate = Boolean(log?.is_late);



    let nextCurrent = log ? Number(log.current) : 0;

    let nextCompleted = wasCompleted;



    if (opts.cannot_do !== undefined) {

      nextCannotDo = opts.cannot_do;

      if (nextCannotDo) {

        nextCompleted = false;

        nextCurrent = 0;

        nextIsLate = false;

      }

    } else if (habit.metric_type === 'boolean' || opts.completed !== undefined) {

      if (opts.completed !== undefined) {

        nextCompleted = opts.completed;

        nextCurrent = nextCompleted ? Number(habit.target) : 0;

      } else if (opts.value !== undefined) {

        nextCurrent = opts.value;

        nextCompleted = nextCurrent >= Number(habit.target);

      }

      if (nextCompleted) nextCannotDo = false;

      else nextIsLate = false;

    } else {

      const step = opts.step ?? (habit.metric_type === 'duration' ? 5 : 1);

      if (opts.value !== undefined) {

        nextCurrent = opts.value;

      } else if (opts.direction !== undefined) {

        nextCurrent = Math.max(0, nextCurrent + step * opts.direction);

      }

      nextCurrent = Math.round(nextCurrent * 10) / 10;

      nextCompleted = nextCurrent >= Number(habit.target);

      if (nextCompleted) nextCannotDo = false;

      else {

        nextIsLate = false;

        if (opts.direction !== undefined || opts.value !== undefined) {

          nextCannotDo = false;

        }

      }

    }



    if (nextCompleted) {

      const overdueCompletion = this.isPastRelative(relative);

      if (opts.is_late === true || overdueCompletion) {

        nextIsLate = true;

      } else if (opts.is_late === false) {

        nextIsLate = false;

      } else if (!wasCompleted) {

        // Fresh on-time completion defaults to not late.

        nextIsLate = false;

      }

    }



    const becomingComplete = nextCompleted && !wasCompleted;



    if (!log) {

      log = this.logRepository.create({

        user_id: userId,

        habit_id: habit.id,

        date,

        current: nextCurrent,

        completed: nextCompleted,

        cannot_do: nextCannotDo,

        is_late: nextIsLate,

        delay_reason: null,

      });

    } else {

      log.current = nextCurrent;

      log.completed = nextCompleted;

      log.cannot_do = nextCannotDo;

      log.is_late = nextIsLate;

    }



    if (opts.delay_reason !== undefined) {

      const trimmed = opts.delay_reason.trim();

      log.delay_reason = trimmed.length > 0 ? trimmed : null;

    } else if (wasCompleted && !nextCompleted && !nextCannotDo) {

      log.delay_reason = null;

    }



    const savedLog = await this.logRepository.save(log);



    // Streak updates for today and for carry late-completions of past days.

    if (date === today) {

      habit.current = nextCurrent;

      habit.completed = nextCompleted;

    }

    if (becomingComplete) {

      habit.streak = (habit.streak ?? 0) + 1;

      await this.habitRepository.save(habit);

    } else if (wasCompleted && !nextCompleted) {

      habit.streak = Math.max(0, (habit.streak ?? 0) - 1);

      await this.habitRepository.save(habit);

    } else if (date === today) {

      await this.habitRepository.save(habit);

    }



    const status = this.resolveStatus({

      relative,

      completed: savedLog.completed,

      cannotDo: savedLog.cannot_do,

      isLate: savedLog.is_late,

    });



    return {

      ...this.serializeHabit(habit, savedLog),

      status,

      cannot_do: savedLog.cannot_do,

      is_late: savedLog.is_late,

      is_locked_missed: savedLog.cannot_do,

      can_complete: !savedLog.cannot_do && !this.isFutureRelative(relative),

      can_undo: savedLog.completed && !this.isFutureRelative(relative),

      can_add_reason: !savedLog.completed && !this.isFutureRelative(relative),

      date,

      relative,

    };

  }



  private resolveStatus(input: {

    relative: DayRelative;

    completed: boolean;

    cannotDo?: boolean;

    isLate?: boolean;

  }): DayStatus {

    if (input.completed) return input.isLate ? 'late' : 'done';

    if (this.isFutureRelative(input.relative)) return 'upcoming';

    if (input.cannotDo || this.isPastRelative(input.relative)) return 'missed';

    return 'pending';

  }



  private isPastRelative(relative: DayRelative) {
    return relative === 'past' || relative === 'yesterday';
  }

  private isFutureRelative(relative: DayRelative) {
    return relative === 'future' || relative === 'tomorrow';
  }

  private resolveRelative(date: string, today: string): DayRelative {
    if (date === today) return 'today';
    const yesterday = this.addDays(today, -1);
    const tomorrow = this.addDays(today, 1);
    if (date === yesterday) return 'yesterday';
    if (date === tomorrow) return 'tomorrow';
    return date < today ? 'past' : 'future';
  }

  private normalizeFrequency(frequency: string) {
    if (frequency === 'custom') return 'daily';
    if (
      frequency === 'daily' ||
      frequency === 'weekly' ||
      frequency === 'monthly' ||
      frequency === 'interval'
    ) {
      return frequency;
    }
    return 'daily';
  }

  private buildScheduleFields(
    frequency: string,
    dto: {
      repeat_days?: number[] | null;
      period_target?: number;
      interval_days?: number;
    },
  ) {
    const normalized = this.normalizeFrequency(frequency);

    if (normalized === 'daily') {
      const days = this.normalizeRepeatDays('daily', dto.repeat_days);
      return {
        frequency: 'daily',
        repeat_days: days,
        period_target: 1,
        interval_days: 1,
      };
    }

    if (normalized === 'weekly') {
      return {
        frequency: 'weekly',
        repeat_days: ALL_DAYS,
        period_target: Math.min(7, Math.max(1, dto.period_target ?? 3)),
        interval_days: 1,
      };
    }

    if (normalized === 'monthly') {
      return {
        frequency: 'monthly',
        repeat_days: ALL_DAYS,
        period_target: Math.min(31, Math.max(1, dto.period_target ?? 8)),
        interval_days: 1,
      };
    }

    return {
      frequency: 'interval',
      repeat_days: ALL_DAYS,
      period_target: 1,
      interval_days: Math.min(365, Math.max(1, dto.interval_days ?? 2)),
    };
  }

  private normalizeRepeatDays(frequency: string, days?: number[] | null) {
    const cleaned = (days ?? [])
      .map((day) => Number(day))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    const unique = [...new Set(cleaned)].sort((a, b) => a - b);

    // TickTick daily: pick specific weekdays (defaults to all days).
    if (frequency === 'daily' || frequency === 'custom') {
      if (unique.length === 0) return ALL_DAYS;
      return unique;
    }

    return unique.length ? unique : ALL_DAYS;
  }

  private resolveRepeatDays(habit: Habit) {
    if (Array.isArray(habit.repeat_days) && habit.repeat_days.length > 0) {
      return habit.repeat_days;
    }
    return ALL_DAYS;
  }

  private isActiveOnDate(habit: Habit, date: string) {
    if (habit.start_date && date < habit.start_date) return false;
    if (habit.end_date && date > habit.end_date) return false;
    return true;
  }

  /** TickTick-style schedule rules for whether a habit appears on a date. */
  private isScheduledOnDate(habit: Habit, date: string, weekday: number) {
    if (!this.isActiveOnDate(habit, date)) return false;

    const frequency = this.normalizeFrequency(habit.frequency);

    if (frequency === 'daily') {
      return this.resolveRepeatDays(habit).includes(weekday);
    }

    if (frequency === 'weekly' || frequency === 'monthly') {
      // Available any day in the period until the user checks in.
      return true;
    }

    // interval: every N days from start_date
    const start = habit.start_date ?? date;
    const daysSinceStart = this.diffDays(start, date);
    const interval = Math.max(1, habit.interval_days ?? 1);
    return daysSinceStart >= 0 && daysSinceStart % interval === 0;
  }

  private diffDays(fromDate: string, toDate: string) {
    const [y1, m1, d1] = fromDate.split('-').map(Number);
    const [y2, m2, d2] = toDate.split('-').map(Number);
    const a = Date.UTC(y1, m1 - 1, d1, 12);
    const b = Date.UTC(y2, m2 - 1, d2, 12);
    return Math.round((b - a) / (24 * 60 * 60 * 1000));
  }

  private weekdayFromDateString(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  }

  private assertDateString(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
  }

  private formatDateLocal(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private addDays(date: string, amount: number) {
    const [year, month, day] = date.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day, 12));
    next.setUTCDate(next.getUTCDate() + amount);
    return next.toISOString().slice(0, 10);
  }

  private resolvePriority(habit: Habit): HabitPriority {
    if (isHabitPriority(habit.priority)) return habit.priority;
    return priorityFromLegacyRequired(habit.is_required);
  }

  private resolveMissBehavior(habit: Habit): HabitMissBehavior {
    if (isHabitMissBehavior(habit.miss_behavior)) return habit.miss_behavior;
    return DEFAULT_HABIT_MISS_BEHAVIOR;
  }

  private resolveIncomingMissBehavior(
    value?: string | null,
  ): HabitMissBehavior {
    if (isHabitMissBehavior(value)) return value;
    return DEFAULT_HABIT_MISS_BEHAVIOR;
  }

  private resolveIncomingPriority(input: {
    priority?: string;
    is_required?: boolean;
  }): HabitPriority {
    if (isHabitPriority(input.priority)) return input.priority;
    if (input.is_required !== undefined) {
      return priorityFromLegacyRequired(input.is_required);
    }
    return DEFAULT_HABIT_PRIORITY;
  }

  private priorityFields(priority: HabitPriority) {
    return {
      priority,
      is_required: priority !== 'low',
    };
  }

  private async findLog(userId: string, habitId: string, date: string) {
    return this.logRepository.findOne({
      where: { user_id: userId, habit_id: habitId, date },
    });
  }

  private async findOwnedHabit(userId: string, habitId: string) {
    const habit = await this.habitRepository.findOne({
      where: { id: habitId, user_id: userId },
    });
    if (!habit) throw new NotFoundException('Habit not found');
    return habit;
  }
}
