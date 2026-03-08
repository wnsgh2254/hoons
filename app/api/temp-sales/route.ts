import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');
    const bookingIds = searchParams.get('booking_ids');

    // 단일 예약의 임시저장 조회
    if (bookingId) {
      const { data, error } = await supabase
        .from('temp_sales')
        .select('*')
        .eq('booking_id', bookingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ temp_sale: null }, { status: 200 });
        }
        if (error.code === 'PGRST205' || error.message?.includes('Could not find')) {
          return NextResponse.json({ temp_sale: null }, { status: 200 });
        }
        return NextResponse.json({ error: '임시저장 조회에 실패했습니다.' }, { status: 500 });
      }

      return NextResponse.json({ temp_sale: data }, { status: 200 });
    }

    // 여러 예약의 임시저장 존재 여부 조회
    if (bookingIds) {
      const ids = bookingIds.split(',').map(Number).filter((n) => !isNaN(n));
      if (ids.length === 0) {
        return NextResponse.json({ booking_ids: [] }, { status: 200 });
      }

      const { data, error } = await supabase
        .from('temp_sales')
        .select('booking_id')
        .in('booking_id', ids);

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('Could not find')) {
          return NextResponse.json({ booking_ids: [] }, { status: 200 });
        }
        return NextResponse.json({ error: '임시저장 조회에 실패했습니다.' }, { status: 500 });
      }

      return NextResponse.json({
        booking_ids: (data || []).map((d: any) => d.booking_id),
      }, { status: 200 });
    }

    return NextResponse.json({ error: 'booking_id 또는 booking_ids가 필요합니다.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in temp-sales GET route:', error);
    return NextResponse.json({ error: error.message || '오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_id, customer_id, data } = body;

    if (!booking_id || !customer_id || !data) {
      return NextResponse.json(
        { error: 'booking_id, customer_id, data가 필요합니다.' },
        { status: 400 }
      );
    }

    // Upsert: booking_id 기준으로 기존 있으면 업데이트, 없으면 생성
    const { data: existing } = await supabase
      .from('temp_sales')
      .select('id')
      .eq('booking_id', booking_id)
      .single();

    if (existing) {
      const { data: updated, error } = await supabase
        .from('temp_sales')
        .update({ customer_id, data, updated_at: new Date().toISOString() })
        .eq('booking_id', booking_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating temp sale:', error);
        return NextResponse.json({ error: '임시저장 업데이트에 실패했습니다.' }, { status: 500 });
      }
      return NextResponse.json({ temp_sale: updated }, { status: 200 });
    } else {
      const { data: created, error } = await supabase
        .from('temp_sales')
        .insert({ booking_id, customer_id, data })
        .select()
        .single();

      if (error) {
        console.error('Error creating temp sale:', error);
        return NextResponse.json({ error: '임시저장 생성에 실패했습니다.' }, { status: 500 });
      }
      return NextResponse.json({ temp_sale: created }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error in temp-sales POST route:', error);
    return NextResponse.json({ error: error.message || '오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');

    if (!bookingId) {
      return NextResponse.json({ error: 'booking_id가 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('temp_sales')
      .delete()
      .eq('booking_id', bookingId);

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find')) {
        return NextResponse.json({ success: true }, { status: 200 });
      }
      console.error('Error deleting temp sale:', error);
      return NextResponse.json({ error: '임시저장 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in temp-sales DELETE route:', error);
    return NextResponse.json({ error: error.message || '오류가 발생했습니다.' }, { status: 500 });
  }
}
