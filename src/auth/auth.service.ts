import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RegisterDto } from './dto/register.dto';
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

    const user = this.userRepository.create({
      first_name: dto.first_name,
      last_name: dto.last_name,
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
    });
    const saved = await this.userRepository.save(user);

    return {
      message: 'Registration successful',
      user: {
        id: saved.id,
        first_name: saved.first_name,
        last_name: saved.last_name,
        username: saved.username,
        email: saved.email,
        created_at: saved.created_at,
      },
    };
  }
}
