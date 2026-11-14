import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('farm_animal_groups')
@Index(['user_id'])
export class AnimalGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  /** Hens | Rabbits */
  @Column({ type: 'varchar', length: 32 })
  species: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  breed: string | null;

  @Column({ type: 'int', default: 0 })
  count: number;

  @Column({ type: 'date', nullable: true })
  date_created: string | null;

  /** Eggs | Meat | Breeding */
  @Column({ type: 'varchar', length: 32, nullable: true })
  production_type: string | null;

  @Column({ type: 'varchar', length: 32, default: 'Healthy' })
  health_status: string;

  @Column({ type: 'varchar', length: 32, default: 'Not Vaccinated' })
  vaccination_status: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  unit_price: string;

  @Column({ type: 'varchar', length: 8, default: 'USD' })
  currency: string;

  @Column({ type: 'date', nullable: true })
  price_updated: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
