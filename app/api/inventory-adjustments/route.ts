import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getInventoryStatus } from '@/lib/utils/inventory-utils';
import { parseInventoryShopId } from '@/lib/inventory-shop';

type AdjustmentInput = {
  inventory_item_id?: number;
  inventoryItemId?: number;
  before?: number;
  after?: number;
  after_stock?: number;
  memo?: string | null;
};

type InventoryAdjustmentItem = {
  id: number;
  sku: string | null;
  name: string | null;
  stock: number | null;
};

// Comment: Load stock adjustment history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search');
    const shopId = parseInventoryShopId(searchParams.get('shop_id'));

    let query = supabase
      .from('inventory_stock_adjustments')
      .select(
        'id, adjusted_at, product_code, product_name, before_stock, after_stock, diff, memo'
      )
      .eq('shop_id', shopId)
      .order('adjusted_at', { ascending: false });

    if (from) {
      query = query.gte('adjusted_at', from);
    }
    if (to) {
      query = query.lte('adjusted_at', `${to} 23:59:59`);
    }
    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      query = query.or(`product_code.ilike.${term},product_name.ilike.${term}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching inventory adjustments:', error);
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    return NextResponse.json({ rows: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in inventory-adjustments GET route:', error);
    return NextResponse.json({ rows: [] }, { status: 200 });
  }
}

// Comment: Apply arbitrary stock adjustments and record audit rows.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const shopId = parseInventoryShopId(body.shop_id ?? body.shopId);
    const adjustments: AdjustmentInput[] = Array.isArray(body.adjustments) ? body.adjustments : [];

    const itemIds = adjustments
      .map((row) => Number(row.inventory_item_id ?? row.inventoryItemId))
      .filter((id: number) => Number.isFinite(id) && id > 0);

    if (!itemIds.length) {
      return NextResponse.json({ success: true, inserted: 0 }, { status: 201 });
    }

    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id, sku, name, stock')
      .eq('shop_id', shopId)
      .in('id', itemIds);

    if (itemsError) {
      console.error('Error loading inventory items for adjustments:', itemsError);
      return NextResponse.json({ error: '재고 상품 정보를 불러오지 못했습니다.' }, { status: 500 });
    }

    const itemMap = new Map(
      ((items ?? []) as InventoryAdjustmentItem[]).map((item) => [Number(item.id), item])
    );
    let inserted = 0;

    for (const row of adjustments) {
      const itemId = Number(row.inventory_item_id ?? row.inventoryItemId);
      const item = itemMap.get(itemId);
      if (!item) continue;

      const before = Number(item.stock ?? row.before ?? 0);
      const after = Math.max(0, Number(row.after ?? row.after_stock ?? before));
      const diff = after - before;
      if (diff === 0) continue;

      const adjustedAt = new Date().toISOString();
      const memo = row.memo ?? null;

      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ stock: after, status: getInventoryStatus(after) })
        .eq('id', itemId)
        .eq('shop_id', shopId);

      if (updateError) {
        console.error('Error updating inventory item for adjustment:', updateError);
        continue;
      }

      const { error: insertError } = await supabase
        .from('inventory_stock_adjustments')
        .insert({
          shop_id: shopId,
          inventory_item_id: itemId,
          adjusted_at: adjustedAt,
          product_code: item.sku ?? null,
          product_name: item.name ?? null,
          before_stock: before,
          after_stock: after,
          diff,
          memo,
        });

      if (insertError) {
        console.error('Error inserting inventory adjustment:', insertError);
      } else {
        inserted += 1;
      }

      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          shop_id: shopId,
          inventory_item_id: itemId,
          created_at: adjustedAt,
          user_id: null,
          product_code: item.sku ?? null,
          product_name: item.name ?? null,
          type: '재고 조정',
          quantity_change: diff,
          current_stock: after,
          created_via: 'stock_adjustment',
        });

      if (movementError) {
        console.error('Error inserting movement for adjustment:', movementError);
      }
    }

    return NextResponse.json({ success: true, inserted }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in inventory-adjustments POST route:', error);
    return NextResponse.json({ error: '재고 임의 조정 저장에 실패했습니다.' }, { status: 500 });
  }
}

