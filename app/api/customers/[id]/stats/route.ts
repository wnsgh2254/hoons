import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function normalizeComparablePhone(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '');
}

function normalizeComparableName(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const customerId = Number(id);
    if (!customerId || Number.isNaN(customerId)) {
      return NextResponse.json({ error: '유효하지 않은 고객 ID 입니다.' }, { status: 400 });
    }

    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const todayStr = now.toISOString().split('T')[0];
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    const customerResult = await supabase
      .from('customers')
      .select('id, name, phone')
      .eq('id', customerId)
      .maybeSingle();

    if (customerResult.error || !customerResult.data) {
      return NextResponse.json({ error: '고객을 찾을 수 없습니다.' }, { status: 404 });
    }

    const customer = customerResult.data;

    const [bookingsResult, prepaidResult, salesResult, refundsResult] = await Promise.all([
      supabase
        .from('bookings')
        .select('booking_date, booking_time, status, total_amount')
        .eq('customer_id', customerId),
      supabase
        .from('prepaid_passes')
        .select('id, customer_id, name, phone, points, is_active, expires_at, created_at')
        .eq('is_active', true),
      supabase.from('sales').select('total_amount').eq('customer_id', customerId),
      supabase.from('refunds').select('total_amount').eq('customer_id', customerId),
    ]);

    type BookingRow = { booking_date: string; booking_time: string | null; status: string | null; total_amount: number | null };
    type PrepaidRow = { id: number; customer_id: number | null; name: string | null; phone: string | null; points: number | null; is_active: boolean | null; expires_at: string | null; created_at: string | null };

    const allBookings: BookingRow[] = (bookingsResult.data as BookingRow[]) || [];

    // Comment: Net sales from sales/refunds — same rule as GET /api/customers (list) and SalesHistoryTable
    const salesRows = (salesResult.data || []) as { total_amount: number | null }[];
    const refundRows = (refundsResult.data || []) as { total_amount: number | null }[];
    const totalSales =
      salesRows.reduce((sum, s) => sum + Number(s.total_amount || 0), 0) -
      refundRows.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

    const lastVisitDate =
      allBookings
        .filter((b: BookingRow) => {
          const s = (b.status || '').toLowerCase();
          return s === 'paid' || s === 'completed';
        })
        .map((b: BookingRow) => b.booking_date)
        .sort((a: string, b: string) => b.localeCompare(a))[0] ?? null;

    let daysSinceLastVisit: number | null = null;
    if (lastVisitDate) {
      const diffMs = now.getTime() - new Date(lastVisitDate).getTime();
      daysSinceLastVisit = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    const recentBookings = allBookings.filter((b: BookingRow) => b.booking_date >= oneYearAgoStr);
    const appointmentsCount = recentBookings.length;
    const cancelledCount = recentBookings.filter((b: BookingRow) => {
      const s = (b.status || '').toLowerCase();
      return s === 'cancelled' || s === 'canceled';
    }).length;

    const nextAppointment =
      allBookings
        .filter((b: BookingRow) => {
          const s = (b.status || '').toLowerCase();
          const isUpcoming = !s || s === 'booked' || s === 'reserved' || s === 'confirmed' || s === 'pending';
          return isUpcoming && b.booking_date >= todayStr;
        })
        .sort((a: BookingRow, b: BookingRow) => {
          const dateCmp = a.booking_date.localeCompare(b.booking_date);
          if (dateCmp !== 0) return dateCmp;
          return (a.booking_time || '').localeCompare(b.booking_time || '');
        })
        .map((b: BookingRow) => ({ date: b.booking_date, time: b.booking_time || '' }))[0] ?? null;

    const prepaidTickets: PrepaidRow[] = ((prepaidResult.data as PrepaidRow[]) || []).filter((p) => {
      if (p.customer_id != null && Number(p.customer_id) === customerId) return true;
      return (
        normalizeComparableName(p.name) === normalizeComparableName(customer.name) &&
        normalizeComparablePhone(p.phone) === normalizeComparablePhone(customer.phone)
      );
    });
    const prepaidBalance = prepaidTickets.reduce((sum: number, p: PrepaidRow) => sum + Number(p.points || 0), 0);

    return NextResponse.json({
      total_sales: totalSales,
      last_visit_date: lastVisitDate,
      days_since_last_visit: daysSinceLastVisit,
      appointments_count: appointmentsCount,
      cancelled_count: cancelledCount,
      next_appointment: nextAppointment,
      prepaid_tickets: prepaidTickets,
      prepaid_balance: prepaidBalance,
    });
  } catch (error) {
    console.error('Error in customers stats route:', error);
    return NextResponse.json({ error: '통계를 불러오지 못했습니다.' }, { status: 500 });
  }
}
