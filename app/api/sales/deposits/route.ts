import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getBookingServiceDisplayName } from '@/lib/utils/appointment-utils';
import { isCancelledBookingStatus } from '@/lib/booking-status';
import { normalizeBookingDepositPaid } from '@/lib/booking-deposit-paid';
import {
  getSydneyDayUtcRange,
  isCreatedAtInSydneyDateRange,
} from '@/lib/sydney-datetime-range';

type DepositBookingRow = {
  id: number;
  shop_id: number | null;
  shop_name: string | null;
  customer_name: string | null;
  designer_name: string | null;
  booking_date: string | null;
  booking_time: string | null;
  service_name: string;
  deposit_paid: number;
  created_at: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const shopId = searchParams.get('shop_id');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required.' },
        { status: 400 },
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json(
        { error: 'start_date and end_date must be YYYY-MM-DD.' },
        { status: 400 },
      );
    }

    const { gteIso, ltIso } = getSydneyDayUtcRange(startDate, endDate);

    let query = supabase
      .from('bookings')
      .select(
        `
        id,
        shop_id,
        booking_date,
        booking_time,
        deposit_paid,
        status,
        created_at,
        custom_service_name,
        designer:designer_id ( id, name ),
        service:service_id ( id, name ),
        customer:customer_id ( id, name ),
        shop:shop_id ( id, name )
      `,
      )
      .gt('deposit_paid', 0)
      .gte('created_at', gteIso)
      .lt('created_at', ltIso)
      .order('created_at', { ascending: false });

    if (shopId) {
      const numericShopId = Number(shopId);
      if (Number.isFinite(numericShopId) && numericShopId > 0) {
        query = query.eq('shop_id', numericShopId);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching deposit-paid bookings:', error);
      return NextResponse.json(
        { error: 'Failed to load deposit bookings.' },
        { status: 500 },
      );
    }

    const filtered = (data || []).filter(
      (booking: any) =>
        booking.created_at &&
        isCreatedAtInSydneyDateRange(booking.created_at, startDate, endDate) &&
        !isCancelledBookingStatus(booking.status),
    );

    const mapped: DepositBookingRow[] = filtered.map(
      (booking: any): DepositBookingRow => {
        const depositPaid = normalizeBookingDepositPaid(booking.deposit_paid);
        return {
          id: booking.id,
          shop_id: booking.shop_id,
          shop_name: booking.shop?.name ?? null,
          customer_name: booking.customer?.name ?? null,
          designer_name: booking.designer?.name ?? null,
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
          service_name: getBookingServiceDisplayName(booking),
          deposit_paid: depositPaid,
          created_at: String(booking.created_at),
        };
      },
    );

    const rows = [...mapped].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const totalDeposit = rows.reduce(
      (sum: number, row) => sum + row.deposit_paid,
      0,
    );

    return NextResponse.json({
      bookings: rows,
      summary: {
        count: rows.length,
        totalDeposit,
      },
    });
  } catch (error) {
    console.error('Error in sales deposits route:', error);
    return NextResponse.json(
      { error: 'Failed to load deposit bookings.' },
      { status: 500 },
    );
  }
}
