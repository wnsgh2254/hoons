import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/services/categories — return all categories ordered by sort_order
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('service_categories')
      .select('id, name, sort_order')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching service categories:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories: data || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in service categories GET route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PATCH /api/services/categories/reorder — batch-update sort_order for categories
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body as { items: Array<{ name: string; sort_order: number }> };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items 배열이 필요합니다.' }, { status: 400 });
    }

    // Upsert category rows — create new ones if they don't exist yet
    const updates = await Promise.all(
      items.map(({ name, sort_order }) =>
        supabase
          .from('service_categories')
          .upsert({ name, sort_order }, { onConflict: 'name' }),
      ),
    );

    const firstError = updates.find((r) => r.error)?.error;
    if (firstError) {
      console.error('Error reordering service categories:', firstError);
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in service categories PATCH route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
