import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Goal } from '../../goals/entities/goal.entity';
import { Project } from './project.entity';

@Entity('tasks')
@Index(['user_id', 'completed'])
@Index(['user_id', 'due_date'])
@Index(['project_id'])
@Index(['goal_id'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid', nullable: true })
  project_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  goal_id: string | null;

  @ManyToOne(() => Project, (project) => project.tasks, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @ManyToOne(() => Goal, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'goal_id' })
  goal: Goal | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'date', nullable: true })
  due_date: string | null;

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  @Column({ type: 'varchar', length: 16, default: 'medium' })
  priority: string;

  @Column({ type: 'varchar', length: 32, default: 'todo' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
