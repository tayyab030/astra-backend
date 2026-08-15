import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { JwtCreateDto } from './dto/jwt-create.dto';
import { JwtRefreshDto } from './dto/jwt-refresh.dto';
import { JwtVerifyDto } from './dto/jwt-verify.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResendOtpLoginDto } from './dto/resend-otp-login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConfirmAccountDeleteDto } from './dto/confirm-account-delete.dto';
import { DEFAULT_AI_VOICE, isAiVoice } from './constants/ai-voice';
import {
  DEFAULT_AI_DATA_SCOPE,
  DEFAULT_AI_INSIGHTS,
  DEFAULT_AI_PERSONALITY,
  DEFAULT_AI_VOICE_MODE,
  isAiDataScope,
  isAiPersonality,
} from './constants/ai-settings';
import {
  DEFAULT_AI_LANGUAGE,
  isAiLanguage,
} from './constants/ai-language';
import {
  DEFAULT_MODULE_SETTINGS,
  normalizeModuleSettings,
} from './constants/module-settings';
import { getCurrencyForCountry, getTimezoneForCountry } from './constants/country-currency';
import {
  sendAccountDeleteEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
} from './email';
import { User } from './entities/user.entity';

const OTP_TTL_MS = 5 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
const ACCOUNT_DELETE_TTL_MS = 20 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 3;
const ACCESS_TOKEN_TTL = '60m';
const REFRESH_TOKEN_TTL = '7d';
const EMAIL_LIKE_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

