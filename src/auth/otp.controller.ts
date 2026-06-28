import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResendOtpLoginDto } from './dto/resend-otp-login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('otp')
export class OtpController {
  constructor(private readonly authService: AuthService) {}

  @Get([':token/status', ':token/status/'])
  status(@Param('token') token: string) {
    return this.authService.getOtpStatus(token);
  }

  @Post(['verify', 'verify/'])
  verify(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post(['create', 'create/'])
  create(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Post(['resend-login', 'resend-login/'])
  resendFromLogin(@Body() dto: ResendOtpLoginDto) {
    return this.authService.resendOtpFromLogin(dto);
  }
}
