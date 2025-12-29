import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Update a single booking (date/time/status etc.)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: '유효하지 않은 예약 ID 입니다.' }, { status: 400 });
    }

    const body = await request.json();
    const updates: any = {};

    if (typeof body.booking_date === 'string') {
      updates.booking_date = body.booking_date;
    }
    if (typeof body.booking_time === 'string') {
      updates.booking_time = body.booking_time;
    }
    if (typeof body.status === 'string') {
      updates.status = body.status;
    }
    if (typeof body.total_amount === 'number' || typeof body.total_amount === 'string') {
      updates.total_amount = Number(body.total_amount);
    }
    if (typeof body.deposit_amount === 'number' || typeof body.deposit_amount === 'string') {
      updates.deposit_amount = Number(body.deposit_amount);
    }
    if (body.service_id === null) {
      updates.service_id = null;
    } else if (typeof body.service_id === 'number' || typeof body.service_id === 'string') {
      updates.service_id = Number(body.service_id);
    }
    if (typeof body.custom_service_name === 'string') {
      updates.custom_service_name = body.custom_service_name;
    }
    if (typeof body.custom_service_duration === 'number' || typeof body.custom_service_duration === 'string') {
      updates.custom_service_duration = Number(body.custom_service_duration);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '업데이트할 필드가 없습니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating booking:', error);
      return NextResponse.json({ error: '예약 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ booking: data }, { status: 200 });
  } catch (error) {
    console.error('Error in appointment PATCH route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// Comment: Delete a single booking
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: '유효하지 않은 예약 ID 입니다.' }, { status: 400 });
    }

    const { error } = await supabase.from('bookings').delete().eq('id', id);

    if (error) {
      console.error('Error deleting booking:', error);
      return NextResponse.json({ error: '예약 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in appointment DELETE route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}


