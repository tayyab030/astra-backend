import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('health_settings')
@Index(['user_id'], { unique: true })
export class HealthSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  height_cm: number | null;

  /** Optional goal weight (kg); should sit within the healthy BMI range for height. */
  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  ideal_weight_kg: number | null;

  @Column({ type: 'int', default: 8 })
  water_glasses_target: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, default: 7.5 })
  sleep_hours_target: number;

  @Column({ type: 'int', default: 60 })
  exercise_minutes_target: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
