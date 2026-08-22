import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseInventoryShopId } from '@/lib/inventory-shop';
import { findBrandCatalogSiblingIds, isCatalogMirrorRequest } from '@/lib/inventory-catalog-sync';

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
    const rawShopId = body.shop_id ?? body.shopId;
    const mirrorCatalog = isCatalogMirrorRequest(rawShopId);
    const shopId = parseInventoryShopId(rawShopId);
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    let targetIds = [brandId];

    if (mirrorCatalog) {
      const { data: source, error: sourceError } = await supabase
        .from('inventory_brands')
        .select('id, shop_id, name')
        .eq('id', brandId)
        .eq('shop_id', shopId)
        .single();

      if (sourceError || !source) {
        return NextResponse.json({ error: '브랜드를 찾지 못했습니다.' }, { status: 404 });
      }

      targetIds = await findBrandCatalogSiblingIds(source);
    }

    const { data, error } = await supabase
      .from('inventory_brands')
      .update(updates)
      .in('id', targetIds)
      .select('id, name');

    if (error) {
      console.error('Error updating inventory brand:', error);
      return NextResponse.json({ error: '브랜드를 수정하지 못했습니다.' }, { status: 500 });
    }

    const rows = data ?? [];
    const brand =
      rows.find((row) => row.id === brandId) ??
      rows.find((row) => row.id != null) ??
      null;

    return NextResponse.json({ brand, updated: rows.length }, { status: 200 });
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
    const rawShopId = searchParams.get('shop_id');
    const mirrorCatalog = isCatalogMirrorRequest(rawShopId);
    const shopId = parseInventoryShopId(rawShopId);

    let targetIds = [brandId];

    if (mirrorCatalog) {
      const { data: source, error: sourceError } = await supabase
        .from('inventory_brands')
        .select('id, shop_id, name')
        .eq('id', brandId)
        .eq('shop_id', shopId)
        .single();

      if (sourceError || !source) {
        return NextResponse.json({ error: '브랜드를 찾지 못했습니다.' }, { status: 404 });
      }

      targetIds = await findBrandCatalogSiblingIds(source);
    }

    const { error } = await supabase.from('inventory_brands').delete().in('id', targetIds);

    if (error) {
      console.error('Error deleting inventory brand:', error);
      return NextResponse.json({ error: '브랜드를 삭제하지 못했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: targetIds.length }, { status: 200 });
  } catch (error) {
    console.error('Error in inventory-brands DELETE route:', error);
    return NextResponse.json({ error: '브랜드를 삭제하지 못했습니다.' }, { status: 500 });
  }
}
