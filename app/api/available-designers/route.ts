import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAvailableDesignerIdsForShop } from '@/lib/designer-availability';
import { sortDesignersByDisplayOrder } from '@/lib/designer-display-order';
import { isPublicBookingDateBeyondHorizon } from '@/lib/utils/appointment-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/available-designers?date=YYYY-MM-DD&shopId=N
 *
 * Uses the same DB rules as admin schedule + lib/designer-schedules GET (via getAvailableDesignerIdsForShop):
 * designer_schedules, designer_shops, designer_time_off, designer_weekday_default_shop, designers.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const shopIdParam = searchParams.get('shopId');

    if (!date || !shopIdParam) {
      return NextResponse.json({ error: 'date and shopId are required.' }, { status: 400 });
    }

    if (isPublicBookingDateBeyondHorizon(date)) {
      return NextResponse.json({ error: 'date is beyond the allowed booking window.' }, { status: 400 });
    }

    const sid = Number(shopIdParam);

    const [finalIds, shopMapResult, allDesignersResult] = await Promise.all([
      getAvailableDesignerIdsForShop(supabase, date, sid),
      supabase
        .from('designer_shops')
        .select('designer_id, shop_id')
        .eq('is_active', true),
      supabase
        .from('designers')
        .select('id, name, english_name, role, shop_id, is_active')
        .eq('is_active', true),
    ]);

    type DesignerRow = {
      id: number;
      name: string;
      english_name: string | null;
      role: string | null;
      shop_id: number | null;
      is_active: boolean;
    };
    if (allDesignersResult.error) {
      console.error('available-designers designers query:', allDesignersResult.error);
      return NextResponse.json({ error: 'Failed to load designers.' }, { status: 500 });
    }

    const allDesigners: DesignerRow[] = (allDesignersResult.data || []) as DesignerRow[];

    const shopMap = new Map<number, number[]>();
    for (const r of shopMapResult.data || []) {
      const did = Number(r.designer_id);
      const s = Number(r.shop_id);
      const list = shopMap.get(did) || [];
      if (!list.includes(s)) list.push(s);
      shopMap.set(did, list);
    }

    function mergedShopIds(designerId: number, primaryShopId: number | null): number[] {
      const set = new Set<number>();
      if (primaryShopId != null) set.add(primaryShopId);
      for (const s of shopMap.get(designerId) || []) set.add(s);
      return [...set];
    }

    const idSet = new Set(finalIds.map(Number));
    const designers = sortDesignersByDisplayOrder(
      allDesigners
        .filter((d) => idSet.has(Number(d.id)))
        .map((d) => ({
          id: d.id,
          name: d.name,
          english_name: d.english_name,
          role: d.role,
          shop_id: d.shop_id,
          shop_ids_at: mergedShopIds(Number(d.id), d.shop_id != null ? Number(d.shop_id) : null),
        })),
    );

    return NextResponse.json({ designers, designerIds: finalIds }, { status: 200 });
  } catch (e) {
    console.error('available-designers:', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
