import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoalMilestone } from './entities/goal-milestone.entity';
import { Goal } from './entities/goal.entity';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

@Module({
  imports: [TypeOrmModule.forFeature([Goal, GoalMilestone])],
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
