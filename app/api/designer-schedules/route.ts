import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: GET - Return designer_ids that are available (have a schedule) on a given date/weekday
// Or return full schedule for a specific designer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const shopId = searchParams.get('shopId');
    const designerId = searchParams.get('designer_id');

    // Comment: If all=true, return all active schedules for all designers (used by HolidayCalendarModal)
    const allParam = searchParams.get('all');
    if (!designerId && !date && allParam === 'true') {
      let query = supabase
        .from('designer_schedules')
        .select('id, designer_id, weekday, start_time, end_time')
        .is('effective_to', null)
        .order('designer_id', { ascending: true })
        .order('weekday', { ascending: true });

      if (shopId) {
        query = query.eq('shop_id', Number(shopId));
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching all schedules:', error);
        return NextResponse.json({ error: '전체 스케줄 조회에 실패했습니다.' }, { status: 500 });
      }

      return NextResponse.json({ schedules: data || [] }, { status: 200 });
    }

    // Comment: If designer_id is provided, return full schedule for that designer
    if (designerId) {
      let query = supabase
        .from('designer_schedules')
        .select('*')
        .eq('designer_id', Number(designerId))
        .order('weekday', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching designer schedules:', error);
        return NextResponse.json({ error: '디자이너 스케줄 조회에 실패했습니다.' }, { status: 500 });
      }

      return NextResponse.json({ schedules: data || [] }, { status: 200 });
    }

    // Comment: Original behavior - return available designer IDs for a date
    if (!date) {
      return NextResponse.json({ error: 'date 파라미터는 필수입니다.' }, { status: 400 });
    }

    const weekday = new Date(date).getDay(); // 0 (Sun) - 6 (Sat)

    // Comment: Get designers with regular schedule for this weekday
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

    const { data: scheduleData, error: scheduleError } = await query;

    if (scheduleError) {
      console.error('Error fetching designer schedules:', scheduleError);
      return NextResponse.json({ error: '디자이너 스케줄 조회에 실패했습니다.' }, { status: 500 });
    }

    const designerIdsFromSchedule = Array.from(
      new Set((scheduleData || []).map((row: any) => row.designer_id).filter(Boolean))
    );

    // Comment: Get designers with special work day (특별 근무일) on this date
    // Special work days override regular holidays - check this FIRST
    let timeOffQuery = supabase
      .from('designer_time_off')
      .select('designer_id, shop_id')
      .eq('reason', '특별 근무일')
      .lte('start_date', date)
      .gte('end_date', date);

    // Comment: If shopId is provided, include both matching shop_id and null shop_id (for all shops)
    if (shopId) {
      timeOffQuery = timeOffQuery.or(`shop_id.eq.${shopId},shop_id.is.null`);
    }

    const { data: timeOffData, error: timeOffError } = await timeOffQuery;

    if (timeOffError) {
      console.error('Error fetching special work days:', timeOffError);
      // Comment: Continue even if time off query fails, but log the error
    }

    const designerIdsFromSpecialWork = Array.from(
      new Set((timeOffData || []).map((row: any) => row.designer_id).filter(Boolean))
    );

    // Comment: Special work days have priority - combine both sets
    // If a designer has special work day, they should appear even if they don't have regular schedule
    const allDesignerIds = Array.from(
      new Set([...designerIdsFromSchedule, ...designerIdsFromSpecialWork])
    );

    // Comment: Log for debugging
    if (designerIdsFromSpecialWork.length > 0) {
      console.log(`[designer-schedules] Special work day designers for ${date}:`, designerIdsFromSpecialWork);
    }

    return NextResponse.json({ designerIds: allDesignerIds }, { status: 200 });
  } catch (error) {
    console.error('Error in designer-schedules route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Comment: POST - Create or update schedule for a designer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { designer_id, shop_id, weekday, start_time, end_time, effective_from, effective_to } = body;

    if (!designer_id || weekday === undefined || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'designer_id, weekday, start_time, end_time는 필수입니다.' },
        { status: 400 }
      );
    }

    // Comment: Validate weekday (0-6)
    if (weekday < 0 || weekday > 6) {
      return NextResponse.json(
        { error: 'weekday는 0(일요일)부터 6(토요일) 사이여야 합니다.' },
        { status: 400 }
      );
    }

    // Comment: Check if schedule already exists for this designer and weekday
    const { data: existing } = await supabase
      .from('designer_schedules')
      .select('id')
      .eq('designer_id', Number(designer_id))
      .eq('weekday', Number(weekday))
      .is('effective_to', null)
      .single();

    let result;
    if (existing) {
      // Comment: Update existing schedule
      const { data, error } = await supabase
        .from('designer_schedules')
        .update({
          shop_id: shop_id ? Number(shop_id) : null,
          start_time,
          end_time,
          effective_from: effective_from || new Date().toISOString().split('T')[0],
          effective_to: effective_to || null,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating schedule:', error);
        return NextResponse.json(
          { error: '스케줄 업데이트에 실패했습니다.' },
          { status: 500 }
        );
      }

      result = data;
    } else {
      // Comment: Create new schedule
      const { data, error } = await supabase
        .from('designer_schedules')
        .insert({
          designer_id: Number(designer_id),
          shop_id: shop_id ? Number(shop_id) : null,
          weekday: Number(weekday),
          start_time,
          end_time,
          effective_from: effective_from || new Date().toISOString().split('T')[0],
          effective_to: effective_to || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating schedule:', error);
        return NextResponse.json(
          { error: '스케줄 생성에 실패했습니다.' },
          { status: 500 }
        );
      }

      result = data;
    }

    return NextResponse.json({ schedule: result }, { status: 200 });
  } catch (error) {
    console.error('Error in designer-schedules POST route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Comment: PATCH - Update a specific schedule by ID
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, start_time, end_time, effective_from, effective_to } = body;

    if (!id) {
      return NextResponse.json({ error: 'id는 필수입니다.' }, { status: 400 });
    }

    const updateData: any = {};
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (effective_from !== undefined) updateData.effective_from = effective_from;
    if (effective_to !== undefined) updateData.effective_to = effective_to;

    const { data, error } = await supabase
      .from('designer_schedules')
      .update(updateData)
      .eq('id', Number(id))
      .select()
      .single();

    if (error) {
      console.error('Error updating schedule:', error);
      return NextResponse.json(
        { error: '스케줄 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ schedule: data }, { status: 200 });
  } catch (error) {
    console.error('Error in designer-schedules PATCH route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Comment: DELETE - Delete a schedule by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id 파라미터는 필수입니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('designer_schedules')
      .delete()
      .eq('id', Number(id));

    if (error) {
      console.error('Error deleting schedule:', error);
      return NextResponse.json(
        { error: '스케줄 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in designer-schedules DELETE route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}





