import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const normalizeName = (value: string | null | undefined) => value?.trim().toLowerCase() || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const designerId = searchParams.get('designer_id');
    const itemType = searchParams.get('item_type');
    const shopId = searchParams.get('shop_id');

    if (!customerId && !startDate) {
      return NextResponse.json({ error: 'customer_id or start_date is required' }, { status: 400 });
    }

    let query = supabase
      .from('refunds')
      .select(`
        *,
        refund_items (*)
      `)
      .order('refund_date', { ascending: false })
      .order('refund_time', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }
    if (startDate) {
      query = query.gte('refund_date', startDate);
    }
    if (endDate) {
      query = query.lte('refund_date', endDate);
    }
    if (shopId) {
      query = query.eq('shop_id', Number(shopId));
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find')) {
        return NextResponse.json({ refunds: [] }, { status: 200 });
      }
      console.error('Error fetching refunds:', error);
      return NextResponse.json({ error: 'Failed to fetch refund history.' }, { status: 500 });
    }

    let refunds = data || [];

    if (designerId) {
      const { data: designer } = await supabase
        .from('designers')
        .select('id, name, english_name')
        .eq('id', Number(designerId))
        .maybeSingle();

      if (!designer) {
        return NextResponse.json({ refunds: [] }, { status: 200 });
      }

      refunds = refunds
        .map((refund: any) => ({
          ...refund,
          refund_items: (refund.refund_items || []).filter((item: any) => {
            const normalizedManager = normalizeName(item.manager);
            return [designer.name, designer.english_name].some(
              (candidate) => normalizeName(candidate) === normalizedManager,
            );
          }),
        }))
        .filter((refund: any) => (refund.refund_items || []).length > 0);
    }

    if (itemType) {
      const normalizedItemType = itemType === 'membership' ? 'prepaid' : itemType;
      refunds = refunds
        .map((refund: any) => ({
          ...refund,
          refund_items: (refund.refund_items || []).filter(
            (item: any) => String(item.item_type) === normalizedItemType,
          ),
        }))
        .filter((refund: any) => (refund.refund_items || []).length > 0);
    }

    return NextResponse.json({ refunds }, { status: 200 });
  } catch (error: any) {
    console.error('Error in refunds GET route:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch refund history.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customer_id,
      shop_id,
      items,
      total_amount,
      point_deduction,
      payment_amounts,
      memo,
      refund_date,
      refund_time,
    } = body;

    if (!customer_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Customer ID and refund items are required.' },
        { status: 400 },
      );
    }

    const { data: refundHeader, error: headerError } = await supabase
      .from('refunds')
      .insert({
        customer_id,
        shop_id: shop_id || null,
        total_amount: total_amount || 0,
        point_deduction: point_deduction || 0,
        cash_amount: payment_amounts?.cash || 0,
        card_amount: payment_amounts?.card || 0,
        bank_transfer_amount: payment_amounts?.bank_transfer || 0,
        memo: memo || null,
        refund_date: refund_date || new Date().toISOString().split('T')[0],
        refund_time: refund_time || new Date().toTimeString().slice(0, 5),
      })
      .select()
      .single();

    if (headerError) {
      console.error('Error creating refund header:', headerError);
      return NextResponse.json({ error: 'Failed to register refund.' }, { status: 500 });
    }

    const refundItems = items.map((item: any) => ({
      refund_id: refundHeader.id,
      item_type: item.type,
      item_name: item.name,
      unit_price: item.unitPrice || 0,
      quantity: item.quantity || 1,
      amount: item.amount || 0,
      manager: item.manager || null,
    }));

    const { error: itemsError } = await supabase
      .from('refund_items')
      .insert(refundItems);

    if (itemsError) {
      console.error('Error creating refund items:', itemsError);
      await supabase.from('refunds').delete().eq('id', refundHeader.id);
      return NextResponse.json({ error: 'Failed to register refund items.' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, refund: refundHeader },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Error in refunds POST route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register refund.' },
      { status: 500 },
    );
  }
}
