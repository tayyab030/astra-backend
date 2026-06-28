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
import { CreateCategoryBudgetDto } from './dto/create-category-budget.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateCategoryBudgetDto } from './dto/update-category-budget.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { WealthFilterDto } from './dto/wealth-filter.dto';
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

  @Post(['budgets', 'budgets/'])
  createCategoryBudget(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCategoryBudgetDto,
  ) {
    return this.wealthService.createCategoryBudget(req.user!.sub, dto);
  }

  @Patch(['budgets/:id', 'budgets/:id/'])
  updateCategoryBudget(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryBudgetDto,
  ) {
    return this.wealthService.updateCategoryBudget(req.user!.sub, id, dto);
  }

  @Delete(['budgets/:id', 'budgets/:id/'])
  deleteCategoryBudget(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.wealthService.deleteCategoryBudget(req.user!.sub, id);
  }
}
