import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Customer search by name or phone for new booking modal

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q) {
    return NextResponse.json({ customers: [] });
  }

  try {
    let query = supabase
      .from('customers')
      .select('id, name, phone')
      .order('created_at', { ascending: false })
      .limit(20);

    const isNumeric = /^[0-9+]+$/.test(q);

    if (isNumeric) {
      query = query.ilike('phone', `%${q}%`);
    } else {
      query = query.ilike('name', `%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error searching customers:', error);
      return NextResponse.json({ error: '고객 검색 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ customers: data || [] });
  } catch (error) {
    console.error('Unexpected error searching customers:', error);
    return NextResponse.json({ error: '고객 검색 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

