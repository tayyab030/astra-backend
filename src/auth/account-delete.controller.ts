import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfirmAccountDeleteDto } from './dto/confirm-account-delete.dto';

@Controller('auth/account-delete')
export class AccountDeleteController {
  constructor(private readonly authService: AuthService) {}

  @Get([':token/status', ':token/status/'])
  status(@Param('token') token: string) {
    return this.authService.getAccountDeleteStatus(token);
  }

  @Post(['confirm', 'confirm/'])
  confirm(@Body() dto: ConfirmAccountDeleteDto) {
    return this.authService.confirmAccountDeletion(dto);
  }
}
