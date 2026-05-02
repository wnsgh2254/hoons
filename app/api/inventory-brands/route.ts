import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseInventoryShopId } from '@/lib/inventory-shop';

// Comment: Load inventory brands list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = parseInventoryShopId(searchParams.get('shop_id'));
    const { data, error } = await supabase
      .from('inventory_brands')
      .select('id, name')
      .eq('shop_id', shopId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching inventory brands:', error);
      return NextResponse.json({ brands: [] }, { status: 200 });
    }

    return NextResponse.json({ brands: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in inventory-brands GET route:', error);
    return NextResponse.json({ brands: [] }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;
    const shopId = parseInventoryShopId(body.shop_id ?? body.shopId);

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: '브랜드명을 입력해주세요.' }, { status: 400 });
    }

    // Get max sort_order to append at end
    const { data: maxData } = await supabase
      .from('inventory_brands')
      .select('sort_order')
      .eq('shop_id', shopId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextSortOrder = (maxData?.[0]?.sort_order ?? 0) + 1;

    const { data, error } = await supabase
      .from('inventory_brands')
      .insert({ name: String(name).trim(), shop_id: shopId, sort_order: nextSortOrder })
      .select('id, name')
      .single();

    if (error) {
      console.error('Error creating inventory brand:', error);
      return NextResponse.json({ error: '브랜드를 추가하지 못했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ brand: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in inventory-brands POST route:', error);
    return NextResponse.json({ error: '브랜드를 추가하지 못했습니다.' }, { status: 500 });
  }
}

// Bulk update sort_order for drag reordering
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
        supabase.from('inventory_brands').update({ sort_order }).eq('id', id).eq('shop_id', shopId),
      ),
    );

    const firstError = updates.find((r) => r.error)?.error;
    if (firstError) {
      console.error('Error reordering inventory brands:', firstError);
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in inventory-brands PUT route:', error);
    return NextResponse.json({ error: '순서를 저장하지 못했습니다.' }, { status: 500 });
  }
}

