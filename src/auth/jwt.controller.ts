import { Body, Controller, Headers, Ip, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtCreateDto } from './dto/jwt-create.dto';
import { JwtRefreshDto } from './dto/jwt-refresh.dto';
import { JwtVerifyDto } from './dto/jwt-verify.dto';

@Controller('auth/jwt')
export class JwtController {
  constructor(private readonly authService: AuthService) {}

  @Post(['create', 'create/'])
  create(
    @Body() dto: JwtCreateDto,
    @Req() req: Request,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.jwtCreate(dto, {
      ipAddress: ip || null,
      userAgent: dto.user_agent || userAgent || null,
    });
  }

  @Post(['refresh', 'refresh/'])
  refresh(
    @Body() dto: JwtRefreshDto,
    @Req() req: Request,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.jwtRefresh(dto, {
      ipAddress: ip || null,
      userAgent: dto.user_agent || userAgent || null,
    });
  }

  @Post(['verify', 'verify/'])
  verify(@Body() dto: JwtVerifyDto) {
    return this.authService.jwtVerify(dto);
  }
}
