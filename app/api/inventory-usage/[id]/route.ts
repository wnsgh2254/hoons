import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getInventoryStatus } from '@/lib/utils/inventory-utils';
import { parseInventoryShopId } from '@/lib/inventory-shop';

type UsageEntryRow = {
  id: number;
  shop_id: number;
  inventory_item_id: number | null;
  used_at: string;
  staff_name: string | null;
  product_code: string | null;
  product_name: string | null;
  unit_price: number | string | null;
  quantity: number | string | null;
  amount: number | string | null;
  memo: string | null;
};

async function loadUsageEntry(id: number, shopId: number): Promise<UsageEntryRow | null> {
  const { data, error } = await supabase
    .from('inventory_internal_usage_entries')
    .select(
      'id, shop_id, inventory_item_id, used_at, staff_name, product_code, product_name, unit_price, quantity, amount, memo'
    )
    .eq('id', id)
    .eq('shop_id', shopId)
    .single();

  if (error || !data) {
    console.error('Error loading internal usage entry:', error);
    return null;
  }

  return data as UsageEntryRow;
}

async function adjustInventoryStock(
  inventoryItemId: number,
  shopId: number,
  delta: number
): Promise<{ productCode: string | null; productName: string | null; newStock: number } | null> {
  const { data: item, error } = await supabase
    .from('inventory_items')
    .select('id, sku, name, stock')
    .eq('id', inventoryItemId)
    .eq('shop_id', shopId)
    .single();

  if (error || !item) {
    console.error('Error loading inventory item for usage adjustment:', error);
    return null;
  }

  const beforeStock = Number(item.stock ?? 0);
  const newStock = Math.max(0, beforeStock + delta);

  const { error: updateError } = await supabase
    .from('inventory_items')
    .update({ stock: newStock, status: getInventoryStatus(newStock) })
    .eq('id', inventoryItemId)
    .eq('shop_id', shopId);

  if (updateError) {
    console.error('Error updating inventory stock for usage adjustment:', updateError);
    return null;
  }

  return {
    productCode: item.sku ?? null,
    productName: item.name ?? null,
    newStock,
  };
}

async function insertUsageMovement(params: {
  shopId: number;
  inventoryItemId: number;
  createdAt: string;
  staffName: string | null;
  productCode: string | null;
  productName: string | null;
  quantityChange: number;
  currentStock: number;
  memo?: string | null;
}) {
  const { error } = await supabase.from('inventory_movements').insert({
    shop_id: params.shopId,
    inventory_item_id: params.inventoryItemId,
    created_at: params.createdAt,
    user_id: params.staffName,
    product_code: params.productCode,
    product_name: params.productName,
    type: '내부 소모',
    quantity_change: params.quantityChange,
    current_stock: params.currentStock,
    created_via: 'internal_usage',
    memo: params.memo ?? null,
  });

  if (error) {
    console.error('Error inserting inventory movement for usage adjustment:', error);
  }
}

type UpdateUsageBody = {
  quantity?: number;
  staffName?: string | null;
  memo?: string | null;
  usedAt?: string;
  shopId?: number;
  shop_id?: number;
};

