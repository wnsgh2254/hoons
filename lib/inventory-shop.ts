export const DEFAULT_INVENTORY_SHOP_ID = 3;

/** Meadowbank + Haymarket — used when admin catalog APIs omit shop_id (settings → 서비스 및 제품). */
export const GLOBAL_INVENTORY_SHOP_IDS: readonly number[] = [3, 4];

export function parseInventoryShopId(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : DEFAULT_INVENTORY_SHOP_ID;
}

/** When shop is omitted, mirror catalog rows to every salon inventory. */
export function resolveCatalogInventoryShopIds(body: { shop_id?: unknown; shopId?: unknown }): number[] {
  const raw = body.shop_id ?? body.shopId;
  if (raw === undefined || raw === null || raw === '') {
    return [...GLOBAL_INVENTORY_SHOP_IDS];
  }
  return [parseInventoryShopId(raw)];
}
