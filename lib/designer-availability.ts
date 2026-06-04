import type { SupabaseClient } from '@supabase/supabase-js';
import { salonCalendarWeekdayIndex } from '@/lib/salon-calendar';
import {
  resolvePerShopTimeOffOutcomes,
  VENUE_TIME_OFF_REASONS,
  type VenueTimeOffRow,
} from '@/lib/designer-venue-time-off';

type DesignerScheduleRow = {
  designer_id: number;
  weekday: number;
  shop_id: number | null;
  start_time: string | null;
  end_time: string | null;
};

type ResolvedDesignerScheduleRow = DesignerScheduleRow & {
  resolved_shop_id: number | null;
};

async function loadResolvedDesignerScheduleRowsForDate(
  supabase: SupabaseClient,
  params: { date: string; designerIds?: number[] },
): Promise<ResolvedDesignerScheduleRow[]> {
  const weekday = salonCalendarWeekdayIndex(params.date);

  let schedulesQuery = supabase
    .from('designer_schedules')
    .select('designer_id, weekday, shop_id, start_time, end_time')
    .eq('weekday', weekday)
    .is('effective_to', null);

  if (params.designerIds && params.designerIds.length > 0) {
    schedulesQuery = schedulesQuery.in('designer_id', params.designerIds);
  }

  const { data: scheduleRows, error: scheduleError } = await schedulesQuery;
  if (scheduleError) {
    console.error('loadResolvedDesignerScheduleRowsForDate schedules:', scheduleError);
    return [];
  }

  const designerIds = Array.from(
    new Set((scheduleRows || []).map((row: { designer_id: number }) => Number(row.designer_id)).filter(Number.isFinite)),
  );
  if (designerIds.length === 0) {
    return [];
  }

  const [designersResult, defaultsResult] = await Promise.all([
    supabase
      .from('designers')
      .select('id, shop_id, is_active')
      .in('id', designerIds)
      .eq('is_active', true),
    supabase
      .from('designer_weekday_default_shop')
      .select('designer_id, weekday, shop_id')
      .in('designer_id', designerIds)
      .eq('weekday', weekday),
  ]);

  if (designersResult.error) {
    console.error('loadResolvedDesignerScheduleRowsForDate designers:', designersResult.error);
    return [];
  }

  if (defaultsResult.error) {
    console.error('loadResolvedDesignerScheduleRowsForDate defaults:', defaultsResult.error);
    return [];
  }

  const activeDesignerIds = new Set(
    (designersResult.data || []).map((row: { id: number }) => Number(row.id)).filter(Number.isFinite),
  );
  const homeShopByDesigner = new Map<number, number | null>();
  for (const row of designersResult.data || []) {
    homeShopByDesigner.set(Number(row.id), row.shop_id != null ? Number(row.shop_id) : null);
  }

  const defaultShopByDesigner = new Map<number, number>();
  for (const row of defaultsResult.data || []) {
    defaultShopByDesigner.set(Number(row.designer_id), Number(row.shop_id));
  }

  return (scheduleRows || [])
    .filter((row: DesignerScheduleRow) => activeDesignerIds.has(Number(row.designer_id)))
    .map((row: DesignerScheduleRow) => ({
      ...row,
      designer_id: Number(row.designer_id),
      weekday: Number(row.weekday),
      shop_id: row.shop_id != null ? Number(row.shop_id) : null,
      resolved_shop_id:
        defaultShopByDesigner.get(Number(row.designer_id)) ??
        (row.shop_id != null ? Number(row.shop_id) : null) ??
        homeShopByDesigner.get(Number(row.designer_id)) ??
        null,
    }));
}

export async function loadDesignerWorkingScheduleRowsForShopDate(
  supabase: SupabaseClient,
  params: { designerId: number; shopId: number; date: string },
): Promise<ResolvedDesignerScheduleRow[]> {
  const rows = await loadResolvedDesignerScheduleRowsForDate(supabase, {
    date: params.date,
    designerIds: [params.designerId],
  });

  return rows.filter(
    (row) =>
      Number(row.designer_id) === Number(params.designerId) &&
      row.resolved_shop_id != null &&
      Number(row.resolved_shop_id) === Number(params.shopId),
  );
}

/**
 * Return the designer IDs available to work at the given shop on the given date.
 * Base schedule follows the Reservation page interpretation exactly:
 * weekday default venue -> schedule row shop_id -> designer home shop.
 * Date-specific temporary holiday / special-..work rows from Appointments then override that base.
 */
export async function getAvailableDesignerIdsForShop(
  supabase: SupabaseClient,
  date: string,
  shopId: number,
): Promise<number[]> {
  const resolvedRows = await loadResolvedDesignerScheduleRowsForDate(supabase, { date });

  const designerIdsFromSchedule = Array.from(
    new Set(
      resolvedRows
        .filter((row) => row.resolved_shop_id != null && Number(row.resolved_shop_id) === Number(shopId))
        .map((row) => Number(row.designer_id))
        .filter(Number.isFinite),
    ),
  );

  const { data: venueTimeOffRows, error: venueTimeOffError } = await supabase
    .from('designer_time_off')
    .select('id, designer_id, shop_id, reason, created_at')
    .in('reason', [...VENUE_TIME_OFF_REASONS])
    .lte('start_date', date)
    .gte('end_date', date);

  if (venueTimeOffError) {
    console.error('getAvailableDesignerIdsForShop time off:', venueTimeOffError);
  }

  const { specialWorkDesignerIds, arbitraryHolidayDesignerIds } = resolvePerShopTimeOffOutcomes(
    (venueTimeOffRows || []) as VenueTimeOffRow[],
    shopId,
  );

  const allDesignerIds = Array.from(
    new Set([
      ...designerIdsFromSchedule,
      ...Array.from(specialWorkDesignerIds).map(Number),
    ]),
  ).filter((designerId) => !arbitraryHolidayDesignerIds.has(Number(designerId)));

  if (allDesignerIds.length === 0) {
    return [];
  }

  const { data: activeRows, error: activeError } = await supabase
    .from('designers')
    .select('id')
    .eq('is_active', true)
    .in('id', allDesignerIds);

  if (activeError) {
    console.error('getAvailableDesignerIdsForShop active designers:', activeError);
    return allDesignerIds;
  }

  const activeIdSet = new Set((activeRows || []).map((row: { id: number }) => Number(row.id)));
  return allDesignerIds.filter((designerId) => activeIdSet.has(Number(designerId)));
}
