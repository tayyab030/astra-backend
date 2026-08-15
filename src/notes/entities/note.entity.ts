import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notes')
@Index(['user_id', 'status'])
@Index(['user_id', 'note_type'])
@Index(['user_id', 'updated_at'])
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', default: '' })
  content: string;

  @Column({ type: 'varchar', length: 32, default: 'quick-notes' })
  note_type: string;

  @Column({ type: 'varchar', length: 64, default: 'Personal' })
  category: string;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ type: 'varchar', length: 16, default: 'medium' })
  priority: string;

  @Column({ type: 'boolean', default: false })
  is_favorite: boolean;

  @Column({ type: 'boolean', default: false })
  is_pinned: boolean;

  @Column({ type: 'varchar', length: 32, nullable: true })
  color: string | null;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @Column({ type: 'jsonb', default: [] })
  attachments: Record<string, unknown>[];

  @Column({ type: 'timestamptz', nullable: true })
  reminder: Date | null;

  @Column({ type: 'jsonb', default: [] })
  linked_items: Record<string, unknown>[];

  @Column({ type: 'varchar', length: 16, default: 'private' })
  visibility: string;

  @Column({ type: 'boolean', default: false })
  is_locked: boolean;

  @Column({ type: 'boolean', default: false })
  is_ai_generated: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ type: 'jsonb', default: [] })
  versions: Record<string, unknown>[];

  @Column({ type: 'jsonb', default: [] })
  activity: Record<string, unknown>[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
