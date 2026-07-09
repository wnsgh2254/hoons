import type { SupabaseClient } from '@supabase/supabase-js';
import { dbTimeStringToMinutes } from '@/lib/booking-time-math';
import { salonCalendarWeekdayIndex } from '@/lib/salon-calendar';

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

/** Comment: Merge overlapping [start,end) minute intervals from midnight */
export function mergeMinuteIntervals(intervals: { start: number; end: number }[]): { start: number; end: number }[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: { start: number; end: number }[] = [];
  let cur = { ...sorted[0]! };
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i]!;
    if (n.start <= cur.end) {
      cur.end = Math.max(cur.end, n.end);
    } else {
      out.push(cur);
      cur = { ...n };
    }
  }
  out.push(cur);
  return out;
}

/**
 * Comment: Shop business-hour windows for a Sydney calendar date (from business_hours table).
 * Used when a designer has no designer_schedules row (e.g. special-work day on an off weekday).
 */
export async function loadShopBusinessHourIntervalsForDate(
  supabase: SupabaseClient,
  params: { shopId: number; date: string },
): Promise<{ start: number; end: number }[]> {
  const weekdayLabel = DAYS_KO[salonCalendarWeekdayIndex(params.date)];

  const { data, error } = await supabase
    .from('business_hours')
    .select('start_time, end_time, days')
    .eq('shop_id', params.shopId);

  if (error) {
    console.error('loadShopBusinessHourIntervalsForDate:', error);
    return [];
  }

  const raw: { start: number; end: number }[] = [];
  for (const row of data || []) {
    if (!Array.isArray(row.days) || !row.days.includes(weekdayLabel)) continue;
    const start = dbTimeStringToMinutes(row.start_time);
    const end = dbTimeStringToMinutes(row.end_time);
    if (end > start) {
      raw.push({ start, end });
    }
  }

  return mergeMinuteIntervals(raw);
}
