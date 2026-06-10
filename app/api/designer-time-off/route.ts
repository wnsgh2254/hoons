import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: GET - Fetch time off records for designers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const designerId = searchParams.get('designer_id');
    const shopId = searchParams.get('shop_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase
      .from('designer_time_off')
      .select(
        `
        *,
        designer:designer_id ( id, name ),
        shop:shop_id ( id, name )
      `
      )
      .order('start_date', { ascending: true });

    if (designerId) {
      query = query.eq('designer_id', Number(designerId));
    }
    if (shopId) {
      query = query.eq('shop_id', Number(shopId));
    }
    if (startDate && endDate) {
      // Comment: Find overlapping time off periods
      query = query.or(
        `and(start_date.lte.${endDate},end_date.gte.${startDate})`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching designer time off:', error);
      return NextResponse.json(
        { error: '휴무 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ timeOffs: data || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in designer-time-off route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Comment: POST - Create a new time off record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rowsInput: Array<{
      designer_id: number;
      shop_id?: number | null;
      start_date: string;
      end_date: string;
      reason?: string | null;
    }> = Array.isArray(body.rows)
      ? body.rows
      : [{
          designer_id: body.designer_id,
          shop_id: body.shop_id,
          start_date: body.start_date,
          end_date: body.end_date,
          reason: body.reason,
        }];

    if (rowsInput.length === 0) {
      return NextResponse.json(
        { error: '등록할 휴무 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // Comment: De-duplicate request payload to avoid repeated DB work for identical rows.
    const uniqueRows = new Map<string, {
      designer_id: number;
      shop_id: number | null;
      start_date: string;
      end_date: string;
      reason: string | null;
    }>();

    for (const row of rowsInput) {
      if (!row?.designer_id || !row?.start_date || !row?.end_date) {
        return NextResponse.json(
          { error: '디자이너 ID, 시작일, 종료일은 필수입니다.' },
          { status: 400 }
        );
      }
      if (new Date(row.end_date) < new Date(row.start_date)) {
        return NextResponse.json(
          { error: '종료일은 시작일보다 이후여야 합니다.' },
          { status: 400 }
        );
      }

      const normalized = {
        designer_id: Number(row.designer_id),
        shop_id: row.shop_id == null ? null : Number(row.shop_id),
        start_date: row.start_date,
        end_date: row.end_date,
        reason: row.reason || null,
      };
      const key = [
        normalized.designer_id,
        normalized.shop_id == null ? 'null' : normalized.shop_id,
        normalized.start_date,
        normalized.end_date,
        normalized.reason ?? 'null',
      ].join('|');
      uniqueRows.set(key, normalized);
    }

    const savedRows: any[] = [];
    for (const row of uniqueRows.values()) {
      // Comment: Keep insert idempotent for same designer/shop/date/reason tuple.
      let duplicateQuery = supabase
        .from('designer_time_off')
        .select('*')
        .eq('designer_id', row.designer_id)
        .eq('start_date', row.start_date)
        .eq('end_date', row.end_date)
        .eq('reason', row.reason);

      duplicateQuery =
        row.shop_id == null
          ? duplicateQuery.is('shop_id', null)
          : duplicateQuery.eq('shop_id', row.shop_id);

      const { data: existingSame, error: existingErr } = await duplicateQuery
        .limit(1)
        .maybeSingle();
      if (existingErr) {
        console.error('Error checking duplicate time off:', existingErr);
        return NextResponse.json(
          { error: '휴무 등록에 실패했습니다.' },
          { status: 500 }
        );
      }
      if (existingSame) {
        savedRows.push(existingSame);
        continue;
      }

      const { data, error } = await supabase
        .from('designer_time_off')
        .insert(row)
        .select()
        .single();

      if (error) {
        console.error('Error creating time off:', error);
        return NextResponse.json(
          { error: '휴무 등록에 실패했습니다.' },
          { status: 500 }
        );
      }
      savedRows.push(data);
    }

    if (!Array.isArray(body.rows)) {
      const first = savedRows[0] ?? null;
      return NextResponse.json({ timeOff: first }, { status: 201 });
    }
    return NextResponse.json({ timeOffs: savedRows }, { status: 201 });
  } catch (error) {
    console.error('Error in designer-time-off POST route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

