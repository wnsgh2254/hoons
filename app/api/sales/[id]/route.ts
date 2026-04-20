import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
      .eq('id', Number(id));

    if (headerError) {
      console.error('Error deleting sale:', headerError);
      return NextResponse.json(
        { error: '판매 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
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
    } = body;

    if (!customer_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: '고객 ID와 판매 항목이 필요합니다.' },
        { status: 400 }
      );
    }

    // Pre-calculate prepaid deduction delta for edit mode
    const { data: oldItems } = await supabase
      .from('sales_items')
      .select('prepaid_deduction')
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

    // 0. Fetch existing edit_history
    const { data: existingSale } = await supabase
      .from('sales')
      .select('edit_history')
      .eq('id', Number(id))
      .single();

    const prevHistory: string[] = existingSale?.edit_history || [];
    const updatedHistory = [...prevHistory, new Date().toISOString()];

    // 1. Update the sales header
    const { data: updatedSale, error: headerError } = await supabase
      .from('sales')
      .update({
        customer_id,
        shop_id: shop_id || null,
        sales_date: sales_date || new Date().toISOString().split('T')[0],
        sales_time: sales_time || new Date().toTimeString().slice(0, 5),
        sales_amount: sales_amount || 0,
        discount_amount: discount_amount || 0,
        total_amount: total || 0,
        payment_method: payment_method || null,
        cash_amount: payment_amounts?.cash || 0,
        card_amount: payment_amounts?.card || 0,
        bank_transfer_amount: payment_amounts?.bank_transfer || 0,
        point_accumulation: point_accumulation || 0,
        memo: memo || null,
        edit_history: updatedHistory,
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
      manager: item.manager || null,
      sales_classification: item.sales_classification || null,
      point_deduction: item.point_deduction || 0,
      prepaid_deduction: item.prepaid_deduction || 0,
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

    // Sync prepaid balance on edit (delta-based)
    if (prepaidDelta !== 0) {
      const { data: customerRow } = await supabase
        .from('customers')
        .select('id, phone')
        .eq('id', customer_id)
        .maybeSingle();
      const normalizedPhone = String(customerRow?.phone || '').replace(/\D/g, '');

      let query = supabase
        .from('prepaid_passes')
        .select('id, points, customer_id')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (normalizedPhone) {
        query = query.or(
          `customer_id.eq.${customer_id},and(customer_id.is.null,phone.eq.${normalizedPhone})`,
        );
      } else {
        query = query.eq('customer_id', customer_id);
      }
      const { data: prepaidRows, error: prepaidSelErr } = await query;

      if (prepaidSelErr) {
        console.error('Error fetching prepaid passes for sale edit:', prepaidSelErr);
      } else if ((prepaidRows || []).length > 0) {
        const legacyIds = (prepaidRows || [])
          .filter((r: any) => r.customer_id == null)
          .map((r: any) => Number(r.id))
          .filter((id: number) => Number.isFinite(id));
        if (legacyIds.length > 0) {
          await supabase
            .from('prepaid_passes')
            .update({ customer_id })
            .in('id', legacyIds);
        }
        if (prepaidDelta > 0) {
          // Additional deduction
          let remaining = prepaidDelta;
          for (const row of prepaidRows || []) {
            if (remaining <= 0) break;
            const current = Number(row.points || 0);
            const deduct = Math.min(current, remaining);
            const next = current - deduct;
            const { error: updErr } = await supabase
              .from('prepaid_passes')
              .update({ points: next })
              .eq('id', row.id);
            if (updErr) {
              console.error(`Error deducting prepaid for pass ${row.id}:`, updErr);
              break;
            }
            remaining -= deduct;
          }
        } else {
          // Refund deduction amount to latest pass
          const refund = Math.abs(prepaidDelta);
          const target = prepaidRows[0];
          const current = Number(target.points || 0);
          const { error: updErr } = await supabase
            .from('prepaid_passes')
            .update({ points: current + refund })
            .eq('id', target.id);
          if (updErr) {
            console.error(`Error refunding prepaid for pass ${target.id}:`, updErr);
          }
        }
      }
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
