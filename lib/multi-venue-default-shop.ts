import type { SupabaseClient } from '@supabase/supabase-js';
import { loadDesignerShopsMap, mergeDesignerShopIds } from '@/lib/designer-multi-venue';

// Comment: After designer-schedules builds candidate IDs, restrict multi-venue staff to default shop per weekday.
// 특별 근무일 at the requested shop still allows that shop for that date.

export async function filterDesignerIdsByDefaultVenueRule(
  supabase: SupabaseClient,
  params: {
    shopId: number;
    weekday: number;
    designerIds: number[];
    specialWorkDesignerIds: Set<number>;
  },
): Promise<number[]> {
  const { shopId, weekday, designerIds, specialWorkDesignerIds } = params;
  if (designerIds.length === 0) return [];

  const { data: drows, error: dErr } = await supabase
    .from('designers')
    .select('id, shop_id')
    .in('id', designerIds);

  if (dErr) {
    console.error('filterDesignerIdsByDefaultVenueRule designers:', dErr);
    return designerIds;
  }

  const shopMap = await loadDesignerShopsMap();
  const multiVenue = new Set<number>();
  for (const row of drows || []) {
    const id = Number(row.id);
    const merged = mergeDesignerShopIds(row.shop_id, shopMap.get(id));
    if (merged.length >= 2) multiVenue.add(id);
  }

  if (multiVenue.size === 0) return designerIds;

  const mvList = Array.from(multiVenue);
  const { data: defRows, error: defErr } = await supabase
    .from('designer_weekday_default_shop')
    .select('designer_id, weekday, shop_id')
    .in('designer_id', mvList);

  if (defErr) {
    console.error('filterDesignerIdsByDefaultVenueRule defaults:', defErr);
    return designerIds;
  }

  const defaultShop = new Map<string, number>();
  for (const r of defRows || []) {
    defaultShop.set(`${Number(r.designer_id)}:${Number(r.weekday)}`, Number(r.shop_id));
  }

  return designerIds.filter((id) => {
    if (!multiVenue.has(id)) return true;
    const def = defaultShop.get(`${id}:${weekday}`);
    if (def === undefined) return false;
    if (Number(shopId) === def) return true;
    return specialWorkDesignerIds.has(id);
  });
}

export async function assertMultiVenueDefaultShopAllowsBooking(
  supabase: SupabaseClient,
  params: {
    designerId: number;
    shopId: number;
    weekday: number;
    specialWorkDesignerIds: Set<number>;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const filtered = await filterDesignerIdsByDefaultVenueRule(supabase, {
    shopId: params.shopId,
    weekday: params.weekday,
    designerIds: [params.designerId],
    specialWorkDesignerIds: params.specialWorkDesignerIds,
  });
  if (filtered.includes(params.designerId)) return { ok: true };
  return {
    ok: false,
    message: 'This designer is not scheduled at this location on the selected day.',
  };
}
