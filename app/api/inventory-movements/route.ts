import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Load inventory movement history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const productCode = searchParams.get('productCode');
    const category = searchParams.get('category');

    let query = supabase
      .from('inventory_movements')
      .select(
        'id, created_at, user_id, product_code, product_name, type, quantity_change, current_stock'
      )
      .order('created_at', { ascending: false });

    if (from) {
      query = query.gte('created_at', from);
    }
    if (to) {
      query = query.lte('created_at', `${to} 23:59:59`);
    }
    if (productCode) {
      query = query.eq('product_code', productCode);
    }
    if (category) {
      query = query.eq('type', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching inventory movements:', error);
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    return NextResponse.json({ rows: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in inventory-movements GET route:', error);
    return NextResponse.json({ rows: [] }, { status: 200 });
  }
}

