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
  isEmailFlowEnabled,
  sendAccountDeleteEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
} from './email';
import { User } from './entities/user.entity';
import {
  AuthSession,
  type AuthClientType,
} from './entities/auth-session.entity';

const OTP_TTL_MS = 5 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
const ACCOUNT_DELETE_TTL_MS = 20 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 3;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_LIKE_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

type ClientMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

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
  'auth_sessions',
] as const;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuthSession)
    private readonly sessionRepository: Repository<AuthSession>,
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

  private signAccessToken(user: User, sessionId: string) {
    return jwt.sign(
      { sub: user.id, email: user.email, typ: 'access', sid: sessionId },
      this.getJwtSecret(),
      { expiresIn: ACCESS_TOKEN_TTL },
    );
  }

  private signRefreshToken(user: User, jti: string) {
    return jwt.sign(
      { sub: user.id, typ: 'refresh', jti },
      this.getJwtSecret(),
      { expiresIn: REFRESH_TOKEN_TTL },
    );
  }

  private normalizeClientType(value?: string | null): AuthClientType {
    if (value === 'mobile' || value === 'desktop' || value === 'web') {
      return value;
    }
    return 'web';
  }

  private buildDeviceLabel(input: {
    clientType: AuthClientType;
    platform?: string | null;
    deviceLabel?: string | null;
    userAgent?: string | null;
  }) {
    if (input.deviceLabel?.trim()) return input.deviceLabel.trim().slice(0, 128);

    const platform = (input.platform || '').trim();
    if (input.clientType === 'mobile') {
      return platform ? `${platform} · Astra app` : 'Astra mobile app';
    }
    if (input.clientType === 'desktop') {
      return platform ? `${platform} · Astra desktop` : 'Astra desktop';
    }
    if (platform) return `${platform} · Website`;
    return 'Astra website';
  }

  private serializeSession(
    session: AuthSession,
    currentJti?: string | null,
    currentSessionId?: string | null,
  ) {
    return {
      id: session.id,
      client_type: session.client_type,
      platform: session.platform,
      device_label: session.device_label,
      user_agent: session.user_agent,
      ip_address: session.ip_address,
      created_at: session.created_at.toISOString(),
      last_seen_at: (session.last_seen_at ?? session.created_at).toISOString(),
      expires_at: session.expires_at.toISOString(),
      is_current: Boolean(
        (currentSessionId && session.id === currentSessionId) ||
          (currentJti && session.jti === currentJti),
      ),
    };
  }

  private async createAuthSession(
    user: User,
    dto: {
      client_type?: string;
      platform?: string;
      device_label?: string;
      user_agent?: string;
    },
    meta: ClientMeta,
  ) {
    const jti = randomUUID();
    const clientType = this.normalizeClientType(dto.client_type);
    const userAgent = (dto.user_agent || meta.userAgent || null)?.slice(0, 512) ?? null;
    const platform = dto.platform?.trim().slice(0, 32) || null;
    const deviceLabel = this.buildDeviceLabel({
      clientType,
      platform,
      deviceLabel: dto.device_label,
      userAgent,
    });

    const session = this.sessionRepository.create({
      user_id: user.id,
      jti,
      client_type: clientType,
      platform,
      device_label: deviceLabel,
      user_agent: userAgent,
      ip_address: meta.ipAddress?.slice(0, 64) || null,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      revoked_at: null,
      last_seen_at: new Date(),
    });
    await this.sessionRepository.save(session);

    // Website: one active browser login at a time — revoke older web sessions
    // so their refresh tokens stop working (forces logout on other tabs/browsers).
    if (clientType === 'web') {
      await this.revokeOtherSessionsOfType(user.id, 'web', session.id);
    }

    return {
      session,
      refresh: this.signRefreshToken(user, jti),
    };
  }

  /**
   * Keep a single active session per client type (used for Website).
   * Revokes every other non-expired session of that type for the user.
   */
  private async revokeOtherSessionsOfType(
    userId: string,
    clientType: AuthClientType,
    keepSessionId: string,
  ) {
    const now = new Date();
    const others = await this.sessionRepository.find({
      where: {
        user_id: userId,
        client_type: clientType,
      },
    });

    let changed = 0;
    for (const session of others) {
      if (session.id === keepSessionId) continue;
      if (session.revoked_at) continue;
      if (session.expires_at.getTime() <= now.getTime()) continue;
      session.revoked_at = now;
      changed += 1;
    }

    if (changed > 0) {
      await this.sessionRepository.save(others);
    }
    return changed;
  }

  /**
   * If multiple Website sessions are still active (legacy), keep the newest
   * by last_seen_at and revoke the rest so only one shows / stays signed in.
   */
  private async enforceSingleWebSession(userId: string) {
    const now = new Date();
    const webSessions = await this.sessionRepository.find({
      where: { user_id: userId, client_type: 'web' },
      order: { last_seen_at: 'DESC', created_at: 'DESC' },
    });

    const active = webSessions.filter(
      (s) => !s.revoked_at && s.expires_at.getTime() > now.getTime(),
    );
    if (active.length <= 1) return;

    const [, ...stale] = active;
    for (const session of stale) {
      session.revoked_at = now;
    }
    await this.sessionRepository.save(stale);
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

    // TEMPORARY_EMAIL_FLOW — when MODE !== local, skip OTP email and auto-verify.
    // Revert: always call issueOtp(saved) and return otp_token (search TEMPORARY_EMAIL_FLOW).
    if (!isEmailFlowEnabled()) {
      saved.is_verified = true;
      saved.verified_at = new Date();
      await this.userRepository.save(saved);
      return { message: 'Registration successful' };
    }

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
    // TEMPORARY_EMAIL_FLOW — OTP email disabled when MODE !== local.
    // Revert: delete this early return (search TEMPORARY_EMAIL_FLOW).
    if (!isEmailFlowEnabled()) {
      throw new BadRequestException({
        non_field_errors: [
          'Email verification is temporarily disabled in this environment.',
        ],
      });
    }

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
    // TEMPORARY_EMAIL_FLOW — OTP email disabled when MODE !== local.
    // Revert: delete this early return (search TEMPORARY_EMAIL_FLOW).
    if (!isEmailFlowEnabled()) {
      throw new BadRequestException({
        non_field_errors: [
          'Email verification is temporarily disabled in this environment.',
        ],
      });
    }

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

  async jwtCreate(dto: JwtCreateDto, meta: ClientMeta = {}) {
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

    const { session, refresh } = await this.createAuthSession(user, dto, meta);

    return {
      access: this.signAccessToken(user, session.id),
      refresh,
      session_id: session.id,
      user: this.serializeUser(user),
    };
  }

  async jwtRefresh(dto: JwtRefreshDto, meta: ClientMeta = {}) {
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

    const jti = typeof payload.jti === 'string' ? payload.jti : null;
    if (jti) {
      const session = await this.sessionRepository.findOne({ where: { jti } });
      if (!session || session.user_id !== user.id) {
        throw new UnauthorizedException({
          detail: 'Token is invalid or expired',
          code: 'token_not_valid',
        });
      }
      if (session.revoked_at || session.expires_at.getTime() <= Date.now()) {
        throw new UnauthorizedException({
          detail: 'Token is invalid or expired',
          code: 'token_not_valid',
        });
      }

      session.last_seen_at = new Date();
      if (dto.client_type) {
        session.client_type = this.normalizeClientType(dto.client_type);
      }
      if (dto.platform?.trim()) {
        session.platform = dto.platform.trim().slice(0, 32);
      }
      if (dto.device_label?.trim()) {
        session.device_label = dto.device_label.trim().slice(0, 128);
      }
      const ua = dto.user_agent || meta.userAgent;
      if (ua) session.user_agent = ua.slice(0, 512);
      if (meta.ipAddress) session.ip_address = meta.ipAddress.slice(0, 64);
      await this.sessionRepository.save(session);

      return {
        access: this.signAccessToken(user, session.id),
        session_id: session.id,
      };
    }

    // Legacy refresh tokens (no jti): mint a real session so device list + revoke work.
    const { session, refresh } = await this.createAuthSession(user, dto, meta);
    return {
      access: this.signAccessToken(user, session.id),
      refresh,
      session_id: session.id,
      rotated_refresh: true,
    };
  }

  async listSessions(userId: string, currentSessionId?: string | null) {
    const now = new Date();
    await this.enforceSingleWebSession(userId);

    const sessions = await this.sessionRepository.find({
      where: { user_id: userId },
      order: { last_seen_at: 'DESC', created_at: 'DESC' },
    });

    const active = sessions.filter(
      (s) => !s.revoked_at && s.expires_at.getTime() > now.getTime(),
    );

    return {
      count: active.length,
      sessions: active.map((s) =>
        this.serializeSession(s, undefined, currentSessionId),
      ),
    };
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, user_id: userId },
    });
    if (!session) {
      throw new NotFoundException({ detail: 'Session not found' });
    }
    if (!session.revoked_at) {
      session.revoked_at = new Date();
      await this.sessionRepository.save(session);
    }
    return { message: 'Session revoked', id: session.id };
  }

  async revokeAllSessions(userId: string) {
    const now = new Date();
    const sessions = await this.sessionRepository.find({
      where: { user_id: userId },
    });
    let revoked = 0;
    for (const session of sessions) {
      if (!session.revoked_at && session.expires_at.getTime() > now.getTime()) {
        session.revoked_at = now;
        revoked += 1;
      }
    }
    if (revoked > 0) {
      await this.sessionRepository.save(sessions);
    }
    return { message: 'All sessions revoked', revoked };
  }

  async verifyAccessToken(token: string) {
    const secret = this.getJwtSecret();

    let payload: jwt.JwtPayload;
    try {
      const decoded = jwt.verify(token, secret);
      if (typeof decoded === 'string') {
        throw new Error('Invalid token');
      }
      payload = decoded as jwt.JwtPayload;
      if (payload.typ !== 'access' || typeof payload.sub !== 'string') {
        throw new Error('Invalid token type');
      }
    } catch {
      throw new UnauthorizedException({
        detail: 'Token is invalid or expired',
        code: 'token_not_valid',
      });
    }

    const sessionId = typeof payload.sid === 'string' ? payload.sid : null;
    if (!sessionId) {
      // Pre-session access tokens cannot be revoked remotely — force re-login.
      throw new UnauthorizedException({
        detail: 'Session expired. Please sign in again.',
        code: 'session_required',
      });
    }

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, user_id: payload.sub },
    });
    if (
      !session ||
      session.revoked_at ||
      session.expires_at.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException({
        detail: 'Session revoked or expired. Please sign in again.',
        code: 'session_revoked',
      });
    }

    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : '',
      sid: session.id,
    };
  }

  async jwtVerify(dto: JwtVerifyDto) {
    await this.verifyAccessToken(dto.token);
    return {};
  }

  /**
   * Shared password-reset issuance for login (forgot) and settings.
   * TEMPORARY_EMAIL_FLOW: when MODE !== local, skip email and return reset_token
   * so the client can open the reset form directly. Revert by always sending
   * email and never returning reset_token (search TEMPORARY_EMAIL_FLOW).
   */
  private async completePasswordResetRequest(user: User) {
    if (this.isPasswordResetStillValid(user)) {
      const remainingMs =
        user.password_reset_expires_at!.getTime() - Date.now();
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

      // TEMPORARY_EMAIL_FLOW — return existing token when email is off
      if (!isEmailFlowEnabled()) {
        return {
          message: 'A recovery session is still valid. Continue to set a new password.',
          sent: false,
          reset_token: user.password_reset_token,
          remaining_time_seconds: remainingSeconds,
        };
      }

      return {
        message:
          'A recovery link was already sent and is still valid. Check your inbox.',
        sent: false,
        remaining_time_seconds: remainingSeconds,
      };
    }

    user.password_reset_token = randomUUID();
    user.password_reset_expires_at = new Date(
      Date.now() + PASSWORD_RESET_TTL_MS,
    );
    await this.userRepository.save(user);

    // TEMPORARY_EMAIL_FLOW — skip email; client uses reset_token (login + settings)
    if (!isEmailFlowEnabled()) {
      return {
        message: 'Password reset ready. Continue to set a new password.',
        sent: false,
        reset_token: user.password_reset_token,
        remaining_time_seconds: Math.floor(PASSWORD_RESET_TTL_MS / 1000),
      };
    }

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

  async requestPasswordReset(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // TEMPORARY_EMAIL_FLOW — keep response vague; no email to send anyway
      if (!isEmailFlowEnabled()) {
        return {
          message:
            'If an account exists with that email, you can reset your password.',
          sent: false,
        };
      }

      return {
        message:
          'If an account exists with that email, a reset link has been sent.',
        sent: true,
      };
    }

    return this.completePasswordResetRequest(user);
  }

  /** Settings: start password reset for the signed-in user (same TEMPORARY_EMAIL_FLOW). */
  async requestPasswordResetForAuthenticatedUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ detail: 'User not found.' });
    }
    return this.completePasswordResetRequest(user);
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

    // TEMPORARY_EMAIL_FLOW — when MODE !== local, skip confirmation email and delete now.
    // Revert: remove this block so deletion always goes through email confirm
    // (search TEMPORARY_EMAIL_FLOW).
    if (!isEmailFlowEnabled()) {
      const email = user.email;
      await this.wipeAllUserData(user.id);
      return {
        message:
          'Your account and all related data have been permanently deleted.',
        email,
        sent: false,
      };
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
