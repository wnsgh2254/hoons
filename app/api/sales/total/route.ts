import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { roundToCents } from '@/lib/utils';

const toNum = (value: unknown) => Number(value || 0);
const isTransientUpstreamError = (error: any) => {
  const message = String(error?.message || '');
  return (
    message.includes('502') ||
    message.includes('Bad gateway') ||
    message.includes('<!DOCTYPE html>') ||
    message.includes('Cloudflare')
  );
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

    let salesQuery = supabase
      .from('sales')
      .select(`
        id,
        shop_id,
        customer_id,
        sales_date,
        total_amount,
        cash_amount,
        card_amount,
        bank_transfer_amount,
        sales_items (
          item_type,
          quantity,
          amount,
          prepaid_deduction
        )
      `)
      .gte('sales_date', startDate)
      .lte('sales_date', endDate);

    let refundsQuery = supabase
      .from('refunds')
      .select(`
        id,
        shop_id,
        refund_date,
        total_amount,
        cash_amount,
        card_amount,
        bank_transfer_amount,
        refund_items (
          item_type,
          quantity,
          amount
        )
      `)
      .gte('refund_date', startDate)
      .lte('refund_date', endDate);

    let bookingsQuery = supabase
      .from('bookings')
      .select('id, shop_id')
      .gte('booking_date', startDate)
      .lte('booking_date', endDate);

    if (shopId) {
      const numericShopId = Number(shopId);
      salesQuery = salesQuery.eq('shop_id', numericShopId);
      refundsQuery = refundsQuery.eq('shop_id', numericShopId);
      bookingsQuery = bookingsQuery.eq('shop_id', numericShopId);
    }

    const [{ data: sales, error: salesError }, { data: refunds, error: refundsError }, { data: bookings, error: bookingsError }] =
      await Promise.all([salesQuery, refundsQuery, bookingsQuery]);

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      return NextResponse.json(
        { error: 'Failed to load sales data.' },
        { status: 500 },
      );
    }

    if (refundsError && !isTransientUpstreamError(refundsError)) {
      console.error('Error fetching refunds:', refundsError);
      return NextResponse.json(
        { error: 'Failed to load refund data.' },
        { status: 500 },
      );
    }

    if (bookingsError && !isTransientUpstreamError(bookingsError)) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to load booking data.' },
        { status: 500 },
      );
    }

    if (refundsError) {
      console.warn('Transient upstream error fetching refunds for sales total; using empty refund summary.', refundsError);
    }

    if (bookingsError) {
      console.warn('Transient upstream error fetching bookings for sales total; deposit summary may be incomplete.', bookingsError);
    }

    const bookingIds = ((bookings as any[]) || []).map((booking: any) => booking.id);
    let paymentsQuery = supabase
      .from('payments')
      .select('id, booking_id, amount, method, type, created_at')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);

    if (bookingIds.length > 0) {
      paymentsQuery = paymentsQuery.in('booking_id', bookingIds);
    } else {
      paymentsQuery = paymentsQuery.eq('booking_id', -1);
    }

    const { data: payments, error: paymentsError } = await paymentsQuery;
    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    const salesData = sales || [];
    const refundsData = refundsError ? [] : (refunds || []);
    const paymentsData = payments || [];

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

    salesData.forEach((sale: any) => {
      (sale.sales_items || []).forEach((item: any) => {
        const quantity = Math.max(1, toNum(item.quantity));
        const amount = toNum(item.amount);

        if (item.item_type === 'service') {
          salesSummary.service.quantity += quantity;
          salesSummary.service.amount += amount;
        } else if (item.item_type === 'product') {
          salesSummary.product.quantity += quantity;
          salesSummary.product.amount += amount;
        } else if (item.item_type === 'prepaid') {
          salesSummary.membership.quantity += quantity;
          salesSummary.membership.amount += amount;
        }
      });
    });

    refundsData.forEach((refund: any) => {
      (refund.refund_items || []).forEach((item: any) => {
        const quantity = Math.max(1, toNum(item.quantity));
        const amount = toNum(item.amount);

        if (item.item_type === 'service') {
          refundSummary.service.quantity += quantity;
          refundSummary.service.amount += amount;
        } else if (item.item_type === 'product') {
          refundSummary.product.quantity += quantity;
          refundSummary.product.amount += amount;
        } else if (item.item_type === 'prepaid') {
          refundSummary.membership.quantity += quantity;
          refundSummary.membership.amount += amount;
        }
      });
    });

    salesSummary.total =
      salesSummary.service.amount +
      salesSummary.product.amount +
      salesSummary.membership.amount;

    refundSummary.total =
      refundSummary.service.amount +
      refundSummary.product.amount +
      refundSummary.membership.amount;

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
      bank_transfer: {
        service: 0,
        product: 0,
        membership: 0,
        total: 0,
      },
    };

    salesData.forEach((sale: any) => {
      const items = sale.sales_items || [];
      const typeTotals = {
        service: items
          .filter((item: any) => item.item_type === 'service')
          .reduce((sum: number, item: any) => sum + toNum(item.amount), 0),
        product: items
          .filter((item: any) => item.item_type === 'product')
          .reduce((sum: number, item: any) => sum + toNum(item.amount), 0),
        membership: items
          .filter((item: any) => item.item_type === 'prepaid')
          .reduce((sum: number, item: any) => sum + toNum(item.amount), 0),
      };
      const payableTotal =
        typeTotals.service + typeTotals.product + typeTotals.membership || toNum(sale.total_amount);

      const paymentBuckets = [
        { key: 'cash' as const, amount: toNum(sale.cash_amount) },
        { key: 'card' as const, amount: toNum(sale.card_amount) },
        { key: 'bank_transfer' as const, amount: toNum(sale.bank_transfer_amount) },
      ];

      paymentBuckets.forEach(({ key, amount }) => {
        if (amount <= 0) return;

        const serviceShare = payableTotal > 0 ? (typeTotals.service / payableTotal) * amount : 0;
        const productShare = payableTotal > 0 ? (typeTotals.product / payableTotal) * amount : 0;
        const membershipShare = Math.max(0, amount - serviceShare - productShare);

        paymentDetails[key].service += roundToCents(serviceShare);
        paymentDetails[key].product += roundToCents(productShare);
        paymentDetails[key].membership += roundToCents(membershipShare);
        paymentDetails[key].total += roundToCents(amount);
      });
    });

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
      bank_transfer: {
        deposit: 0,
        depositRefund: 0,
        paymentAtSale: 0,
        uncollectedDeposit: 0,
        refund: 0,
        total: 0,
      },
    };

    const resolveDepositMethod = (method: string): 'cash' | 'card' | 'bank_transfer' => {
      if (method === 'cash') return 'cash';
      if (method === 'bank_transfer') return 'bank_transfer';
      return 'card';
    };

    paymentsData.forEach((payment: any) => {
      const method = resolveDepositMethod(String(payment.method || 'card'));
      const amount = toNum(payment.amount);

      if (payment.type === 'deposit') {
        depositSummary[method].deposit += amount;
      } else if (payment.type === 'balance') {
        depositSummary[method].paymentAtSale += amount;
      }

      depositSummary[method].total += amount;
    });

    refundsData.forEach((refund: any) => {
      const totalRefundAmount = toNum(refund.total_amount);
      const depositRefundAmount = (refund.refund_items || [])
        .filter((item: any) => String(item.item_type) === 'deposit')
        .reduce((sum: number, item: any) => sum + toNum(item.amount), 0);

      const paymentBuckets = [
        { key: 'cash' as const, amount: toNum(refund.cash_amount) },
        { key: 'card' as const, amount: toNum(refund.card_amount) },
        { key: 'bank_transfer' as const, amount: toNum(refund.bank_transfer_amount) },
      ];

      paymentBuckets.forEach(({ key, amount }) => {
        if (amount <= 0) return;

        const depositShare =
          totalRefundAmount > 0 ? Math.min(amount, (depositRefundAmount / totalRefundAmount) * amount) : 0;
        const regularRefundShare = Math.max(0, amount - depositShare);

        depositSummary[key].depositRefund += depositShare;
        depositSummary[key].refund += regularRefundShare;
        depositSummary[key].total -= amount;
      });
    });

    const membershipDeductions = {
      service: { quantity: 0, amount: 0 },
      product: { quantity: 0, amount: 0 },
      total: 0,
    };

    const uniqueCustomers = {
      service: new Set<number>(),
      product: new Set<number>(),
    };

    salesData.forEach((sale: any) => {
      (sale.sales_items || []).forEach((item: any) => {
        const prepaidDeduction = toNum(item.prepaid_deduction);

        if (item.item_type === 'service') {
          if (sale.customer_id != null) {
            uniqueCustomers.service.add(Number(sale.customer_id));
          }
          if (prepaidDeduction > 0) {
            membershipDeductions.service.quantity += 1;
            membershipDeductions.service.amount += prepaidDeduction;
          }
        } else if (item.item_type === 'product') {
          if (sale.customer_id != null) {
            uniqueCustomers.product.add(Number(sale.customer_id));
          }
          if (prepaidDeduction > 0) {
            membershipDeductions.product.quantity += 1;
            membershipDeductions.product.amount += prepaidDeduction;
          }
        }
      });
    });

    membershipDeductions.total =
      membershipDeductions.service.amount + membershipDeductions.product.amount;

    const totalUniqueCustomers = new Set<number>([
      ...uniqueCustomers.service,
      ...uniqueCustomers.product,
    ]);

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
        total:
          salesSummary.service.amount +
          salesSummary.product.amount +
          membershipDeductions.total,
      },
      customers: {
        service: { quantity: uniqueCustomers.service.size, amount: 0 },
        product: { quantity: uniqueCustomers.product.size, amount: 0 },
        total: { quantity: totalUniqueCustomers.size, amount: 0 },
      },
    };

    if (revenueSummary.customers.service.quantity > 0) {
      revenueSummary.customers.service.amount = roundToCents(
        revenueSummary.sales.service.amount / revenueSummary.customers.service.quantity,
      );
    }
    if (revenueSummary.customers.product.quantity > 0) {
      revenueSummary.customers.product.amount = roundToCents(
        revenueSummary.sales.product.amount / revenueSummary.customers.product.quantity,
      );
    }
    if (revenueSummary.customers.total.quantity > 0) {
      revenueSummary.customers.total.amount = roundToCents(
        revenueSummary.total.total / revenueSummary.customers.total.quantity,
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
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in total sales route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 },
    );
  }
}
