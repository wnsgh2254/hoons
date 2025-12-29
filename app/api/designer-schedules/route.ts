import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Return designer_ids that are available (have a schedule) on a given date/weekday
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const shopId = searchParams.get('shopId');

    if (!date) {
      return NextResponse.json({ error: 'date 파라미터는 필수입니다.' }, { status: 400 });
    }

    const weekday = new Date(date).getDay(); // 0 (Sun) - 6 (Sat)

    let query = supabase
      .from('designer_schedules')
      .select('designer_id, weekday, effective_from, effective_to')
      .eq('weekday', weekday);

    if (shopId) {
      query = query.eq('shop_id', Number(shopId));
    }

    // Comment: Only schedules effective on this date
    query = query.lte('effective_from', date);
    query = query.or(`effective_to.is.null,effective_to.gte.${date}`);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching designer schedules:', error);
      return NextResponse.json({ error: '디자이너 스케줄 조회에 실패했습니다.' }, { status: 500 });
    }

    const designerIds = Array.from(
      new Set((data || []).map((row: any) => row.designer_id).filter(Boolean))
    );

    return NextResponse.json({ designerIds }, { status: 200 });
  } catch (error) {
    console.error('Error in designer-schedules route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}





