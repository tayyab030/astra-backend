import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('wealth_savings')
@Index(['user_id', 'month'])
export class WealthSaving {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 7 })
  month: string;

  @Column({ type: 'varchar', length: 16 })
  type: 'deposit' | 'withdrawal';

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'uuid', nullable: true })
  transaction_id: string | null;

  @CreateDateColumn()
  created_at: Date;
}
