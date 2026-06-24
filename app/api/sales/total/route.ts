import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  applyPaymentsToDepositSummary,
  applyRefundsToDepositSummary,
  applySalesToDepositSummary,
  emptyDepositSummary,
  recalculateDepositTotals,
} from '@/lib/sales-deposit-summary';
import { attachBookingDepositPaidToSales } from '@/lib/booking-deposit-paid';
import {
  fetchForfeitedDepositsInBookingDateRange,
  sumForfeitedDepositAmount,
} from '@/lib/forfeited-deposit-sales';
import {
  applySaleToPaymentDetails,
  emptyPaymentDetails,
  recalculatePaymentDetailColumnTotals,
} from '@/lib/sales-payment-details';
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
        payment_method,
        booking_id,
        paid_deposit,
        bookings:booking_id ( deposit_paid ),
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

    if (shopId) {
      const numericShopId = Number(shopId);
      salesQuery = salesQuery.eq('shop_id', numericShopId);
      refundsQuery = refundsQuery.eq('shop_id', numericShopId);
    }

    const [{ data: sales, error: salesError }, { data: refunds, error: refundsError }] =
      await Promise.all([salesQuery, refundsQuery]);

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

    if (refundsError) {
      console.warn('Transient upstream error fetching refunds for sales total; using empty refund summary.', refundsError);
    }

    // Payments by payment date (created_at), not booking appointment date.
    let paymentsQuery = supabase
      .from('payments')
      .select(
        `
        id,
        booking_id,
        amount,
        method,
        type,
        created_at,
        bookings!inner (
          shop_id
        )
      `,
      )
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59.999`);

    if (shopId) {
      paymentsQuery = paymentsQuery.eq('bookings.shop_id', Number(shopId));
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

    await attachBookingDepositPaidToSales(supabase, salesData);

    const paymentDetails = emptyPaymentDetails();

    salesData.forEach((sale: any) => {
      applySaleToPaymentDetails(paymentDetails, sale);
    });

    const forfeitedDeposits = await fetchForfeitedDepositsInBookingDateRange(
      supabase,
      startDate,
      endDate,
      shopId,
    );
    const forfeitedDepositTotal = sumForfeitedDepositAmount(forfeitedDeposits);
    if (forfeitedDepositTotal > 0) {
      paymentDetails.deposit.service += roundToCents(forfeitedDepositTotal);
      paymentDetails.deposit.total += roundToCents(forfeitedDepositTotal);
    }

    recalculatePaymentDetailColumnTotals(paymentDetails);

    const depositSummary = emptyDepositSummary();

    applyPaymentsToDepositSummary(depositSummary, paymentsData);
    applySalesToDepositSummary(depositSummary, salesData);
    applyRefundsToDepositSummary(depositSummary, refundsData);
    recalculateDepositTotals(depositSummary);

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
