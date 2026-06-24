import { normalizeBookingDepositPaid } from '@/lib/booking-deposit-paid';
import { isCancelledBookingStatus } from '@/lib/booking-status';
import { hasPaidDepositSnapshot } from '@/lib/sale-paid-deposit';

const BOOKING_DEPOSIT_REFUND_MEMO_RE = /^Booking #(\d+) deposit refund/;

export type ForfeitedDepositRow = {
  bookingId: number;
  designerId: number | null;
  shopId: number | null;
  bookingDate: string;
  amount: number;
};

function isForfeitureBookingStatus(status: string | null | undefined): boolean {
  const normalized = String(status || '').trim().toLowerCase();
  return (
    isCancelledBookingStatus(status) ||
    normalized === 'noshow' ||
    normalized === 'no_show'
  );
}

async function fetchDepositRefundsByBookingId(
  supabase: { from: (table: string) => any },
  bookingIds: number[],
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (!bookingIds.length) return map;

  const idSet = new Set(bookingIds);
  const { data, error } = await supabase
    .from('refunds')
    .select('total_amount, memo')
    .ilike('memo', 'Booking #% deposit refund%');

  if (error) {
    console.error('Error fetching booking deposit refunds for forfeiture:', error);
    return map;
  }

  for (const row of data || []) {
    const match = BOOKING_DEPOSIT_REFUND_MEMO_RE.exec(String(row.memo || ''));
    if (!match) continue;
    const bookingId = Number(match[1]);
    if (!idSet.has(bookingId)) continue;
    const amount = Math.max(0, Number(row.total_amount) || 0);
    map.set(bookingId, (map.get(bookingId) || 0) + amount);
  }

  return map;
}

async function fetchBookingIdsWithDepositSaleCredit(
  supabase: { from: (table: string) => any },
  bookingIds: number[],
): Promise<Set<number>> {
  const credited = new Set<number>();
  if (!bookingIds.length) return credited;

  const { data, error } = await supabase
    .from('sales')
    .select('booking_id, paid_deposit')
    .in('booking_id', bookingIds);

  if (error) {
    console.error('Error fetching sales deposit credit for forfeiture:', error);
    return credited;
  }

  for (const row of data || []) {
    const bookingId = Number(row.booking_id);
    if (!Number.isFinite(bookingId) || bookingId <= 0) continue;
    if (hasPaidDepositSnapshot(row.paid_deposit)) {
      credited.add(bookingId);
    }
  }

  return credited;
}

/** Forfeited deposit on cancelled / no-show bookings (net of refund, excluding sale deposit credit). */
export async function fetchForfeitedDepositsInBookingDateRange(
  supabase: { from: (table: string) => any },
  startDate: string,
  endDate: string,
  shopId?: string | null,
): Promise<ForfeitedDepositRow[]> {
  let query = supabase
    .from('bookings')
    .select(
      `
      id,
      shop_id,
      designer_id,
      booking_date,
      deposit_paid,
      deposit_refunded_at,
      status
    `,
    )
    .gt('deposit_paid', 0)
    .gte('booking_date', startDate)
    .lte('booking_date', endDate);

  if (shopId) {
    const numericShopId = Number(shopId);
    if (Number.isFinite(numericShopId) && numericShopId > 0) {
      query = query.eq('shop_id', numericShopId);
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching forfeited deposit bookings:', error);
    return [];
  }

  const candidates = (data || []).filter((booking: any) =>
    isForfeitureBookingStatus(booking.status),
  );
  if (!candidates.length) return [];

  const bookingIds = candidates
    .map((booking: any) => Number(booking.id))
    .filter((id: number) => Number.isFinite(id) && id > 0);

  const [refundsByBookingId, creditedBookingIds] = await Promise.all([
    fetchDepositRefundsByBookingId(supabase, bookingIds),
    fetchBookingIdsWithDepositSaleCredit(supabase, bookingIds),
  ]);

  const rows: ForfeitedDepositRow[] = [];

  for (const booking of candidates) {
    const bookingId = Number(booking.id);
    if (creditedBookingIds.has(bookingId)) continue;

    const depositPaid = normalizeBookingDepositPaid(booking.deposit_paid);
    const refundedFromTable = refundsByBookingId.get(bookingId) ?? 0;
    const refunded =
      refundedFromTable > 0
        ? refundedFromTable
        : booking.deposit_refunded_at
          ? depositPaid
          : 0;
    const remaining = Math.max(0, depositPaid - refunded);
    if (remaining <= 0) continue;

    rows.push({
      bookingId,
      designerId:
        booking.designer_id != null && !Number.isNaN(Number(booking.designer_id))
          ? Number(booking.designer_id)
          : null,
      shopId:
        booking.shop_id != null && !Number.isNaN(Number(booking.shop_id))
          ? Number(booking.shop_id)
          : null,
      bookingDate: String(booking.booking_date || ''),
      amount: remaining,
    });
  }

  return rows;
}

export function sumForfeitedDepositAmount(rows: ForfeitedDepositRow[]): number {
  return rows.reduce((sum, row) => sum + row.amount, 0);
}