// Comment: Update an internal usage entry and reconcile inventory stock
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const usageId = Number(id);
    if (!usageId) {
      return NextResponse.json({ error: '잘못된 id 입니다.' }, { status: 400 });
    }

    const body = (await request.json()) as UpdateUsageBody;
    const shopId = parseInventoryShopId(body.shop_id ?? body.shopId);
    const entry = await loadUsageEntry(usageId, shopId);

    if (!entry) {
      return NextResponse.json({ error: '내부 소모 내역을 찾을 수 없습니다.' }, { status: 404 });
    }

    const oldQuantity = Number(entry.quantity ?? 0);
    const nextQuantity =
      body.quantity !== undefined ? Number(body.quantity) : oldQuantity;

    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      return NextResponse.json({ error: '수량은 1 이상 숫자로 입력해주세요.' }, { status: 400 });
    }

    const unitPrice = Number(entry.unit_price ?? 0);
    const usedAt =
      body.usedAt && body.usedAt.trim().length > 0
        ? new Date(body.usedAt).toISOString()
        : entry.used_at;
    const staffName =
      body.staffName !== undefined ? body.staffName || null : entry.staff_name;
    const memo = body.memo !== undefined ? body.memo || null : entry.memo;
    const quantityDelta = nextQuantity - oldQuantity;

    if (entry.inventory_item_id && quantityDelta !== 0) {
      // Comment: Higher usage decreases stock; lower usage restores stock
      const adjusted = await adjustInventoryStock(
        entry.inventory_item_id,
        shopId,
        -quantityDelta
      );
      if (!adjusted) {
        return NextResponse.json(
          { error: '재고 수량을 조정하지 못했습니다.' },
          { status: 500 }
        );
      }

      await insertUsageMovement({
        shopId,
        inventoryItemId: entry.inventory_item_id,
        createdAt: usedAt,
        staffName,
        productCode: adjusted.productCode ?? entry.product_code,
        productName: adjusted.productName ?? entry.product_name,
        quantityChange: -quantityDelta,
        currentStock: adjusted.newStock,
        memo: '내부 소모 수정',
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from('inventory_internal_usage_entries')
      .update({
        quantity: nextQuantity,
        amount: unitPrice * nextQuantity,
        staff_name: staffName,
        memo,
        used_at: usedAt,
      })
      .eq('id', usageId)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating internal usage entry:', updateError);
      return NextResponse.json(
        { error: '내부 소모 내역을 수정하지 못했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: updated }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in inventory-usage/[id] PATCH route:', error);
    return NextResponse.json({ error: '내부 소모 수정에 실패했습니다.' }, { status: 500 });
  }
}

// Comment: Delete an internal usage entry and restore inventory stock
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const usageId = Number(id);
    if (!usageId) {
      return NextResponse.json({ error: '잘못된 id 입니다.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    let shopId = parseInventoryShopId(searchParams.get('shop_id'));

    // Comment: Prefer query shop_id; fall back to JSON body when present
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const body = (await request.json()) as { shopId?: number; shop_id?: number };
        if (body.shop_id != null || body.shopId != null) {
          shopId = parseInventoryShopId(body.shop_id ?? body.shopId);
        }
      } catch {
        // Comment: Empty or invalid body is fine for DELETE
      }
    }

    const entry = await loadUsageEntry(usageId, shopId);
    if (!entry) {
      return NextResponse.json({ error: '내부 소모 내역을 찾을 수 없습니다.' }, { status: 404 });
    }

    const quantity = Number(entry.quantity ?? 0);

    if (entry.inventory_item_id && quantity > 0) {
      const adjusted = await adjustInventoryStock(entry.inventory_item_id, shopId, quantity);
      if (!adjusted) {
        return NextResponse.json(
          { error: '재고 수량을 복원하지 못했습니다.' },
          { status: 500 }
        );
      }

      await insertUsageMovement({
        shopId,
        inventoryItemId: entry.inventory_item_id,
        createdAt: new Date().toISOString(),
        staffName: entry.staff_name,
        productCode: adjusted.productCode ?? entry.product_code,
        productName: adjusted.productName ?? entry.product_name,
        quantityChange: quantity,
        currentStock: adjusted.newStock,
        memo: '내부 소모 삭제 복원',
      });
    }

    const { error: deleteError } = await supabase
      .from('inventory_internal_usage_entries')
      .delete()
      .eq('id', usageId)
      .eq('shop_id', shopId);

    if (deleteError) {
      console.error('Error deleting internal usage entry:', deleteError);
      return NextResponse.json(
        { error: '내부 소모 내역을 삭제하지 못했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in inventory-usage/[id] DELETE route:', error);
    return NextResponse.json({ error: '내부 소모 삭제에 실패했습니다.' }, { status: 500 });
  }
}
