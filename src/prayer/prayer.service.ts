import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { PrayerDayLog } from './entities/prayer-day-log.entity';
import {
  ALADHAN_BASE_URL,
  DEFAULT_ADHAN_KEYS,
  PRAYER_CALCULATION_METHODS,
  PRAYER_METHOD_IDS,
  PRAYER_TIMING_DEFS,
  TRACKABLE_PRAYER_KEYS,
  type PrayerCalculationMethod,
  type TrackablePrayerKey,
} from './prayer.constants';
import type {
  PrayerLogsQueryDto,
  PrayerTimingsByCityQueryDto,
  PrayerTimingsQueryDto,
  UpdatePrayerDayDto,
  UpdatePrayerPreferencesDto,
} from './dto/prayer.dto';

type AladhanTimingsPayload = {
  timings?: Record<string, string>;
  date?: {
    readable?: string;
    gregorian?: { date?: string; weekday?: { en?: string } };
    hijri?: { date?: string; weekday?: { en?: string }; month?: { en?: string } };
  };
  meta?: {
    timezone?: string;
    method?: { id?: number; name?: string };
    latitude?: number;
    longitude?: number;
  };
};

export type PrayerPreferences = {
  method: number | null;
  method_name: string | null;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  adhan_enabled: boolean;
  adhan_keys: string[];
};

export type PrayerTimingsResult = {
  date: {
    readable: string;
    gregorian: string | null;
    hijri: string | null;
    weekday: string | null;
  };
  location: {
    latitude: number | null;
    longitude: number | null;
    label: string | null;
    city?: string | null;
    country?: string | null;
  };
  method: {
    id: number;
    name: string;
  };
  timezone: string | null;
  timings: Record<string, string>;
  prayers: Array<{ key: string; name: string; time: string }>;
};

export type PrayerDayResult = {
  date: string;
  completed: Record<string, boolean>;
  statuses: Record<string, 'on_time' | 'qaza' | null>;
  trackable: readonly TrackablePrayerKey[];
};

export type PrayerLogsResult = {
  days: Array<{
    date: string;
    completed: Record<string, boolean>;
    statuses: Record<string, 'on_time' | 'qaza' | null>;
  }>;
};

const TIMINGS_CACHE_TTL_MS = 30 * 60 * 1000;

function emptyCompleted(): Record<string, boolean> {
  const completed: Record<string, boolean> = {};
  for (const key of TRACKABLE_PRAYER_KEYS) {
    completed[key] = false;
  }
  return completed;
}

function emptyStatuses(): Record<string, 'on_time' | 'qaza' | null> {
  const statuses: Record<string, 'on_time' | 'qaza' | null> = {};
  for (const key of TRACKABLE_PRAYER_KEYS) {
    statuses[key] = null;
  }
  return statuses;
}

function normalizeCompleted(
  raw: Record<string, boolean> | null | undefined,
): Record<string, boolean> {
  const completed = emptyCompleted();
  if (!raw || typeof raw !== 'object') return completed;
  for (const key of TRACKABLE_PRAYER_KEYS) {
    completed[key] = Boolean(raw[key]);
  }
  return completed;
}

function normalizeStatuses(
  raw: Record<string, string> | null | undefined,
): Record<string, 'on_time' | 'qaza' | null> {
  const statuses = emptyStatuses();
  if (!raw || typeof raw !== 'object') return statuses;
  for (const key of TRACKABLE_PRAYER_KEYS) {
    const value = raw[key];
    statuses[key] = value === 'on_time' || value === 'qaza' ? value : null;
  }
  return statuses;
}

