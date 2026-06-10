import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  adjustInventoryStockForSaleItem,
  adjustPrepaidBalance,
  assertSufficientPrepaidBalance,
} from '@/lib/sales-reconciliation';
import { archiveSaleDeletion } from '@/lib/sale-deletion-log';
import {
  getSaleIssuedPrepaidCreditLines,
  getSalePrepaidDeductionTotal,
} from '@/lib/sales-payment-utils';
import { restoreBookingAfterSaleDelete } from '@/lib/sale-booking-link';
import { resolveBookingDepositPaidForSale } from '@/lib/booking-deposit-paid';
import {
  resolvePaidDepositForSaleWrite,
  sumServiceGrossFromSaleItems,
} from '@/lib/sale-paid-deposit';
import { cashTenderedForStorage } from '@/lib/sales-cash-payment';
import {
  normalizePaymentAmounts,
  resolveSalePaymentMethod,
} from '@/lib/sales-payment-utils';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const saleId = Number(id);
    if (!saleId || Number.isNaN(saleId)) {
      return NextResponse.json(
        { error: '유효하지 않은 판매 ID 입니다.' },
        { status: 400 }
      );
    }

    const { data: sale, error } = await supabase
      .from('sales')
      .select(
        `
        *,
        sales_items (*)
      `
      )
      .eq('id', saleId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching sale:', error);
      return NextResponse.json(
        { error: '판매를 불러오지 못했습니다.' },
        { status: 500 }
      );
    }

    if (!sale) {
      return NextResponse.json(
        { error: '판매를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    let customer_name = sale.customer_name || '';
    if (sale.customer_id) {
      const { data: c } = await supabase
        .from('customers')
        .select('name')
        .eq('id', sale.customer_id)
        .maybeSingle();
      customer_name = sale.customer_name || c?.name || '';
    }

    const booking_deposit_paid = await resolveBookingDepositPaidForSale(supabase, sale);

    return NextResponse.json(
      { sale: { ...sale, customer_name, booking_deposit_paid } },
      { status: 200 }
    );
  } catch (e: any) {
    console.error('Error in sales GET:', e);
    return NextResponse.json(
      { error: e.message || '오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { error: '유효하지 않은 판매 ID 입니다.' },
        { status: 400 }
      );
    }

    const saleId = Number(id);

    const { data: saleExists } = await supabase
      .from('sales')
      .select('id')
      .eq('id', saleId)
      .maybeSingle();

    if (!saleExists) {
      return NextResponse.json(
        { error: '판매를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    let linkedBookingId: number | null = null;
    try {
      const archived = await archiveSaleDeletion(supabase, saleId);
      linkedBookingId = archived.bookingId;

      const customerId = archived.sale.customer_id != null ? Number(archived.sale.customer_id) : null;

      const prepaidToRestore = getSalePrepaidDeductionTotal(archived.sale.sales_items || []);
      if (prepaidToRestore > 0 && customerId != null) {
        await adjustPrepaidBalance(supabase, {
          customerId,
          pointsDelta: prepaidToRestore,
        });
      }

      const issuedPrepaidLines = getSaleIssuedPrepaidCreditLines(archived.sale.sales_items || []);
      if (issuedPrepaidLines.length > 0 && customerId != null) {
        for (const line of issuedPrepaidLines) {
          await adjustPrepaidBalance(supabase, {
            customerId,
            passLabel: line.passLabel,
            pointsDelta: -line.points,
          });
        }
      }
    } catch (archiveError: any) {
      console.error('Error archiving sale before delete:', archiveError);
      return NextResponse.json(
        { error: archiveError.message || '판매 삭제 기록 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    // Delete sales_items first (child rows)
    const { error: itemsError } = await supabase
      .from('sales_items')
      .delete()
      .eq('sale_id', Number(id));

    if (itemsError) {
      console.error('Error deleting sales items:', itemsError);
      return NextResponse.json(
        { error: '판매 항목 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    // Then delete the sales header
    const { error: headerError } = await supabase
      .from('sales')
      .delete()
      .eq('id', saleId);

    if (headerError) {
      console.error('Error deleting sale:', headerError);
      return NextResponse.json(
        { error: '판매 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (linkedBookingId) {
      try {
        await restoreBookingAfterSaleDelete(supabase, linkedBookingId);
      } catch (bookingRestoreError: any) {
        console.error('Error restoring booking after sale delete:', bookingRestoreError);
        return NextResponse.json(
          { error: bookingRestoreError.message || '예약 상태 복구에 실패했습니다.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: true, restored_booking_id: linkedBookingId },
      { status: 200 },
    );
  } catch (error: any) {
    console.error('Error in sales DELETE route:', error);
    return NextResponse.json(
      { error: error.message || '판매 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { error: '유효하지 않은 판매 ID 입니다.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      customer_id, shop_id, items, sales_amount, discount_amount,
      total, payment_method, payment_amounts,
      point_accumulation, memo, sales_date, sales_time,
      prepaid_customer_id,
      paid_deposit,
      cash_tendered,
    } = body;

    if (!customer_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: '고객 ID와 판매 항목이 필요합니다.' },
        { status: 400 }
      );
    }

    const { data: existingSale, error: existingSaleError } = await supabase
      .from('sales')
      .select('shop_id, booking_id')
      .eq('id', Number(id))
      .maybeSingle();

    if (existingSaleError || !existingSale) {
      return NextResponse.json(
        { error: '판매를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const resolvedShopId =
      shop_id != null && shop_id !== '' ? Number(shop_id) : existingSale.shop_id ?? null;

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('name')
      .eq('id', Number(customer_id))
      .maybeSingle();

    if (customerError || !customer) {
      console.error('Error resolving sale customer:', customerError);
      return NextResponse.json(
        { error: '고객을 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    // Pre-calculate prepaid deduction delta for edit mode
    const { data: oldItems } = await supabase
      .from('sales_items')
      .select('item_type, item_name, quantity, prepaid_deduction')
      .eq('sale_id', Number(id));
    const oldPrepaidDeductionTotal = (oldItems || []).reduce(
      (sum: number, row: any) => sum + Number(row.prepaid_deduction || 0),
      0,
    );
    const newPrepaidDeductionTotal = (items || []).reduce(
      (sum: number, row: any) => sum + Number(row.prepaid_deduction || 0),
      0,
    );
    const prepaidDelta = newPrepaidDeductionTotal - oldPrepaidDeductionTotal;
    const oldProductQuantityMap = new Map<string, number>();
    const newProductQuantityMap = new Map<string, number>();
    const addQuantity = (map: Map<string, number>, itemName: string, quantity: number) => {
      map.set(itemName, (map.get(itemName) || 0) + quantity);
    };
    (oldItems || []).forEach((row: any) => {
      if (String(row.item_type) !== 'product') return;
      addQuantity(
        oldProductQuantityMap,
        String(row.item_name || ''),
        Math.max(1, Number(row.quantity || 1)),
      );
    });
    (items || []).forEach((row: any) => {
      if (String(row.type) !== 'product') return;
      addQuantity(
        newProductQuantityMap,
        String(row.name || ''),
        Math.max(1, Number(row.quantity || 1)),
      );
    });

    const normalizedPayments = normalizePaymentAmounts(payment_amounts);
    const resolvedPaymentMethod = resolveSalePaymentMethod(
      normalizedPayments,
      newPrepaidDeductionTotal,
      payment_method,
    );
    const prepaidCustomerId =
      prepaid_customer_id != null &&
      prepaid_customer_id !== '' &&
      !Number.isNaN(Number(prepaid_customer_id))
        ? Number(prepaid_customer_id)
        : Number(customer_id);

    if (prepaidDelta > 0) {
      try {
        await assertSufficientPrepaidBalance(supabase, prepaidCustomerId, prepaidDelta);
      } catch (prepaidValidationError: any) {
        return NextResponse.json(
          { error: prepaidValidationError?.message || '정액권 잔액을 확인할 수 없습니다.' },
          { status: 400 },
        );
      }
    }

    const linkedBookingIdForDeposit =
      existingSale.booking_id != null && !Number.isNaN(Number(existingSale.booking_id))
        ? Number(existingSale.booking_id)
        : null;
    const paidDepositToStore = await resolvePaidDepositForSaleWrite(supabase, {
      bookingId: linkedBookingIdForDeposit,
      paidDepositFromRequest: paid_deposit,
      grossServiceTotal: sumServiceGrossFromSaleItems(items),
    });

    // 1. Update the sales header (no edit_history column in DB — omit to avoid PGRST204)
    const { data: updatedSale, error: headerError } = await supabase
      .from('sales')
      .update({
        customer_id,
        // Comment: Snapshot the customer name so historical sales keep their display name.
        customer_name: customer.name || null,
        shop_id: resolvedShopId,
        booking_id: existingSale.booking_id ?? null,
        sales_date: sales_date || new Date().toISOString().split('T')[0],
        sales_time: sales_time || new Date().toTimeString().slice(0, 5),
        sales_amount: sales_amount || 0,
        discount_amount: discount_amount || 0,
        total_amount: total || 0,
        paid_deposit: paidDepositToStore,
        payment_method: resolvedPaymentMethod,
        cash_amount: normalizedPayments.cash,
        cash_tendered: cashTenderedForStorage(
          normalizedPayments.cash,
          cash_tendered,
        ),
        card_amount: normalizedPayments.card,
        bank_transfer_amount: normalizedPayments.bank_transfer,
        point_accumulation: point_accumulation || 0,
        memo: memo || null,
      })
      .eq('id', Number(id))
      .select()
      .single();

    if (headerError) {
      console.error('Error updating sale header:', headerError);
      return NextResponse.json(
        { error: '판매 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 2. Delete old sales_items
    const { error: deleteItemsError } = await supabase
      .from('sales_items')
      .delete()
      .eq('sale_id', Number(id));

    if (deleteItemsError) {
      console.error('Error deleting old sales items:', deleteItemsError);
      return NextResponse.json(
        { error: '판매 항목 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 3. Insert new sales_items
    const saleItems = items.map((item: any) => ({
      sale_id: Number(id),
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
      prepaid_credit_points:
        item.type === 'prepaid'
          ? Math.round(Number(item.prepaid_credit_points ?? item.prepaid_points ?? 0))
          : 0,
    }));

    const { error: insertItemsError } = await supabase
      .from('sales_items')
      .insert(saleItems);

    if (insertItemsError) {
      console.error('Error inserting new sales items:', insertItemsError);
      return NextResponse.json(
        { error: '판매 항목 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    for (const [itemName, oldQty] of oldProductQuantityMap.entries()) {
      const newQty = newProductQuantityMap.get(itemName) || 0;
      const delta = newQty - oldQty;
      if (delta !== 0) {
        await adjustInventoryStockForSaleItem(supabase, {
          shopId: resolvedShopId,
          itemName,
          quantityDelta: -delta,
        });
      }
      newProductQuantityMap.delete(itemName);
    }

    for (const [itemName, qty] of newProductQuantityMap.entries()) {
      await adjustInventoryStockForSaleItem(supabase, {
        shopId: resolvedShopId,
        itemName,
        quantityDelta: -qty,
      });
    }

    if (prepaidDelta !== 0) {
      await adjustPrepaidBalance(supabase, {
        customerId: prepaidCustomerId,
        pointsDelta: -prepaidDelta,
      });
    }

    return NextResponse.json(
      { success: true, sale: updatedSale },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in sales PUT route:', error);
    return NextResponse.json(
      { error: error.message || '판매 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
