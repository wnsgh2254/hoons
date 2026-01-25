import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Get detailed sales history for a designer in a period
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const designerId = searchParams.get('designer_id');

    if (!startDate || !endDate || !designerId) {
      return NextResponse.json(
        { error: '시작 날짜, 종료 날짜, 디자이너 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Comment: Fetch bookings for this designer and period
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, customer_id, service_id, designer_id, booking_date, booking_time, total_amount, status, prepaid_pass_id')
      .eq('designer_id', Number(designerId))
      .gte('booking_date', startDate)
      .lte('booking_date', endDate)
      .eq('status', 'confirmed')
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json(
        { error: '예약 데이터 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // Comment: Get payments for these bookings
    const bookingIds = (bookings || []).map((b: any) => b.id);
    let paymentsQuery = supabase
      .from('payments')
      .select('id, booking_id, amount, method, type, created_at')
      .in('booking_id', bookingIds.length > 0 ? bookingIds : [-1])
      .order('created_at', { ascending: true });

    const { data: payments, error: paymentsError } = await paymentsQuery;

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    // Comment: Get services
    const serviceIds = Array.from(
      new Set(
        (bookings || [])
          .map((b: any) => b.service_id)
          .filter((id: number | null | undefined): id is number => id !== null && id !== undefined)
      )
    );

    const { data: services } = await supabase
      .from('services')
      .select('id, name, price')
      .in('id', serviceIds.length > 0 ? serviceIds : [-1]);

    const servicesMap = new Map();
    (services || []).forEach((s: any) => servicesMap.set(s.id, s));

    // Comment: Get customers
    const customerIds = Array.from(
      new Set(
        (bookings || [])
          .map((b: any) => b.customer_id)
          .filter((id: number | null | undefined): id is number => id !== null && id !== undefined)
      )
    );

    const { data: customers } = await supabase
      .from('customers')
      .select('id, name')
      .in('id', customerIds.length > 0 ? customerIds : [-1]);

    const customersMap = new Map();
    (customers || []).forEach((c: any) => customersMap.set(c.id, c));

    // Comment: Get designer for incentive rate
    const { data: designer } = await supabase
      .from('designers')
      .select('id, name, percent_rate')
      .eq('id', Number(designerId))
      .single();

    const incentiveRate = designer?.percent_rate || 0;

    // Comment: Group payments by booking
    const paymentsByBooking = new Map();
    (payments || []).forEach((p: any) => {
      if (p.booking_id) {
        if (!paymentsByBooking.has(p.booking_id)) {
          paymentsByBooking.set(p.booking_id, []);
        }
        paymentsByBooking.get(p.booking_id).push(p);
      }
    });

    // Comment: Build sales history
    const salesHistory: any[] = [];

    (bookings || []).forEach((booking: any) => {
      const service = servicesMap.get(booking.service_id);
      const customer = customersMap.get(booking.customer_id);
      const bookingPayments = paymentsByBooking.get(booking.id) || [];
      const isPrepaidDeduction = booking.prepaid_pass_id !== null;

      const totalAmount = Number(booking.total_amount || 0);

      if (bookingPayments.length === 0) {
        // Comment: No payment record, use booking total_amount
        salesHistory.push({
          id: `booking-${booking.id}`,
          date: booking.booking_date,
          customerName: customer?.name || '-',
          serviceName: service?.name || '-',
          unitPrice: service?.price || totalAmount,
          quantity: 1,
          amount: totalAmount,
          discount: 0,
          paymentMethod: '-',
          paymentAmount: totalAmount,
          isPrepaidDeduction: isPrepaidDeduction,
          afterDeduction: totalAmount,
          incentiveRate: incentiveRate,
          incentive: (totalAmount * incentiveRate) / 100,
        });
      } else {
        // Comment: Process each payment
        bookingPayments.forEach((payment: any) => {
          const paymentAmount = Number(payment.amount || 0);
          const paymentMethod = payment.method === 'cash' ? '현금' 
            : payment.method === 'card' ? '카드'
            : payment.method === 'prepaid_pass' ? '정액권 차감'
            : '-';

          salesHistory.push({
            id: `booking-${booking.id}-payment-${payment.id}`,
            date: booking.booking_date,
            customerName: customer?.name || '-',
            serviceName: service?.name || '-',
            unitPrice: service?.price || totalAmount,
            quantity: 1,
            amount: totalAmount,
            discount: totalAmount > paymentAmount ? totalAmount - paymentAmount : 0,
            paymentMethod: paymentMethod,
            paymentAmount: paymentAmount,
            isPrepaidDeduction: isPrepaidDeduction && payment.method === 'prepaid_pass',
            afterDeduction: paymentAmount,
            incentiveRate: incentiveRate,
            incentive: (paymentAmount * incentiveRate) / 100,
          });
        });
      }
    });

    // Comment: Sort by date
    salesHistory.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.id.localeCompare(b.id);
    });

    return NextResponse.json({
      salesHistory,
      designer: designer ? { id: designer.id, name: designer.name, incentiveRate: designer.percent_rate } : null,
    });
  } catch (error: any) {
    console.error('Error in sales-history route:', error);
    return NextResponse.json(
      { error: error.message || '판매 히스토리 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
