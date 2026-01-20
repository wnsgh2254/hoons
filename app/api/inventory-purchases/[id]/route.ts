import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Load single purchase header + items
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const purchaseId = Number(id);
    if (!purchaseId) {
      return NextResponse.json({ error: '잘못된 id 입니다.' }, { status: 400 });
    }

    const { data: header, error: headerError } = await supabase
      .from('inventory_purchases')
      .select(
        'id, type, purchase_date, memo, total_amount, created_at, suppliers:inventory_suppliers(name)'
      )
      .eq('id', purchaseId)
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

    const mappedItems =
      items?.map((row: any) => ({
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
          type: header.type,
          supplier_name: header.suppliers?.name ?? null,
          purchase_date: header.purchase_date,
          created_at: header.created_at,
          memo: header.memo ?? null,
          total_amount: Number(header.total_amount ?? 0),
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

