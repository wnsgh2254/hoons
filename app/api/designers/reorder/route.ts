import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PATCH /api/designers/reorder — batch-update sort_order for designers
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body as { items: Array<{ id: number; sort_order: number }> };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items 배열이 필요합니다.' }, { status: 400 });
    }

    const updates = await Promise.all(
      items.map(({ id, sort_order }) =>
        supabase.from('designers').update({ sort_order }).eq('id', id),
      ),
    );

    const firstError = updates.find((r) => r.error)?.error;
    if (firstError) {
      console.error('Error reordering designers:', firstError);
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in designers/reorder PATCH route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
