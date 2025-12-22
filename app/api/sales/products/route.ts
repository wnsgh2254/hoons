import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Get aggregated product sales per inventory item using product_sale_items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Comment: Fallback to last 30 days if no range provided
    let fromDate = from;
    let toDate = to;

    if (!fromDate || !toDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      fromDate = start.toISOString();
      toDate = end.toISOString();
    }

    // Comment: Join product_sale_items -> payments -> inventory_items
    // Note: We filter by product_sale_items.created_at to keep syntax simple
    const { data, error } = await supabase
      .from('product_sale_items')
      .select(
        `
        quantity,
        line_amount,
        created_at,
        payments(id, created_at, type),
        inventory_items(id, name, category, price, icon)
      `
      )
      .gte('created_at', fromDate)
      .lte('created_at', toDate);

    if (error) {
      console.error('Error fetching product sales:', error);
      return NextResponse.json(
        { error: '제품 매출 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    const rows = (data || []) as any[];

    // Comment: Aggregate by inventory item
    const byProduct: Record<
      number,
      {
        itemId: number;
        name: string;
        category: string;
        icon: string | null;
        unitPrice: number;
        totalQuantity: number;
        totalAmount: number;
      }
    > = {};

    for (const row of rows) {
      const item = row.inventory_items;
      if (!item) continue;

      const id = Number(item.id);
      if (!byProduct[id]) {
        byProduct[id] = {
          itemId: id,
          name: item.name,
          category: item.category,
          icon: item.icon ?? null,
          unitPrice: Number(item.price || 0),
          totalQuantity: 0,
          totalAmount: 0,
        };
      }

      byProduct[id].totalQuantity += Number(row.quantity || 0);
      byProduct[id].totalAmount += Number(row.line_amount || 0);
    }

    const list = Object.values(byProduct).sort(
      (a, b) => b.totalAmount - a.totalAmount
    );

    const summary = list.reduce(
      (acc, item) => {
        acc.totalAmount += item.totalAmount;
        acc.totalQuantity += item.totalQuantity;
        return acc;
      },
      { totalAmount: 0, totalQuantity: 0 }
    );

    return NextResponse.json(
      {
        from: fromDate,
        to: toDate,
        summary,
        products: list,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in product sales route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


