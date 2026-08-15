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
  AdjustHabitDto,
  CreateHabitDto,
  CreateHabitPackDto,
  HabitDayQueryDto,
  ToggleHabitDto,
  UpdateHabitDto,
  UpsertHabitLogDto,
} from './dto/habits.dto';
import { HabitsService } from './habits.service';

@Controller('habits')
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  @Get(['', '/'])
  list(@Req() req: AuthenticatedRequest) {
    return this.habitsService.listSerialized(req.user!.sub);
  }

  @Get(['day', 'day/'])
  getDay(@Req() req: AuthenticatedRequest, @Query() query: HabitDayQueryDto) {
    return this.habitsService.getDayView(req.user!.sub, query.date);
  }

  @Post(['pack', 'pack/'])
  createPack(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateHabitPackDto,
  ) {
    return this.habitsService.createHabitPack(req.user!.sub, dto);
  }

  @Post(['', '/'])
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateHabitDto) {
    return this.habitsService.createHabit(req.user!.sub, dto);
  }

  @Patch([':id/toggle', ':id/toggle/'])
  toggle(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ToggleHabitDto,
  ) {
    return this.habitsService.toggleHabit(req.user!.sub, id, dto ?? {});
  }

  @Post([':id/adjust', ':id/adjust/'])
  adjust(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: AdjustHabitDto,
  ) {
    return this.habitsService.adjustHabit(req.user!.sub, id, dto);
  }

  @Post([':id/log', ':id/log/'])
  upsertLog(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpsertHabitLogDto,
  ) {
    return this.habitsService.upsertHabitLog(req.user!.sub, id, dto);
  }

  @Patch([':id', ':id/'])
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateHabitDto,
  ) {
    return this.habitsService.updateHabit(req.user!.sub, id, dto);
  }

  @Delete([':id', ':id/'])
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.habitsService.deleteHabit(req.user!.sub, id);
  }
}
