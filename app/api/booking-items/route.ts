import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - List booking items, optionally filtered by shopId and activeOnly
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly');

    let query = supabase
      .from('booking_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (activeOnly === 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching booking items:', error);
      return NextResponse.json({ error: '예약항목 조회에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ bookingItems: data || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in booking-items GET route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST - Create a new booking item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, duration_hours, duration_minutes, is_active, sort_order } = body;

    if (!name) {
      return NextResponse.json({ error: 'name은 필수입니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('booking_items')
      .insert({
        name,
        duration_hours: duration_hours ?? 0,
        duration_minutes: duration_minutes ?? 0,
        is_active: is_active ?? true,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating booking item:', error);
      return NextResponse.json({ error: '예약항목 생성에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ bookingItem: data }, { status: 201 });
  } catch (error) {
    console.error('Error in booking-items POST route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PATCH - Update a booking item by id
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, duration_hours, duration_minutes, is_active, sort_order } = body;

    if (!id) {
      return NextResponse.json({ error: 'id는 필수입니다.' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (duration_hours !== undefined) updateData.duration_hours = duration_hours;
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    const { data, error } = await supabase
      .from('booking_items')
      .update(updateData)
      .eq('id', Number(id))
      .select()
      .single();

    if (error) {
      console.error('Error updating booking item:', error);
      return NextResponse.json({ error: '예약항목 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ bookingItem: data }, { status: 200 });
  } catch (error) {
    console.error('Error in booking-items PATCH route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE - Delete a booking item by id
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id 파라미터는 필수입니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('booking_items')
      .delete()
      .eq('id', Number(id));

    if (error) {
      console.error('Error deleting booking item:', error);
      return NextResponse.json({ error: '예약항목 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in booking-items DELETE route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
