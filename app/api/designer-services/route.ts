import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: GET - List designer_services, optionally filtered by designer_id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const designerId = searchParams.get('designer_id');

    let query = supabase
      .from('designer_services')
      .select('id, designer_id, service_id, price, duration_minutes, is_active, notes, created_at, services(id, name, category, description)')
      .order('designer_id')
      .order('service_id');

    if (designerId) {
      query = query.eq('designer_id', Number(designerId));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching designer_services:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ designerServices: data || [] }, { status: 200 });
  } catch (error: any) {
    console.error('Error in designer-services GET:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// Comment: POST - Create a new designer_service entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { designer_id, service_id, price, duration_minutes, is_active, notes } = body;

    if (!designer_id || !service_id || price === undefined) {
      return NextResponse.json(
        { error: 'designer_id, service_id, price는 필수입니다.' },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from('designer_services')
      .select('id')
      .eq('designer_id', Number(designer_id))
      .eq('service_id', Number(service_id))
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: '이미 등록된 서비스입니다. 수정을 이용해주세요.' },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('designer_services')
      .insert({
        designer_id: Number(designer_id),
        service_id: Number(service_id),
        price: Number(price),
        duration_minutes: duration_minutes != null ? Number(duration_minutes) : null,
        is_active: is_active !== undefined ? is_active : true,
        notes: notes ?? null,
      })
      .select('id, designer_id, service_id, price, duration_minutes, is_active, notes, created_at, services(id, name, category, description)')
      .single();

    if (error) {
      console.error('Error creating designer_service:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ designerService: data }, { status: 201 });
  } catch (error: any) {
    console.error('Error in designer-services POST:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// Comment: PATCH - Update a designer_service entry by id
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, price, duration_minutes, is_active, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'id는 필수입니다.' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (price !== undefined) updateData.price = Number(price);
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes != null ? Number(duration_minutes) : null;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('designer_services')
      .update(updateData)
      .eq('id', Number(id))
      .select('id, designer_id, service_id, price, duration_minutes, is_active, notes, created_at, services(id, name, category, description)')
      .single();

    if (error) {
      console.error('Error updating designer_service:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ designerService: data }, { status: 200 });
  } catch (error: any) {
    console.error('Error in designer-services PATCH:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// Comment: DELETE - Remove a designer_service entry by id
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id는 필수입니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('designer_services')
      .delete()
      .eq('id', Number(id));

    if (error) {
      console.error('Error deleting designer_service:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in designer-services DELETE:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
