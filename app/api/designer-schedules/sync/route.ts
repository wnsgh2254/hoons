import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { resolveShopIdForDesigner, upsertDesignerScheduleRow } from '@/lib/designer-schedule-server';

// Comment: Batch delete + upsert for reservation resources (one round-trip instead of N DELETE/POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { designer_id, shop_id, delete_ids = [], entries = [] } = body;

    if (!designer_id) {
      return NextResponse.json({ error: 'designer_id는 필수입니다.' }, { status: 400 });
    }

    if (!Array.isArray(delete_ids) || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'delete_ids와 entries는 배열이어야 합니다.' }, { status: 400 });
    }

    const resolvedShopId = await resolveShopIdForDesigner(Number(designer_id), shop_id);
    if (!resolvedShopId) {
      return NextResponse.json(
        {
          error:
            '스케줄에 연결할 매장이 없습니다. 예약 자원에서 매장을 지정한 뒤 다시 시도하세요.',
        },
        { status: 400 }
      );
    }

    const ids = delete_ids.map((id: unknown) => Number(id)).filter((n) => Number.isFinite(n));
    if (ids.length > 0) {
      const { error } = await supabase.from('designer_schedules').delete().in('id', ids);
      if (error) {
        console.error('Error batch deleting schedules:', error);
        return NextResponse.json({ error: '스케줄 삭제에 실패했습니다.' }, { status: 500 });
      }
    }

    const schedules: unknown[] = [];
    for (const entry of entries) {
      const { weekday, start_time, end_time, effective_from, effective_to } = entry;
      if (weekday === undefined || !start_time || !end_time) {
        return NextResponse.json(
          { error: '각 항목에 weekday, start_time, end_time이 필요합니다.' },
          { status: 400 }
        );
      }
      if (weekday < 0 || weekday > 6) {
        return NextResponse.json(
          { error: 'weekday는 0(일요일)부터 6(토요일) 사이여야 합니다.' },
          { status: 400 }
        );
      }
      const { schedule, error: upsertErr } = await upsertDesignerScheduleRow({
        designer_id: Number(designer_id),
        resolvedShopId,
        weekday: Number(weekday),
        start_time,
        end_time,
        effective_from,
        effective_to,
      });
      if (upsertErr) {
        return NextResponse.json(
          { error: upsertErr || '스케줄 저장에 실패했습니다.' },
          { status: 500 }
        );
      }
      if (schedule) schedules.push(schedule);
    }

    return NextResponse.json({ schedules }, { status: 200 });
  } catch (error) {
    console.error('Error in designer-schedules sync:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
