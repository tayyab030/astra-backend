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
import { CreateGoalDto, CreateGoalMilestoneDto } from './dto/create-goal.dto';
import { GoalsFilterDto } from './dto/goals-filter.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { GoalsService } from './goals.service';

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get(['', '/'])
  getDashboard(
    @Req() req: AuthenticatedRequest,
    @Query() filter: GoalsFilterDto,
  ) {
    return this.goalsService.getDashboard(req.user!.sub, filter);
  }

  @Post(['', '/'])
  createGoal(@Req() req: AuthenticatedRequest, @Body() dto: CreateGoalDto) {
    return this.goalsService.createGoal(req.user!.sub, dto);
  }

  @Get([':id', ':id/'])
  getGoal(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.goalsService.getGoal(req.user!.sub, id);
  }

  @Patch([':id', ':id/'])
  updateGoal(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.updateGoal(req.user!.sub, id, dto);
  }

  @Delete([':id', ':id/'])
  deleteGoal(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.goalsService.deleteGoal(req.user!.sub, id);
  }

  @Patch([':goalId/milestones/:milestoneId', ':goalId/milestones/:milestoneId/'])
  updateMilestone(
    @Req() req: AuthenticatedRequest,
    @Param('goalId') goalId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.goalsService.updateMilestone(
      req.user!.sub,
      goalId,
      milestoneId,
      dto,
    );
  }

  @Post([':goalId/milestones', ':goalId/milestones/'])
  createMilestone(
    @Req() req: AuthenticatedRequest,
    @Param('goalId') goalId: string,
    @Body() dto: CreateGoalMilestoneDto,
  ) {
    return this.goalsService.createMilestone(req.user!.sub, goalId, dto);
  }

  @Delete([
    ':goalId/milestones/:milestoneId',
    ':goalId/milestones/:milestoneId/',
  ])
  deleteMilestone(
    @Req() req: AuthenticatedRequest,
    @Param('goalId') goalId: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.goalsService.deleteMilestone(
      req.user!.sub,
      goalId,
      milestoneId,
    );
  }
}
