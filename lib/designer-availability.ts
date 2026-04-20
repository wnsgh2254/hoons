// Shared logic for computing available designer IDs for a given date and shop.
// Used by both the designer-schedules API route and the initial-data batch route
// to avoid server-to-server HTTP self-calls.

import type { SupabaseClient } from '@supabase/supabase-js';
import { salonCalendarWeekdayIndex } from '@/lib/salon-calendar';
import {
  resolvePerShopTimeOffOutcomes,
  type VenueTimeOffRow,
} from '@/lib/designer-venue-time-off';
import { filterDesignerIdsByDefaultVenueRule } from '@/lib/multi-venue-default-shop';

/**
 * Return the designer IDs available to work at the given shop on the given date.
 * Respects regular schedules, home-shop fallback, director rules, linked shops,
 * arbitrary holidays, and special work days.
 *
 * Mirrors the GET logic in app/api/designer-schedules/route.ts for the
 * "date + shopId" case — no HTTP round-trip needed.
 */
export async function getAvailableDesignerIdsForShop(
  supabase: SupabaseClient,
  date: string,
  shopId: number,
): Promise<number[]> {
  const weekday = salonCalendarWeekdayIndex(date);

  // 1. Regular schedule rows for the shop on this weekday
  const { data: scheduleData } = await supabase
    .from('designer_schedules')
    .select('designer_id')
    .eq('weekday', weekday)
    .eq('shop_id', shopId)
    .lte('effective_from', date)
    .or(`effective_to.is.null,effective_to.gte.${date}`);

  const designerIdsFromSchedule = Array.from(
    new Set((scheduleData || []).map((r: any) => r.designer_id).filter(Boolean)),
  );

  // 2. Home-shop designers who have any weekday schedule (legacy shop_id mismatch)
  let designerIdsFromHomeShop: number[] = [];
  const { data: homeStaff } = await supabase
    .from('designers')
    .select('id')
    .eq('is_active', true)
    .eq('shop_id', shopId);

  const homeIds = (homeStaff || []).map((r: any) => Number(r.id)).filter(Number.isFinite);
  if (homeIds.length > 0) {
    const { data: anyShopSched } = await supabase
      .from('designer_schedules')
      .select('designer_id')
      .eq('weekday', weekday)
      .in('designer_id', homeIds)
      .lte('effective_from', date)
      .or(`effective_to.is.null,effective_to.gte.${date}`);

    designerIdsFromHomeShop = Array.from(
      new Set((anyShopSched || []).map((r: any) => r.designer_id).filter(Boolean)),
    );
  }

  // 3. Linked shop designers (designer_shops table)
  let designerIdsFromLinkedShops: number[] = [];
  const { data: linkRows } = await supabase
    .from('designer_shops')
    .select('designer_id')
    .eq('shop_id', shopId)
    .eq('is_active', true);

  const linkedIds = Array.from(
    new Set((linkRows || []).map((r: any) => Number(r.designer_id)).filter(Number.isFinite)),
  );
  if (linkedIds.length > 0) {
    const { data: linkSched } = await supabase
      .from('designer_schedules')
      .select('designer_id')
      .eq('weekday', weekday)
      .in('designer_id', linkedIds)
      .lte('effective_from', date)
      .or(`effective_to.is.null,effective_to.gte.${date}`);

    designerIdsFromLinkedShops = Array.from(
      new Set((linkSched || []).map((r: any) => r.designer_id).filter(Boolean)),
    );
  }

  // 5. Venue-specific time off overrides (arbitrary holiday / special work day)
  let designerIdsFromSpecialWork: number[] = [];
  let arbitraryExcludeIds = new Set<number>();

  const { data: venueTimeOffRows } = await supabase
    .from('designer_time_off')
    .select('id, designer_id, shop_id, reason, created_at')
    .in('reason', ['임의 휴일', '특별 근무일'])
    .lte('start_date', date)
    .gte('end_date', date);

  const { specialWorkDesignerIds, arbitraryHolidayDesignerIds } = resolvePerShopTimeOffOutcomes(
    (venueTimeOffRows || []) as VenueTimeOffRow[],
    shopId,
  );
  designerIdsFromSpecialWork = Array.from(specialWorkDesignerIds);
  arbitraryExcludeIds = arbitraryHolidayDesignerIds;

  // 6. Combine all sources
  let allDesignerIds = Array.from(
    new Set([
      ...designerIdsFromSchedule,
      ...designerIdsFromHomeShop,
      ...designerIdsFromLinkedShops,
      ...designerIdsFromSpecialWork,
    ]),
  );

  // Remove arbitrary-holiday designers and apply multi-venue default-shop rule
  allDesignerIds = allDesignerIds.filter((id) => !arbitraryExcludeIds.has(Number(id)));
  allDesignerIds = await filterDesignerIdsByDefaultVenueRule(supabase, {
    shopId,
    weekday,
    designerIds: allDesignerIds.map(Number),
    specialWorkDesignerIds: new Set(designerIdsFromSpecialWork.map(Number)),
  });

  // Comment: Filter out inactive/deleted designers — schedule rows may reference old designer IDs
  const { data: activeRows } = await supabase
    .from('designers')
    .select('id')
    .eq('is_active', true)
    .in('id', allDesignerIds.map(Number));
  const activeIdSet = new Set((activeRows || []).map((r: { id: number }) => Number(r.id)));

  return allDesignerIds.filter((id) => activeIdSet.has(Number(id)));
}
