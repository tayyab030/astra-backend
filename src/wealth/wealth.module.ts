import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WealthCategoryBudget } from './entities/wealth-category-budget.entity';
import { WealthTransaction } from './entities/wealth-transaction.entity';
import { WealthController } from './wealth.controller';
import { WealthService } from './wealth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WealthTransaction, WealthCategoryBudget]),
  ],
  controllers: [WealthController],
  providers: [WealthService],
})
export class WealthModule {}
