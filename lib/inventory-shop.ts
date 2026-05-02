export const DEFAULT_INVENTORY_SHOP_ID = 3;

export function parseInventoryShopId(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : DEFAULT_INVENTORY_SHOP_ID;
}
