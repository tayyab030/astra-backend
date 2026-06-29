import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Task } from './task.entity';

@Entity('projects')
@Index(['user_id', 'updated_at'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'varchar', length: 32, default: '#5EC5DC' })
  color: string;

  @Column({ type: 'varchar', length: 64, default: 'Globe' })
  icon: string;

  @Column({ type: 'boolean', default: false })
  starred: boolean;

  @Column({ type: 'varchar', length: 32, default: 'on_track' })
  status: string;

  @Column({ type: 'date', nullable: true })
  due_date: string | null;

  @OneToMany(() => Task, (task) => task.project, {
    cascade: true,
  })
  tasks: Task[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
