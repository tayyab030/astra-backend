import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountDeleteController } from './account-delete.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtController } from './jwt.controller';
import { RequireAuthMiddleware } from './middleware/require-auth.middleware';
import { MeController } from './me.controller';
import { OtpController } from './otp.controller';
import { PasswordController } from './password.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [
    AuthController,
    JwtController,
    MeController,
    OtpController,
    PasswordController,
    AccountDeleteController,
  ],
  providers: [AuthService, RequireAuthMiddleware],
  exports: [AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireAuthMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
