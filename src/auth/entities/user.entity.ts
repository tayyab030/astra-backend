import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  first_name!: string;

  @Column()
  last_name!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  country!: string | null;

  @Column({ type: 'varchar', length: 64, default: 'UTC' })
  timezone!: string;

  @Column({ type: 'varchar', length: 16, default: 'neon' })
  theme!: string;

  @Column({ type: 'boolean', default: false })
  is_verified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verified_at!: Date | null;

  @Column({ type: 'varchar', length: 6, nullable: true })
  otp_code!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  otp_expires_at!: Date | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  otp_token!: string | null;

  @Column({ type: 'int', default: 0 })
  otp_attempts!: number;

  @Column({ type: 'varchar', length: 36, nullable: true })
  password_reset_token!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  password_reset_expires_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
