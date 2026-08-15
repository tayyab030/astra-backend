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
import {
  AdjustMetricDto,
  CreateHabitDto,
  CreateWorkoutDto,
  HealthFilterDto,
  LogWeightDto,
  SaveMoodDto,
  ToggleSleepDto,
  CreateSleepSessionDto,
  UpdateSleepSessionDto,
  UpdateHabitDto,
  UpdateHealthProfileDto,
  UpdateHealthTargetsDto,
  UpdateTodayMetricsDto,
} from './dto/health.dto';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get(['', '/'])
  getDashboard(
    @Req() req: AuthenticatedRequest,
    @Query() filter: HealthFilterDto,
  ) {
    return this.healthService.getDashboard(req.user!.sub, filter);
  }

  @Patch(['profile', 'profile/'])
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateHealthProfileDto,
  ) {
    return this.healthService.updateProfile(req.user!.sub, dto);
  }

  @Patch(['targets', 'targets/'])
  updateTargets(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateHealthTargetsDto,
  ) {
    return this.healthService.updateTargets(req.user!.sub, dto);
  }

  @Patch(['today', 'today/'])
  updateTodayMetrics(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateTodayMetricsDto,
  ) {
    return this.healthService.updateTodayMetrics(req.user!.sub, dto);
  }

  @Post(['metrics/adjust', 'metrics/adjust/'])
  adjustMetric(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AdjustMetricDto,
  ) {
    return this.healthService.adjustMetric(req.user!.sub, dto);
  }

  @Post(['weight', 'weight/'])
  logWeight(@Req() req: AuthenticatedRequest, @Body() dto: LogWeightDto) {
    return this.healthService.logWeight(req.user!.sub, dto);
  }

  @Patch(['habits/:id/toggle', 'habits/:id/toggle/'])
  toggleHabit(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.healthService.toggleHabit(req.user!.sub, id);
  }

  @Post(['habits', 'habits/'])
  createHabit(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateHabitDto,
  ) {
    return this.healthService.createHabit(req.user!.sub, dto);
  }

  @Patch(['habits/:id', 'habits/:id/'])
  updateHabit(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateHabitDto,
  ) {
    return this.healthService.updateHabit(req.user!.sub, id, dto);
  }

  @Delete(['habits/:id', 'habits/:id/'])
  deleteHabit(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.healthService.deleteHabit(req.user!.sub, id);
  }

  @Post(['sleep-sessions/toggle', 'sleep-sessions/toggle/'])
  toggleSleep(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ToggleSleepDto,
  ) {
    return this.healthService.toggleSleep(req.user!.sub, dto);
  }

  @Post(['sleep-sessions', 'sleep-sessions/'])
  createSleepSession(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSleepSessionDto,
  ) {
    return this.healthService.createSleepSession(req.user!.sub, dto);
  }

  @Patch(['sleep-sessions/:id', 'sleep-sessions/:id/'])
  updateSleepSession(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSleepSessionDto,
  ) {
    return this.healthService.updateSleepSession(req.user!.sub, id, dto);
  }

  @Delete(['sleep-sessions/:id', 'sleep-sessions/:id/'])
  deleteSleepSession(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.healthService.deleteSleepSession(req.user!.sub, id);
  }

  @Post(['workouts', 'workouts/'])
  createWorkout(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateWorkoutDto,
  ) {
    return this.healthService.createWorkout(req.user!.sub, dto);
  }

  @Post(['mood', 'mood/'])
  saveMood(@Req() req: AuthenticatedRequest, @Body() dto: SaveMoodDto) {
    return this.healthService.saveMood(req.user!.sub, dto);
  }
}
