import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: GET - Fetch all designers (name and id only)
export async function GET(request: NextRequest) {
  try {
    // Comment: Get all active designers, select id, name, and role for sorting
    const { data, error } = await supabase
      .from('designers')
      .select('id, name, role')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching designers:', error);
      return NextResponse.json(
        { error: error.message || '디자이너 목록을 불러오지 못했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ designers: data || [] }, { status: 200 });
  } catch (error: any) {
    console.error('Error in designers GET route:', error);
    return NextResponse.json(
      { error: error.message || '디자이너 목록을 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}
