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

    // Comment: Load bookings in date range (service-history source)
    const { data: bookingsInRange, error: bookingsRangeError } = await supabase
      .from('bookings')
      .select('id, designer_id, service_id, total_amount, booking_date, booking_time, status')
      .gte('booking_date', fromDate.split('T')[0])
      .lte('booking_date', toDate.split('T')[0])
      .eq('status', 'confirmed'); // Only count confirmed bookings

    if (bookingsRangeError) {
      console.error('Error fetching bookings for summary:', bookingsRangeError);
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
    const bookingsData = bookingsInRange || [];

    // Comment: Create a map of booking revenue (from bookings.total_amount or payments)
    const bookingRevenueMap = new Map<number, number>();
    
    // Comment: First, use bookings.total_amount (service-history source)
    bookingsData.forEach((b: any) => {
      if (b.total_amount && toNum(b.total_amount) > 0) {
        bookingRevenueMap.set(b.id, toNum(b.total_amount));
      }
    });

    // Comment: Then, use payments data for bookings not in range or to supplement
    paymentsData.forEach((p: any) => {
      if (p.booking_id) {
        const existing = bookingRevenueMap.get(p.booking_id) || 0;
        // Comment: Use payment amount if booking doesn't have total_amount or payment is higher
        const paymentAmount = toNum(p.amount);
        if (paymentAmount > existing || existing === 0) {
          bookingRevenueMap.set(p.booking_id, paymentAmount);
        }
      }
    });

    const bookingIds = Array.from(bookingRevenueMap.keys());

    // Comment: Load related bookings for designer/service mapping (combine both sources)
    const allBookingIds = Array.from(
      new Set([
        ...bookingsData.map((b: any) => b.id),
        ...paymentsData
          .map((p: any) => p.booking_id)
          .filter(
            (id: number | null | undefined): id is number =>
              id !== null && id !== undefined
          ),
      ])
    );

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, designer_id, service_id, total_amount, booking_date')
      .in('id', allBookingIds.length > 0 ? allBookingIds : [-1]);

    if (bookingsError) {
      console.error('Error fetching bookings for summary:', bookingsError);
      return NextResponse.json({ error: '매출 요약 조회에 실패했습니다.' }, { status: 500 });
    }

    const bookingData = bookings || [];

    const designerIds = Array.from(
      new Set(
        bookingData
          .map((b: any) => b.designer_id)
          .filter(
            (id: number | null | undefined): id is number =>
              id !== null && id !== undefined
          )
      )
    );

    const serviceIds = Array.from(
      new Set(
        bookingData
          .map((b: any) => b.service_id)
          .filter(
            (id: number | null | undefined): id is number =>
              id !== null && id !== undefined
          )
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
    (designers || []).forEach((d: any) => designersMap.set(d.id, d));

    const servicesMap = new Map<number, { id: number; name: string; price: number }>();
    (services || []).forEach((s: any) => servicesMap.set(s.id, s));

    const bookingsMap = new Map<number, any>();
    bookingData.forEach((b: any) => bookingsMap.set(b.id, b));

    // Comment: Overall revenue and ticket metrics (from booking revenue map)
    const totalRevenue = Array.from(bookingRevenueMap.values()).reduce((sum, amount) => sum + amount, 0);
    const transactions = bookingRevenueMap.size;

    const avgTicket = transactions > 0 ? totalRevenue / transactions : 0;

    // Comment: Always group by date (YYYY-MM-DD format)
    // Comment: Frontend will handle transformation for Today/Week/Year
    const trendMap = new Map<
      string,
      {
        date: string;
        revenue: number;
      }
    >();

    bookingsData.forEach((b: any) => {
      const revenue = bookingRevenueMap.get(b.id) || 0;
      if (revenue > 0) {
        const key = b.booking_date as string;
        const existing = trendMap.get(key) || { date: key, revenue: 0 };
        existing.revenue += revenue;
        trendMap.set(key, existing);
      }
    });

    // Comment: Also include payments that don't have bookings
    paymentsData.forEach((p: any) => {
      if (!p.booking_id) {
        const d = new Date(p.created_at as string);
        const key = d.toISOString().slice(0, 10);
        const existing = trendMap.get(key) || { date: key, revenue: 0 };
        existing.revenue += toNum(p.amount);
        trendMap.set(key, existing);
      }
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

    paymentsData.forEach((p: any) => {
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

    // Comment: Top stylists by service revenue (from booking revenue map)
    const stylistMap = new Map<
      number,
      {
        designerId: number;
        name: string;
        revenue: number;
        bookingsCount: number;
      }
    >();

    bookingRevenueMap.forEach((revenue, bookingId) => {
      const booking = bookingsMap.get(bookingId);
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
      existing.revenue += revenue;
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

    // Comment: Revenue by service (from booking revenue map)
    const serviceMapAgg = new Map<
      number,
      {
        serviceId: number;
        name: string;
        transactions: number;
        revenue: number;
      }
    >();

    bookingRevenueMap.forEach((revenue, bookingId) => {
      const booking = bookingsMap.get(bookingId);
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
      existing.revenue += revenue;
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





