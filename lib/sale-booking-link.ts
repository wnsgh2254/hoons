export type SaleBookingRow = {
  id?: number;
  booking_id?: number | null;
  customer_id?: number | null;
  shop_id?: number | null;
  sales_date?: string | null;
  sales_time?: string | null;
};

type BookingLinkRow = {
  id: number;
  customer_id?: number | null;
  shop_id?: number | null;
  booking_date?: string | null;
  booking_time?: string | null;
  sale_completed?: number | boolean | null;
};

export function normalizeTimeForCompare(time: string | null | undefined): string {
  const raw = String(time || '').trim();
  if (raw.length >= 5) return raw.slice(0, 5);
  return raw;
}

export function timeDistanceMinutes(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const parse = (value: string | null | undefined) => {
    const [hours, minutes] = normalizeTimeForCompare(value).split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };
  return Math.abs(parse(a) - parse(b));
}

/** Prefer booking_id; fall back to legacy date/time (+ optional shop) matching. */
export function pickSaleForBooking<T extends SaleBookingRow>(
  sales: T[],
  booking: BookingLinkRow,
): T | null {
  if (!sales.length) return null;

  const linked = sales.find((sale) => Number(sale.booking_id) === Number(booking.id));
  if (linked) return linked;

  const bookingDate = booking.booking_date || '';
  const sameDay = sales.filter((sale) => String(sale.sales_date || '') === bookingDate);
  const candidates = sameDay.length > 0 ? sameDay : sales;

  let best: T | null = null;
  let bestDistance = Infinity;

  for (const sale of candidates) {
    if (
      booking.shop_id != null &&
      sale.shop_id != null &&
      Number(sale.shop_id) !== Number(booking.shop_id)
    ) {
      continue;
    }

    const distance = timeDistanceMinutes(sale.sales_time, booking.booking_time);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = sale;
    }
  }

  return best;
}

/** Resolve the booking tied to a sale (booking_id column or legacy heuristics). */
export async function resolveBookingIdForSale(
  supabase: any,
  sale: SaleBookingRow,
): Promise<number | null> {
  if (sale.booking_id != null && !Number.isNaN(Number(sale.booking_id))) {
    return Number(sale.booking_id);
  }

  if (!sale.customer_id || !sale.sales_date) return null;

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, booking_time, shop_id')
    .eq('customer_id', Number(sale.customer_id))
    .eq('booking_date', sale.sales_date)
    .eq('sale_completed', 1);

  if (error || !bookings?.length) return null;

  let best: BookingLinkRow | null = null;
  let bestDistance = Infinity;

  for (const booking of bookings as BookingLinkRow[]) {
    if (
      sale.shop_id != null &&
      booking.shop_id != null &&
      Number(booking.shop_id) !== Number(sale.shop_id)
    ) {
      continue;
    }

    const distance = timeDistanceMinutes(sale.sales_time, booking.booking_time);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = booking;
    }
  }

  return best ? Number(best.id) : null;
}

/** Clear sale_completed on booking after sale is removed; keep the appointment. */
export async function restoreBookingAfterSaleDelete(
  supabase: any,
  bookingId: number,
): Promise<void> {
  await supabase.from('temp_sales').delete().eq('booking_id', bookingId);

  const { error } = await supabase
    .from('bookings')
    .update({ sale_completed: 0 })
    .eq('id', bookingId);

  if (error) {
    throw new Error(error.message || 'Failed to restore booking after sale delete.');
  }
}
