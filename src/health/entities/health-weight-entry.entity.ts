import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('health_weight_entries')
@Index(['user_id', 'date'], { unique: true })
export class HealthWeightEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'decimal', precision: 5, scale: 1 })
  weight_kg: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
