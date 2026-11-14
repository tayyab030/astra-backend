import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { WealthScope } from '../constants/wealth-scope';

@Entity('wealth_transactions')
@Index(['user_id', 'scope', 'date'])
export class WealthTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 16, default: 'personal' })
  scope: WealthScope;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 32 })
  category: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, unknown> | null;

  @CreateDateColumn()
  created_at: Date;
}
