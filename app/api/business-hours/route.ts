import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - List business hours, optionally filtered by shopId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    let query = supabase
      .from('business_hours')
      .select('*')
      .order('id', { ascending: true });

    if (shopId) {
      query = query.eq('shop_id', Number(shopId));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching business hours:', error);
      return NextResponse.json({ error: '영업시간 조회에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ businessHours: data || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in business-hours GET route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST - Create a new business hour entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop_id, start_time, end_time, days } = body;

    if (!start_time || !end_time || !days || !Array.isArray(days) || days.length === 0) {
      return NextResponse.json(
        { error: 'start_time, end_time, days는 필수입니다.' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('business_hours')
      .insert({
        shop_id: shop_id ? Number(shop_id) : null,
        start_time,
        end_time,
        days,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating business hour:', error);
      return NextResponse.json({ error: '영업시간 생성에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ businessHour: data }, { status: 201 });
  } catch (error) {
    console.error('Error in business-hours POST route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PATCH - Update a business hour entry by id
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, shop_id, start_time, end_time, days } = body;

    if (!id) {
      return NextResponse.json({ error: 'id는 필수입니다.' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (shop_id !== undefined) updateData.shop_id = shop_id;
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (days !== undefined) updateData.days = days;

    const { data, error } = await supabase
      .from('business_hours')
      .update(updateData)
      .eq('id', Number(id))
      .select()
      .single();

    if (error) {
      console.error('Error updating business hour:', error);
      return NextResponse.json({ error: '영업시간 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ businessHour: data }, { status: 200 });
  } catch (error) {
    console.error('Error in business-hours PATCH route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE - Delete a business hour entry by id
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id 파라미터는 필수입니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('business_hours')
      .delete()
      .eq('id', Number(id));

    if (error) {
      console.error('Error deleting business hour:', error);
      return NextResponse.json({ error: '영업시간 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in business-hours DELETE route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
