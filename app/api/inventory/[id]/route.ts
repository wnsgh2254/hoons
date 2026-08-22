import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseInventoryShopId } from '@/lib/inventory-shop';
import {
  findInventoryCatalogSiblingIds,
  isCatalogMirrorRequest,
  type InventoryCatalogRow,
} from '@/lib/inventory-catalog-sync';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const itemId = Number(id);

    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    const rawShopId = searchParams.get('shop_id');
    const mirrorCatalog = isCatalogMirrorRequest(rawShopId);
    const shopId = parseInventoryShopId(rawShopId);

    let targetIds = [itemId];

    if (mirrorCatalog) {
      const { data: source, error: sourceError } = await supabase
        .from('inventory_items')
        .select('id, shop_id, name, sku, brand, category')
        .eq('id', itemId)
        .eq('shop_id', shopId)
        .single();

      if (sourceError || !source) {
        return NextResponse.json({ error: '제품을 찾지 못했습니다.' }, { status: 404 });
      }

      targetIds = await findInventoryCatalogSiblingIds(source as InventoryCatalogRow);
    }

    const { error } = await supabase.from('inventory_items').delete().in('id', targetIds);

    if (error) {
      console.error('Error deleting inventory item:', error);
      return NextResponse.json({ error: '제품을 삭제하지 못했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: targetIds.length }, { status: 200 });
  } catch (error) {
    console.error('Error in inventory DELETE route:', error);
    return NextResponse.json({ error: '제품을 삭제하지 못했습니다.' }, { status: 500 });
  }
}
