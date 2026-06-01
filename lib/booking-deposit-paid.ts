import { resolveBookingIdForSale, type SaleBookingRow } from '@/lib/sale-booking-link';

/** Stripe (etc.) deposit actually paid on the booking — source of truth for D badge and sale deposit credit. */
export function normalizeBookingDepositPaid(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Gross sale total minus deposit credit (capped), never negative. */
export function netDueAfterDeposit(grossTotal: number, depositPaid: number): number {
  const g = Math.max(0, grossTotal);
  const d = Math.max(0, depositPaid);
  return Math.max(0, g - Math.min(d, g));
}

export async function fetchBookingDepositPaid(
  supabase: { from: (table: string) => any },
  bookingId: number | null | undefined,
): Promise<number> {
  if (bookingId == null || Number.isNaN(Number(bookingId))) return 0;

  const { data, error } = await supabase
    .from('bookings')
    .select('deposit_paid')
    .eq('id', Number(bookingId))
    .maybeSingle();

  if (error || !data) return 0;
  return normalizeBookingDepositPaid(data.deposit_paid);
}

/** Resolve linked booking (booking_id or legacy match) and return its deposit_paid. */
export async function resolveBookingDepositPaidForSale(
  supabase: { from: (table: string) => any },
  sale: SaleBookingRow,
): Promise<number> {
  let bookingId: number | null =
    sale.booking_id != null && !Number.isNaN(Number(sale.booking_id))
      ? Number(sale.booking_id)
      : null;

  if (!bookingId) {
    bookingId = await resolveBookingIdForSale(supabase, sale);
  }

  return fetchBookingDepositPaid(supabase, bookingId);
}

export async function attachBookingDepositPaidToSales(
  supabase: { from: (table: string) => any },
  sales: Array<{ booking_id?: number | null; booking_deposit_paid?: number; [key: string]: unknown }>,
): Promise<void> {
  const bookingIds = [
    ...new Set(
      sales
        .map((s) => s.booking_id)
        .filter((id): id is number => id != null && !Number.isNaN(Number(id)))
        .map((id) => Number(id)),
    ),
  ];

  if (!bookingIds.length) {
    for (const sale of sales) {
      sale.booking_deposit_paid = 0;
    }
    return;
  }

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, deposit_paid')
    .in('id', bookingIds);

  const depositByBookingId = new Map<number, number>();
  if (!error && bookings) {
    for (const row of bookings as Array<{ id: number; deposit_paid?: unknown }>) {
      depositByBookingId.set(Number(row.id), normalizeBookingDepositPaid(row.deposit_paid));
    }
  }

  for (const sale of sales) {
    const bid =
      sale.booking_id != null && !Number.isNaN(Number(sale.booking_id))
        ? Number(sale.booking_id)
        : null;
    sale.booking_deposit_paid = bid != null ? depositByBookingId.get(bid) ?? 0 : 0;
  }
}
