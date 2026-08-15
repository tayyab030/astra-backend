import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Table kept as health_habits to preserve existing data. */
@Entity('health_habits')
@Index(['user_id'])
@Index(['user_id', 'group_key'])
export class Habit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 32, default: 'custom' })
  domain: string;

  /** boolean | count | duration */
  @Column({ type: 'varchar', length: 32, default: 'boolean' })
  metric_type: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  unit: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  group_key: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  group_name: string | null;

  /**
   * high | medium | low
   * Replaces legacy required/optional. Existing rows migrate via service defaults.
   */
  @Column({ type: 'varchar', length: 16, default: 'medium' })
  priority: string;

  /**
   * carry — missed days stay open and must be done (with later days); late completions marked late.
   * reset — a miss does not carry; streak breaks and the day is gone.
   */
  @Column({ type: 'varchar', length: 16, default: 'carry' })
  miss_behavior: string;

  /** @deprecated Prefer priority. Kept synced for older clients/data. */
  @Column({ type: 'boolean', default: true })
  is_required: boolean;

  @Column({ type: 'int', default: 0 })
  streak: number;

  @Column({ type: 'decimal', precision: 10, scale: 1, default: 1 })
  target: number;

  @Column({ type: 'decimal', precision: 10, scale: 1, default: 0 })
  current: number;

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  /**
   * TickTick-style frequency:
   * daily | weekly | monthly | interval
   * (legacy "custom" treated as daily with selected weekdays)
   */
  @Column({ type: 'varchar', length: 32, default: 'daily' })
  frequency: string;

  /** Weekdays for daily habits (0=Sun … 6=Sat). */
  @Column({ type: 'simple-json', nullable: true })
  repeat_days: number[] | null;

  /** For weekly/monthly: complete this many times in the period. */
  @Column({ type: 'int', default: 1 })
  period_target: number;

  /** For interval: every N days. */
  @Column({ type: 'int', default: 1 })
  interval_days: number;

  /** morning | afternoon | evening | anytime */
  @Column({ type: 'varchar', length: 32, default: 'anytime' })
  time_of_day: string;

  /** Optional reminder time HH:mm */
  @Column({ type: 'varchar', length: 8, nullable: true })
  reminder_time: string | null;

  /** Habit becomes active from this calendar date (YYYY-MM-DD). */
  @Column({ type: 'date', nullable: true })
  start_date: string | null;

  /** Habit stops appearing after this calendar date (YYYY-MM-DD). Null = continues. */
  @Column({ type: 'date', nullable: true })
  end_date: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
