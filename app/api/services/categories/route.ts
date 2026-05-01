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

// PATCH — batch reorder and/or rename a category
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const renameFrom = body.renameFrom as string | undefined;
    const renameTo = body.renameTo as string | undefined;

    if (renameFrom != null && renameTo != null) {
      const from = String(renameFrom).trim();
      const to = String(renameTo).trim();
      if (!from || !to) {
        return NextResponse.json({ error: 'renameFrom, renameTo 가 필요합니다.' }, { status: 400 });
      }
      if (from === to) {
        return NextResponse.json({ success: true }, { status: 200 });
      }

      const { error: catRenameErr } = await supabase
        .from('service_categories')
        .update({ name: to })
        .eq('name', from);

      if (catRenameErr) {
        console.error('Error renaming service category row:', catRenameErr);
        return NextResponse.json({ error: catRenameErr.message }, { status: 500 });
      }

      const { error: svcErr } = await supabase
        .from('services')
        .update({ category: to })
        .eq('category', from);

      if (svcErr) {
        console.error('Error updating services after category rename:', svcErr);
        return NextResponse.json({ error: svcErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

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

// DELETE — remove a category row and move services to Others
export async function DELETE(request: NextRequest) {
  try {
    const name = new URL(request.url).searchParams.get('name');
    const trimmed = name?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'name 쿼리 파라미터가 필요합니다.' }, { status: 400 });
    }

    const { error: svcErr } = await supabase
      .from('services')
      .update({ category: 'Others' })
      .eq('category', trimmed);

    if (svcErr) {
      console.error('Error reassigning services before category delete:', svcErr);
      return NextResponse.json({ error: svcErr.message }, { status: 500 });
    }

    const { error: delErr } = await supabase.from('service_categories').delete().eq('name', trimmed);

    if (delErr) {
      console.error('Error deleting service category:', delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in service categories DELETE route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
