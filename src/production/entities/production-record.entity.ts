import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('farm_production_records')
@Index(['user_id'])
@Index(['user_id', 'date'])
@Index(['user_id', 'type'])
export class ProductionRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  /** milk | egg | meat */
  @Column({ type: 'varchar', length: 16 })
  type: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  quantity: string;

  @Column({ type: 'varchar', length: 16, default: 'unit' })
  unit: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  time: string | null;

  @Column({ type: 'uuid', nullable: true })
  animal_id: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  animal_tag: string | null;

  @Column({ type: 'uuid', nullable: true })
  group_id: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  group_name: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  breed: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  session: string | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  fat_percentage: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  quality_grade: string | null;

  @Column({ type: 'int', nullable: true })
  broken_count: number | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  productivity: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
