import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Goal } from './goal.entity';

@Entity('goal_milestones')
@Index(['goal_id', 'sort_order'])
export class GoalMilestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  goal_id: string;

  @ManyToOne(() => Goal, (goal) => goal.milestones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goal_id' })
  goal: Goal;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'date' })
  due_date: string;

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;
}
