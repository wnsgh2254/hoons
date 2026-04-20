import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeBookingStatus } from '@/lib/booking-status';

const DEFAULT_PENDING_TTL_MINUTES = 30;

export function isExpiredPendingBooking(
  status: string | null | undefined,
  createdAt: string | null | undefined,
  now: Date = new Date(),
  ttlMinutes: number = DEFAULT_PENDING_TTL_MINUTES,
): boolean {
  if (normalizeBookingStatus(status) !== 'pending') return false;
  if (!createdAt) return false;

  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;

  return now.getTime() - created.getTime() > ttlMinutes * 60 * 1000;
}

export async function cleanupExpiredPendingBookings(
  supabase: SupabaseClient,
  params: { date?: string | null; shopId?: number | null; designerId?: number | null } = {},
): Promise<number> {
  let query = supabase
    .from('bookings')
    .select('id, status, created_at')
    .eq('status', 'pending');

  if (params.date) {
    query = query.eq('booking_date', params.date);
  }
  if (params.shopId != null) {
    query = query.eq('shop_id', params.shopId);
  }
  if (params.designerId != null) {
    query = query.eq('designer_id', params.designerId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('cleanupExpiredPendingBookings select:', error);
    return 0;
  }

  const expiredIds = (data || [])
    .filter((booking: any) => isExpiredPendingBooking(booking.status, booking.created_at))
    .map((booking: any) => Number(booking.id))
    .filter((id: number) => Number.isFinite(id));

  if (expiredIds.length === 0) return 0;

  const { error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .in('id', expiredIds);

  if (updateError) {
    console.error('cleanupExpiredPendingBookings update:', updateError);
    return 0;
  }

  return expiredIds.length;
}
