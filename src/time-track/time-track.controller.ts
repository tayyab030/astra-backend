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
  AddTrackedTaskDto,
  CreateTimeEntryDto,
  RemoveTrackedTaskQueryDto,
  TimeTrackFilterDto,
  UpdateTimeTrackSettingsDto,
} from './dto/time-track.dto';
import { TimeTrackService } from './time-track.service';

@Controller('time-track')
export class TimeTrackController {
  constructor(private readonly timeTrackService: TimeTrackService) {}

  @Get(['', '/'])
  getDashboard(
    @Req() req: AuthenticatedRequest,
    @Query() filter: TimeTrackFilterDto,
  ) {
    return this.timeTrackService.getDashboard(req.user!.sub, filter);
  }

  @Post(['entries', 'entries/'])
  createEntry(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateTimeEntryDto,
  ) {
    return this.timeTrackService.createEntry(req.user!.sub, dto);
  }

  @Delete(['entries/:id', 'entries/:id/'])
  deleteEntry(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.timeTrackService.deleteEntry(req.user!.sub, id);
  }

  @Post(['tracked-tasks', 'tracked-tasks/'])
  addTrackedTask(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddTrackedTaskDto,
  ) {
    return this.timeTrackService.addTrackedTask(req.user!.sub, dto);
  }

  @Delete(['tracked-tasks/:taskId', 'tracked-tasks/:taskId/'])
  removeTrackedTask(
    @Req() req: AuthenticatedRequest,
    @Param('taskId') taskId: string,
    @Query() query: RemoveTrackedTaskQueryDto,
  ) {
    return this.timeTrackService.removeTrackedTask(
      req.user!.sub,
      taskId,
      query.track_date,
    );
  }

  @Patch(['settings', 'settings/'])
  updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateTimeTrackSettingsDto,
  ) {
    return this.timeTrackService.updateSettings(req.user!.sub, dto);
  }
}
