import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: GET - Fetch all active designers from DB (used by home & designers pages)
export async function GET(_request: NextRequest) {
  try {
    // Comment: Include shop_id for filtering and instagramLink for profile link if present
    const { data, error } = await supabase
      .from('designers')
      .select('id, name, english_name, role, shop_id, instagramLink')
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
