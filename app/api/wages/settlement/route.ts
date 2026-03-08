import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { designer_id, week_start_date, week_end_date, year, month, week_num, is_settled } = body;

    if (!designer_id || !week_start_date || !week_end_date || !year || !month || week_num == null) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    // Upsert: check if record exists
    const { data: existing } = await supabase
      .from('wage_settlements')
      .select('id')
      .eq('designer_id', designer_id)
      .eq('week_start_date', week_start_date)
      .eq('week_end_date', week_end_date)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('wage_settlements')
        .update({
          is_settled,
          settled_at: is_settled ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating settlement:', error);
        return NextResponse.json({ error: '정산 상태 업데이트 실패' }, { status: 500 });
      }
      return NextResponse.json({ settlement: data });
    } else {
      const { data, error } = await supabase
        .from('wage_settlements')
        .insert({
          designer_id,
          week_start_date,
          week_end_date,
          year,
          month,
          week_num,
          is_settled,
          settled_at: is_settled ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting settlement:', error);
        return NextResponse.json({ error: '정산 상태 저장 실패' }, { status: 500 });
      }
      return NextResponse.json({ settlement: data });
    }
  } catch (error) {
    console.error('Error in settlement route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
