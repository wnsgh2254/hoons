import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Load inventory brands list
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('inventory_brands')
      .select('id, name')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching inventory brands:', error);
      return NextResponse.json({ brands: [] }, { status: 200 });
    }

    return NextResponse.json({ brands: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in inventory-brands GET route:', error);
    return NextResponse.json({ brands: [] }, { status: 200 });
  }
}

