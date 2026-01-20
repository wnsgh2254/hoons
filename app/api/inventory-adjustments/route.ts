import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Load stock adjustment history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search');

    let query = supabase
      .from('inventory_stock_adjustments')
      .select(
        'id, adjusted_at, product_code, product_name, before_stock, after_stock, diff, memo'
      )
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

// Comment: Apply arbitrary stock adjustments (to be wired with proper schema later)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // TODO: Insert adjustment rows + update inventory_items stock + movement history
    console.log('inventory-adjustments POST payload', body);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in inventory-adjustments POST route:', error);
    return NextResponse.json({ error: '재고 임의 조정 저장에 실패했습니다.' }, { status: 500 });
  }
}

