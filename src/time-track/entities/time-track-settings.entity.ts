import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('time_track_settings')
@Index(['user_id'], { unique: true })
export class TimeTrackSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'int', default: 40 })
  weekly_target_hours: number;

  @Column({ type: 'boolean', default: true })
  activity_bar_visible: boolean;

  @Column({ type: 'uuid', nullable: true })
  last_selected_task_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
