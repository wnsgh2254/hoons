import { test, expect, request as playwrightRequest } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { isExpiredPendingBooking } from '../../lib/pending-bookings';
import {
  dbTimeStringToMinutes,
  isStartSlotUnavailable,
  type DesignerAvailabilityIntervals,
} from '../../lib/booking-time-math';
import { salonCalendarWeekdayIndex } from '../../lib/salon-calendar';

const APRIL_2026_DATES = Array.from({ length: 30 }, (_, index) => `2026-04-${String(index + 1).padStart(2, '0')}`);
const VENUE_TIME_OFF_REASONS = ['임의 휴일', '특별 근무일'];
const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

type DesignerRow = {
  id: number;
  name: string;
  english_name: string | null;
  shop_id: number | null;
  is_active: boolean;
};

type ShopRow = {
  id: number;
  name: string;
};

type DesignerShopRow = {
  designer_id: number;
  shop_id: number;
  is_active: boolean;
};

type DefaultShopRow = {
  designer_id: number;
  weekday: number;
  shop_id: number;
};

type ScheduleRow = {
  designer_id: number;
  weekday: number;
  shop_id: number | null;
  start_time: string | null;
  end_time: string | null;
  effective_from: string | null;
  effective_to: string | null;
};

type TimeOffRow = {
  id: number;
  designer_id: number;
  shop_id: number | null;
  reason: string;
  created_at: string | null;
  start_date: string;
  end_date: string;
};

type RestrictionRow = {
  designer_id: number;
  restriction_type: string;
  restriction_date: string;
  start_time: string | null;
  end_time: string | null;
};

type BookingRow = {
  id: number;
  designer_id: number | null;
  shop_id: number | null;
  booking_date: string;
  booking_time: string | null;
  status: string | null;
  created_at: string | null;
  service_id: number | null;
  custom_service_duration: number | null;
};

type ServiceRow = {
  id: number;
  duration_minutes: number | null;
};

type BusinessHourRow = {
  shop_id: number | null;
  start_time: string;
  end_time: string;
  days: string[] | null;
};

type Snapshot = {
  designers: DesignerRow[];
  shops: ShopRow[];
  designerShops: DesignerShopRow[];
  defaultShops: DefaultShopRow[];
  schedules: ScheduleRow[];
  timeOff: TimeOffRow[];
  restrictions: RestrictionRow[];
  bookings: BookingRow[];
  services: ServiceRow[];
  businessHours: BusinessHourRow[];
};

function parseEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function createDirectSupabaseClient(): SupabaseClient {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const envVars = parseEnvFile(envPath);
  const url = process.env.SUPABASE_URL || envVars.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || envVars.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY are missing for April 2026 availability tests.');
  }

  return createClient(url, anonKey, { auth: { persistSession: false } });
}

