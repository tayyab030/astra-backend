import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AuthClientType = 'web' | 'mobile' | 'desktop';

@Entity('auth_sessions')
export class AuthSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  user_id!: string;

  /** JWT refresh token jti */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  jti!: string;

  @Column({ type: 'varchar', length: 16, default: 'web' })
  client_type!: AuthClientType;

  @Column({ type: 'varchar', length: 32, nullable: true })
  platform!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  device_label!: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip_address!: string | null;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_seen_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
