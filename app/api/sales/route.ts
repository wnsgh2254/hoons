import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
