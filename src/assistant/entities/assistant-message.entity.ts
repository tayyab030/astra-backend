import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AssistantMessageRole = 'user' | 'assistant';

@Entity('assistant_messages')
@Index(['conversation_id', 'created_at'])
@Index(['user_id', 'created_at'])
export class AssistantMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  conversation_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 16 })
  role!: AssistantMessageRole;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
