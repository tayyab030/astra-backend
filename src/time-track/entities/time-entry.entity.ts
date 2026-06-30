import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('time_entries')
@Index(['user_id', 'date'])
@Index(['user_id', 'task_id'])
export class TimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  task_id: string;

  @Column({ type: 'varchar', length: 255 })
  task_title: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'timestamptz' })
  start_time: Date;

  @Column({ type: 'timestamptz' })
  end_time: Date;

  @Column({ type: 'int' })
  duration_seconds: number;

  @CreateDateColumn()
  created_at: Date;
}
