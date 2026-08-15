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

  @Column({ type: 'varchar', length: 32, nullable: true })
  gender!: string | null;

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

  /** Groq Orpheus TTS voice id (e.g. austin). */
  @Column({ type: 'varchar', length: 32, default: 'austin' })
  ai_voice!: string;

  /** Prefer speaking assistant replies in the client. */
  @Column({ type: 'boolean', default: false })
  ai_voice_mode!: boolean;

  /** professional | casual | motivational */
  @Column({ type: 'varchar', length: 32, default: 'professional' })
  ai_personality!: string;

  /** Offer unsolicited smart insights when relevant. */
  @Column({ type: 'boolean', default: true })
  ai_insights!: boolean;

  /** tasks | productivity | all */
  @Column({ type: 'varchar', length: 32, default: 'all' })
  ai_data_scope!: string;

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
