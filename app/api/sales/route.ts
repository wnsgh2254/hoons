import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { issuePrepaidPassFromSale } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    if (!customerId) {
      return NextResponse.json(
        { error: 'customer_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        sales_items (*)
      `)
      .eq('customer_id', customerId)
      .order('sales_date', { ascending: false })
      .order('sales_time', { ascending: false });

    if (error) {
      // Table may not exist yet - return empty array gracefully
      if (error.code === 'PGRST205' || error.message?.includes('Could not find')) {
        return NextResponse.json({ sales: [] }, { status: 200 });
      }
      console.error('Error fetching sales:', error);
      return NextResponse.json(
        { error: '판매 내역 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sales: data || [] }, { status: 200 });
  } catch (error: any) {
    console.error('Error in sales GET route:', error);
    return NextResponse.json(
      { error: error.message || '판매 내역 조회 중 오류가 발생했습니다.' },
      { status: 500 }
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
    } = body;

    if (!customer_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: '고객 ID와 판매 항목이 필요합니다.' },
        { status: 400 }
      );
    }

    // 판매 날짜와 시간 결합
    const salesDateTime = sales_date && sales_time 
      ? `${sales_date}T${sales_time}:00`
      : new Date().toISOString();

    // 판매 헤더 생성
    const { data: saleHeader, error: headerError } = await supabase
      .from('sales')
      .insert({
        customer_id: customer_id,
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
      })
      .select()
      .single();

    if (headerError) {
      console.error('Error creating sale header:', headerError);
      return NextResponse.json(
        { error: '판매 등록에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 판매 항목 생성
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
      // 헤더는 이미 생성되었으므로 롤백
      await supabase.from('sales').delete().eq('id', saleHeader.id);
      return NextResponse.json(
        { error: '판매 항목 등록에 실패했습니다.' },
        { status: 500 }
      );
    }

    // Comment: Credit prepaid_passes for each prepaid line item (purchase). Deduction-only path below is separate.
    const rawItems = (items || []) as any[];
    for (const rawItem of rawItems) {
      if (String(rawItem.type) !== 'prepaid') continue;
      const qty = Math.max(1, Math.round(Number(rawItem.quantity || 1)));
      const perCredit = Math.round(Number(rawItem.prepaid_credit_points ?? rawItem.prepaid_points ?? 0));
      const totalCredit = perCredit * qty;
      if (totalCredit <= 0) continue;
      const passLabel = String(rawItem.name || '정액권').trim();
      const expiresAt =
        rawItem.prepaid_expires_at != null && String(rawItem.prepaid_expires_at).trim() !== ''
          ? String(rawItem.prepaid_expires_at).trim()
          : null;
      try {
        await issuePrepaidPassFromSale({
          customerId: Number(customer_id),
          passLabel: passLabel,
          creditPoints: totalCredit,
          expiresAt,
        });
      } catch (prepaidIssueErr: any) {
        console.error('Error issuing prepaid pass after sale:', prepaidIssueErr);
        await supabase.from('sales_items').delete().eq('sale_id', saleHeader.id);
        await supabase.from('sales').delete().eq('id', saleHeader.id);
        return NextResponse.json(
          {
            error:
              prepaidIssueErr?.message ||
              '정액권 잔액 반영에 실패했습니다. 판매 등록이 취소되었습니다.',
          },
          { status: 400 },
        );
      }
    }

    // Apply prepaid deduction to customer's prepaid balance
    const totalPrepaidDeduction = saleItems.reduce(
      (sum: number, item: any) => sum + Number(item.prepaid_deduction || 0),
      0,
    );
    if (totalPrepaidDeduction > 0) {
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
        console.error('Error fetching prepaid pass for deduction:', prepaidSelErr);
      } else {
        const legacyIds = (prepaidRows || [])
          .filter((r: any) => r.customer_id == null)
          .map((r: any) => Number(r.id))
          .filter((id: number) => Number.isFinite(id));
        if (legacyIds.length > 0) {
          await supabase
            .from('prepaid_passes')
            .update({ customer_id: customer_id })
            .in('id', legacyIds);
        }
        const usableRows = (prepaidRows || []).filter((row: any) => Number(row.points || 0) > 0);
        let remaining = totalPrepaidDeduction;
        for (const row of usableRows) {
          if (remaining <= 0) break;
          const current = Number(row.points || 0);
          const deduct = Math.min(current, remaining);
          const next = current - deduct;
          const { error: prepaidUpdErr } = await supabase
            .from('prepaid_passes')
            .update({ points: next })
            .eq('id', row.id);
          if (prepaidUpdErr) {
            console.error(`Error updating prepaid balance for pass ${row.id}:`, prepaidUpdErr);
            break;
          }
          remaining -= deduct;
        }
      }
    }

    if (booking_id != null && booking_id !== '') {
      const bid = Number(booking_id);
      if (!Number.isNaN(bid)) {
        const { data: bk, error: bkSelErr } = await supabase
          .from('bookings')
          .select('id, customer_id')
          .eq('id', bid)
          .maybeSingle();
        if (bkSelErr || !bk) {
          console.error('sale_completed: booking lookup failed', bkSelErr);
          await supabase.from('sales_items').delete().eq('sale_id', saleHeader.id);
          await supabase.from('sales').delete().eq('id', saleHeader.id);
          return NextResponse.json(
            { error: '연결된 예약을 찾을 수 없습니다.' },
            { status: 400 },
          );
        }
        if (bk.customer_id != null && Number(bk.customer_id) !== Number(customer_id)) {
          await supabase.from('sales_items').delete().eq('sale_id', saleHeader.id);
          await supabase.from('sales').delete().eq('id', saleHeader.id);
          return NextResponse.json(
            { error: '예약과 고객이 일치하지 않습니다.' },
            { status: 400 },
          );
        }
        const { error: updErr } = await supabase
          .from('bookings')
          .update({ sale_completed: 1 })
          .eq('id', bid);
        if (updErr) {
          console.error('Error setting booking sale_completed:', updErr);
          await supabase.from('sales_items').delete().eq('sale_id', saleHeader.id);
          await supabase.from('sales').delete().eq('id', saleHeader.id);
          return NextResponse.json(
            { error: '예약 계산완료 표시에 실패했습니다.' },
            { status: 500 },
          );
        }
      }
    }

    // 포인트 적립이 있으면 고객 포인트 업데이트
    if (point_accumulation > 0) {
      const { error: pointsError } = await supabase.rpc('increment_customer_points', {
        customer_id: customer_id,
        points: point_accumulation,
      });

      if (pointsError) {
        console.error('Error updating customer points:', pointsError);
        // 포인트 업데이트 실패해도 판매는 완료된 것으로 처리
      }
    }

    return NextResponse.json(
      { 
        success: true,
        sale: saleHeader,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in sales POST route:', error);
    return NextResponse.json(
      { error: error.message || '판매 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
