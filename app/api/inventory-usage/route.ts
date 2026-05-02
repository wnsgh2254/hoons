import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getInventoryStatus } from '@/lib/utils/inventory-utils';
import { parseInventoryShopId } from '@/lib/inventory-shop';

type UsageInventoryItem = {
  category?: string | null;
  sku?: string | null;
  name?: string | null;
  price?: number | string | null;
  cost_price?: number | string | null;
  stock?: number | string | null;
};

// Comment: Load internal usage entries list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const staff = searchParams.get('staff');
    const shopId = parseInventoryShopId(searchParams.get('shop_id'));

    let query = supabase
      .from('inventory_internal_usage_entries')
      .select(
        'id, used_at, staff_name, product_code, product_name, unit_price, quantity, amount, memo'
      )
      .eq('shop_id', shopId)
      .order('used_at', { ascending: false });

    if (from) {
      query = query.gte('used_at', from);
    }
    if (to) {
      query = query.lte('used_at', `${to} 23:59:59`);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (staff) {
      query = query.eq('staff_name', staff);
    }
    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      query = query.or(`product_code.ilike.${term},product_name.ilike.${term}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching internal usage entries:', error);
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    return NextResponse.json({ rows: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in inventory-usage GET route:', error);
    return NextResponse.json({ rows: [] }, { status: 200 });
  }
}

type CreateUsageBody = {
  inventoryItemId: number;
  quantity: number;
  staffName?: string;
  memo?: string;
  usedAt?: string;
  shopId?: number;
  shop_id?: number;
};

// Comment: Create a single internal usage entry and update inventory/ movements
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateUsageBody;
    const inventoryItemId = Number(body.inventoryItemId);
    const quantity = Number(body.quantity);
    const shopId = parseInventoryShopId(body.shop_id ?? body.shopId);

    if (!inventoryItemId || !Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: 'inventoryItemId 와 양수 quantity 가 필요합니다.' },
        { status: 400 }
      );
    }

    // 1) Load inventory item
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', inventoryItemId)
      .eq('shop_id', shopId)
      .single();

    if (itemError || !item) {
      console.error('Error loading inventory item for internal usage:', itemError);
      return NextResponse.json(
        { error: '해당 인벤토리 상품을 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    // Comment: Internal usage cost is based on cost price, not retail price.
    const inventoryItem = item as UsageInventoryItem;
    const unitPrice = Number(inventoryItem.cost_price ?? inventoryItem.price ?? 0);
    const amount = unitPrice * quantity;
    const beforeStock = Number(inventoryItem.stock ?? 0);
    const newStock = Math.max(0, beforeStock - quantity);

    const usedAt =
      body.usedAt && body.usedAt.trim().length > 0
        ? new Date(body.usedAt)
        : new Date();

    // 2) Insert internal usage entry
    const { data: usage, error: usageError } = await supabase
      .from('inventory_internal_usage_entries')
      .insert({
        shop_id: shopId,
        inventory_item_id: inventoryItemId,
        used_at: usedAt.toISOString(),
        staff_name: body.staffName ?? null,
        category: inventoryItem.category ?? null,
        product_code: inventoryItem.sku ?? null,
        product_name: inventoryItem.name ?? null,
        unit_price: unitPrice,
        quantity,
        amount,
        memo: body.memo ?? null,
      })
      .select()
      .single();

    if (usageError) {
      console.error('Error inserting internal usage entry:', usageError);
      return NextResponse.json(
        { error: '내부 소모 내역을 저장하지 못했습니다.' },
        { status: 500 }
      );
    }

    // 3) Update inventory_items stock & status
    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({ stock: newStock, status: getInventoryStatus(newStock) })
      .eq('id', inventoryItemId)
      .eq('shop_id', shopId);

    if (updateError) {
      console.error('Error updating inventory stock after internal usage:', updateError);
    }

    // 4) Insert movement row for calculations
    const { error: movementError } = await supabase
      .from('inventory_movements')
      .insert({
        shop_id: shopId,
        inventory_item_id: inventoryItemId,
        created_at: usedAt.toISOString(),
        user_id: body.staffName ?? null,
        product_code: inventoryItem.sku ?? null,
        product_name: inventoryItem.name ?? null,
        type: '내부 소모',
        quantity_change: -quantity,
        current_stock: newStock,
        created_via: 'internal_usage',
      });

    if (movementError) {
      console.error('Error inserting inventory movement for internal usage:', movementError);
    }

    return NextResponse.json({ item: usage }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in inventory-usage POST route:', error);
    return NextResponse.json({ error: '내부 소모 등록에 실패했습니다.' }, { status: 500 });
  }
}