function toSortedIds(values: Array<number | string | null | undefined>): number[] {
  return values
    .map((value) => Number(value))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function isDateWithinRange(date: string, start: string | null, end: string | null): boolean {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function mergeIntervals(intervals: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  let current = { ...sorted[0]! };

  for (let index = 1; index < sorted.length; index += 1) {
    const next = sorted[index]!;
    if (next.start <= current.end) {
      current.end = Math.max(current.end, next.end);
      continue;
    }
    merged.push(current);
    current = { ...next };
  }

  merged.push(current);
  return merged;
}

function pickLatestTimeOffRow(rows: TimeOffRow[]): TimeOffRow | null {
  if (rows.length === 0) return null;
  return rows.reduce((best, current) => {
    const bestTs = best.created_at ? new Date(best.created_at).getTime() : 0;
    const currentTs = current.created_at ? new Date(current.created_at).getTime() : 0;
    if (currentTs !== bestTs) return currentTs > bestTs ? current : best;
    return current.id > best.id ? current : best;
  });
}

function computeExpectedDesignerIdsForShop(snapshot: Snapshot, date: string, shopId: number): number[] {
  const weekday = salonCalendarWeekdayIndex(date);

  const activeDesigners = snapshot.designers.filter((designer) => designer.is_active);
  const activeDesignerIds = new Set(activeDesigners.map((designer) => Number(designer.id)));
  const homeShopByDesigner = new Map(
    activeDesigners.map((designer) => [Number(designer.id), designer.shop_id != null ? Number(designer.shop_id) : null]),
  );
  const defaultShopByDesigner = new Map<number, number>();

  for (const row of snapshot.defaultShops) {
    if (Number(row.weekday) !== weekday) continue;
    defaultShopByDesigner.set(Number(row.designer_id), Number(row.shop_id));
  }

  const baseDesignerIds = uniqueSorted(
    snapshot.schedules
      .filter((row) => Number(row.weekday) === weekday)
      .filter((row) => isDateWithinRange(date, row.effective_from, row.effective_to))
      .map((row) => {
        const designerId = Number(row.designer_id);
        if (!activeDesignerIds.has(designerId)) return null;
        const resolvedShopId =
          defaultShopByDesigner.get(designerId) ??
          (row.shop_id != null ? Number(row.shop_id) : null) ??
          homeShopByDesigner.get(designerId) ??
          null;
        if (resolvedShopId !== Number(shopId)) return null;
        return designerId;
      })
      .filter((value): value is number => value != null),
  );

  const applicableRows = snapshot.timeOff.filter((row) => {
    if (!VENUE_TIME_OFF_REASONS.includes(row.reason)) return false;
    if (date < row.start_date || date > row.end_date) return false;
    if (row.shop_id == null) return true;
    return Number(row.shop_id) === Number(shopId);
  });

  const rowsByDesigner = new Map<number, TimeOffRow[]>();
  for (const row of applicableRows) {
    const designerId = Number(row.designer_id);
    const list = rowsByDesigner.get(designerId) ?? [];
    list.push(row);
    rowsByDesigner.set(designerId, list);
  }

  const specialWorkIds = new Set<number>();
  const arbitraryHolidayIds = new Set<number>();

  for (const [designerId, rows] of rowsByDesigner) {
    const winner = pickLatestTimeOffRow(rows);
    if (!winner) continue;
    if (winner.reason === '특별 근무일') specialWorkIds.add(designerId);
    if (winner.reason === '임의 휴일') arbitraryHolidayIds.add(designerId);
  }

  return uniqueSorted(
    [...baseDesignerIds, ...specialWorkIds].filter(
      (designerId) => activeDesignerIds.has(designerId) && !arbitraryHolidayIds.has(designerId),
    ),
  );
}

function computeWorkingIntervals(snapshot: Snapshot, date: string, designerId: number, shopId: number) {
  const weekday = salonCalendarWeekdayIndex(date);
  const designer = snapshot.designers.find((row) => Number(row.id) === Number(designerId) && row.is_active);
  if (!designer) return [];

  const defaultShop = snapshot.defaultShops.find(
    (row) => Number(row.designer_id) === Number(designerId) && Number(row.weekday) === weekday,
  );

  const designerIntervals = mergeIntervals(
    snapshot.schedules
      .filter((row) => Number(row.designer_id) === Number(designerId))
      .filter((row) => Number(row.weekday) === weekday)
      .filter((row) => isDateWithinRange(date, row.effective_from, row.effective_to))
      .map((row) => {
        const resolvedShopId =
          defaultShop?.shop_id != null
            ? Number(defaultShop.shop_id)
            : row.shop_id != null
              ? Number(row.shop_id)
              : designer.shop_id != null
                ? Number(designer.shop_id)
                : null;

        if (resolvedShopId !== Number(shopId)) return null;
        if (!row.start_time || !row.end_time) return null;

        const start = dbTimeStringToMinutes(row.start_time);
        const end = dbTimeStringToMinutes(row.end_time);
        if (end <= start) return null;
        return { start, end };
      })
      .filter((value): value is { start: number; end: number } => value != null),
  );

  if (designerIntervals.length > 0) return designerIntervals;

  const weekdayLabel = DAYS_KO[salonCalendarWeekdayIndex(date)];
  return mergeIntervals(
    snapshot.businessHours
      .filter((row) => Number(row.shop_id) === Number(shopId))
      .filter((row) => Array.isArray(row.days) && row.days.includes(weekdayLabel))
      .map((row) => {
        const start = dbTimeStringToMinutes(row.start_time);
        const end = dbTimeStringToMinutes(row.end_time);
        if (end <= start) return null;
        return { start, end };
      })
      .filter((value): value is { start: number; end: number } => value != null),
  );
}

function computeExpectedAvailability(snapshot: Snapshot, date: string, designerId: number, shopId: number): DesignerAvailabilityIntervals {
  const fullDayBlocked = snapshot.restrictions.some(
    (row) =>
      Number(row.designer_id) === Number(designerId) &&
      row.restriction_date === date &&
      row.restriction_type === 'date',
  );

  const restrictionIntervals = fullDayBlocked
    ? []
    : snapshot.restrictions
        .filter(
          (row) =>
            Number(row.designer_id) === Number(designerId) &&
            row.restriction_date === date &&
            row.restriction_type === 'time' &&
            !!row.start_time &&
            !!row.end_time,
        )
        .map((row) => ({
          start: dbTimeStringToMinutes(row.start_time),
          end: dbTimeStringToMinutes(row.end_time),
        }))
        .filter((interval) => interval.end > interval.start);

  const serviceDurationById = new Map(snapshot.services.map((row) => [Number(row.id), row.duration_minutes ?? null]));
  const bookingIntervals = snapshot.bookings
    .filter((row) => Number(row.designer_id) === Number(designerId))
    .filter((row) => Number(row.shop_id) === Number(shopId))
    .filter((row) => row.booking_date === date)
    .filter((row) => !!row.booking_time)
    .filter((row) => {
      const status = String(row.status || '').trim().toLowerCase();
      return status !== 'cancelled' && status !== 'canceled';
    })
    .filter((row) => !isExpiredPendingBooking(row.status, row.created_at))
    .map((row) => {
      const start = dbTimeStringToMinutes(row.booking_time);
      const explicitDuration = row.custom_service_duration != null ? Number(row.custom_service_duration) : null;
      const serviceDuration = row.service_id != null ? serviceDurationById.get(Number(row.service_id)) ?? null : null;
      const duration =
        explicitDuration != null && Number.isFinite(explicitDuration) && explicitDuration > 0
          ? Math.round(explicitDuration)
          : serviceDuration != null && Number.isFinite(Number(serviceDuration)) && Number(serviceDuration) > 0
            ? Math.round(Number(serviceDuration))
            : 60;
      return { start, end: start + duration };
    });

  const workingIntervals = computeWorkingIntervals(snapshot, date, designerId, shopId);

  return {
    fullDayBlocked,
    restrictionIntervals,
    bookingIntervals,
    workingIntervals,
  };
}

function normalizeIntervals(intervals: Array<{ start: number; end: number }> | null | undefined) {
  return (intervals || [])
    .map((interval) => ({ start: Number(interval.start), end: Number(interval.end) }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

function minutesToTimeLabel(totalMinutes: number): string {
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const isPm = hour24 >= 12;
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  return `${hour12}:${String(minute).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`;
}

function computeShopTimeLabels(snapshot: Snapshot, date: string, shopId: number): string[] {
  const weekdayLabel = DAYS_KO[salonCalendarWeekdayIndex(date)];
  const labels = new Set<string>();

  for (const row of snapshot.businessHours) {
    if (Number(row.shop_id) !== Number(shopId)) continue;
    if (!Array.isArray(row.days) || !row.days.includes(weekdayLabel)) continue;
    const start = dbTimeStringToMinutes(row.start_time);
    const end = dbTimeStringToMinutes(row.end_time);
    for (let minute = start; minute < end; minute += 30) {
      labels.add(minutesToTimeLabel(minute));
    }
  }

  return [...labels].sort((a, b) => {
    const am = dbTimeStringToMinutes(
      (() => {
        const match = a.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
        if (!match) return '00:00';
        let hour = Number(match[1]);
        if (match[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
        if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
        return `${String(hour).padStart(2, '0')}:${match[2]}`;
      })(),
    );
    const bm = dbTimeStringToMinutes(
      (() => {
        const match = b.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
        if (!match) return '00:00';
        let hour = Number(match[1]);
        if (match[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
        if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
        return `${String(hour).padStart(2, '0')}:${match[2]}`;
      })(),
    );
    return am - bm;
  });
}

async function loadSnapshot(supabase: SupabaseClient): Promise<Snapshot> {
  const [designers, shops, designerShops, defaultShops, schedules, timeOff, restrictions, bookings, services, businessHours] =
    await Promise.all([
      supabase.from('designers').select('id, name, english_name, shop_id, is_active'),
      supabase.from('shops').select('id, name').order('id'),
      supabase.from('designer_shops').select('designer_id, shop_id, is_active').eq('is_active', true),
      supabase.from('designer_weekday_default_shop').select('designer_id, weekday, shop_id'),
      supabase
        .from('designer_schedules')
        .select('designer_id, weekday, shop_id, start_time, end_time, effective_from, effective_to')
        .gte('effective_from', '2025-01-01'),
      supabase
        .from('designer_time_off')
        .select('id, designer_id, shop_id, reason, created_at, start_date, end_date')
        .lte('start_date', '2026-04-30')
        .gte('end_date', '2026-04-01'),
      supabase
        .from('booking_restrictions')
        .select('designer_id, restriction_type, restriction_date, start_time, end_time')
        .gte('restriction_date', '2026-04-01')
        .lte('restriction_date', '2026-04-30'),
      supabase
        .from('bookings')
        .select('id, designer_id, shop_id, booking_date, booking_time, status, created_at, service_id, custom_service_duration')
        .gte('booking_date', '2026-04-01')
        .lte('booking_date', '2026-04-30'),
      supabase.from('services').select('id, duration_minutes'),
      supabase.from('business_hours').select('shop_id, start_time, end_time, days'),
    ]);

  const results = [designers, shops, designerShops, defaultShops, schedules, timeOff, restrictions, bookings, services, businessHours];
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw failed.error;
  }

  return {
    designers: (designers.data || []) as DesignerRow[],
    shops: (shops.data || []) as ShopRow[],
    designerShops: (designerShops.data || []) as DesignerShopRow[],
    defaultShops: (defaultShops.data || []) as DefaultShopRow[],
    schedules: (schedules.data || []) as ScheduleRow[],
    timeOff: (timeOff.data || []) as TimeOffRow[],
    restrictions: (restrictions.data || []) as RestrictionRow[],
    bookings: (bookings.data || []) as BookingRow[],
    services: (services.data || []) as ServiceRow[],
    businessHours: (businessHours.data || []) as BusinessHourRow[],
  };
}

test.describe('2026-04 venue placement and booking availability', () => {
  test.describe.configure({ timeout: 15 * 60 * 1000 });

  let supabase: SupabaseClient;
  let snapshot: Snapshot;

  test.beforeAll(async () => {
    supabase = createDirectSupabaseClient();
    snapshot = await loadSnapshot(supabase);
  });

  test('appointments page venue allocation matches schedule + arbitrary holiday/special work for every April 2026 day', async () => {
    const api = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' });
    const failures: string[] = [];

    try {
      for (const date of APRIL_2026_DATES) {
        const response = await api.get(`/api/appointments/initial-data?date=${date}&month=2026-04`);
        expect(response.ok(), `appointments initial-data failed for ${date}`).toBeTruthy();
        const json = await response.json();

        for (const shop of snapshot.shops) {
          const expected = computeExpectedDesignerIdsForShop(snapshot, date, shop.id);
          const actual = toSortedIds(json.availableDesignerIdsByShop?.[shop.id] || []);
          if (JSON.stringify(expected) !== JSON.stringify(actual)) {
            failures.push(
              `[appointments] ${date} ${shop.name}: expected [${expected.join(', ')}], got [${actual.join(', ')}]`,
            );
          }
        }
      }
    } finally {
      await api.dispose();
    }

    expect(failures).toEqual([]);
  });

  test('booking page venue allocation matches schedule + arbitrary holiday/special work for every April 2026 day', async () => {
    const api = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' });
    const failures: string[] = [];

    try {
      for (const date of APRIL_2026_DATES) {
        for (const shop of snapshot.shops) {
          const expected = computeExpectedDesignerIdsForShop(snapshot, date, shop.id);
          const response = await api.get(`/api/available-designers?date=${date}&shopId=${shop.id}`);
          expect(response.ok(), `available-designers failed for ${date} shop ${shop.id}`).toBeTruthy();
          const json = await response.json();
          const actual = toSortedIds(json.designerIds || json.designers?.map((designer: { id: number }) => designer.id) || []);

          if (JSON.stringify(expected) !== JSON.stringify(actual)) {
            failures.push(
              `[booking] ${date} ${shop.name}: expected [${expected.join(', ')}], got [${actual.join(', ')}]`,
            );
          }
        }
      }
    } finally {
      await api.dispose();
    }

    expect(failures).toEqual([]);
  });

  test('booking page blocks booked/restricted/out-of-duration slots for every April 2026 day', async () => {
    const api = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' });
    const failures: string[] = [];
    let haymarketBoundaryChecks = 0;

    try {
      for (const date of APRIL_2026_DATES) {
        for (const shop of snapshot.shops) {
          const designerIds = computeExpectedDesignerIdsForShop(snapshot, date, shop.id);
          const shopTimeLabels = computeShopTimeLabels(snapshot, date, shop.id);

          for (const designerId of designerIds) {
            const expectedAvailability = computeExpectedAvailability(snapshot, date, designerId, shop.id);
            const response = await api.get(
              `/api/booking-time-availability?designer_id=${designerId}&shop_id=${shop.id}&date=${date}`,
            );

            expect(response.ok(), `booking-time-availability failed for ${date} shop ${shop.id} designer ${designerId}`).toBeTruthy();
            const json = (await response.json()) as DesignerAvailabilityIntervals;

            if (Boolean(json.fullDayBlocked) !== Boolean(expectedAvailability.fullDayBlocked)) {
              failures.push(
                `[availability] ${date} ${shop.name} designer ${designerId}: fullDayBlocked expected ${expectedAvailability.fullDayBlocked}, got ${json.fullDayBlocked}`,
              );
            }

            const intervalComparisons: Array<[string, Array<{ start: number; end: number }>, Array<{ start: number; end: number }>]> = [
              ['restrictionIntervals', normalizeIntervals(expectedAvailability.restrictionIntervals), normalizeIntervals(json.restrictionIntervals)],
              ['bookingIntervals', normalizeIntervals(expectedAvailability.bookingIntervals), normalizeIntervals(json.bookingIntervals)],
              ['workingIntervals', normalizeIntervals(expectedAvailability.workingIntervals), normalizeIntervals(json.workingIntervals)],
            ];

            for (const [label, expected, actual] of intervalComparisons) {
              if (JSON.stringify(expected) !== JSON.stringify(actual)) {
                failures.push(
                  `[availability] ${date} ${shop.name} designer ${designerId}: ${label} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
                );
              }
            }

            for (const durationMinutes of [30, 60, 90, 120, 150, 180]) {
              const unavailableLabels = new Set<string>();

              for (const label of shopTimeLabels) {
                const match = label.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
                if (!match) continue;
                let hour = Number(match[1]);
                if (match[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
                if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
                const startMin = hour * 60 + Number(match[2]);
                if (isStartSlotUnavailable(startMin, durationMinutes, json)) {
                  unavailableLabels.add(label);
                }
              }

              for (const interval of expectedAvailability.bookingIntervals) {
                const bookingStart = minutesToTimeLabel(interval.start);
                if (!shopTimeLabels.includes(bookingStart)) continue;
                if (!unavailableLabels.has(bookingStart)) {
                  failures.push(
                    `[slot-booked] ${date} ${shop.name} designer ${designerId}: booked slot ${bookingStart} should be blocked for duration ${durationMinutes}`,
                  );
                }
              }

              if (/haymarket/i.test(shop.name) && shopTimeLabels.includes('6:30 PM') && durationMinutes === 180) {
                haymarketBoundaryChecks += 1;
                if (!unavailableLabels.has('6:30 PM')) {
                  failures.push(
                    `[slot-boundary] ${date} ${shop.name} designer ${designerId}: 6:30 PM should be blocked for 180-minute booking`,
                  );
                }
              }
            }
          }
        }
      }
    } finally {
      await api.dispose();
    }

    expect(haymarketBoundaryChecks).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });
});
