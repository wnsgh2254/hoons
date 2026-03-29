import type { SupabaseClient } from '@supabase/supabase-js';
import {
  dbTimeStringToMinutes,
  isStartSlotUnavailable,
  timeLabelToMinutes,
} from '@/lib/booking-time-math';
import type { DesignerAvailabilityIntervals } from '@/lib/booking-time-math';
import { resolvePerShopTimeOffOutcomes, type VenueTimeOffRow } from '@/lib/designer-venue-time-off';
import { salonCalendarWeekdayIndex } from '@/lib/salon-calendar';
import { assertMultiVenueDefaultShopAllowsBooking } from '@/lib/multi-venue-default-shop';

// Comment: DB stores mixed case (e.g. cancelled, CANCELLED) — match Supabase live data
function isCancelledStatus(status: string | null | undefined): boolean {
  const n = (status || '').toString().trim().toLowerCase();
  return n === 'cancelled' || n === 'canceled';
}

function bookingDurationMinutes(row: {
  service?: { duration_minutes?: number | null } | null;
  custom_service_duration?: number | null;
}): number {
  const custom = row.custom_service_duration;
  if (custom != null && Number.isFinite(Number(custom)) && Number(custom) > 0) {
    return Math.round(Number(custom));
  }
  const dm = row.service?.duration_minutes;
  if (dm != null && Number.isFinite(Number(dm)) && Number(dm) > 0) {
    return Math.round(Number(dm));
  }
  return 60;
}

/**
 * Comment: Load restriction + booking intervals for a designer on a shop date (Sydney calendar date string).
 * Used by public booking UI and payment validation.
 */
export async function loadDesignerAvailabilityForPublicBooking(
  supabase: SupabaseClient,
  params: { designerId: number; shopId: number; date: string },
): Promise<DesignerAvailabilityIntervals> {
  const { designerId, shopId, date } = params;

  const { data: restrictions, error: rErr } = await supabase
    .from('booking_restrictions')
    .select('id, designer_id, restriction_type, restriction_date, start_time, end_time')
    .eq('designer_id', designerId)
    .eq('restriction_date', date);

  if (rErr) {
    console.error('loadDesignerAvailability restrictions:', rErr);
  }

  let fullDayBlocked = false;
  const restrictionIntervals: { start: number; end: number }[] = [];

  for (const r of restrictions || []) {
    if (r.restriction_type === 'date') {
      fullDayBlocked = true;
      break;
    }
    if (r.restriction_type === 'time' && r.start_time && r.end_time) {
      const start = dbTimeStringToMinutes(r.start_time);
      const end = dbTimeStringToMinutes(r.end_time);
      if (end > start) {
        restrictionIntervals.push({ start, end });
      }
    }
  }

  if (fullDayBlocked) {
    return { fullDayBlocked: true, restrictionIntervals: [], bookingIntervals: [] };
  }

  const { data: bookings, error: bErr } = await supabase
    .from('bookings')
    .select('booking_time, status, service:service_id(duration_minutes), custom_service_duration')
    .eq('designer_id', designerId)
    .eq('shop_id', shopId)
    .eq('booking_date', date);

  if (bErr) {
    console.error('loadDesignerAvailability bookings:', bErr);
  }

  const bookingIntervals: { start: number; end: number }[] = [];

  for (const b of bookings || []) {
    if (!b.booking_time) continue;
    if (isCancelledStatus((b as { status?: string | null }).status)) continue;
    const start = dbTimeStringToMinutes(b.booking_time);
    const dur = bookingDurationMinutes(b as any);
    bookingIntervals.push({ start, end: start + dur });
  }

  return { fullDayBlocked: false, restrictionIntervals, bookingIntervals };
}

/** Comment: Resolve duration for overlap check (client may send explicit minutes) */
export async function resolveBookingDurationMinutes(
  supabase: SupabaseClient,
  opts: { durationMinutes?: number | null; serviceId?: number | null },
): Promise<number> {
  if (typeof opts.durationMinutes === 'number' && opts.durationMinutes > 0) {
    return Math.round(opts.durationMinutes);
  }
  if (opts.serviceId != null && Number.isFinite(Number(opts.serviceId))) {
    const { data } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', Number(opts.serviceId))
      .maybeSingle();
    const dm = data?.duration_minutes;
    if (dm != null && Number(dm) > 0) return Math.round(Number(dm));
  }
  return 60;
}

/** Comment: Server-side guard before creating a public booking (payment routes) */
export async function assertPublicBookingSlotAvailable(
  supabase: SupabaseClient,
  params: {
    designerId: number | null;
    shopId: number;
    date: string;
    timeLabel: string;
    durationMinutes: number;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!params.designerId) {
    return { ok: false, message: 'Designer is required.' };
  }
  const slotMin = timeLabelToMinutes(params.timeLabel);
  if (slotMin == null) {
    return { ok: false, message: 'Invalid time format.' };
  }

  // Comment: Same rule as designer-schedules: newest 임의 휴일/특별 근무일 row wins per venue.
  const { data: venueRows, error: venueErr } = await supabase
    .from('designer_time_off')
    .select('id, designer_id, shop_id, reason, created_at')
    .eq('designer_id', params.designerId)
    .in('reason', ['임의 휴일', '특별 근무일'])
    .lte('start_date', params.date)
    .gte('end_date', params.date);

  let specialWorkDesignerIds = new Set<number>();
  if (!venueErr && venueRows?.length) {
    const resolved = resolvePerShopTimeOffOutcomes(venueRows as VenueTimeOffRow[], params.shopId);
    specialWorkDesignerIds = resolved.specialWorkDesignerIds;
    if (resolved.arbitraryHolidayDesignerIds.has(Number(params.designerId))) {
      return {
        ok: false,
        message: 'This designer is not available at this location on the selected date.',
      };
    }
  }

  const defaultVenueCheck = await assertMultiVenueDefaultShopAllowsBooking(supabase, {
    designerId: Number(params.designerId),
    shopId: params.shopId,
    weekday: salonCalendarWeekdayIndex(params.date),
    specialWorkDesignerIds,
  });
  if (!defaultVenueCheck.ok) {
    return defaultVenueCheck;
  }

  const data = await loadDesignerAvailabilityForPublicBooking(supabase, {
    designerId: params.designerId,
    shopId: params.shopId,
    date: params.date,
  });
  if (isStartSlotUnavailable(slotMin, params.durationMinutes, data)) {
    return {
      ok: false,
      message: 'That time is no longer available. Please choose another slot.',
    };
  }
  return { ok: true };
}