/** Tables keyed by user_id — delete before removing the user row. */
const USER_DATA_TABLES = [
  'assistant_messages',
  'assistant_conversations',
  'habit_day_logs',
  'health_habits',
  'health_sleep_sessions',
  'health_daily_metrics',
  'health_mood_entries',
  'health_workouts',
  'health_weight_entries',
  'health_settings',
  'notes',
  'time_entries',
  'time_tracked_tasks',
  'time_track_settings',
  'tasks',
  'goals',
  'projects',
  'wealth_category_budgets',
  'wealth_savings',
  'wealth_transactions',
] as const;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  private getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new InternalServerErrorException({
        message: 'JWT_SECRET is not configured',
        error: 'Internal Server Error',
      });
    }
    return secret;
  }

  /**
   * Public profile payload for clients and Astra/Groq context.
   * When adding user-facing profile fields, include them here (never secrets:
   * password, otp_*, password_reset_*). Groq receives every field from this object.
   */
  private serializeUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      gender: user.gender,
      currency: user.currency || 'USD',
      country: user.country,
      timezone: user.timezone || 'UTC',
      theme: user.theme || 'neon',
      ai_voice: isAiVoice(user.ai_voice) ? user.ai_voice : DEFAULT_AI_VOICE,
      ai_voice_mode:
        typeof user.ai_voice_mode === 'boolean'
          ? user.ai_voice_mode
          : DEFAULT_AI_VOICE_MODE,
      ai_personality: isAiPersonality(user.ai_personality)
        ? user.ai_personality
        : DEFAULT_AI_PERSONALITY,
      ai_insights:
        typeof user.ai_insights === 'boolean'
          ? user.ai_insights
          : DEFAULT_AI_INSIGHTS,
      ai_data_scope: isAiDataScope(user.ai_data_scope)
        ? user.ai_data_scope
        : DEFAULT_AI_DATA_SCOPE,
      ai_language: isAiLanguage(user.ai_language)
        ? user.ai_language
        : DEFAULT_AI_LANGUAGE,
      module_settings: normalizeModuleSettings(user.module_settings),
      is_verified: user.is_verified,
      created_at: user.created_at?.toISOString?.() ?? user.created_at,
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ detail: 'User not found.' });
    }
    return this.serializeUser(user);
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ detail: 'User not found.' });
    }

    if (dto.first_name !== undefined) {
      user.first_name = dto.first_name.trim();
    }
    if (dto.last_name !== undefined) {
      user.last_name = dto.last_name.trim();
    }
    if (dto.gender !== undefined) {
      user.gender = dto.gender;
    }
    if (dto.currency !== undefined) {
      user.currency = dto.currency.toUpperCase();
    }
    if (dto.timezone !== undefined) {
      user.timezone = dto.timezone;
    }
    if (dto.theme !== undefined) {
      user.theme = dto.theme;
    }
    if (dto.ai_voice !== undefined) {
      user.ai_voice = dto.ai_voice;
    }
    if (dto.ai_voice_mode !== undefined) {
      user.ai_voice_mode = dto.ai_voice_mode;
    }
    if (dto.ai_personality !== undefined) {
      user.ai_personality = dto.ai_personality;
    }
    if (dto.ai_insights !== undefined) {
      user.ai_insights = dto.ai_insights;
    }
    if (dto.ai_data_scope !== undefined) {
      user.ai_data_scope = dto.ai_data_scope;
    }
    if (dto.ai_language !== undefined) {
      user.ai_language = dto.ai_language;
    }
    if (dto.module_settings !== undefined) {
      const current = normalizeModuleSettings(user.module_settings);
      user.module_settings = normalizeModuleSettings({
        weights: {
          ...current.weights,
          ...dto.module_settings.weights,
        },
        enabled: {
          ...current.enabled,
          ...dto.module_settings.enabled,
        },
      });
    }

    const saved = await this.userRepository.save(user);
    return this.serializeUser(saved);
  }

  private signAccessToken(user: User) {
    return jwt.sign(
      { sub: user.id, email: user.email, typ: 'access' },
      this.getJwtSecret(),
      { expiresIn: ACCESS_TOKEN_TTL },
    );
  }

  private signRefreshToken(user: User) {
    return jwt.sign(
      { sub: user.id, typ: 'refresh' },
      this.getJwtSecret(),
      { expiresIn: REFRESH_TOKEN_TTL },
    );
  }

  private generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private findUserByLogin(login: string) {
    const normalized = login.trim();
    const where = normalized.includes('@')
      ? { email: normalized.toLowerCase() }
      : { username: normalized };
    return this.userRepository.findOne({ where });
  }

  private async findUserByLoginAndPassword(login: string, password: string) {
    const user = await this.findUserByLogin(login);
    if (!user) {
      throw new UnauthorizedException({
        non_field_errors: [
          'Incorrect username/email or password. Please try again.',
        ],
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new UnauthorizedException({
        non_field_errors: [
          'Incorrect username/email or password. Please try again.',
        ],
      });
    }

    return user;
  }

  private isOtpStillValid(user: User) {
    return Boolean(
      user.otp_token &&
        user.otp_expires_at &&
        user.otp_expires_at.getTime() > Date.now(),
    );
  }

  private isPasswordResetStillValid(user: User) {
    return Boolean(
      user.password_reset_token &&
        user.password_reset_expires_at &&
        user.password_reset_expires_at.getTime() > Date.now(),
    );
  }

  private isAccountDeleteStillValid(user: User) {
    return Boolean(
      user.account_delete_token &&
        user.account_delete_expires_at &&
        user.account_delete_expires_at.getTime() > Date.now(),
    );
  }

  private async wipeAllUserData(userId: string) {
    await this.dataSource.transaction(async (manager) => {
      // Milestones hang off goals (CASCADE); remove orphan-safe via goal ids first if needed.
      await manager.query(
        `DELETE FROM goal_milestones WHERE goal_id IN (SELECT id FROM goals WHERE user_id = $1)`,
        [userId],
      );

      for (const table of USER_DATA_TABLES) {
        await manager.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
      }

      await manager.query(`DELETE FROM users WHERE id = $1`, [userId]);
    });
  }

  private async issueOtp(user: User) {
    const otp = this.generateOtp();
    user.otp_code = otp;
    user.otp_expires_at = new Date(Date.now() + OTP_TTL_MS);
    user.otp_token = randomUUID();
    user.otp_attempts = 0;
    const saved = await this.userRepository.save(user);
    await sendOtpEmail({ to: saved.email, otp });
    return saved;
  }

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException({
        confirmPassword: ["Passwords don't match"],
      });
    }
    if (dto.terms !== true) {
      throw new BadRequestException({
        terms: ['You must accept the terms and conditions'],
      });
    }

    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim();

    if (EMAIL_LIKE_REGEX.test(username) || username.includes('@')) {
      throw new BadRequestException({
        username: ['Username cannot be an email address.'],
      });
    }

    if (username.toLowerCase() === email) {
      throw new BadRequestException({
        username: ['Username and email cannot be the same.'],
      });
    }

    const existingByUsername = await this.userRepository.findOne({
      where: { username },
    });
    if (existingByUsername) {
      throw new ConflictException({
        username: ['A user with that username already exists.'],
      });
    }

    const existingByEmail = await this.userRepository.findOne({
      where: { email },
    });
    if (existingByEmail) {
      throw new ConflictException({
        email: ['user with this email already exists.'],
      });
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const country = dto.country.trim().toUpperCase();
    const currency = getCurrencyForCountry(country);
    const timezone = getTimezoneForCountry(country);

    const user = this.userRepository.create({
      first_name: dto.first_name.trim(),
      last_name: dto.last_name.trim(),
      gender: dto.gender,
      username,
      email,
      password: hashedPassword,
      country,
      currency,
      timezone,
      theme: 'neon',
      ai_voice: DEFAULT_AI_VOICE,
      ai_voice_mode: DEFAULT_AI_VOICE_MODE,
      ai_personality: DEFAULT_AI_PERSONALITY,
      ai_insights: DEFAULT_AI_INSIGHTS,
      ai_data_scope: DEFAULT_AI_DATA_SCOPE,
      ai_language: DEFAULT_AI_LANGUAGE,
      module_settings: DEFAULT_MODULE_SETTINGS,
    });
    const saved = await this.userRepository.save(user);
    const withOtp = await this.issueOtp(saved);

    return {
      message: 'Registration successful',
      otp_token: withOtp.otp_token,
    };
  }

  async getOtpStatus(token: string) {
    const user = await this.userRepository.findOne({
      where: { otp_token: token },
    });
    if (!user || user.is_verified) {
      throw new NotFoundException({ detail: 'Invalid OTP token.' });
    }

    const remainingMs = user.otp_expires_at
      ? user.otp_expires_at.getTime() - Date.now()
      : 0;

    return {
      remaining_time_seconds: Math.max(0, Math.floor(remainingMs / 1000)),
      user_id: user.id,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.userRepository.findOne({
      where: { id: dto.user_id },
    });
    if (!user) {
      throw new BadRequestException({ user_id: ['User not found.'] });
    }
    if (user.is_verified) {
      return { message: 'Email already verified' };
    }
    if (!user.otp_code || !user.otp_expires_at) {
      throw new BadRequestException({
        otp_code: ['No verification code found.'],
      });
    }
    if (user.otp_expires_at.getTime() < Date.now()) {
      throw new BadRequestException({
        otp_code: ['Verification code expired.'],
      });
    }
    if (user.otp_code !== dto.otp_code) {
      user.otp_attempts += 1;
      await this.userRepository.save(user);

      const attemptsUsed = String(user.otp_attempts);
      const remaining = String(Math.max(0, MAX_OTP_ATTEMPTS - user.otp_attempts));

      throw new BadRequestException({
        otp_code: ['Invalid OTP code.'],
        attempts_used: [attemptsUsed],
        max_attempts: [String(MAX_OTP_ATTEMPTS)],
        remaining_attempts: [remaining],
        error_type: ['invalid_code'],
      });
    }

    user.is_verified = true;
    user.verified_at = new Date();
    user.otp_code = null;
    user.otp_expires_at = null;
    user.otp_token = null;
    user.otp_attempts = 0;
    await this.userRepository.save(user);

    return { message: 'OTP verified successfully' };
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.userRepository.findOne({
      where: { id: dto.user_id },
    });
    if (!user) {
      throw new BadRequestException({ user_id: ['User not found.'] });
    }
    if (user.is_verified) {
      throw new BadRequestException({
        user_id: ['Email is already verified.'],
      });
    }
    if (user.otp_expires_at && user.otp_expires_at.getTime() > Date.now()) {
      throw new BadRequestException({
        otp_code: ['Verification code is still valid.'],
      });
    }

    const updated = await this.issueOtp(user);
    return {
      otp: {
        token: updated.otp_token,
      },
    };
  }

  async resendOtpFromLogin(dto: ResendOtpLoginDto) {
    const user = await this.findUserByLoginAndPassword(dto.login, dto.password);

    if (user.is_verified) {
      throw new BadRequestException({
        non_field_errors: ['Email is already verified.'],
      });
    }

    if (this.isOtpStillValid(user)) {
      return {
        message: 'Verification code is still valid.',
        otp: { token: user.otp_token },
        resent: false,
      };
    }

    const updated = await this.issueOtp(user);
    return {
      message: 'New verification code sent!',
      otp: { token: updated.otp_token },
      resent: true,
    };
  }

  async jwtCreate(dto: JwtCreateDto) {
    const user = await this.findUserByLogin(dto.login);
    if (!user) {
      throw new UnauthorizedException({
        non_field_errors: [
          'Incorrect username/email or password. Please try again.',
        ],
      });
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException({
        non_field_errors: [
          'Incorrect username/email or password. Please try again.',
        ],
      });
    }

    if (!user.is_verified) {
      throw new UnauthorizedException({
        non_field_errors: ['Email is not verified.'],
        is_unverified: true,
        user_id: user.id,
        otp_token: user.otp_token,
        otp_still_valid: this.isOtpStillValid(user),
      });
    }

    return {
      access: this.signAccessToken(user),
      refresh: this.signRefreshToken(user),
      user: this.serializeUser(user),
    };
  }

  async jwtRefresh(dto: JwtRefreshDto) {
    const secret = this.getJwtSecret();
    let payload: jwt.JwtPayload;

    try {
      const decoded = jwt.verify(dto.refresh, secret);
      if (typeof decoded === 'string') {
        throw new Error('Invalid token');
      }
      payload = decoded;
    } catch {
      throw new UnauthorizedException({
        detail: 'Token is invalid or expired',
        code: 'token_not_valid',
      });
    }

    if (payload.typ !== 'refresh' || typeof payload.sub !== 'string') {
      throw new UnauthorizedException({
        detail: 'Token is invalid or expired',
        code: 'token_not_valid',
      });
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException({
        detail: 'Token is invalid or expired',
        code: 'token_not_valid',
      });
    }

    return { access: this.signAccessToken(user) };
  }

  verifyAccessToken(token: string) {
    const secret = this.getJwtSecret();

    try {
      const decoded = jwt.verify(token, secret);
      if (typeof decoded === 'string') {
        throw new Error('Invalid token');
      }
      const payload = decoded as jwt.JwtPayload;
      if (payload.typ !== 'access' || typeof payload.sub !== 'string') {
        throw new Error('Invalid token type');
      }

      return {
        sub: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : '',
      };
    } catch {
      throw new UnauthorizedException({
        detail: 'Token is invalid or expired',
        code: 'token_not_valid',
      });
    }
  }

  async jwtVerify(dto: JwtVerifyDto) {
    this.verifyAccessToken(dto.token);
    return {};
  }

  async requestPasswordReset(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      return {
        message:
          'If an account exists with that email, a reset link has been sent.',
        sent: true,
      };
    }

    if (this.isPasswordResetStillValid(user)) {
      const remainingMs =
        user.password_reset_expires_at!.getTime() - Date.now();
      return {
        message:
          'A recovery link was already sent and is still valid. Check your inbox.',
        sent: false,
        remaining_time_seconds: Math.max(
          0,
          Math.floor(remainingMs / 1000),
        ),
      };
    }

    user.password_reset_token = randomUUID();
    user.password_reset_expires_at = new Date(
      Date.now() + PASSWORD_RESET_TTL_MS,
    );
    await this.userRepository.save(user);

    const frontendUrl =
      process.env.FRONTEND_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${user.password_reset_token}`;
    await sendPasswordResetEmail({ to: user.email, resetUrl });

    return {
      message:
        'If an account exists with that email, a reset link has been sent.',
      sent: true,
    };
  }

  async getPasswordResetStatus(token: string) {
    const user = await this.userRepository.findOne({
      where: { password_reset_token: token },
    });
    if (!user || !user.password_reset_expires_at) {
      throw new NotFoundException({ detail: 'Invalid reset token.' });
    }

    const remainingMs =
      user.password_reset_expires_at.getTime() - Date.now();
    if (remainingMs <= 0) {
      throw new NotFoundException({ detail: 'Invalid reset token.' });
    }

    return {
      remaining_time_seconds: Math.max(0, Math.floor(remainingMs / 1000)),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException({
        confirmPassword: ["Passwords don't match"],
      });
    }

    const user = await this.userRepository.findOne({
      where: { password_reset_token: dto.token },
    });
    if (!user || !user.password_reset_expires_at) {
      throw new BadRequestException({
        token: ['Invalid or expired reset link.'],
      });
    }
    if (user.password_reset_expires_at.getTime() < Date.now()) {
      throw new BadRequestException({
        token: ['Invalid or expired reset link.'],
      });
    }

    user.password = await bcrypt.hash(dto.password, 10);
    user.password_reset_token = null;
    user.password_reset_expires_at = null;
    await this.userRepository.save(user);

    return { message: 'Password reset successful' };
  }

  async requestAccountDeletion(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ detail: 'User not found.' });
    }

    if (this.isAccountDeleteStillValid(user)) {
      const remainingMs =
        user.account_delete_expires_at!.getTime() - Date.now();
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      throw new ConflictException({
        detail:
          'A deletion confirmation email was already sent and is still valid. Check your inbox.',
        remaining_time_seconds: remainingSeconds,
        code: 'account_delete_pending',
      });
    }

    user.account_delete_token = randomUUID();
    user.account_delete_expires_at = new Date(
      Date.now() + ACCOUNT_DELETE_TTL_MS,
    );
    await this.userRepository.save(user);

    const frontendUrl =
      process.env.FRONTEND_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
    const deleteUrl = `${frontendUrl}/auth/delete-account?token=${user.account_delete_token}`;
    const sent = await sendAccountDeleteEmail({
      to: user.email,
      deleteUrl,
    });

    if (!sent) {
      throw new InternalServerErrorException({
        detail:
          'Could not send the confirmation email. Please try again later.',
      });
    }

    return {
      message:
        'We sent a confirmation link to your email. It expires in 20 minutes.',
      sent: true,
      remaining_time_seconds: Math.floor(ACCOUNT_DELETE_TTL_MS / 1000),
    };
  }

  async getAccountDeleteStatus(token: string) {
    const user = await this.userRepository.findOne({
      where: { account_delete_token: token },
    });
    if (!user || !user.account_delete_expires_at) {
      throw new NotFoundException({ detail: 'Invalid or expired delete link.' });
    }

    const remainingMs =
      user.account_delete_expires_at.getTime() - Date.now();
    if (remainingMs <= 0) {
      throw new NotFoundException({ detail: 'Invalid or expired delete link.' });
    }

    return {
      email: user.email,
      remaining_time_seconds: Math.max(0, Math.floor(remainingMs / 1000)),
    };
  }

  async confirmAccountDeletion(dto: ConfirmAccountDeleteDto) {
    const user = await this.userRepository.findOne({
      where: { account_delete_token: dto.token },
    });
    if (!user || !user.account_delete_expires_at) {
      throw new BadRequestException({
        token: ['Invalid or expired delete link.'],
      });
    }
    if (user.account_delete_expires_at.getTime() < Date.now()) {
      throw new BadRequestException({
        token: ['This delete link has expired. Request a new one from Settings.'],
      });
    }

    const email = user.email;
    await this.wipeAllUserData(user.id);

    return {
      message: 'Your account and all related data have been permanently deleted.',
      email,
    };
  }
}
