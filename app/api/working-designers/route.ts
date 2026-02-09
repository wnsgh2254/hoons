import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Get designers who are scheduled to work on a given date (and are active)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = (searchParams.get('date') || '').trim();

  if (!dateParam) {
    return NextResponse.json({ designers: [] });
  }

  const targetDate = new Date(dateParam);
  if (Number.isNaN(targetDate.getTime())) {
    return NextResponse.json({ designers: [] });
  }

  const weekday = targetDate.getDay(); // 0 (Sun) - 6 (Sat)

  try {
    // Comment: Load active designers
    const { data: designers, error: designersError } = await supabase
      .from('designers')
      .select('id, name, role, is_active');

    if (designersError) {
      console.error('Error fetching designers for working-designers:', designersError);
      return NextResponse.json({ error: '디자이너 정보를 불러오지 못했습니다.' }, { status: 500 });
    }

    const activeDesigners = (designers || []).filter((d: any) => d.is_active !== false);

    // Comment: Load weekly schedules for the weekday
    const { data: schedules, error: schedulesError } = await supabase
      .from('designer_schedules')
      .select('designer_id, weekday, effective_from, effective_to')
      .eq('weekday', weekday);

    if (schedulesError) {
      console.error('Error fetching designer_schedules:', schedulesError);
      return NextResponse.json({ error: '근무 스케줄 정보를 불러오지 못했습니다.' }, { status: 500 });
    }

    // Comment: Load time-off records to exclude designers on leave
    const { data: timeOff, error: timeOffError } = await supabase
      .from('designer_time_off')
      .select('designer_id, start_date, end_date');

    if (timeOffError) {
      console.error('Error fetching designer_time_off:', timeOffError);
      return NextResponse.json({ error: '휴무 정보를 불러오지 못했습니다.' }, { status: 500 });
    }

    const dateOnly = new Date(dateParam);
    dateOnly.setHours(0, 0, 0, 0);

    const isWithinDateRange = (value: string | null, from: boolean) => {
      if (!value) return true;
      const d = new Date(value);
      d.setHours(0, 0, 0, 0);
      return from ? d <= dateOnly : d >= dateOnly;
    };

    const workingDesignerIdSet = new Set<number>();

    (schedules || []).forEach((s: any) => {
      if (
        isWithinDateRange(s.effective_from, true) &&
        isWithinDateRange(s.effective_to, false)
      ) {
        workingDesignerIdSet.add(Number(s.designer_id));
      }
    });

    const timeOffMap = new Map<number, { start_date: string; end_date: string }[]>();
    (timeOff || []).forEach((t: any) => {
      const id = Number(t.designer_id);
      if (!timeOffMap.has(id)) {
        timeOffMap.set(id, []);
      }
      timeOffMap.get(id)!.push({ start_date: t.start_date, end_date: t.end_date });
    });

    const isOnTimeOff = (designerId: number) => {
      const records = timeOffMap.get(designerId);
      if (!records || records.length === 0) return false;
      return records.some((r) => {
        const start = new Date(r.start_date);
        const end = new Date(r.end_date);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return start <= dateOnly && end >= dateOnly;
      });
    };

    const workingDesigners = activeDesigners.filter((d: any) => {
      const id = Number(d.id);
      return workingDesignerIdSet.has(id) && !isOnTimeOff(id);
    });

    return NextResponse.json({
      designers: workingDesigners.map((d: any) => ({
        id: d.id,
        name: d.name,
        role: d.role,
      })),
    });
  } catch (error) {
    console.error('Unexpected error in working-designers route:', error);
    return NextResponse.json({ error: '근무 디자이너 정보를 불러오지 못했습니다.' }, { status: 500 });
  }
}

