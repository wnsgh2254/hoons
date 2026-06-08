/** Fixed display order for key designers (within each shop / selection list). */
export const FIXED_DESIGNER_DISPLAY_ORDER = ['윤훈', '태훈', '여정', '찬우'] as const;

/** Lower index = earlier in lists. Non-fixed designers share the same bucket. */
export function getFixedDesignerSortIndex(name: string | null | undefined): number {
  const trimmed = (name || '').trim();
  const idx = (FIXED_DESIGNER_DISPLAY_ORDER as readonly string[]).indexOf(trimmed);
  return idx >= 0 ? idx : FIXED_DESIGNER_DISPLAY_ORDER.length;
}

export function compareDesignersByDisplayOrder(
  a: { name?: string | null },
  b: { name?: string | null },
): number {
  const orderA = getFixedDesignerSortIndex(a.name);
  const orderB = getFixedDesignerSortIndex(b.name);
  if (orderA !== orderB) return orderA - orderB;
  return (a.name || '').localeCompare(b.name || '');
}

export function sortDesignersByDisplayOrder<T extends { name?: string | null }>(designers: T[]): T[] {
  return [...designers].sort(compareDesignersByDisplayOrder);
}