@Injectable()
export class PrayerService {
  private readonly logger = new Logger(PrayerService.name);
  private readonly timingsCache = new Map<
    string,
    { result: PrayerTimingsResult; fetchedAt: number }
  >();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PrayerDayLog)
    private readonly dayLogRepository: Repository<PrayerDayLog>,
  ) {}

  listMethods(): PrayerCalculationMethod[] {
    return PRAYER_CALCULATION_METHODS;
  }

  resolveMethod(methodId: number): PrayerCalculationMethod {
    if (!PRAYER_METHOD_IDS.has(methodId)) {
      throw new BadRequestException({
        detail: `Unknown calculation method: ${methodId}`,
      });
    }
    return (
      PRAYER_CALCULATION_METHODS.find((item) => item.id === methodId) ?? {
        id: methodId,
        name: `Method ${methodId}`,
      }
    );
  }

  async getPreferences(userId: string): Promise<PrayerPreferences> {
    const user = await this.requireUser(userId);
    return this.serializePreferences(user);
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePrayerPreferencesDto,
  ): Promise<PrayerPreferences> {
    const user = await this.requireUser(userId);

    if (dto.method !== undefined) {
      if (dto.method === null) {
        user.prayer_calculation_method = null;
      } else {
        this.resolveMethod(dto.method);
        user.prayer_calculation_method = dto.method;
      }
    }

    if (dto.latitude !== undefined) {
      user.prayer_latitude = dto.latitude;
    }
    if (dto.longitude !== undefined) {
      user.prayer_longitude = dto.longitude;
    }
    if (dto.location_label !== undefined) {
      user.prayer_location_label = dto.location_label
        ? dto.location_label.trim().slice(0, 200)
        : null;
    }

    if (dto.adhan_enabled !== undefined) {
      user.prayer_adhan_enabled = dto.adhan_enabled;
    }
    if (dto.adhan_keys !== undefined) {
      user.prayer_adhan_keys = dto.adhan_keys.length
        ? [...dto.adhan_keys]
        : [...DEFAULT_ADHAN_KEYS];
    }

    const saved = await this.userRepository.save(user);
    return this.serializePreferences(saved);
  }

  async getDay(userId: string, date: string): Promise<PrayerDayResult> {
    this.assertIsoDate(date);
    const log = await this.dayLogRepository.findOne({
      where: { user_id: userId, date },
    });
    return {
      date,
      completed: normalizeCompleted(log?.completed),
      statuses: normalizeStatuses(log?.statuses),
      trackable: TRACKABLE_PRAYER_KEYS,
    };
  }

  async updateDay(
    userId: string,
    dto: UpdatePrayerDayDto,
  ): Promise<PrayerDayResult> {
    this.assertIsoDate(dto.date);
    let log = await this.dayLogRepository.findOne({
      where: { user_id: userId, date: dto.date },
    });

    if (!log) {
      log = this.dayLogRepository.create({
        user_id: userId,
        date: dto.date,
        completed: emptyCompleted(),
        statuses: {} as Record<string, 'on_time' | 'qaza'>,
      });
    }

    const completed = normalizeCompleted(log.completed);
    const statuses = normalizeStatuses(log.statuses);
    completed[dto.prayer_key] = dto.completed;
    if (!dto.completed) {
      statuses[dto.prayer_key] = null;
    } else if (dto.status === 'on_time' || dto.status === 'qaza') {
      statuses[dto.prayer_key] = dto.status;
    } else if (!statuses[dto.prayer_key]) {
      statuses[dto.prayer_key] = 'on_time';
    }
    log.completed = completed;
    log.statuses = Object.fromEntries(
      Object.entries(statuses).filter(([, value]) => value != null),
    ) as Record<string, 'on_time' | 'qaza'>;

    const saved = await this.dayLogRepository.save(log);
    return {
      date: saved.date,
      completed: normalizeCompleted(saved.completed),
      statuses: normalizeStatuses(saved.statuses),
      trackable: TRACKABLE_PRAYER_KEYS,
    };
  }

  async getLogs(
    userId: string,
    query: PrayerLogsQueryDto,
  ): Promise<PrayerLogsResult> {
    this.assertIsoDate(query.from);
    this.assertIsoDate(query.to);
    if (query.from > query.to) {
      throw new BadRequestException({
        detail: '`from` must be on or before `to`.',
      });
    }

    const logs = await this.dayLogRepository.find({
      where: {
        user_id: userId,
        date: Between(query.from, query.to),
      },
      order: { date: 'ASC' },
    });

    return {
      days: logs.map((log) => ({
        date: String(log.date).slice(0, 10),
        completed: normalizeCompleted(log.completed),
        statuses: normalizeStatuses(log.statuses),
      })),
    };
  }

  async getTimingsByCoordinates(
    userId: string,
    query: PrayerTimingsQueryDto,
    options?: { persist?: boolean },
  ): Promise<PrayerTimingsResult> {
    const method = this.resolveMethod(query.method);
    const dateSegment = this.normalizeDateSegment(query.date);
    const cacheKey = [
      'coords:v2',
      query.latitude.toFixed(4),
      query.longitude.toFixed(4),
      query.method,
      dateSegment ?? 'today',
    ].join(':');

    const cached = this.timingsCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < TIMINGS_CACHE_TTL_MS) {
      if (options?.persist !== false) {
        await this.rememberLocationAndMethod(userId, {
          method: query.method,
          latitude: query.latitude,
          longitude: query.longitude,
          location_label: query.label?.trim() || null,
        });
      }
      return cached.result;
    }

    const params = new URLSearchParams({
      latitude: String(query.latitude),
      longitude: String(query.longitude),
      method: String(query.method),
    });

    const url = dateSegment
      ? `${ALADHAN_BASE_URL}/timings/${dateSegment}?${params}`
      : `${ALADHAN_BASE_URL}/timings?${params}`;

    const payload = await this.fetchAladhan(url);
    const result = this.normalizeTimings(payload, method, {
      latitude: query.latitude,
      longitude: query.longitude,
      label: query.label?.trim() || null,
    });

    this.timingsCache.set(cacheKey, { result, fetchedAt: Date.now() });

    if (options?.persist !== false) {
      await this.rememberLocationAndMethod(userId, {
        method: query.method,
        latitude: query.latitude,
        longitude: query.longitude,
        location_label: query.label?.trim() || null,
      });
    }

    return result;
  }

  async getTimingsByCity(
    userId: string,
    query: PrayerTimingsByCityQueryDto,
  ): Promise<PrayerTimingsResult> {
    const method = this.resolveMethod(query.method);
    const dateSegment = this.normalizeDateSegment(query.date);
    const params = new URLSearchParams({
      city: query.city,
      country: query.country,
      method: String(query.method),
    });

    const url = dateSegment
      ? `${ALADHAN_BASE_URL}/timingsByCity/${dateSegment}?${params}`
      : `${ALADHAN_BASE_URL}/timingsByCity?${params}`;

    const payload = await this.fetchAladhan(url);
    const result = this.normalizeTimings(payload, method, {
      latitude: payload.meta?.latitude ?? null,
      longitude: payload.meta?.longitude ?? null,
      label: `${query.city}, ${query.country}`,
      city: query.city,
      country: query.country,
    });

    await this.rememberLocationAndMethod(userId, {
      method: query.method,
      latitude: result.location.latitude,
      longitude: result.location.longitude,
      location_label: result.location.label,
    });

    return result;
  }

  /** Used by assistant live context when the user has saved prayer prefs. */
  async getTodayTimingsForUser(userId: string): Promise<{
    prefs: PrayerPreferences;
    timings: PrayerTimingsResult | null;
    todayCompleted: Record<string, boolean> | null;
  }> {
    const prefs = await this.getPreferences(userId);
    const today = this.localTodayIso();
    let todayCompleted: Record<string, boolean> | null = null;
    try {
      const day = await this.getDay(userId, today);
      todayCompleted = day.completed;
    } catch {
      todayCompleted = null;
    }

    if (
      prefs.method == null ||
      prefs.latitude == null ||
      prefs.longitude == null
    ) {
      return { prefs, timings: null, todayCompleted };
    }

    const timings = await this.getTimingsByCoordinates(
      userId,
      {
        latitude: prefs.latitude,
        longitude: prefs.longitude,
        method: prefs.method,
        label: prefs.location_label ?? undefined,
      },
      { persist: false },
    );
    return { prefs, timings, todayCompleted };
  }

  private serializePreferences(user: User): PrayerPreferences {
    const methodId = user.prayer_calculation_method;
    const method =
      methodId != null
        ? PRAYER_CALCULATION_METHODS.find((item) => item.id === methodId)
        : null;

    const keys =
      Array.isArray(user.prayer_adhan_keys) && user.prayer_adhan_keys.length > 0
        ? user.prayer_adhan_keys.filter((key): key is TrackablePrayerKey =>
            (TRACKABLE_PRAYER_KEYS as readonly string[]).includes(key),
          )
        : [...DEFAULT_ADHAN_KEYS];

    return {
      method: methodId,
      method_name: method?.name ?? null,
      latitude: user.prayer_latitude,
      longitude: user.prayer_longitude,
      location_label: user.prayer_location_label,
      adhan_enabled: Boolean(user.prayer_adhan_enabled),
      adhan_keys: keys,
    };
  }

  private async rememberLocationAndMethod(
    userId: string,
    values: {
      method: number;
      latitude: number | null;
      longitude: number | null;
      location_label: string | null;
    },
  ) {
    try {
      const user = await this.requireUser(userId);
      user.prayer_calculation_method = values.method;
      if (values.latitude != null) user.prayer_latitude = values.latitude;
      if (values.longitude != null) user.prayer_longitude = values.longitude;
      if (values.location_label != null) {
        user.prayer_location_label = values.location_label.slice(0, 200);
      }
      await this.userRepository.save(user);
    } catch (error) {
      this.logger.warn(
        `Failed to persist prayer prefs for ${userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private normalizeDateSegment(date?: string): string | null {
    if (!date) return null;
    const trimmed = date.trim();
    // Aladhan accepts DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;
    // Accept YYYY-MM-DD from clients
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
    throw new BadRequestException({
      detail: 'date must be YYYY-MM-DD or DD-MM-YYYY',
    });
  }

  private assertIsoDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException({
        detail: 'date must be YYYY-MM-DD',
      });
    }
  }

  private localTodayIso() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private async fetchAladhan(url: string): Promise<AladhanTimingsPayload> {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      this.logger.warn(
        `Aladhan fetch failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      throw new ServiceUnavailableException({
        detail: 'Prayer times service is temporarily unavailable.',
      });
    }

    if (!response.ok) {
      this.logger.warn(`Aladhan HTTP ${response.status} for ${url}`);
      throw new ServiceUnavailableException({
        detail: 'Could not load prayer times from Aladhan.',
      });
    }

    const body = (await response.json()) as {
      code?: number;
      data?: AladhanTimingsPayload;
      status?: string;
    };

    if (!body?.data?.timings) {
      throw new ServiceUnavailableException({
        detail: 'Unexpected prayer times response.',
      });
    }

    return body.data;
  }

  private normalizeTimings(
    payload: AladhanTimingsPayload,
    method: PrayerCalculationMethod,
    location: {
      latitude: number | null;
      longitude: number | null;
      label: string | null;
      city?: string | null;
      country?: string | null;
    },
  ): PrayerTimingsResult {
    const timingsRaw = payload.timings ?? {};
    const timings: Record<string, string> = {};
    for (const [key, value] of Object.entries(timingsRaw)) {
      timings[key] = this.stripTimezoneSuffix(value);
    }

    const findTime = (key: string): string | undefined => {
      if (timings[key]) return timings[key];
      const lower = key.toLowerCase();
      const hit = Object.entries(timings).find(
        ([k]) => k.toLowerCase() === lower,
      );
      return hit?.[1];
    };

    const prayers: Array<{ key: string; name: string; time: string }> = [];

    for (const def of PRAYER_TIMING_DEFS) {
      const time = findTime(def.key);
      if (!time) continue;
      prayers.push({ key: def.key, name: def.name, time });
    }

    // Include any extra Aladhan keys we did not map explicitly.
    for (const [rawKey, time] of Object.entries(timings)) {
      const known = PRAYER_TIMING_DEFS.some(
        (def) => def.key.toLowerCase() === rawKey.toLowerCase(),
      );
      if (known) continue;
      prayers.push({ key: rawKey, name: rawKey, time });
    }

    prayers.sort((a, b) => {
      const toMins = (time: string) => {
        const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
        if (!match) return 0;
        return Number(match[1]) * 60 + Number(match[2]);
      };
      return toMins(a.time) - toMins(b.time);
    });

    // Drop Sunset when it matches Maghrib (common Aladhan duplicate).
    const deduped = prayers.filter((item) => {
      if (item.key !== 'Sunset') return true;
      return !prayers.some(
        (other) => other.key === 'Maghrib' && other.time === item.time,
      );
    });

    return {
      date: {
        readable: payload.date?.readable ?? '',
        gregorian: payload.date?.gregorian?.date ?? null,
        hijri: payload.date?.hijri?.date ?? null,
        weekday:
          payload.date?.gregorian?.weekday?.en ??
          payload.date?.hijri?.weekday?.en ??
          null,
      },
      location: {
        latitude: location.latitude ?? payload.meta?.latitude ?? null,
        longitude: location.longitude ?? payload.meta?.longitude ?? null,
        label: location.label,
        city: location.city ?? null,
        country: location.country ?? null,
      },
      method: {
        id: method.id,
        name: payload.meta?.method?.name || method.name,
      },
      timezone: payload.meta?.timezone ?? null,
      timings,
      prayers: deduped,
    };
  }

  private stripTimezoneSuffix(value: string) {
    return value.replace(/\s*\(.*\)$/, '').trim();
  }

  private async requireUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ detail: 'User not found.' });
    }
    return user;
  }
}
