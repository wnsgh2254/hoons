import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getInventoryStatus } from '@/lib/utils/inventory-utils';

// Comment: List purchases with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const type = searchParams.get('type'); // 'purchase' | 'return'
    const supplierName = searchParams.get('supplier');

    let query = supabase
      .from('inventory_purchases')
      .select('id, type, purchase_date, total_amount, memo, suppliers:inventory_suppliers(name)')
      .order('purchase_date', { ascending: false })
      .order('id', { ascending: false });

    if (from) {
      query = query.gte('purchase_date', from);
    }
    if (to) {
      query = query.lte('purchase_date', to);
    }
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    if (supplierName && supplierName.trim().length > 0) {
      const term = `%${supplierName.trim()}%`;
      query = query.ilike('inventory_suppliers.name', term);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching inventory purchases:', error);
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    const rows =
      data?.map((row: any) => ({
        id: row.id,
        type: row.type,
        purchase_date: row.purchase_date,
        total_amount: Number(row.total_amount ?? 0),
        memo: row.memo ?? null,
        supplier_name: row.suppliers?.name ?? null,
      })) ?? [];

    return NextResponse.json({ rows }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in inventory-purchases GET route:', error);
    return NextResponse.json({ rows: [] }, { status: 200 });
  }
}

type PurchaseItemInput = {
  inventoryItemId: number;
  unitPrice: number;
  quantity: number;
};

type CreatePurchaseBody = {
  type: 'purchase' | 'return';
  supplierName: string;
  purchaseDate: string;
  memo?: string;
  items: PurchaseItemInput[];
};

// Comment: Create purchase/return with items and update inventory + movements
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreatePurchaseBody;
    const type = body.type === 'return' ? 'return' : 'purchase';
    const items = Array.isArray(body.items) ? body.items : [];

    if (!body.supplierName || !body.purchaseDate || !items.length) {
      return NextResponse.json(
        { error: '공급처, 날짜, 품목이 필요합니다.' },
        { status: 400 }
      );
    }

    // 1) Upsert supplier
    const supplierName = body.supplierName.trim();
    let supplierId: number | null = null;

    const { data: existingSupplier } = await supabase
      .from('inventory_suppliers')
      .select('id')
      .eq('name', supplierName)
      .maybeSingle();

    if (existingSupplier) {
      supplierId = existingSupplier.id;
    } else {
      const { data: newSupplier, error: insertSupplierError } = await supabase
        .from('inventory_suppliers')
        .insert({ name: supplierName })
        .select()
        .single();
      if (insertSupplierError) {
        console.error('Error inserting supplier:', insertSupplierError);
        return NextResponse.json(
          { error: '공급처를 저장하지 못했습니다.' },
          { status: 500 }
        );
      }
      supplierId = newSupplier.id;
    }

    // 2) Load inventory_items needed for price/stock
    const itemIds = items.map((i) => Number(i.inventoryItemId)).filter((id) => !!id);
    const { data: inventoryList, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('*')
      .in('id', itemIds);

    if (inventoryError) {
      console.error('Error loading inventory items for purchase:', inventoryError);
      return NextResponse.json(
        { error: '재고 상품 정보를 불러오지 못했습니다.' },
        { status: 500 }
      );
    }

    const inventoryMap = new Map<number, any>();
    (inventoryList ?? []).forEach((row: any) => {
      inventoryMap.set(row.id, row);
    });

    // 3) Calculate totals
    const purchaseDate = body.purchaseDate;
    const itemRows = items.map((i) => {
      const unitPrice = Number(i.unitPrice ?? 0);
      const quantity = Number(i.quantity ?? 0);
      return {
        inventory_item_id: i.inventoryItemId,
        unit_price: unitPrice,
        quantity,
        line_amount: unitPrice * quantity,
      };
    });

    const totalAmount = itemRows.reduce((sum, r) => sum + r.line_amount, 0);

    // 4) Insert purchase header
    const { data: purchase, error: purchaseError } = await supabase
      .from('inventory_purchases')
      .insert({
        type,
        supplier_id: supplierId,
        purchase_date: purchaseDate,
        memo: body.memo ?? null,
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Error inserting purchase header:', purchaseError);
      return NextResponse.json(
        { error: '매입 정보를 저장하지 못했습니다.' },
        { status: 500 }
      );
    }

    // 5) Insert items
    const { data: insertedItems, error: itemsError } = await supabase
      .from('inventory_purchase_items')
      .insert(
        itemRows.map((row) => ({
          ...row,
          purchase_id: purchase.id,
        }))
      )
      .select();

    if (itemsError) {
      console.error('Error inserting purchase items:', itemsError);
      return NextResponse.json(
        { error: '매입 품목을 저장하지 못했습니다.' },
        { status: 500 }
      );
    }

    // 6) Update inventory_items stock + insert movements
    for (const row of insertedItems ?? []) {
      const inventoryId = row.inventory_item_id as number;
      const sourceItem = inventoryMap.get(inventoryId);
      if (!sourceItem) continue;

      const qtyChange =
        type === 'purchase'
          ? Number(row.quantity ?? 0)
          : -Number(row.quantity ?? 0);

      const beforeStock = Number(sourceItem.stock ?? 0);
      const newStock = beforeStock + qtyChange;

      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ stock: newStock, status: getInventoryStatus(newStock) })
        .eq('id', inventoryId);

      if (updateError) {
        console.error('Error updating inventory stock after purchase:', updateError);
      }

      const movementType = type === 'purchase' ? '매입' : '반품';

      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          inventory_item_id: inventoryId,
          created_at: purchaseDate,
          user_id: null,
          product_code: sourceItem.sku ?? null,
          product_name: sourceItem.name ?? null,
          type: movementType,
          quantity_change: qtyChange,
          current_stock: newStock,
          created_via: 'purchase',
        });

      if (movementError) {
        console.error(
          'Error inserting inventory movement for purchase item:',
          movementError
        );
      }
    }

    return NextResponse.json({ purchaseId: purchase.id }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in inventory-purchases POST route:', error);
    return NextResponse.json(
      { error: '매입 정보를 저장하지 못했습니다.' },
      { status: 500 }
    );
  }
}

