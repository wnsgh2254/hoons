import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Helper to safely convert to number
const toNum = (v: any) => Number(v || 0);

// Comment: Get total sales data for sales page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '시작 날짜와 종료 날짜가 필요합니다.' },
        { status: 400 }
      );
    }

    // Comment: Fetch bookings in date range
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, service_id, total_amount, booking_date, status, deposit_amount, prepaid_pass_id')
      .gte('booking_date', startDate)
      .lte('booking_date', endDate);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json(
        { error: '예약 데이터 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // Comment: Fetch payments in date range (including prepaid pass sales)
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, booking_id, amount, method, type, created_at, designer_id')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return NextResponse.json(
        { error: '결제 데이터 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // Comment: Fetch product sales
    const { data: productSales, error: productSalesError } = await supabase
      .from('product_sale_items')
      .select('quantity, line_amount, created_at, payments(id, method, type)')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);

    if (productSalesError) {
      console.error('Error fetching product sales:', productSalesError);
    }

    // Comment: Fetch prepaid pass purchases (payments with type that indicates prepaid)
    // Comment: For now, we'll check if there's a prepaid_passes table or track prepaid purchases differently
    // Comment: Assuming prepaid purchases are tracked via payments with a specific type or booking_id is null

    const bookingsData = bookings || [];
    const paymentsData = payments || [];
    const productSalesData = productSales || [];

    // Comment: Initialize sales summary
    const salesSummary = {
      service: { quantity: 0, amount: 0 },
      product: { quantity: 0, amount: 0 },
      membership: { quantity: 0, amount: 0 },
      total: 0,
    };

    const refundSummary = {
      service: { quantity: 0, amount: 0 },
      product: { quantity: 0, amount: 0 },
      membership: { quantity: 0, amount: 0 },
      total: 0,
    };

    // Comment: Process service sales from bookings
    bookingsData.forEach((booking: any) => {
      const isPrepaidDeduction = booking.prepaid_pass_id !== null && booking.prepaid_pass_id !== undefined;
      
      if (booking.status === 'cancelled') {
        // Comment: Count as refund
        if (booking.service_id) {
          refundSummary.service.quantity += 1;
          refundSummary.service.amount += toNum(booking.total_amount);
        }
      } else if (booking.status === 'confirmed') {
        // Comment: Count as sale (not prepaid deduction)
        if (booking.service_id && !isPrepaidDeduction) {
          salesSummary.service.quantity += 1;
          salesSummary.service.amount += toNum(booking.total_amount);
        }
      }
    });

    // Comment: Process product sales
    productSalesData.forEach((item: any) => {
      const payment = item.payments;
      if (payment && payment.type === 'product') {
        salesSummary.product.quantity += toNum(item.quantity);
        salesSummary.product.amount += toNum(item.line_amount);
      }
    });

    // Comment: Process prepaid pass purchases (payments with booking_id is null)
    const prepaidPayments = paymentsData.filter((p: any) => {
      // Comment: Prepaid pass sales are payments with booking_id is null
      return p.booking_id === null || p.booking_id === undefined;
    });

    prepaidPayments.forEach((payment: any) => {
      salesSummary.membership.quantity += 1;
      salesSummary.membership.amount += toNum(payment.amount);
    });

    // Comment: Calculate totals
    salesSummary.total =
      salesSummary.service.amount +
      salesSummary.product.amount +
      salesSummary.membership.amount;

    refundSummary.total =
      refundSummary.service.amount +
      refundSummary.product.amount +
      refundSummary.membership.amount;

    // Comment: Payment method breakdown
    const paymentDetails = {
      cash: {
        service: 0,
        product: 0,
        membership: 0,
        total: 0,
      },
      card: {
        service: 0,
        product: 0,
        membership: 0,
        total: 0,
      },
    };

    // Comment: Process payments by method
    paymentsData.forEach((payment: any) => {
      const method = payment.method === 'cash' ? 'cash' : 'card';
      const amount = toNum(payment.amount);

      if (payment.booking_id === null || payment.booking_id === undefined) {
        // Comment: Prepaid pass sale (membership)
        paymentDetails[method].membership += amount;
      } else if (payment.type === 'deposit' || payment.type === 'balance') {
        // Comment: Service payment
        paymentDetails[method].service += amount;
      } else if (payment.type === 'product') {
        // Comment: Product payment
        paymentDetails[method].product += amount;
      } else {
        // Comment: Might be membership or other
        paymentDetails[method].membership += amount;
      }

      paymentDetails[method].total += amount;
    });

    // Comment: Deposit summary
    const depositSummary = {
      cash: {
        deposit: 0,
        depositRefund: 0,
        paymentAtSale: 0,
        uncollectedDeposit: 0,
        refund: 0,
        total: 0,
      },
      card: {
        deposit: 0,
        depositRefund: 0,
        paymentAtSale: 0,
        uncollectedDeposit: 0,
        refund: 0,
        total: 0,
      },
    };

    // Comment: Process deposits (exclude prepaid pass sales)
    paymentsData.forEach((payment: any) => {
      // Comment: Skip prepaid pass sales (booking_id is null) for deposit summary
      if (payment.booking_id === null || payment.booking_id === undefined) {
        return;
      }

      const method = payment.method === 'cash' ? 'cash' : 'card';
      const amount = toNum(payment.amount);

      if (payment.type === 'deposit') {
        depositSummary[method].deposit += amount;
      } else if (payment.type === 'balance') {
        depositSummary[method].paymentAtSale += amount;
      }

      depositSummary[method].total += amount;
    });

    // Comment: Revenue summary (with membership deductions)
    // Comment: Calculate membership deductions from bookings with prepaid_pass_id
    const membershipDeductions = {
      service: { quantity: 0, amount: 0 },
      product: { quantity: 0, amount: 0 },
      total: 0,
    };

    bookingsData.forEach((booking: any) => {
      const isPrepaidDeduction = booking.prepaid_pass_id !== null && booking.prepaid_pass_id !== undefined;
      if (booking.status === 'confirmed' && isPrepaidDeduction) {
        if (booking.service_id) {
          membershipDeductions.service.quantity += 1;
          membershipDeductions.service.amount += toNum(booking.total_amount);
        }
      }
    });

    membershipDeductions.total = membershipDeductions.service.amount + membershipDeductions.product.amount;

    const revenueSummary = {
      sales: {
        service: { quantity: salesSummary.service.quantity, amount: salesSummary.service.amount },
        product: { quantity: salesSummary.product.quantity, amount: salesSummary.product.amount },
        total: salesSummary.service.amount + salesSummary.product.amount,
      },
      membershipDeduction: membershipDeductions,
      total: {
        service: { amount: salesSummary.service.amount + membershipDeductions.service.amount },
        product: { amount: salesSummary.product.amount + membershipDeductions.product.amount },
        total: salesSummary.service.amount + salesSummary.product.amount + membershipDeductions.total,
      },
      customers: {
        service: { quantity: salesSummary.service.quantity, amount: 0 },
        product: { quantity: salesSummary.product.quantity, amount: 0 },
        total: { quantity: salesSummary.service.quantity, amount: 0 },
      },
    };

    // Comment: Calculate average per customer
    if (revenueSummary.customers.service.quantity > 0) {
      revenueSummary.customers.service.amount = Math.round(
        revenueSummary.sales.service.amount / revenueSummary.customers.service.quantity
      );
    }
    if (revenueSummary.customers.product.quantity > 0) {
      revenueSummary.customers.product.amount = Math.round(
        revenueSummary.sales.product.amount / revenueSummary.customers.product.quantity
      );
    }
    if (revenueSummary.customers.total.quantity > 0) {
      revenueSummary.customers.total.amount = Math.round(
        revenueSummary.total.total / revenueSummary.customers.total.quantity
      );
    }

    return NextResponse.json(
      {
        sales: salesSummary,
        refund: refundSummary,
        paymentDetails,
        depositSummary,
        revenueSummary,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in total sales route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
