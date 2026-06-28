import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtController } from './jwt.controller';
import { OtpController } from './otp.controller';
import { PasswordController } from './password.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController, JwtController, OtpController, PasswordController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
