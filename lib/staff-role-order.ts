/** Staff list role priority: Director → Assistant Director → Lead Hair Designer → others */
export function getStaffRoleSortIndex(role: string | null | undefined): number {
  const lower = (role || '').trim().toLowerCase();
  if (!lower) return 999;

  // Assistant Director must be checked before generic "director" match
  if (lower.includes('assistant') && lower.includes('director')) return 2;
  if (lower === 'director' || lower === 'senior director') return 1;
  if (lower.includes('director') && !lower.includes('assistant')) return 1;
  if (lower.includes('lead hair designer')) return 3;

  return 999;
}

export function compareStaffByRole(
  a: { role?: string | null; name?: string | null },
  b: { role?: string | null; name?: string | null },
): number {
  const orderA = getStaffRoleSortIndex(a.role);
  const orderB = getStaffRoleSortIndex(b.role);
  if (orderA !== orderB) return orderA - orderB;
  return (a.name || '').localeCompare(b.name || '');
}

export function sortStaffByRole<T extends { role?: string | null; name?: string | null }>(
  staff: T[],
): T[] {
  return [...staff].sort(compareStaffByRole);
}
