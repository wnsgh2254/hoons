import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: GET - Fetch booking restrictions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const designerId = searchParams.get('designer_id');
    const date = searchParams.get('date');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase
      .from('booking_restrictions')
      .select('*')
      .order('restriction_date', { ascending: true });

    if (designerId) {
      query = query.eq('designer_id', Number(designerId));
    }
    if (date) {
      query = query.eq('restriction_date', date);
    }
    if (startDate && endDate) {
      query = query.gte('restriction_date', startDate).lte('restriction_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching booking restrictions:', error);
      return NextResponse.json(
        { error: '예약금지 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ restrictions: data || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in booking-restrictions GET route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Comment: POST - Create a new booking restriction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { designer_id, restriction_type, restriction_date, start_time, end_time, reason, memo } = body;

    if (!designer_id || !restriction_type || !restriction_date) {
      return NextResponse.json(
        { error: '디자이너 ID, 제한 유형, 날짜는 필수입니다.' },
        { status: 400 }
      );
    }

    if (restriction_type === 'time' && (!start_time || !end_time)) {
      return NextResponse.json(
        { error: '시간 제한의 경우 시작 시간과 종료 시간이 필요합니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('booking_restrictions')
      .insert({
        designer_id: Number(designer_id),
        restriction_type,
        restriction_date,
        start_time: restriction_type === 'time' ? start_time : null,
        end_time: restriction_type === 'time' ? end_time : null,
        reason: reason ?? memo ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating booking restriction:', error);
      return NextResponse.json(
        { error: '예약금지 등록에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ restriction: data }, { status: 201 });
  } catch (error) {
    console.error('Error in booking-restrictions POST route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Comment: PUT - Update an existing booking restriction by ID
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id 파라미터는 필수입니다.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      designer_id,
      restriction_type,
      restriction_date,
      start_time,
      end_time,
      reason,
      memo,
    } = body;

    if (!designer_id || !restriction_type || !restriction_date) {
      return NextResponse.json(
        { error: '디자이너 ID, 제한 유형, 날짜는 필수입니다.' },
        { status: 400 }
      );
    }

    if (restriction_type === 'time' && (!start_time || !end_time)) {
      return NextResponse.json(
        { error: '시간 제한의 경우 시작 시간과 종료 시간이 필요합니다.' },
        { status: 400 }
      );
    }

    const reasonValue = reason ?? memo ?? null;

    const { data, error } = await supabase
      .from('booking_restrictions')
      .update({
        designer_id: Number(designer_id),
        restriction_type,
        restriction_date,
        start_time: restriction_type === 'time' ? start_time : null,
        end_time: restriction_type === 'time' ? end_time : null,
        reason: reasonValue,
      })
      .eq('id', Number(id))
      .select()
      .single();

    if (error) {
      console.error('Error updating booking restriction:', error);
      return NextResponse.json(
        { error: '예약금지 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ restriction: data }, { status: 200 });
  } catch (error) {
    console.error('Error in booking-restrictions PUT route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Comment: DELETE - Delete a booking restriction by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id 파라미터는 필수입니다.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('booking_restrictions')
      .delete()
      .eq('id', Number(id));

    if (error) {
      console.error('Error deleting booking restriction:', error);
      return NextResponse.json(
        { error: '예약금지 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in booking-restrictions DELETE route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


