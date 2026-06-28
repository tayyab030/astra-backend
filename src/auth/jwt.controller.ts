import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtCreateDto } from './dto/jwt-create.dto';
import { JwtRefreshDto } from './dto/jwt-refresh.dto';
import { JwtVerifyDto } from './dto/jwt-verify.dto';

@Controller('auth/jwt')
export class JwtController {
  constructor(private readonly authService: AuthService) {}

  @Post(['create', 'create/'])
  create(@Body() dto: JwtCreateDto) {
    return this.authService.jwtCreate(dto);
  }

  @Post(['refresh', 'refresh/'])
  refresh(@Body() dto: JwtRefreshDto) {
    return this.authService.jwtRefresh(dto);
  }

  @Post(['verify', 'verify/'])
  verify(@Body() dto: JwtVerifyDto) {
    return this.authService.jwtVerify(dto);
  }
}
