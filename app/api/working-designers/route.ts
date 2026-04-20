import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAvailableDesignerIdsForShop } from '@/lib/designer-availability';

export const dynamic = 'force-dynamic';

type DesignerRow = {
  id: number;
  name: string;
  english_name: string | null;
  role: string | null;
  shop_id: number | null;
  is_active: boolean;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = (searchParams.get('date') || '').trim();
  const shopIdParam = searchParams.get('shopId');

  if (!date) {
    return NextResponse.json({ designers: [] }, { status: 200 });
  }

  try {
    const [shopsResult, allDesignersResult, shopMapResult] = await Promise.all([
      supabase.from('shops').select('id').order('id', { ascending: true }),
      supabase
        .from('designers')
        .select('id, name, english_name, role, shop_id, is_active')
        .eq('is_active', true),
      supabase
        .from('designer_shops')
        .select('designer_id, shop_id')
        .eq('is_active', true),
    ]);

    if (shopsResult.error) {
      console.error('working-designers shops query:', shopsResult.error);
      return NextResponse.json({ error: 'Failed to load shops.' }, { status: 500 });
    }

    if (allDesignersResult.error) {
      console.error('working-designers designers query:', allDesignersResult.error);
      return NextResponse.json({ error: 'Failed to load designers.' }, { status: 500 });
    }

    const shopIds: number[] =
      shopIdParam != null
        ? [Number(shopIdParam)]
        : Array.from(
            new Set((shopsResult.data || []).map((row: { id: number }) => Number(row.id)).filter(Number.isFinite)),
          );

    const idsByShop = await Promise.all(
      shopIds.map((shopId) => getAvailableDesignerIdsForShop(supabase, date, shopId)),
    );
    const availableIdSet = new Set(idsByShop.flat().map(Number).filter(Number.isFinite));

    const shopMap = new Map<number, number[]>();
    for (const row of shopMapResult.data || []) {
      const designerId = Number(row.designer_id);
      const shopId = Number(row.shop_id);
      const list = shopMap.get(designerId) || [];
      if (!list.includes(shopId)) list.push(shopId);
      shopMap.set(designerId, list);
    }

    const designers = ((allDesignersResult.data || []) as DesignerRow[])
      .filter((designer) => availableIdSet.has(Number(designer.id)))
      .map((designer) => ({
        id: designer.id,
        name: designer.name,
        english_name: designer.english_name,
        role: designer.role,
        shop_id: designer.shop_id,
        shop_ids_at: Array.from(
          new Set([
            ...(designer.shop_id != null ? [Number(designer.shop_id)] : []),
            ...(shopMap.get(Number(designer.id)) || []),
          ]),
        ),
      }));

    return NextResponse.json({ designers }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in working-designers route:', error);
    return NextResponse.json({ error: 'Failed to load working designers.' }, { status: 500 });
  }
}
