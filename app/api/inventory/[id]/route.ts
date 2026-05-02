import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseInventoryShopId } from '@/lib/inventory-shop';

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
    const shopId = parseInventoryShopId(searchParams.get('shop_id'));

    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', itemId)
      .eq('shop_id', shopId);

    if (error) {
      console.error('Error deleting inventory item:', error);
      return NextResponse.json({ error: '제품을 삭제하지 못했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in inventory DELETE route:', error);
    return NextResponse.json({ error: '제품을 삭제하지 못했습니다.' }, { status: 500 });
  }
}
