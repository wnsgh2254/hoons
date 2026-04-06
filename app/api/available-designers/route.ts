import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { salonCalendarWeekdayIndex } from '@/lib/salon-calendar';
import { resolvePerShopTimeOffOutcomes, type VenueTimeOffRow } from '@/lib/designer-venue-time-off';

export const dynamic = 'force-dynamic';

/**
 * GET /api/available-designers?date=YYYY-MM-DD&shopId=N
 *
 * Replaces two sequential fetches (/api/designer-schedules then /api/designers)
 * with a single endpoint that runs DB queries in two parallel rounds.
 * Returns: { designers: DesignerRow[], designerIds: number[] }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const shopIdParam = searchParams.get('shopId');

    if (!date || !shopIdParam) {
      return NextResponse.json({ error: 'date and shopId are required.' }, { status: 400 });
    }

    const sid = Number(shopIdParam);
    const weekday = salonCalendarWeekdayIndex(date);

    // ── Round 1: all independent queries in parallel ─────────────────────────
    const [
      schedResult,         // regular schedules keyed to this shop+weekday
      linkedResult,        // designer_shops entries for this shop
      venueToResult,       // 임의 휴일 / 특별 근무일 rows for this date
      defaultResult,       // weekday venue defaults for this weekday
      shopMapResult,       // all designer_shops rows (for multi-venue detection)
      allDesignersResult,  // all active designers (details + home shop + role)
    ] = await Promise.all([
      supabase
        .from('designer_schedules')
        .select('designer_id')
        .eq('shop_id', sid)
        .eq('weekday', weekday)
        .lte('effective_from', date)
        .or(`effective_to.is.null,effective_to.gte.${date}`),

      supabase
        .from('designer_shops')
        .select('designer_id')
        .eq('shop_id', sid)
        .eq('is_active', true),

      supabase
        .from('designer_time_off')
        .select('id, designer_id, shop_id, reason, created_at')
        .in('reason', ['임의 휴일', '특별 근무일'])
        .lte('start_date', date)
        .gte('end_date', date),

      supabase
        .from('designer_weekday_default_shop')
        .select('designer_id, shop_id')
        .eq('weekday', weekday),

      supabase
        .from('designer_shops')
        .select('designer_id, shop_id')
        .eq('is_active', true),

      supabase
        .from('designers')
        .select('id, name, english_name, role, shop_id, is_active')
        .eq('is_active', true),
    ]);

    type DesignerRow = { id: number; name: string; english_name: string | null; role: string | null; shop_id: number | null; is_active: boolean };
    const allDesigners: DesignerRow[] = (allDesignersResult.data || []) as DesignerRow[];

    // Comment: Build shopMap (designer_id → shop_ids[]) from preloaded data
    const shopMap = new Map<number, number[]>();
    for (const r of shopMapResult.data || []) {
      const did = Number(r.designer_id);
      const s = Number(r.shop_id);
      const list = shopMap.get(did) || [];
      if (!list.includes(s)) list.push(s);
      shopMap.set(did, list);
    }

    // Comment: Derived candidate sets from round-1 data
    const fromSchedIds = new Set<number>(
      (schedResult.data || []).map((r: { designer_id: number }) => Number(r.designer_id)),
    );
    const linkedIds = [
      ...new Set(
        (linkedResult.data || []).map((r: { designer_id: number }) => Number(r.designer_id)),
      ),
    ];
    const homeIds = allDesigners.filter(d => Number(d.shop_id) === sid).map(d => Number(d.id));
    const dirIds  = allDesigners.filter(d => String(d.role || '').toLowerCase().includes('director')).map(d => Number(d.id));

    // ── Round 2: weekday-schedule queries for home / director / linked ────────
    const allCandidateIds: number[] = [...new Set([...homeIds, ...dirIds, ...linkedIds] as number[])];
    const needSched: number[] = allCandidateIds.filter(id => !fromSchedIds.has(id));

    const extraSchedResult = needSched.length > 0
      ? await supabase
          .from('designer_schedules')
          .select('designer_id')
          .eq('weekday', weekday)
          .in('designer_id', needSched)
          .lte('effective_from', date)
          .or(`effective_to.is.null,effective_to.gte.${date}`)
      : { data: [] };

    const fromExtraIds = new Set<number>(
      (extraSchedResult.data || []).map((r: { designer_id: number }) => Number(r.designer_id)),
    );

    // ── Resolve 임의 휴일 vs 특별 근무일 (newest row wins per venue) ─────────
    const { specialWorkDesignerIds, arbitraryHolidayDesignerIds } = resolvePerShopTimeOffOutcomes(
      (venueToResult.data || []) as VenueTimeOffRow[],
      sid,
    );

    // ── Build candidate set ───────────────────────────────────────────────────
    const candidates = new Set<number>([
      ...fromSchedIds,
      ...fromExtraIds,
      ...specialWorkDesignerIds,
    ]);

    // Remove arbitrary holiday designers
    for (const id of arbitraryHolidayDesignerIds) candidates.delete(id);

    // ── Apply multi-venue default-shop rule ───────────────────────────────────
    const defaultShop = new Map<number, number>();
    for (const r of defaultResult.data || []) {
      defaultShop.set(Number(r.designer_id), Number(r.shop_id));
    }

    function mergedShopIds(designerId: number, primaryShopId: number | null): number[] {
      const set = new Set<number>();
      if (primaryShopId != null) set.add(primaryShopId);
      for (const s of shopMap.get(designerId) || []) set.add(s);
      return [...set];
    }

    const finalIds: number[] = [];
    for (const id of candidates) {
      const drow = allDesigners.find(d => Number(d.id) === id);
      if (!drow) continue;
      const merged = mergedShopIds(id, drow.shop_id != null ? Number(drow.shop_id) : null);
      if (merged.length < 2) {
        // Comment: Single-venue designer — no default-shop restriction
        finalIds.push(id);
        continue;
      }
      // Comment: Special workday designers bypass the default-shop restriction
      if (specialWorkDesignerIds.has(id)) { finalIds.push(id); continue; }
      const def = defaultShop.get(id);
      if (def === undefined) continue;         // not configured → block
      if (def === sid) { finalIds.push(id); continue; }
    }

    // Comment: Return only the details for qualifying designers
    const designers = allDesigners
      .filter(d => finalIds.includes(Number(d.id)))
      .map(d => ({
        id: d.id,
        name: d.name,
        english_name: d.english_name,
        role: d.role,
        shop_id: d.shop_id,
        shop_ids_at: mergedShopIds(Number(d.id), d.shop_id != null ? Number(d.shop_id) : null),
      }));

    return NextResponse.json({ designers, designerIds: finalIds }, { status: 200 });
  } catch (e) {
    console.error('available-designers:', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
