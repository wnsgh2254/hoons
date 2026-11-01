import { supabase } from '@/lib/supabase';

// Comment: Active designer_id -> sorted unique shop ids from designer_shops
export async function loadDesignerShopsMap(): Promise<Map<number, number[]>> {
  const { data, error } = await supabase
    .from('designer_shops')
    .select('designer_id, shop_id')
    .eq('is_active', true);

  if (error) {
    console.error('designer_shops load error:', error);
    return new Map();
  }

  const map = new Map<number, number[]>();
  for (const row of data || []) {
    const did = Number(row.designer_id);
    const sid = Number(row.shop_id);
    if (!Number.isFinite(did) || !Number.isFinite(sid)) continue;
    const list = map.get(did) ?? [];
    if (!list.includes(sid)) list.push(sid);
    map.set(did, list);
  }
  for (const [k, v] of map) {
    map.set(k, [...v].sort((a, b) => a - b));
  }
  return map;
}

/** Comment: Primary column + designer_shops merged (unique, sorted) */
export function mergeDesignerShopIds(
  primary: number | null | undefined,
  fromLinks: number[] | undefined,
): number[] {
  const set = new Set<number>();
  if (primary != null && Number.isFinite(Number(primary))) set.add(Number(primary));
  for (const s of fromLinks || []) {
    if (Number.isFinite(s)) set.add(Number(s));
  }
  return [...set].sort((a, b) => a - b);
}

/** Comment: Sorted venue ids for grouping / labels (API + grid) */
export function getDesignerVenueShopIds(d: {
  shop_id?: number | null;
  shop_ids_at?: number[];
} | null | undefined): number[] {
  if (!d) return [];
  if (d.shop_ids_at && d.shop_ids_at.length > 0) {
    return [...d.shop_ids_at].sort((a, b) => a - b);
  }
  if (d.shop_id != null) return [Number(d.shop_id)];
  return [];
}

export function formatDesignerVenuesLabel(
  d: { shop_id?: number | null; shop_ids_at?: number[] } | null | undefined,
  allShops: Array<{ id: number; name: string }>,
): string {
  const ids = getDesignerVenueShopIds(d);
  if (ids.length === 0) return '미지정';
  const names = ids.map((id) => allShops.find((s) => s.id === id)?.name).filter(Boolean);
  return names.length > 0 ? names.join(' · ') : '미지정';
}

/** Comment: Sync designer_shops to the given extra shop ids (rows not listed are deactivated, never deleted) */
export async function syncDesignerShops(designerId: number, shopIds: number[]): Promise<void> {
  const wanted = new Set(shopIds.map(Number).filter((n) => Number.isFinite(n) && n > 0));

  const { data: existing, error } = await supabase
    .from('designer_shops')
    .select('shop_id, is_active')
    .eq('designer_id', designerId);
  if (error) throw new Error(error.message);

  const existingByShop = new Map<number, boolean>();
  for (const row of existing || []) existingByShop.set(Number(row.shop_id), Boolean(row.is_active));

  const toDeactivate = [...existingByShop.entries()]
    .filter(([sid, active]) => active && !wanted.has(sid))
    .map(([sid]) => sid);
  const toActivate = [...wanted].filter((sid) => existingByShop.get(sid) === false);
  const toInsert = [...wanted].filter((sid) => !existingByShop.has(sid));

  if (toDeactivate.length > 0) {
    const { error: e } = await supabase
      .from('designer_shops')
      .update({ is_active: false })
      .eq('designer_id', designerId)
      .in('shop_id', toDeactivate);
    if (e) throw new Error(e.message);
  }
  if (toActivate.length > 0) {
    const { error: e } = await supabase
      .from('designer_shops')
      .update({ is_active: true })
      .eq('designer_id', designerId)
      .in('shop_id', toActivate);
    if (e) throw new Error(e.message);
  }
  if (toInsert.length > 0) {
    const { error: e } = await supabase
      .from('designer_shops')
      .insert(toInsert.map((sid) => ({ designer_id: designerId, shop_id: sid, is_active: true })));
    if (e) throw new Error(e.message);
  }
}
