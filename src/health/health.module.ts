import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthDailyMetric } from './entities/health-daily-metric.entity';
import { HealthHabit } from './entities/health-habit.entity';
import { HealthMoodEntry } from './entities/health-mood-entry.entity';
import { HealthSettings } from './entities/health-settings.entity';
import { HealthWeightEntry } from './entities/health-weight-entry.entity';
import { HealthWorkout } from './entities/health-workout.entity';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HealthSettings,
      HealthDailyMetric,
      HealthWeightEntry,
      HealthHabit,
      HealthWorkout,
      HealthMoodEntry,
    ]),
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
