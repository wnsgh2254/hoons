import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseInventoryShopId } from '@/lib/inventory-shop';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const brandId = Number(id);

    if (Number.isNaN(brandId)) {
      return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 });
    }

    const body = await request.json();
    const shopId = parseInventoryShopId(body.shop_id ?? body.shopId);
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('inventory_brands')
      .update(updates)
      .eq('id', brandId)
      .eq('shop_id', shopId)
      .select('id, name')
      .single();

    if (error) {
      console.error('Error updating inventory brand:', error);
      return NextResponse.json({ error: '브랜드를 수정하지 못했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ brand: data }, { status: 200 });
  } catch (error) {
    console.error('Error in inventory-brands PATCH route:', error);
    return NextResponse.json({ error: '브랜드를 수정하지 못했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const brandId = Number(id);

    if (Number.isNaN(brandId)) {
      return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    const shopId = parseInventoryShopId(searchParams.get('shop_id'));

    const { error } = await supabase
      .from('inventory_brands')
      .delete()
      .eq('id', brandId)
      .eq('shop_id', shopId);

    if (error) {
      console.error('Error deleting inventory brand:', error);
      return NextResponse.json({ error: '브랜드를 삭제하지 못했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in inventory-brands DELETE route:', error);
    return NextResponse.json({ error: '브랜드를 삭제하지 못했습니다.' }, { status: 500 });
  }
}
