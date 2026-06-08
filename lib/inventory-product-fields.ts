/** Legacy rows stored 분류(brand) names in `category` before brand was persisted. */

export function resolveInventoryBrand(
  item: { brand?: string | null; category?: string | null },
  brandNames: readonly string[],
): string | null {
  const brand = item.brand?.trim();
  if (brand) return brand;
  const category = item.category?.trim();
  if (category && brandNames.includes(category)) return category;
  return null;
}

export function resolveInventoryProductCategory(
  item: { brand?: string | null; category?: string | null },
  brandNames: readonly string[],
  categoryNames: readonly string[],
): string | null {
  const category = item.category?.trim();
  if (!category) return null;
  if (categoryNames.includes(category)) return category;
  if (brandNames.includes(category)) return null;
  return category;
}

export function resolveInitialProductBrand(
  item: { brand?: string | null; category?: string | null } | undefined,
  brandNames: readonly string[],
): string {
  if (!item) return '';
  return resolveInventoryBrand(item, brandNames) ?? '';
}

export function resolveInitialProductCategory(
  item: { brand?: string | null; category?: string | null } | undefined,
  brandNames: readonly string[],
  categoryNames: readonly string[],
): string {
  if (!item) return '';
  return resolveInventoryProductCategory(item, brandNames, categoryNames) ?? '';
}
