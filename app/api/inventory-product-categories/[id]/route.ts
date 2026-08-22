import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseInventoryShopId } from '@/lib/inventory-shop';
import {
  findProductCategoryCatalogSiblingIds,
  isCatalogMirrorRequest,
} from '@/lib/inventory-catalog-sync';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const categoryId = Number(id);

    if (Number.isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
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

    let targetIds = [categoryId];

    if (mirrorCatalog) {
      const { data: source, error: sourceError } = await supabase
        .from('inventory_product_categories')
        .select('id, shop_id, name')
        .eq('id', categoryId)
        .eq('shop_id', shopId)
        .single();

      if (sourceError || !source) {
        return NextResponse.json({ error: '카테고리를 찾지 못했습니다.' }, { status: 404 });
      }

      targetIds = await findProductCategoryCatalogSiblingIds(source);
    }

    const { data, error } = await supabase
      .from('inventory_product_categories')
      .update(updates)
      .in('id', targetIds)
      .select('id, name');

    if (error) {
      console.error('Error updating inventory product category:', error);
      return NextResponse.json({ error: '카테고리를 수정하지 못했습니다.' }, { status: 500 });
    }

    const rows = data ?? [];
    const category =
      rows.find((row) => row.id === categoryId) ??
      rows.find((row) => row.id != null) ??
      null;

    return NextResponse.json({ category, updated: rows.length }, { status: 200 });
  } catch (error) {
    console.error('Error in inventory-product-categories PATCH route:', error);
    return NextResponse.json({ error: '카테고리를 수정하지 못했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const categoryId = Number(id);

    if (Number.isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    const rawShopId = searchParams.get('shop_id');
    const mirrorCatalog = isCatalogMirrorRequest(rawShopId);
    const shopId = parseInventoryShopId(rawShopId);

    let targetIds = [categoryId];

    if (mirrorCatalog) {
      const { data: source, error: sourceError } = await supabase
        .from('inventory_product_categories')
        .select('id, shop_id, name')
        .eq('id', categoryId)
        .eq('shop_id', shopId)
        .single();

      if (sourceError || !source) {
        return NextResponse.json({ error: '카테고리를 찾지 못했습니다.' }, { status: 404 });
      }

      targetIds = await findProductCategoryCatalogSiblingIds(source);
    }

    const { error } = await supabase.from('inventory_product_categories').delete().in('id', targetIds);

    if (error) {
      console.error('Error deleting inventory product category:', error);
      return NextResponse.json({ error: '카테고리를 삭제하지 못했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: targetIds.length }, { status: 200 });
  } catch (error) {
    console.error('Error in inventory-product-categories DELETE route:', error);
    return NextResponse.json({ error: '카테고리를 삭제하지 못했습니다.' }, { status: 500 });
  }
}
