import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { issuePrepaidPassFromSale } from '@/lib/data';
import {
  adjustInventoryStockForSaleItem,
  adjustPrepaidBalance,
  assertSufficientPrepaidBalance,
} from '@/lib/sales-reconciliation';
import { archiveSaleDeletion } from '@/lib/sale-deletion-log';
import {
  getSaleIssuedPrepaidCreditLines,
  getSalePrepaidDeductionTotal,
  normalizePaymentAmounts,
  prepaidCustomerIdForStorage,
  resolvePrepaidOwnerCustomerId,
  resolveSalePaymentMethod,
} from '@/lib/sales-payment-utils';
import { restoreBookingAfterSaleDelete } from '@/lib/sale-booking-link';
import { resolveBookingDepositPaidForSale } from '@/lib/booking-deposit-paid';
import {
  resolvePaidDepositForSaleWrite,
  sumServiceGrossFromSaleItems,
} from '@/lib/sale-paid-deposit';
import { cashTenderedForStorage } from '@/lib/sales-cash-payment';
import { roundToCents } from '@/lib/utils';

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
    let prepaidToRestore = 0;
    let prepaidOwnerId: number | null = null;
    let issuedPrepaidLines: Array<{ passLabel: string; points: number }> = [];
    let saleCustomerId: number | null = null;

    try {
      const archived = await archiveSaleDeletion(supabase, saleId);
      linkedBookingId = archived.bookingId;

      saleCustomerId =
        archived.sale.customer_id != null ? Number(archived.sale.customer_id) : null;
      prepaidOwnerId = resolvePrepaidOwnerCustomerId(
        (archived.sale as { prepaid_customer_id?: number | null }).prepaid_customer_id,
        archived.sale.customer_id,
      );
      prepaidToRestore = getSalePrepaidDeductionTotal(archived.sale.sales_items || []);
      issuedPrepaidLines = getSaleIssuedPrepaidCreditLines(archived.sale.sales_items || []);
    } catch (archiveError: any) {
      console.error('Error archiving sale before delete:', archiveError);
      return NextResponse.json(
        { error: archiveError.message || '판매 삭제 기록 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    // Delete sale rows before balance restore so a failed restore cannot double-refund on retry.
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

    try {
      if (prepaidToRestore > 0 && prepaidOwnerId != null) {
        await adjustPrepaidBalance(supabase, {
          customerId: prepaidOwnerId,
          pointsDelta: prepaidToRestore,
        });
      }

      if (issuedPrepaidLines.length > 0 && saleCustomerId != null) {
        for (const line of issuedPrepaidLines) {
          await adjustPrepaidBalance(supabase, {
            customerId: saleCustomerId,
            passLabel: line.passLabel,
            pointsDelta: -line.points,
          });
        }
      }
    } catch (prepaidRestoreError: any) {
      console.error('Sale deleted but prepaid balance restore failed:', prepaidRestoreError);
      return NextResponse.json(
        {
          error:
            prepaidRestoreError?.message ||
            '판매는 삭제되었으나 정액권 잔액 복구에 실패했습니다. 잔액을 수동으로 확인해 주세요.',
          sale_deleted: true,
          restored_booking_id: linkedBookingId,
        },
        { status: 500 },
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
      .select('shop_id, booking_id, customer_id, prepaid_customer_id')
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

    const { data: oldItems } = await supabase
      .from('sales_items')
      .select(
        'item_type, item_name, quantity, prepaid_deduction, prepaid_credit_points, amount, unit_price, discount',
      )
      .eq('sale_id', Number(id));

    const oldPrepaidDeductionTotal = getSalePrepaidDeductionTotal(oldItems || []);
    const newPrepaidDeductionTotal = getSalePrepaidDeductionTotal(
      (items || []).map((row: any) => ({ prepaid_deduction: row.prepaid_deduction })),
    );
    const oldPrepaidOwnerId = resolvePrepaidOwnerCustomerId(
      existingSale.prepaid_customer_id,
      existingSale.customer_id,
    );
    const newPrepaidOwnerId = resolvePrepaidOwnerCustomerId(prepaid_customer_id, customer_id);
    const storedPrepaidCustomerId = prepaidCustomerIdForStorage(
      newPrepaidOwnerId,
      newPrepaidDeductionTotal,
    );

    const oldIssuedPrepaidLines = getSaleIssuedPrepaidCreditLines(oldItems || []);

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

    // Validate additional prepaid deduction needed after restoring the old amount when same owner.
    try {
      if (
        oldPrepaidOwnerId != null &&
        newPrepaidOwnerId != null &&
        oldPrepaidOwnerId === newPrepaidOwnerId
      ) {
        const prepaidDelta = roundToCents(newPrepaidDeductionTotal - oldPrepaidDeductionTotal);
        if (prepaidDelta > 0) {
          await assertSufficientPrepaidBalance(supabase, newPrepaidOwnerId, prepaidDelta);
        }
      } else if (newPrepaidDeductionTotal > 0 && newPrepaidOwnerId != null) {
        await assertSufficientPrepaidBalance(
          supabase,
          newPrepaidOwnerId,
          newPrepaidDeductionTotal,
        );
      }
    } catch (prepaidValidationError: any) {
      return NextResponse.json(
        { error: prepaidValidationError?.message || '정액권 잔액을 확인할 수 없습니다.' },
        { status: 400 },
      );
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
        prepaid_customer_id: storedPrepaidCustomerId,
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
      discount_type_2: item.discount_type_2 || null,
      discount_value_2: item.discount_value_2 || null,
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

    try {
      // Prepaid deduction: restore old owner, then apply new deduction to new owner.
      if (
        oldPrepaidOwnerId != null &&
        newPrepaidOwnerId != null &&
        oldPrepaidOwnerId === newPrepaidOwnerId
      ) {
        const prepaidDelta = roundToCents(newPrepaidDeductionTotal - oldPrepaidDeductionTotal);
        if (prepaidDelta !== 0) {
          await adjustPrepaidBalance(supabase, {
            customerId: newPrepaidOwnerId,
            pointsDelta: -prepaidDelta,
          });
        }
      } else {
        if (oldPrepaidDeductionTotal > 0 && oldPrepaidOwnerId != null) {
          await adjustPrepaidBalance(supabase, {
            customerId: oldPrepaidOwnerId,
            pointsDelta: oldPrepaidDeductionTotal,
          });
        }
        if (newPrepaidDeductionTotal > 0 && newPrepaidOwnerId != null) {
          await adjustPrepaidBalance(supabase, {
            customerId: newPrepaidOwnerId,
            pointsDelta: -newPrepaidDeductionTotal,
          });
        }
      }

      // Prepaid pass sales (credits): only adjust when issued amounts or sale customer change.
      const oldCreditCustomerId =
        existingSale.customer_id != null ? Number(existingSale.customer_id) : Number(customer_id);
      const newCreditCustomerId = Number(customer_id);
      const newIssuedByRaw = (items as any[])
        .filter((rawItem) => String(rawItem.type || '') === 'prepaid')
        .map((rawItem) => {
          const qty = Math.max(1, Math.round(Number(rawItem.quantity || 1)));
          const perCredit = Math.round(
            Number(rawItem.prepaid_credit_points ?? rawItem.prepaid_points ?? 0),
          );
          return {
            passLabel: String(rawItem.name || 'Prepaid').trim(),
            points: perCredit * qty,
            expiresAt:
              rawItem.prepaid_expires_at != null && String(rawItem.prepaid_expires_at).trim() !== ''
                ? String(rawItem.prepaid_expires_at).trim()
                : null,
            raw: rawItem,
          };
        })
        .filter((line) => line.points > 0);

      const creditsChanged =
        oldCreditCustomerId !== newCreditCustomerId ||
        oldIssuedPrepaidLines.length !== newIssuedByRaw.length ||
        oldIssuedPrepaidLines.some((oldLine, idx) => {
          const next = newIssuedByRaw[idx];
          return !next || oldLine.passLabel !== next.passLabel || oldLine.points !== next.points;
        });

      if (creditsChanged) {
        for (const line of oldIssuedPrepaidLines) {
          await adjustPrepaidBalance(supabase, {
            customerId: oldCreditCustomerId,
            passLabel: line.passLabel,
            pointsDelta: -line.points,
          });
        }
        for (const line of newIssuedByRaw) {
          await issuePrepaidPassFromSale({
            customerId: newCreditCustomerId,
            passLabel: line.passLabel,
            creditPoints: line.points,
            expiresAt: line.expiresAt,
          });
        }
      }
    } catch (prepaidReconcileError: any) {
      console.error('Error reconciling prepaid balances on sale edit:', prepaidReconcileError);
      return NextResponse.json(
        {
          error:
            prepaidReconcileError?.message ||
            '판매는 수정되었으나 정액권 잔액 조정에 실패했습니다. 잔액을 확인해 주세요.',
        },
        { status: 500 },
      );
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
