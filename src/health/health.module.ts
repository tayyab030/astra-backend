import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitsModule } from '../habits/habits.module';
import { HealthDailyMetric } from './entities/health-daily-metric.entity';
import { HealthMoodEntry } from './entities/health-mood-entry.entity';
import { HealthSettings } from './entities/health-settings.entity';
import { HealthSleepSession } from './entities/health-sleep-session.entity';
import { HealthWeightEntry } from './entities/health-weight-entry.entity';
import { HealthWorkout } from './entities/health-workout.entity';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [
    HabitsModule,
    TypeOrmModule.forFeature([
      HealthSettings,
      HealthDailyMetric,
      HealthWeightEntry,
      HealthWorkout,
      HealthMoodEntry,
      HealthSleepSession,
    ]),
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
