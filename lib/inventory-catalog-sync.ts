import { supabase } from '@/lib/supabase';
import { GLOBAL_INVENTORY_SHOP_IDS } from '@/lib/inventory-shop';

export function isCatalogMirrorRequest(raw: unknown): boolean {
  return raw === undefined || raw === null || raw === '';
}

export type InventoryCatalogRow = {
  id: number;
  shop_id: number;
  name: string;
  sku: string | null;
  brand: string | null;
  category: string;
};

type NamedCatalogRow = {
  id: number;
  shop_id: number;
  name: string;
};

function normalizeText(value: string | null | undefined): string {
  return value == null ? '' : String(value).trim();
}

async function findInventoryIdsBySku(shopId: number, sku: string): Promise<number[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id')
    .eq('shop_id', shopId)
    .eq('sku', sku);

  if (error) {
    console.error('Error finding inventory siblings by sku:', error);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

async function findInventoryIdsByIdentity(
  shopId: number,
  name: string,
  brand: string,
  category: string,
): Promise<number[]> {
  let query = supabase
    .from('inventory_items')
    .select('id, brand')
    .eq('shop_id', shopId)
    .eq('name', name)
    .eq('category', category);

  const { data, error } = await query;

  if (error) {
    console.error('Error finding inventory siblings by identity:', error);
    return [];
  }

  return (data ?? [])
    .filter((row) => normalizeText(row.brand) === brand)
    .map((row) => row.id);
}

/** Find mirrored catalog rows across Meadowbank + Haymarket for the same product. */
export async function findInventoryCatalogSiblingIds(source: InventoryCatalogRow): Promise<number[]> {
  const ids = new Set<number>([source.id]);
  const sku = normalizeText(source.sku);
  const name = normalizeText(source.name);
  const brand = normalizeText(source.brand);
  const category = normalizeText(source.category);

  const otherShopIds = GLOBAL_INVENTORY_SHOP_IDS.filter((shopId) => shopId !== source.shop_id);

  for (const shopId of otherShopIds) {
    const matchedIds =
      sku.length > 0
        ? await findInventoryIdsBySku(shopId, sku)
        : await findInventoryIdsByIdentity(shopId, name, brand, category);

    for (const id of matchedIds) {
      ids.add(id);
    }
  }

  return [...ids];
}

/** Find mirrored brand rows across global inventory shops by name. */
export async function findBrandCatalogSiblingIds(source: NamedCatalogRow): Promise<number[]> {
  const trimmedName = normalizeText(source.name);
  const { data, error } = await supabase
    .from('inventory_brands')
    .select('id')
    .in('shop_id', [...GLOBAL_INVENTORY_SHOP_IDS])
    .eq('name', trimmedName);

  if (error) {
    console.error('Error finding brand catalog siblings:', error);
    return [source.id];
  }

  const ids = new Set<number>([source.id]);
  for (const row of data ?? []) {
    ids.add(row.id);
  }
  return [...ids];
}

/** Find mirrored product category rows across global inventory shops by name. */
export async function findProductCategoryCatalogSiblingIds(source: NamedCatalogRow): Promise<number[]> {
  const trimmedName = normalizeText(source.name);
  const { data, error } = await supabase
    .from('inventory_product_categories')
    .select('id')
    .in('shop_id', [...GLOBAL_INVENTORY_SHOP_IDS])
    .eq('name', trimmedName);

  if (error) {
    console.error('Error finding product category catalog siblings:', error);
    return [source.id];
  }

  const ids = new Set<number>([source.id]);
  for (const row of data ?? []) {
    ids.add(row.id);
  }
  return [...ids];
}
