import { Body, Controller, Get, Patch, Query, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import {
  PrayerDayQueryDto,
  PrayerLogsQueryDto,
  PrayerTimingsByCityQueryDto,
  PrayerTimingsQueryDto,
  UpdatePrayerDayDto,
  UpdatePrayerPreferencesDto,
} from './dto/prayer.dto';
import { PrayerService } from './prayer.service';

@Controller('prayer')
export class PrayerController {
  constructor(private readonly prayerService: PrayerService) {}

  @Get(['methods', 'methods/'])
  listMethods() {
    return { methods: this.prayerService.listMethods() };
  }

  @Get(['preferences', 'preferences/'])
  getPreferences(@Req() req: AuthenticatedRequest) {
    return this.prayerService.getPreferences(req.user!.sub);
  }

  @Patch(['preferences', 'preferences/'])
  updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdatePrayerPreferencesDto,
  ) {
    return this.prayerService.updatePreferences(req.user!.sub, dto);
  }

  @Get(['day', 'day/'])
  getDay(
    @Req() req: AuthenticatedRequest,
    @Query() query: PrayerDayQueryDto,
  ) {
    return this.prayerService.getDay(req.user!.sub, query.date);
  }

  @Patch(['day', 'day/'])
  updateDay(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdatePrayerDayDto,
  ) {
    return this.prayerService.updateDay(req.user!.sub, dto);
  }

  @Get(['logs', 'logs/'])
  getLogs(
    @Req() req: AuthenticatedRequest,
    @Query() query: PrayerLogsQueryDto,
  ) {
    return this.prayerService.getLogs(req.user!.sub, query);
  }

  @Get(['timings', 'timings/'])
  getTimings(
    @Req() req: AuthenticatedRequest,
    @Query() query: PrayerTimingsQueryDto,
  ) {
    return this.prayerService.getTimingsByCoordinates(req.user!.sub, query);
  }

  @Get(['timings-by-city', 'timings-by-city/'])
  getTimingsByCity(
    @Req() req: AuthenticatedRequest,
    @Query() query: PrayerTimingsByCityQueryDto,
  ) {
    return this.prayerService.getTimingsByCity(req.user!.sub, query);
  }
}
