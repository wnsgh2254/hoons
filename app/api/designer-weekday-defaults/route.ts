import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { loadDesignerShopsMap, mergeDesignerShopIds } from '@/lib/designer-multi-venue';

export const dynamic = 'force-dynamic';

// Comment: GET — all rows or ?designer_id=
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const designerId = searchParams.get('designer_id');

    let q = supabase
      .from('designer_weekday_default_shop')
      .select('designer_id, weekday, shop_id')
      .order('designer_id', { ascending: true })
      .order('weekday', { ascending: true });
    if (designerId) {
      q = q.eq('designer_id', Number(designerId));
    }

    const { data, error } = await q;
    if (error) {
      console.error('designer-weekday-defaults GET:', error);
      return NextResponse.json({ error: '조회에 실패했습니다.' }, { status: 500 });
    }
    return NextResponse.json({ defaults: data || [] }, { status: 200 });
  } catch (e) {
    console.error('designer-weekday-defaults GET:', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// Comment: PUT — upsert provided weekday rows for one designer (1–7 rows accepted; other weekdays untouched)
// body: { designer_id, rows: [{ weekday, shop_id }] }
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const designerId = Number(body.designer_id);
    const rows = body.rows as { weekday: number; shop_id: number }[] | undefined;

    if (!Number.isFinite(designerId) || designerId <= 0) {
      return NextResponse.json({ error: 'designer_id가 필요합니다.' }, { status: 400 });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: '요일 행이 하나 이상 필요합니다.' }, { status: 400 });
    }

    const seen = new Set<number>();
    for (const r of rows) {
      const w = Number(r.weekday);
      const sid = Number(r.shop_id);
      if (!Number.isFinite(w) || w < 0 || w > 6 || seen.has(w)) {
        return NextResponse.json({ error: 'weekday는 0–6까지 각각 한 번씩이어야 합니다.' }, { status: 400 });
      }
      seen.add(w);
      if (!Number.isFinite(sid) || sid <= 0) {
        return NextResponse.json({ error: '유효한 shop_id가 필요합니다.' }, { status: 400 });
      }
    }

    const { data: drow, error: dErr } = await supabase
      .from('designers')
      .select('id, shop_id')
      .eq('id', designerId)
      .maybeSingle();

    if (dErr || !drow) {
      return NextResponse.json({ error: '디자이너를 찾을 수 없습니다.' }, { status: 404 });
    }

    const shopMap = await loadDesignerShopsMap();
    const allowed = new Set(mergeDesignerShopIds(drow.shop_id, shopMap.get(designerId)));
    if (allowed.size < 2) {
      // Comment: Single-venue designer — silently skip (no default-shop rule needed)
      return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
    }

    for (const r of rows) {
      if (!allowed.has(Number(r.shop_id))) {
        return NextResponse.json(
          { error: '선택한 매장이 해당 디자이너 소속 지점이 아닙니다.' },
          { status: 400 },
        );
      }
    }

    // Comment: Upsert provided weekdays; rows not included remain unchanged
    const upsertPayload = rows.map((r) => ({
      designer_id: designerId,
      weekday: Number(r.weekday),
      shop_id: Number(r.shop_id),
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase
      .from('designer_weekday_default_shop')
      .upsert(upsertPayload, { onConflict: 'designer_id,weekday' });

    if (upsertErr) {
      console.error('designer-weekday-defaults UPSERT:', upsertErr);
      return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('designer-weekday-defaults PUT:', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// Comment: DELETE — remove specific weekdays or all rows for one designer
// body: { designer_id, weekdays?: number[] }  (omit weekdays to remove all)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const designerId = Number(body.designer_id);
    if (!Number.isFinite(designerId) || designerId <= 0) {
      return NextResponse.json({ error: 'designer_id가 필요합니다.' }, { status: 400 });
    }
    let q = supabase.from('designer_weekday_default_shop').delete().eq('designer_id', designerId);
    if (Array.isArray(body.weekdays) && body.weekdays.length > 0) {
      q = q.in('weekday', body.weekdays.map(Number));
    }
    const { error } = await q;
    if (error) {
      console.error('designer-weekday-defaults DELETE:', error);
      return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('designer-weekday-defaults DELETE:', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
