import { pickSaleForBooking } from '@/lib/sale-booking-link';
import { mapSaleRecordToDetailData } from '@/lib/sales-detail-mapper';
import type { SalesDetailData } from '@/lib/types';

/** Load the sale detail that belongs to a specific booking (booking_id first, legacy fallback). */
export async function fetchSaleDetailForBooking(
  booking: {
    id?: number;
    customer?: { id?: number; name?: string | null } | null;
    customer_id?: number | null;
    customer_name?: string | null;
    booking_date?: string | null;
    booking_time?: string | null;
    shop_id?: number | null;
  },
  request: typeof fetch = fetch,
): Promise<SalesDetailData | null> {
  const customerNameFallback =
    booking.customer?.name || booking.customer_name || '';

  if (booking.id) {
    const linkedRes = await request(`/api/sales?booking_id=${booking.id}`);
    if (linkedRes.ok) {
      const linkedData = await linkedRes.json();
      const linkedSale = (linkedData.sales || [])[0];
      if (linkedSale) {
        return mapSaleRecordToDetailData(linkedSale, customerNameFallback);
      }
    }
  }

  const customerId = booking.customer?.id ?? booking.customer_id;
  if (!customerId) return null;

  const res = await request(`/api/sales?customer_id=${customerId}`);
  if (!res.ok) return null;

  const { sales = [] } = await res.json();
  const sale = pickSaleForBooking(sales, {
    id: Number(booking.id),
    booking_date: booking.booking_date || undefined,
    booking_time: booking.booking_time || undefined,
    shop_id: booking.shop_id ?? undefined,
  });

  if (!sale) return null;
  return mapSaleRecordToDetailData(sale, customerNameFallback);
}
