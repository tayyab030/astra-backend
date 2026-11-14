import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('farm_animals')
@Index(['user_id'])
@Index(['user_id', 'tag'], { unique: true })
@Index(['user_id', 'group_id'])
export class Animal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 64 })
  tag: string;

  @Column({ type: 'varchar', length: 32 })
  species: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  breed: string | null;

  @Column({ type: 'date', nullable: true })
  date_of_birth: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  sex: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  weight: string | null;

  @Column({ type: 'varchar', length: 32, default: 'Healthy' })
  status: string;

  @Column({ type: 'varchar', length: 32, default: 'Not Vaccinated' })
  vaccination_status: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  price: string;

  @Column({ type: 'varchar', length: 8, default: 'USD' })
  currency: string;

  @Column({ type: 'date', nullable: true })
  price_updated: string | null;

  @Column({ type: 'uuid', nullable: true })
  group_id: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
