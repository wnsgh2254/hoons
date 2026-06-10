import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseInventoryShopId } from '@/lib/inventory-shop';

type PurchaseDetailItemRow = {
  id: number;
  inventory_items?: {
    sku?: string | null;
    name?: string | null;
  } | null;
  unit_price: number | string | null;
  quantity: number | string | null;
  line_amount: number | string | null;
};

type PurchaseDetailHeaderRow = {
  type: 'purchase' | 'return';
  purchase_date: string;
  memo: string | null;
  total_amount: number | string | null;
  created_at: string;
  suppliers?: { name?: string | null } | { name?: string | null }[] | null;
};

function supplierNameFromJoin(
  suppliers: PurchaseDetailHeaderRow['suppliers'],
): string | null {
  if (!suppliers) return null;
  if (Array.isArray(suppliers)) return suppliers[0]?.name ?? null;
  return suppliers.name ?? null;
}

// Comment: Load single purchase header + items
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const purchaseId = Number(id);
    if (!purchaseId) {
      return NextResponse.json({ error: '잘못된 id 입니다.' }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    const shopId = parseInventoryShopId(searchParams.get('shop_id'));

    const { data: header, error: headerError } = await supabase
      .from('inventory_purchases')
      .select(
        'id, type, purchase_date, memo, total_amount, created_at, suppliers:inventory_suppliers(name)'
      )
      .eq('id', purchaseId)
      .eq('shop_id', shopId)
      .single();

    if (headerError || !header) {
      console.error('Error loading purchase header:', headerError);
      return NextResponse.json(
        { error: '매입 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from('inventory_purchase_items')
      .select(
        'id, unit_price, quantity, line_amount, inventory_item_id, inventory_items!inner(sku, name)'
      )
      .eq('purchase_id', purchaseId);

    if (itemsError) {
      console.error('Error loading purchase items:', itemsError);
      return NextResponse.json(
        { error: '매입 품목을 불러오지 못했습니다.' },
        { status: 500 }
      );
    }

    const purchaseHeader = header as PurchaseDetailHeaderRow;

    const mappedItems =
      (items as PurchaseDetailItemRow[] | null)?.map((row) => ({
        id: row.id,
        product_code: row.inventory_items?.sku ?? null,
        product_name: row.inventory_items?.name ?? null,
        unit_price: Number(row.unit_price ?? 0),
        quantity: Number(row.quantity ?? 0),
        line_amount: Number(row.line_amount ?? 0),
      })) ?? [];

    return NextResponse.json(
      {
        header: {
          type: purchaseHeader.type,
          supplier_name: supplierNameFromJoin(purchaseHeader.suppliers),
          purchase_date: purchaseHeader.purchase_date,
          created_at: purchaseHeader.created_at,
          memo: purchaseHeader.memo ?? null,
          total_amount: Number(purchaseHeader.total_amount ?? 0),
        },
        items: mappedItems,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in inventory-purchases/[id] GET route:', error);
    return NextResponse.json(
      { error: '매입 상세를 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}

