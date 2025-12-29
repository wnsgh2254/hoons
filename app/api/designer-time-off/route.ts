import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: GET - Fetch time off records for designers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const designerId = searchParams.get('designer_id');
    const shopId = searchParams.get('shop_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase
      .from('designer_time_off')
      .select(
        `
        *,
        designer:designer_id ( id, name ),
        shop:shop_id ( id, name )
      `
      )
      .order('start_date', { ascending: true });

    if (designerId) {
      query = query.eq('designer_id', Number(designerId));
    }
    if (shopId) {
      query = query.eq('shop_id', Number(shopId));
    }
    if (startDate && endDate) {
      // Comment: Find overlapping time off periods
      query = query.or(
        `and(start_date.lte.${endDate},end_date.gte.${startDate})`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching designer time off:', error);
      return NextResponse.json(
        { error: '휴무 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ timeOffs: data || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in designer-time-off route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Comment: POST - Create a new time off record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { designer_id, shop_id, start_date, end_date, reason } = body;

    if (!designer_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: '디자이너 ID, 시작일, 종료일은 필수입니다.' },
        { status: 400 }
      );
    }

    if (new Date(end_date) < new Date(start_date)) {
      return NextResponse.json(
        { error: '종료일은 시작일보다 이후여야 합니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('designer_time_off')
      .insert({
        designer_id: Number(designer_id),
        shop_id: shop_id ? Number(shop_id) : null,
        start_date,
        end_date,
        reason: reason || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating time off:', error);
      return NextResponse.json(
        { error: '휴무 등록에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ timeOff: data }, { status: 201 });
  } catch (error) {
    console.error('Error in designer-time-off POST route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

