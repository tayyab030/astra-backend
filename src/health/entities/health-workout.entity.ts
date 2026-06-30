import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('health_workouts')
@Index(['user_id'])
export class HealthWorkout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 64 })
  type: string;

  @Column({ type: 'int' })
  duration: number;

  @Column({ type: 'int', default: 0 })
  calories: number;

  @Column({ type: 'date' })
  date: string;

  @CreateDateColumn()
  created_at: Date;
}
