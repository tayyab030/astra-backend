import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('wealth_category_budgets')
@Index(['user_id', 'category', 'period_type', 'year', 'month'], {
  unique: true,
})
export class WealthCategoryBudget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 32 })
  category: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 8 })
  period_type: 'month' | 'year';

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int', nullable: true })
  month: number | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
