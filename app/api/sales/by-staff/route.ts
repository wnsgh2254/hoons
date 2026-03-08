import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Helper to safely convert to number
const toNum = (v: any) => Number(v || 0);

// Comment: Get sales data by staff/designer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const designerId = searchParams.get('designer_id');
    const includePointDeduction = searchParams.get('include_point_deduction') === 'true';

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '시작 날짜와 종료 날짜가 필요합니다.' },
        { status: 400 }
      );
    }

    // Comment: Build query for bookings
    let bookingsQuery = supabase
      .from('bookings')
      .select('id, designer_id, service_id, total_amount, booking_date, status, deposit_amount, prepaid_pass_id')
      .gte('booking_date', startDate)
      .lte('booking_date', endDate)
      .eq('status', 'confirmed');

    if (designerId) {
      bookingsQuery = bookingsQuery.eq('designer_id', designerId);
    }

    const { data: bookings, error: bookingsError } = await bookingsQuery;

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json(
        { error: '예약 데이터 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // Comment: Fetch payments for these bookings AND prepaid pass sales (booking_id is null)
    const bookingIds = (bookings || []).map((b: any) => b.id);
    let paymentsQuery = supabase
      .from('payments')
      .select('id, booking_id, amount, method, type, created_at, designer_id')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);

    // Comment: Get payments for bookings OR prepaid pass sales (booking_id is null)
    if (bookingIds.length > 0) {
      paymentsQuery = paymentsQuery.or(`booking_id.in.(${bookingIds.join(',')}),booking_id.is.null`);
    } else {
      // Comment: If no bookings, still get prepaid pass sales
      paymentsQuery = paymentsQuery.is('booking_id', null);
    }

    // Comment: Filter by designer if specified
    if (designerId) {
      paymentsQuery = paymentsQuery.eq('designer_id', designerId);
    }

    const { data: payments, error: paymentsError } = await paymentsQuery;

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    // Comment: Fetch product sales by designer
    // Comment: Product sales might not have direct designer association
    // Comment: We'll need to check if product_sale_items has designer_id or link through bookings

    // Comment: Fetch services for price lookup
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

    const servicesMap = new Map<number, { id: number; name: string; price: number }>();
    (services || []).forEach((s: any) => servicesMap.set(s.id, s));

    // Comment: Fetch designers (from bookings and prepaid pass sales)
    const designerIdsFromBookings: number[] = Array.from(
      new Set<number>(
        (bookings || [])
          .map((b: any) => b.designer_id)
          .filter((id: number | null | undefined): id is number => id !== null && id !== undefined)
      )
    );

    const designerIdsFromPayments: number[] = Array.from(
      new Set<number>(
        (payments || [])
          .map((p: any) => p.designer_id)
          .filter((id: number | null | undefined): id is number => id !== null && id !== undefined)
      )
    );

    const allDesignerIds: number[] = Array.from(new Set<number>([...designerIdsFromBookings, ...designerIdsFromPayments]));

    const { data: designers } = await supabase
      .from('designers')
      .select('id, name')
      .in('id', allDesignerIds.length > 0 ? allDesignerIds : [-1]);

    const designersMap = new Map<number, { id: number; name: string }>();
    (designers || []).forEach((d: any) => designersMap.set(d.id, d));

    // Comment: Group bookings by designer
    type StaffSalesData = {
      designerId: number;
      name: string;
      sales: {
        service: { quantity: number; amount: number };
        product: { quantity: number; amount: number };
        subtotal: number;
        membership: { quantity: number; amount: number };
        total: number;
      };
      membershipDeduction: {
        service: { quantity: number; amount: number };
        subtotal: number;
      };
      total: {
        service: { amount: number };
        product: { amount: number };
        subtotal: number;
      };
    };

    const staffSalesMap = new Map<number, StaffSalesData>();

    // Comment: Initialize staff data
    allDesignerIds.forEach((id: number) => {
      const designer = designersMap.get(id);
      if (designer) {
        staffSalesMap.set(id, {
          designerId: id,
          name: designer.name,
          sales: {
            service: { quantity: 0, amount: 0 },
            product: { quantity: 0, amount: 0 },
            subtotal: 0,
            membership: { quantity: 0, amount: 0 },
            total: 0,
          },
          membershipDeduction: {
            service: { quantity: 0, amount: 0 },
            subtotal: 0,
          },
          total: {
            service: { amount: 0 },
            product: { amount: 0 },
            subtotal: 0,
          },
        });
      }
    });

    // Comment: Process bookings
    (bookings || []).forEach((booking: any) => {
      if (!booking.designer_id) return;

      const staffData = staffSalesMap.get(booking.designer_id);
      if (!staffData) return;

      const service = servicesMap.get(booking.service_id || 0);
      const amount = toNum(booking.total_amount);
      const isPrepaidDeduction = booking.prepaid_pass_id !== null && booking.prepaid_pass_id !== undefined;

      if (service) {
        if (isPrepaidDeduction) {
          // Comment: This is a membership deduction
          staffData.membershipDeduction.service.quantity += 1;
          staffData.membershipDeduction.service.amount += amount;
        } else {
          // Comment: This is a regular sale
          staffData.sales.service.quantity += 1;
          staffData.sales.service.amount += amount;
        }
      }
    });

    // Comment: Process prepaid pass sales (payments with booking_id is null)
    (payments || []).forEach((payment: any) => {
      if (payment.booking_id !== null) return; // Comment: Skip regular payments
      if (!payment.designer_id) return;

      const staffData = staffSalesMap.get(payment.designer_id);
      if (!staffData) return;

      // Comment: This is a prepaid pass sale
      const amount = toNum(payment.amount);
      staffData.sales.membership.quantity += 1;
      staffData.sales.membership.amount += amount;
    });

    // Comment: Calculate subtotals and totals
    staffSalesMap.forEach((staffData) => {
      staffData.sales.subtotal =
        staffData.sales.service.amount + staffData.sales.product.amount;
      staffData.sales.total =
        staffData.sales.subtotal +
        staffData.sales.membership.amount;

      staffData.membershipDeduction.subtotal =
        staffData.membershipDeduction.service.amount;

      staffData.total.service.amount =
        staffData.sales.service.amount + staffData.membershipDeduction.service.amount;
      staffData.total.product.amount = staffData.sales.product.amount;
      staffData.total.subtotal =
        staffData.total.service.amount + staffData.total.product.amount;
    });

    const staffSales = Array.from(staffSalesMap.values());

    return NextResponse.json(
      {
        staffSales,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in by-staff sales route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
