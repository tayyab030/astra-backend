import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { PrayerDayLog } from './entities/prayer-day-log.entity';
import { PrayerController } from './prayer.controller';
import { PrayerService } from './prayer.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, PrayerDayLog])],
  controllers: [PrayerController],
  providers: [PrayerService],
  exports: [PrayerService],
})
export class PrayerModule {}
