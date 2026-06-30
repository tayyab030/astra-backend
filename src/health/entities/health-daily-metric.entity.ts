import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('health_daily_metrics')
@Index(['user_id', 'date'], { unique: true })
export class HealthDailyMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int', default: 0 })
  water_glasses: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, default: 0 })
  sleep_hours: number;

  @Column({ type: 'int', default: 0 })
  exercise_minutes: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
