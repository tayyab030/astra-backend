import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { sendVerificationEmail } from './email';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException({
        message: "Passwords don't match",
        error: 'Bad Request',
      });
    }
    if (dto.terms !== true) {
      throw new BadRequestException({
        message: 'You must accept the terms and conditions',
        error: 'Bad Request',
      });
    }

    const existingByUsername = await this.userRepository.findOne({
      where: { username: dto.username },
    });
    if (existingByUsername) {
      throw new ConflictException({
        message: 'Username is already taken',
        error: 'Conflict',
      });
    }

    const existingByEmail = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingByEmail) {
      throw new ConflictException({
        message: 'Email is already registered',
        error: 'Conflict',
      });
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new InternalServerErrorException({
        message: 'JWT_SECRET is not configured',
        error: 'Internal Server Error',
      });
    }

    const user = this.userRepository.create({
      first_name: dto.first_name,
      last_name: dto.last_name,
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
    });
    const saved = await this.userRepository.save(user);

    const token = jwt.sign({ sub: saved.id, email: saved.email }, secret, {
      expiresIn: '15m',
    });
    saved.token = token;
    await this.userRepository.save(saved);

    const apiPublicUrl =
      process.env.API_PUBLIC_URL ??
      process.env.APP_URL ??
      'http://localhost:3000';
    const verifyUrl = `${apiPublicUrl.replace(/\/$/, '')}/api/auth/verify?token=${encodeURIComponent(token)}`;
    await sendVerificationEmail({ to: saved.email, verifyUrl });

    return {
      message: 'Registration successful',
      user: {
        id: saved.id,
        first_name: saved.first_name,
        last_name: saved.last_name,
        username: saved.username,
        email: saved.email,
        is_verified: saved.is_verified,
        verified_at: saved.verified_at,
        created_at: saved.created_at,
      },
    };
  }

  async verifyEmail(token: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new InternalServerErrorException({
        message: 'JWT_SECRET is not configured',
        error: 'Internal Server Error',
      });
    }

    let payload: jwt.JwtPayload;
    try {
      const decoded = jwt.verify(token, secret);
      if (typeof decoded === 'string') {
        throw new Error('Invalid token');
      }
      payload = decoded;
    } catch {
      throw new BadRequestException({
        message: 'Invalid or expired token',
        error: 'Bad Request',
      });
    }

    const userId = payload.sub;
    if (typeof userId !== 'string') {
      throw new BadRequestException({
        message: 'Invalid token payload',
        error: 'Bad Request',
      });
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.token !== token) {
      throw new BadRequestException({
        message: 'Invalid or expired token',
        error: 'Bad Request',
      });
    }

    user.is_verified = true;
    user.verified_at = new Date();
    user.token = null;
    await this.userRepository.save(user);

    return { message: 'Email verified' };
  }

  async login(dto: LoginDto) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new InternalServerErrorException({
        message: 'JWT_SECRET is not configured',
        error: 'Internal Server Error',
      });
    }

    const normalized = dto.identifier.trim();
    const where = normalized.includes('@')
      ? { email: normalized.toLowerCase() }
      : { username: normalized };

    const user = await this.userRepository.findOne({ where });
    if (!user) {
      throw new UnauthorizedException({
        message: 'Invalid email or password',
        error: 'Unauthorized',
      });
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException({
        message: 'Invalid email or password',
        error: 'Unauthorized',
      });
    }

    if (!user.is_verified) {
      throw new ForbiddenException({
        message: 'Please verify your email before signing in.',
        error: 'Forbidden',
      });
    }

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, typ: 'access' },
      secret,
      { expiresIn: '7d' },
    );

    return {
      access_token: accessToken,
      token_type: 'Bearer' as const,
      expires_in: 60 * 60 * 24 * 7,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        email: user.email,
        is_verified: user.is_verified,
        created_at: user.created_at,
      },
    };
  }

  async resendVerification(identifier: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new InternalServerErrorException({
        message: 'JWT_SECRET is not configured',
        error: 'Internal Server Error',
      });
    }

    const normalized = identifier.trim();
    const where = normalized.includes('@')
      ? { email: normalized.toLowerCase() }
      : { username: normalized };

    const user = await this.userRepository.findOne({ where });
    if (!user) {
      throw new BadRequestException({
        message: 'User not found',
        error: 'Bad Request',
      });
    }
    if (user.is_verified) {
      throw new BadRequestException({
        message: 'Email is already verified',
        error: 'Bad Request',
      });
    }
    if (!user.token) {
      throw new BadRequestException({
        message: 'No verification request found',
        error: 'Bad Request',
      });
    }

    try {
      jwt.verify(user.token, secret);
      throw new BadRequestException({
        message:
          'A verification email has already been sent. Please check your inbox (and spam folder).',
        error: 'Bad Request',
      });
    } catch (err: unknown) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      const isExpired = err instanceof jwt.TokenExpiredError;
      if (!isExpired) {
        throw new BadRequestException({
          message:
            'Invalid verification token. Please contact support or try signing up again.',
          error: 'Bad Request',
        });
      }
    }

    const newToken = jwt.sign({ sub: user.id, email: user.email }, secret, {
      expiresIn: '15m',
    });
    user.token = newToken;
    await this.userRepository.save(user);

    const apiPublicUrl =
      process.env.API_PUBLIC_URL ??
      process.env.APP_URL ??
      'http://localhost:3000';
    const verifyUrl = `${apiPublicUrl.replace(/\/$/, '')}/api/auth/verify?token=${encodeURIComponent(newToken)}`;
    await sendVerificationEmail({ to: user.email, verifyUrl });

    return { message: 'Verification email resent' };
  }
}
