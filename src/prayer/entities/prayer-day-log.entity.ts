import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Per-day salah completion log for a user. */
@Entity('prayer_day_logs')
@Index(['user_id', 'date'], { unique: true })
export class PrayerDayLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  /** Local calendar date YYYY-MM-DD */
  @Column({ type: 'date' })
  date!: string;

  /**
   * Map of prayer key → completed.
   * Keys: Fajr, Dhuhr, Asr, Maghrib, Isha, Lastthird (Tahajjud).
   */
  @Column({ type: 'jsonb', default: {} })
  completed!: Record<string, boolean>;

  /**
   * Map of prayer key → how it was offered when completed.
   * Values: on_time | qaza
   */
  @Column({ type: 'jsonb', default: {} })
  statuses!: Record<string, 'on_time' | 'qaza'>;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
