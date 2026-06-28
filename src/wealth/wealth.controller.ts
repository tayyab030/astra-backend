import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { CreateSavingDto } from './dto/create-saving.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateSavingDto } from './dto/update-saving.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { WealthFilterDto } from './dto/wealth-filter.dto';
import { WithdrawSavingDto } from './dto/withdraw-saving.dto';
import { WealthService } from './wealth.service';

@Controller('wealth')
export class WealthController {
  constructor(private readonly wealthService: WealthService) {}

  @Get(['', '/'])
  getDashboard(
    @Req() req: AuthenticatedRequest,
    @Query() filter: WealthFilterDto,
  ) {
    return this.wealthService.getDashboard(req.user!.sub, filter);
  }

  @Post(['transactions', 'transactions/'])
  createTransaction(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.wealthService.createTransaction(req.user!.sub, dto);
  }

  @Patch(['transactions/:id', 'transactions/:id/'])
  updateTransaction(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.wealthService.updateTransaction(req.user!.sub, id, dto);
  }

  @Delete(['transactions/:id', 'transactions/:id/'])
  deleteTransaction(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.wealthService.deleteTransaction(req.user!.sub, id);
  }

  @Post(['savings', 'savings/'])
  createSaving(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSavingDto,
  ) {
    return this.wealthService.createSaving(req.user!.sub, dto);
  }

  @Post(['savings/withdraw', 'savings/withdraw/'])
  withdrawSaving(
    @Req() req: AuthenticatedRequest,
    @Body() dto: WithdrawSavingDto,
  ) {
    return this.wealthService.withdrawSaving(req.user!.sub, dto);
  }

  @Patch(['savings/:id', 'savings/:id/'])
  updateSaving(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSavingDto,
  ) {
    return this.wealthService.updateSaving(req.user!.sub, id, dto);
  }

  @Delete(['savings/:id', 'savings/:id/'])
  deleteSaving(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.wealthService.deleteSaving(req.user!.sub, id);
  }
}
