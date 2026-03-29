import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { loadDesignerShopsMap, mergeDesignerShopIds } from '@/lib/designer-multi-venue';

const DESIGNER_SELECT = 'id, name, english_name, role, shop_id, instagramLink';

function enrichDesigners(
  rows: any[] | null,
  shopMap: Map<number, number[]>,
): Array<any & { shop_ids_at: number[] }> {
  return (rows || []).map((d) => ({
    ...d,
    shop_ids_at: mergeDesignerShopIds(d.shop_id, shopMap.get(d.id)),
  }));
}

// Comment: GET — active designers. ids=comma-separated (booking). shopId = primary OR designer_shops OR Director
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    const shopIdParam = searchParams.get('shopId');

    const shopMap = await loadDesignerShopsMap();

    if (idsParam != null && idsParam.trim() !== '') {
      const ids = idsParam
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (ids.length === 0) {
        return NextResponse.json({ designers: [] }, { status: 200 });
      }

      const { data, error } = await supabase
        .from('designers')
        .select(DESIGNER_SELECT)
        .eq('is_active', true)
        .in('id', ids)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching designers by ids:', error);
        return NextResponse.json(
          { error: error.message || '디자이너 목록을 불러오지 못했습니다.' },
          { status: 500 },
        );
      }

      return NextResponse.json({ designers: enrichDesigners(data, shopMap) }, { status: 200 });
    }

    const { data, error } = await supabase
      .from('designers')
      .select(DESIGNER_SELECT)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching designers:', error);
      return NextResponse.json(
        { error: error.message || '디자이너 목록을 불러오지 못했습니다.' },
        { status: 500 },
      );
    }

    let rows = enrichDesigners(data, shopMap);

    if (shopIdParam != null && shopIdParam !== '') {
      const shopId = Number(shopIdParam);
      if (Number.isNaN(shopId)) {
        return NextResponse.json({ error: 'shopId 가 올바르지 않습니다.' }, { status: 400 });
      }
      rows = rows.filter(
        (d) =>
          d.shop_ids_at.includes(shopId) ||
          String(d.role || '')
            .toLowerCase()
            .includes('director'),
      );
    }

    return NextResponse.json({ designers: rows }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in designers GET route:', error);
    return NextResponse.json(
      { error: message || '디자이너 목록을 불러오지 못했습니다.' },
      { status: 500 },
    );
  }
}
