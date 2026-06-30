import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('health_habits')
@Index(['user_id'])
export class HealthHabit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'int', default: 0 })
  streak: number;

  @Column({ type: 'decimal', precision: 10, scale: 1, default: 1 })
  target: number;

  @Column({ type: 'decimal', precision: 10, scale: 1, default: 0 })
  current: number;

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  @Column({ type: 'varchar', length: 32, default: 'daily' })
  frequency: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
