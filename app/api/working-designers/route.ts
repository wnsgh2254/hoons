import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { salonCalendarWeekdayIndex } from '@/lib/salon-calendar';
import { resolvePerShopTimeOffOutcomes, type VenueTimeOffRow } from '@/lib/designer-venue-time-off';

// Comment: Get designers who are scheduled to work on a given date (and are active).
// Optional shopId param enables per-shop time-off resolution.

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = (searchParams.get('date') || '').trim();
  const shopIdParam = searchParams.get('shopId');

  if (!dateParam) {
    return NextResponse.json({ designers: [] });
  }

  const targetDate = new Date(dateParam);
  if (Number.isNaN(targetDate.getTime())) {
    return NextResponse.json({ designers: [] });
  }

  const weekday = salonCalendarWeekdayIndex(dateParam);
  const shopId = shopIdParam ? Number(shopIdParam) : null;

  try {
    // Comment: Load active designers
    const { data: designers, error: designersError } = await supabase
      .from('designers')
      .select('id, name, role, is_active, shop_id');

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

    // Comment: Load time-off records filtered by reason and date range
    const { data: timeOff, error: timeOffError } = await supabase
      .from('designer_time_off')
      .select('id, designer_id, shop_id, reason, created_at')
      .in('reason', ['임의 휴일', '특별 근무일'])
      .lte('start_date', dateParam)
      .gte('end_date', dateParam);

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

    // Comment: Resolve time-off using per-shop logic when shopId is provided
    if (shopId != null) {
      const { specialWorkDesignerIds, arbitraryHolidayDesignerIds } =
        resolvePerShopTimeOffOutcomes((timeOff || []) as VenueTimeOffRow[], shopId);

      // Add special work day designers (they work even without regular schedule)
      for (const id of specialWorkDesignerIds) {
        workingDesignerIdSet.add(id);
      }

      // Remove arbitrary holiday designers
      for (const id of arbitraryHolidayDesignerIds) {
        workingDesignerIdSet.delete(id);
      }
    } else {
      // Comment: Fallback for calls without shopId — treat all 임의 휴일 as exclusion
      const arbitraryHolidayIds = new Set<number>();
      const specialWorkIds = new Set<number>();

      for (const t of (timeOff || []) as VenueTimeOffRow[]) {
        const did = Number(t.designer_id);
        if (t.reason === '임의 휴일') arbitraryHolidayIds.add(did);
        else if (t.reason === '특별 근무일') specialWorkIds.add(did);
      }

      for (const id of specialWorkIds) {
        workingDesignerIdSet.add(id);
      }
      for (const id of arbitraryHolidayIds) {
        // Only exclude if there's no competing special work day
        if (!specialWorkIds.has(id)) {
          workingDesignerIdSet.delete(id);
        }
      }
    }

    const workingDesigners = activeDesigners.filter((d: any) => {
      const id = Number(d.id);
      return workingDesignerIdSet.has(id);
    });

    return NextResponse.json({
      designers: workingDesigners.map((d: any) => ({
        id: d.id,
        name: d.name,
        role: d.role,
        shop_id: d.shop_id || null,
      })),
    });
  } catch (error) {
    console.error('Unexpected error in working-designers route:', error);
    return NextResponse.json({ error: '근무 디자이너 정보를 불러오지 못했습니다.' }, { status: 500 });
  }
}
