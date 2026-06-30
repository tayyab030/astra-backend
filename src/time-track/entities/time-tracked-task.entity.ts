import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('time_tracked_tasks')
@Unique(['user_id', 'task_id', 'track_date'])
@Index(['user_id', 'track_date'])
export class TimeTrackedTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  task_id: string;

  @Column({ type: 'date' })
  track_date: string;

  @CreateDateColumn()
  created_at: Date;
}
