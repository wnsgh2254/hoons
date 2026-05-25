import type { SupabaseClient } from '@supabase/supabase-js';
import { isCancelledBookingStatus } from '@/lib/booking-status';

const PAGE_SIZE = 1000;

type BookingDateRow = { booking_date: string; status: string | null };

/** Parse day-of-month from YYYY-MM-DD without timezone shifts. */
export function dayNumberFromBookingDate(bookingDate: string): number | null {
  const datePart = String(bookingDate).slice(0, 10);
  const day = Number(datePart.split('-')[2]);
  return Number.isFinite(day) && day >= 1 && day <= 31 ? day : null;
}

export function buildDayCountsFromRows(rows: BookingDateRow[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const row of rows) {
    if (isCancelledBookingStatus(row.status)) continue;
    const day = dayNumberFromBookingDate(row.booking_date);
    if (day == null) continue;
    counts[day] = (counts[day] || 0) + 1;
  }
  return counts;
}

/** Fetch all bookings in range (paginated) and aggregate per-day counts for the calendar. */
export async function fetchMonthBookingDayCounts(
  supabase: SupabaseClient,
  monthStart: string,
  monthEnd: string,
  filters?: { shopId?: number | null; designerId?: number | null },
): Promise<Record<number, number>> {
  const allRows: BookingDateRow[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from('bookings')
      .select('booking_date, status')
      .gte('booking_date', monthStart)
      .lte('booking_date', monthEnd)
      .order('booking_date', { ascending: true })
      .order('id', { ascending: true });

    if (filters?.shopId != null) query = query.eq('shop_id', filters.shopId);
    if (filters?.designerId) query = query.eq('designer_id', filters.designerId);

    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;

    const batch = (data || []) as BookingDateRow[];
    allRows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return buildDayCountsFromRows(allRows);
}
