import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseInventoryShopId, resolveCatalogInventoryShopIds } from '@/lib/inventory-shop';

// Comment: Load inventory product categories list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = parseInventoryShopId(searchParams.get('shop_id'));
    const { data, error } = await supabase
      .from('inventory_product_categories')
      .select('id, name')
      .eq('shop_id', shopId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching inventory product categories:', error);
      return NextResponse.json({ categories: [] }, { status: 200 });
    }

    return NextResponse.json({ categories: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in inventory-product-categories GET route:', error);
    return NextResponse.json({ categories: [] }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;
    const shopIds = resolveCatalogInventoryShopIds(body);

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: '카테고리명을 입력해주세요.' }, { status: 400 });
    }

    const trimmedName = String(name).trim();
    const created: { id: number; name: string }[] = [];

    for (const sid of shopIds) {
      const { data: maxData } = await supabase
        .from('inventory_product_categories')
        .select('sort_order')
        .eq('shop_id', sid)
        .order('sort_order', { ascending: false })
        .limit(1);
      const nextSortOrder = (maxData?.[0]?.sort_order ?? 0) + 1;

      const { data, error } = await supabase
        .from('inventory_product_categories')
        .insert({ name: trimmedName, shop_id: sid, sort_order: nextSortOrder })
        .select('id, name')
        .single();

      if (error) {
        console.error('Error creating inventory product category:', error);
        return NextResponse.json({ error: '카테고리를 추가하지 못했습니다.' }, { status: 500 });
      }
      if (data) created.push(data);
    }

    return NextResponse.json({ categories: created, category: created[0] }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in inventory-product-categories POST route:', error);
    return NextResponse.json({ error: '카테고리를 추가하지 못했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const order: Array<{ id: number; sort_order: number }> = body.order;
    const shopId = parseInventoryShopId(body.shop_id ?? body.shopId);

    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json({ error: 'order 배열이 필요합니다.' }, { status: 400 });
    }

    const updates = await Promise.all(
      order.map(({ id, sort_order }) =>
        supabase
          .from('inventory_product_categories')
          .update({ sort_order })
          .eq('id', id)
          .eq('shop_id', shopId),
      ),
    );

    const firstError = updates.find((r) => r.error)?.error;
    if (firstError) {
      console.error('Error reordering inventory product categories:', firstError);
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in inventory-product-categories PUT route:', error);
    return NextResponse.json({ error: '순서를 저장하지 못했습니다.' }, { status: 500 });
  }
}
