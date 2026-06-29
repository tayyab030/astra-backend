import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GoalMilestone } from './goal-milestone.entity';

@Entity('goals')
@Index(['user_id', 'target_date'])
export class Goal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 32 })
  category: string;

  @Column({ type: 'varchar', length: 16 })
  priority: string;

  @Column({ type: 'text', nullable: true })
  motivation: string | null;

  @Column({ type: 'date' })
  start_date: string;

  @Column({ type: 'date' })
  target_date: string;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'int', default: 0 })
  streak: number;

  @Column({ type: 'int', default: 0 })
  linked_tasks: number;

  @OneToMany(() => GoalMilestone, (milestone) => milestone.goal, {
    cascade: true,
  })
  milestones: GoalMilestone[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
