import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WealthSaving } from './entities/wealth-saving.entity';
import { WealthTransaction } from './entities/wealth-transaction.entity';
import { WealthController } from './wealth.controller';
import { WealthService } from './wealth.service';

@Module({
  imports: [TypeOrmModule.forFeature([WealthTransaction, WealthSaving])],
  controllers: [WealthController],
  providers: [WealthService],
})
export class WealthModule {}
