import {
  fetchBookingDepositPaid,
  normalizeBookingDepositPaid,
} from '@/lib/booking-deposit-paid';

/** True when sales.paid_deposit holds a real snapshot (not legacy default 0). */
export function hasPaidDepositSnapshot(value: unknown): boolean {
  if (value == null || value === '') return false;
  return normalizeBookingDepositPaid(value) > 0;
}

/** Deposit stored on the sale row; falls back to linked booking when unset (legacy rows). */
export function resolvePaidDepositFromSaleRecord(sale: {
  paid_deposit?: unknown;
  booking_deposit_paid?: unknown;
  booking_id?: number | null;
  bookings?: { deposit_paid?: unknown } | { deposit_paid?: unknown }[] | null;
}): number {
  const attached = normalizeBookingDepositPaid(sale.booking_deposit_paid);
  if (attached > 0) return attached;

  if (hasPaidDepositSnapshot(sale.paid_deposit)) {
    return normalizeBookingDepositPaid(sale.paid_deposit);
  }

  const joined = sale.bookings;
  const row = Array.isArray(joined) ? joined[0] : joined;
  return normalizeBookingDepositPaid(row?.deposit_paid);
}

/** Cap deposit credit to gross service total on the sale. */
export function capPaidDepositToService(
  deposit: number,
  grossServiceTotal: number,
): number {
  const d = Math.max(0, deposit);
  const gross = Math.max(0, grossServiceTotal);
  if (gross <= 0) return d;
  return Math.min(d, gross);
}

export function sumServiceGrossFromSaleItems(
  items: Array<{ type?: string | null; amount?: unknown }> | null | undefined,
): number {
  return (items || [])
    .filter((item) => item.type === 'service')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

/** Resolve deposit to persist on a new/updated sale header. */
export async function resolvePaidDepositForSaleWrite(
  supabase: { from: (table: string) => any },
  params: {
    bookingId: number | null;
    paidDepositFromRequest?: unknown;
    grossServiceTotal: number;
  },
): Promise<number> {
  let raw = 0;

  const fromRequest = normalizeBookingDepositPaid(params.paidDepositFromRequest);
  if (fromRequest > 0) {
    raw = fromRequest;
  } else if (params.bookingId != null) {
    raw = await fetchBookingDepositPaid(supabase, params.bookingId);
  }

  return capPaidDepositToService(raw, params.grossServiceTotal);
}
