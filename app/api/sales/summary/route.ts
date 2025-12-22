import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Helper to safely convert to number
const toNum = (v: any) => Number(v || 0);

// Comment: Sales summary API - aggregates revenue metrics for dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let fromDate = from;
    let toDate = to;

    // Comment: Default to last 30 days
    if (!fromDate || !toDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      fromDate = start.toISOString();
      toDate = end.toISOString();
    }

    // Comment: Load payments in range
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, booking_id, amount, method, type, created_at')
      .gte('created_at', fromDate)
      .lte('created_at', toDate);

    if (paymentsError) {
      console.error('Error fetching payments for summary:', paymentsError);
      return NextResponse.json({ error: '매출 요약 조회에 실패했습니다.' }, { status: 500 });
    }

    const paymentsData = payments || [];

    const bookingIds = Array.from(
      new Set(
        paymentsData
          .map((p) => p.booking_id)
          .filter((id): id is number => id !== null && id !== undefined)
      )
    );

    // Comment: Load related bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, designer_id, service_id, total_amount, booking_date')
      .in('id', bookingIds.length > 0 ? bookingIds : [-1]);

    if (bookingsError) {
      console.error('Error fetching bookings for summary:', bookingsError);
      return NextResponse.json({ error: '매출 요약 조회에 실패했습니다.' }, { status: 500 });
    }

    const bookingData = bookings || [];

    const designerIds = Array.from(
      new Set(
        bookingData
          .map((b) => b.designer_id)
          .filter((id): id is number => id !== null && id !== undefined)
      )
    );

    const serviceIds = Array.from(
      new Set(
        bookingData
          .map((b) => b.service_id)
          .filter((id): id is number => id !== null && id !== undefined)
      )
    );

    // Comment: Load designers and services
    const [{ data: designers }, { data: services }] = await Promise.all([
      supabase
        .from('designers')
        .select('id, name')
        .in('id', designerIds.length > 0 ? designerIds : [-1]),
      supabase
        .from('services')
        .select('id, name, price')
        .in('id', serviceIds.length > 0 ? serviceIds : [-1]),
    ]);

    const designersMap = new Map<number, { id: number; name: string }>();
    (designers || []).forEach((d) => designersMap.set(d.id, d));

    const servicesMap = new Map<number, { id: number; name: string; price: number }>();
    (services || []).forEach((s) => servicesMap.set(s.id, s));

    const bookingsMap = new Map<number, any>();
    bookingData.forEach((b) => bookingsMap.set(b.id, b));

    // Comment: Overall revenue and ticket metrics
    const totalRevenue = paymentsData.reduce((sum, p) => sum + toNum(p.amount), 0);
    const transactions = paymentsData.length;

    const distinctBookingIds = Array.from(
      new Set(
        paymentsData
          .map((p) => p.booking_id)
          .filter((id): id is number => id !== null && id !== undefined)
      )
    );

    const avgTicket =
      distinctBookingIds.length > 0 ? totalRevenue / distinctBookingIds.length : 0;

    // Comment: Revenue trends by date
    const trendMap = new Map<
      string,
      {
        date: string;
        revenue: number;
      }
    >();

    paymentsData.forEach((p) => {
      const d = new Date(p.created_at as string);
      const key = d.toISOString().slice(0, 10);
      const existing = trendMap.get(key) || { date: key, revenue: 0 };
      existing.revenue += toNum(p.amount);
      trendMap.set(key, existing);
    });

    const trendPoints = Array.from(trendMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Comment: Payment method breakdown
    const paymentMethodMap = new Map<
      string,
      {
        method: string;
        amount: number;
      }
    >();

    paymentsData.forEach((p) => {
      const key = p.method as string;
      const existing = paymentMethodMap.get(key) || { method: key, amount: 0 };
      existing.amount += toNum(p.amount);
      paymentMethodMap.set(key, existing);
    });

    const paymentMethodsRaw = Array.from(paymentMethodMap.values());
    const paymentTotal = paymentMethodsRaw.reduce((sum, m) => sum + m.amount, 0);

    const paymentMethods = paymentMethodsRaw.map((m) => ({
      method: m.method,
      amount: m.amount,
      percentage: paymentTotal > 0 ? (m.amount / paymentTotal) * 100 : 0,
    }));

    // Comment: Top stylists by service revenue (exclude product-only payments)
    const stylistMap = new Map<
      number,
      {
        designerId: number;
        name: string;
        revenue: number;
        bookingsCount: number;
      }
    >();

    paymentsData.forEach((p) => {
      if (p.type === 'product') return;
      if (!p.booking_id) return;
      const booking = bookingsMap.get(p.booking_id);
      if (!booking || !booking.designer_id) return;
      const designerId = booking.designer_id as number;
      const designer = designersMap.get(designerId);
      if (!designer) return;

      const existing = stylistMap.get(designerId) || {
        designerId,
        name: designer.name,
        revenue: 0,
        bookingsCount: 0,
      };
      existing.revenue += toNum(p.amount);
      existing.bookingsCount += 1;
      stylistMap.set(designerId, existing);
    });

    const topStylistsRaw = Array.from(stylistMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    );

    const topStylistsTotal = topStylistsRaw.reduce(
      (sum, s) => sum + s.revenue,
      0
    );

    const topStylists = topStylistsRaw.slice(0, 5).map((s) => ({
      designerId: s.designerId,
      name: s.name,
      revenue: s.revenue,
      bookingsCount: s.bookingsCount,
      percentageOfTop:
        topStylistsTotal > 0 ? (s.revenue / topStylistsTotal) * 100 : 0,
    }));

    // Comment: Revenue by service (grouped by service name)
    const serviceMapAgg = new Map<
      number,
      {
        serviceId: number;
        name: string;
        transactions: number;
        revenue: number;
      }
    >();

    paymentsData.forEach((p) => {
      if (p.type === 'product') return;
      if (!p.booking_id) return;
      const booking = bookingsMap.get(p.booking_id);
      if (!booking || !booking.service_id) return;
      const serviceId = booking.service_id as number;
      const service = servicesMap.get(serviceId);
      if (!service) return;

      const existing = serviceMapAgg.get(serviceId) || {
        serviceId,
        name: service.name,
        transactions: 0,
        revenue: 0,
      };
      existing.transactions += 1;
      existing.revenue += toNum(p.amount);
      serviceMapAgg.set(serviceId, existing);
    });

    const serviceCategories = Array.from(serviceMapAgg.values()).sort(
      (a, b) => b.revenue - a.revenue
    );

    return NextResponse.json(
      {
        from: fromDate,
        to: toDate,
        totalRevenue,
        transactions,
        avgTicket,
        trendPoints,
        paymentMethods,
        topStylists,
        serviceCategories,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in sales summary route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


