import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Per-day progress for a habit. */
@Entity('habit_day_logs')
@Index(['user_id', 'date'])
@Index(['habit_id', 'date'], { unique: true })
export class HabitDayLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  habit_id: string;

  /** Local calendar date YYYY-MM-DD */
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'decimal', precision: 10, scale: 1, default: 0 })
  current: number;

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  /**
   * User decided this occurrence cannot / will not be done.
   * Completing the habit clears this flag.
   */
  @Column({ type: 'boolean', default: false })
  cannot_do: boolean;

  /**
   * Completed after the due day, or user marked this completion as late (even same day).
   */
  @Column({ type: 'boolean', default: false })
  is_late: boolean;

  /**
   * Optional note for why a habit was delayed/missed or skipped.
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  delay_reason: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
