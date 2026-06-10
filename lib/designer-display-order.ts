import { getStaffRoleSortIndex } from '@/lib/staff-role-order';

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

/** Home page: Director → Assistant Director → Lead Hair Designer → others, then fixed names, then name */
export function compareDesignersForHomeDisplay(
  a: { role?: string | null; name?: string | null },
  b: { role?: string | null; name?: string | null },
): number {
  const roleA = getStaffRoleSortIndex(a.role);
  const roleB = getStaffRoleSortIndex(b.role);
  if (roleA !== roleB) return roleA - roleB;

  const fixedA = getFixedDesignerSortIndex(a.name);
  const fixedB = getFixedDesignerSortIndex(b.name);
  if (fixedA !== fixedB) return fixedA - fixedB;

  return (a.name || '').localeCompare(b.name || '');
}

export function sortDesignersForHomeDisplay<
  T extends { role?: string | null; name?: string | null },
>(designers: T[]): T[] {
  return [...designers].sort(compareDesignersForHomeDisplay);
}
