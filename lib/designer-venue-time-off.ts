// Comment: When multiple designer_time_off rows overlap a date for the same venue,
// only the most recent row wins (created_at desc, then id desc).

export type VenueTimeOffRow = {
  id: number;
  designer_id: number;
  shop_id: number | null;
  reason: string;
  created_at?: string | null;
};

/** Comment: DB designer_time_off.reason values for venue-specific overrides (shared by booking APIs). */
export const VENUE_TIME_OFF_REASONS = ['임의 휴일', '특별 근무일'] as const;
export type VenueTimeOffReason = (typeof VENUE_TIME_OFF_REASONS)[number];

export function isVenueTimeOffReason(reason: string | null | undefined): boolean {
  return VENUE_TIME_OFF_REASONS.includes(reason as (typeof VENUE_TIME_OFF_REASONS)[number]);
}

function isMoreRecentTimeOffRow(a: VenueTimeOffRow, b: VenueTimeOffRow): boolean {
  const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
  const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
  if (ta !== tb) return ta > tb;
  return Number(a.id) > Number(b.id);
}

export function pickWinningTimeOffRow(rows: VenueTimeOffRow[]): VenueTimeOffRow | null {
  if (!rows.length) return null;
  return rows.reduce((best, cur) => (isMoreRecentTimeOffRow(cur, best) ? cur : best));
}

/** Rows that apply to this venue: explicit shop match or all-venues (null shop_id). */
export function rowsApplicableToShop(rows: VenueTimeOffRow[], shopId: number): VenueTimeOffRow[] {
  return rows.filter((r) => {
    if (!isVenueTimeOffReason(r.reason)) return false;
    const sid = r.shop_id != null ? Number(r.shop_id) : null;
    return sid === null || sid === shopId;
  });
}

/**
 * Per designer, pick one winning row among applicable venue rows; split by outcome.
 */
export function resolvePerShopTimeOffOutcomes(
  rows: VenueTimeOffRow[],
  shopId: number,
): { specialWorkDesignerIds: Set<number>; arbitraryHolidayDesignerIds: Set<number> } {
  const specialWorkDesignerIds = new Set<number>();
  const arbitraryHolidayDesignerIds = new Set<number>();
  const byDesigner = new Map<number, VenueTimeOffRow[]>();

  for (const r of rowsApplicableToShop(rows, shopId)) {
    const did = Number(r.designer_id);
    if (!Number.isFinite(did)) continue;
    const list = byDesigner.get(did) ?? [];
    list.push(r);
    byDesigner.set(did, list);
  }

  for (const [did, list] of byDesigner) {
    const w = pickWinningTimeOffRow(list);
    if (!w) continue;
    if (w.reason === '특별 근무일') specialWorkDesignerIds.add(did);
    else if (w.reason === '임의 휴일') arbitraryHolidayDesignerIds.add(did);
  }

  return { specialWorkDesignerIds, arbitraryHolidayDesignerIds };
}
