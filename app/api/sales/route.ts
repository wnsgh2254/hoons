import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { issuePrepaidPassFromSale } from '@/lib/data';
import {
  adjustInventoryStockForSaleItem,
  adjustPrepaidBalance,
  assertSufficientPrepaidBalance,
} from '@/lib/sales-reconciliation';
import { attachBookingDepositPaidToSales } from '@/lib/booking-deposit-paid';
import {
  normalizePaymentAmounts,
  resolveSalePaymentMethod,
} from '@/lib/sales-payment-utils';

const normalizeName = (value: string | null | undefined) => value?.trim().toLowerCase() || '';

function managerMatchesDesigner(
  manager: string | null | undefined,
  designer: { name?: string | null; english_name?: string | null } | null | undefined,
) {
  const normalizedManager = normalizeName(manager);
  if (!normalizedManager || !designer) return false;

  return [designer.name, designer.english_name].some(
    (candidate) => normalizeName(candidate) === normalizedManager,
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');
    const bookingId = searchParams.get('booking_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const designerId = searchParams.get('designer_id');
    const itemType = searchParams.get('item_type');
    const shopId = searchParams.get('shop_id');

    if (!customerId && !bookingId && !startDate) {
      return NextResponse.json(
        { error: 'customer_id, booking_id, or start_date is required' },
        { status: 400 },
      );
    }

    let query = supabase
      .from('sales')
      .select(`
        *,
        customer:customer_id ( id, name, phone ),
        sales_items (*)
      `)
      .order('sales_date', { ascending: false })
      .order('sales_time', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }
    if (bookingId) {
      query = query.eq('booking_id', Number(bookingId));
    }
    if (startDate) {
      query = query.gte('sales_date', startDate);
    }
    if (endDate) {
      query = query.lte('sales_date', endDate);
    }
    if (shopId) {
      query = query.eq('shop_id', Number(shopId));
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find')) {
        return NextResponse.json({ sales: [] }, { status: 200 });
      }
      console.error('Error fetching sales:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sales history.' },
        { status: 500 },
      );
    }

    let sales = data || [];

    if (designerId) {
      const { data: designer } = await supabase
        .from('designers')
        .select('id, name, english_name')
        .eq('id', Number(designerId))
        .maybeSingle();

      if (!designer) {
        return NextResponse.json({ sales: [] }, { status: 200 });
      }

      const targetDesignerId = Number(designerId);
      sales = sales
        .map((sale: any) => ({
          ...sale,
          sales_items: (sale.sales_items || []).filter((item: any) => {
            // Prefer stable id match. Keep legacy manager-name fallback for old rows.
            if (item.designer_id != null) return Number(item.designer_id) === targetDesignerId;
            return managerMatchesDesigner(item.manager, designer);
          }),
        }))
        .filter((sale: any) => (sale.sales_items || []).length > 0);
    }

    if (itemType) {
      const normalizedItemType = itemType === 'membership' ? 'prepaid' : itemType;
      sales = sales
        .map((sale: any) => ({
          ...sale,
          sales_items: (sale.sales_items || []).filter(
            (item: any) => String(item.item_type) === normalizedItemType,
          ),
        }))
        .filter((sale: any) => (sale.sales_items || []).length > 0);
    }

    await attachBookingDepositPaidToSales(supabase, sales);

    return NextResponse.json({ sales }, { status: 200 });
  } catch (error: any) {
    console.error('Error in sales GET route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sales history.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customer_id,
      shop_id,
      booking_id,
      items,
      sales_amount,
      discount_amount,
      total,
      payment_method,
      payment_amounts,
      point_accumulation,
      memo,
      sales_date,
      sales_time,
      prepaid_customer_id,
    } = body;

    if (!customer_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Customer ID and sales items are required.' },
        { status: 400 },
      );
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('name')
      .eq('id', Number(customer_id))
      .maybeSingle();

    if (customerError || !customer) {
      console.error('Error resolving sale customer:', customerError);
      return NextResponse.json(
        { error: 'Customer was not found.' },
        { status: 400 },
      );
    }

    const linkedBookingId =
      booking_id != null && booking_id !== '' && !Number.isNaN(Number(booking_id))
        ? Number(booking_id)
        : null;

    const normalizedPayments = normalizePaymentAmounts(payment_amounts);
    const totalPrepaidDeductionFromRequest = (items || []).reduce(
      (sum: number, item: any) => sum + Number(item.prepaid_deduction || 0),
      0,
    );
    const resolvedPaymentMethod = resolveSalePaymentMethod(
      normalizedPayments,
      totalPrepaidDeductionFromRequest,
      payment_method,
    );
    const prepaidCustomerId =
      prepaid_customer_id != null &&
      prepaid_customer_id !== '' &&
      !Number.isNaN(Number(prepaid_customer_id))
        ? Number(prepaid_customer_id)
        : Number(customer_id);

    if (totalPrepaidDeductionFromRequest > 0) {
      try {
        await assertSufficientPrepaidBalance(
          supabase,
          prepaidCustomerId,
          totalPrepaidDeductionFromRequest,
        );
      } catch (prepaidValidationError: any) {
        return NextResponse.json(
          { error: prepaidValidationError?.message || '정액권 잔액을 확인할 수 없습니다.' },
          { status: 400 },
        );
      }
    }

    const { data: saleHeader, error: headerError } = await supabase
      .from('sales')
      .insert({
        customer_id: customer_id,
        // Comment: Snapshot the customer name so historical sales keep their display name.
        customer_name: customer.name || null,
        shop_id: shop_id || null,
        booking_id: linkedBookingId,
        sales_date: sales_date || new Date().toISOString().split('T')[0],
        sales_time: sales_time || new Date().toTimeString().slice(0, 5),
        sales_amount: sales_amount || 0,
        discount_amount: discount_amount || 0,
        total_amount: total || 0,
        payment_method: resolvedPaymentMethod,
        cash_amount: normalizedPayments.cash,
        card_amount: normalizedPayments.card,
        bank_transfer_amount: normalizedPayments.bank_transfer,
        point_accumulation: point_accumulation || 0,
        memo: memo || null,
      })
      .select()
      .single();

    if (headerError) {
      console.error('Error creating sale header:', headerError);
      return NextResponse.json(
        { error: 'Failed to register sale.' },
        { status: 500 },
      );
    }

    const saleItems = items.map((item: any) => ({
      sale_id: saleHeader.id,
      item_type: item.type,
      item_name: item.name,
      unit_price: item.unit_price || 0,
      quantity: item.quantity || 1,
      discount: item.discount || 0,
      discount_type: item.discount_type || null,
      discount_value: item.discount_value || null,
      amount: item.amount || 0,
      designer_id: item.designer_id || null,
      manager: item.manager || null,
      sales_classification: item.sales_classification || null,
      point_deduction: item.point_deduction || 0,
      prepaid_deduction: item.prepaid_deduction || 0,
    }));

    const { error: itemsError } = await supabase
      .from('sales_items')
      .insert(saleItems);

    if (itemsError) {
      console.error('Error creating sale items:', itemsError);
      await supabase.from('sales').delete().eq('id', saleHeader.id);
      return NextResponse.json(
        { error: 'Failed to register sale items.' },
        { status: 500 },
      );
    }

    const rawItems = (items || []) as any[];
    const appliedInventoryAdjustments: Array<{ itemName: string; quantity: number }> = [];
    const issuedPrepaidCredits: Array<{ passLabel: string; points: number }> = [];
    let appliedPrepaidDeduction = 0;

    try {
      for (const rawItem of rawItems) {
        const itemType = String(rawItem.type || '');
        const qty = Math.max(1, Math.round(Number(rawItem.quantity || 1)));

        if (itemType === 'product') {
          await adjustInventoryStockForSaleItem(supabase, {
            shopId: shop_id,
            itemName: rawItem.name,
            quantityDelta: -qty,
          });
          appliedInventoryAdjustments.push({
            itemName: String(rawItem.name || ''),
            quantity: qty,
          });
          continue;
        }

        if (itemType !== 'prepaid') continue;

        const perCredit = Math.round(
          Number(rawItem.prepaid_credit_points ?? rawItem.prepaid_points ?? 0),
        );
        const totalCredit = perCredit * qty;
        if (totalCredit <= 0) continue;

        const passLabel = String(rawItem.name || 'Prepaid').trim();
        const expiresAt =
          rawItem.prepaid_expires_at != null && String(rawItem.prepaid_expires_at).trim() !== ''
            ? String(rawItem.prepaid_expires_at).trim()
            : null;

        await issuePrepaidPassFromSale({
          customerId: Number(customer_id),
          passLabel,
          creditPoints: totalCredit,
          expiresAt,
        });
        issuedPrepaidCredits.push({ passLabel, points: totalCredit });
      }

      const totalPrepaidDeduction = saleItems.reduce(
        (sum: number, item: any) => sum + Number(item.prepaid_deduction || 0),
        0,
      );

      if (totalPrepaidDeduction > 0) {
        await adjustPrepaidBalance(supabase, {
          customerId: prepaidCustomerId,
          pointsDelta: -totalPrepaidDeduction,
        });
        appliedPrepaidDeduction = totalPrepaidDeduction;
      }
    } catch (reconciliationError: any) {
      console.error('Error reconciling sale side effects:', reconciliationError);

      for (const adjustment of appliedInventoryAdjustments.reverse()) {
        try {
          await adjustInventoryStockForSaleItem(supabase, {
            itemName: adjustment.itemName,
            quantityDelta: adjustment.quantity,
          });
        } catch (rollbackError) {
          console.error('Failed to rollback inventory adjustment:', rollbackError);
        }
      }

      for (const issued of issuedPrepaidCredits.reverse()) {
        try {
          await adjustPrepaidBalance(supabase, {
            customerId: Number(customer_id),
            passLabel: issued.passLabel,
            pointsDelta: -issued.points,
          });
        } catch (rollbackError) {
          console.error('Failed to rollback prepaid issuance:', rollbackError);
        }
      }

      if (appliedPrepaidDeduction > 0) {
        try {
          await adjustPrepaidBalance(supabase, {
            customerId: prepaidCustomerId,
            pointsDelta: appliedPrepaidDeduction,
          });
        } catch (rollbackError) {
          console.error('Failed to rollback prepaid deduction:', rollbackError);
        }
      }

      await supabase.from('sales_items').delete().eq('sale_id', saleHeader.id);
      await supabase.from('sales').delete().eq('id', saleHeader.id);

      return NextResponse.json(
        {
          error:
            reconciliationError?.message ||
            'Failed to reconcile sale side effects. The sale registration was rolled back.',
        },
        { status: 400 },
      );
    }

    if (booking_id != null && booking_id !== '') {
      const bid = Number(booking_id);
      if (!Number.isNaN(bid)) {
        const { data: booking, error: bookingLookupError } = await supabase
          .from('bookings')
          .select('id, customer_id')
          .eq('id', bid)
          .maybeSingle();
        if (bookingLookupError || !booking) {
          console.error('sale_completed: booking lookup failed', bookingLookupError);
          await supabase.from('sales_items').delete().eq('sale_id', saleHeader.id);
          await supabase.from('sales').delete().eq('id', saleHeader.id);
          return NextResponse.json(
            { error: 'Linked booking was not found.' },
            { status: 400 },
          );
        }
        if (booking.customer_id != null && Number(booking.customer_id) !== Number(customer_id)) {
          await supabase.from('sales_items').delete().eq('sale_id', saleHeader.id);
          await supabase.from('sales').delete().eq('id', saleHeader.id);
          return NextResponse.json(
            { error: 'Booking and customer do not match.' },
            { status: 400 },
          );
        }
        const { error: bookingUpdateError } = await supabase
          .from('bookings')
          .update({ sale_completed: 1 })
          .eq('id', bid);
        if (bookingUpdateError) {
          console.error('Error setting booking sale_completed:', bookingUpdateError);
          await supabase.from('sales_items').delete().eq('sale_id', saleHeader.id);
          await supabase.from('sales').delete().eq('id', saleHeader.id);
          return NextResponse.json(
            { error: 'Failed to mark the booking as completed.' },
            { status: 500 },
          );
        }
      }
    }

    if (point_accumulation > 0) {
      const { error: pointsError } = await supabase.rpc('increment_customer_points', {
        customer_id: customer_id,
        points: point_accumulation,
      });

      if (pointsError) {
        console.error('Error updating customer points:', pointsError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        sale: saleHeader,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Error in sales POST route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register sale.' },
      { status: 500 },
    );
  }
}
