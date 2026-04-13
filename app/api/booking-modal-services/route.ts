import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('booking_modal_services')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ services: data || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in booking-modal-services GET:', error);
    return NextResponse.json({ error: '서비스 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, is_active, sort_order } = body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('booking_modal_services')
      .insert({
        name: name.trim(),
        is_active: is_active !== false,
        sort_order: Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ service: data }, { status: 201 });
  } catch (error) {
    console.error('Error in booking-modal-services POST:', error);
    return NextResponse.json({ error: '서비스 등록에 실패했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, is_active, sort_order } = body || {};
    const targetId = Number(id);

    if (!Number.isFinite(targetId) || targetId <= 0) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (is_active !== undefined) updates.is_active = is_active === true;
    if (sort_order !== undefined) updates.sort_order = Number(sort_order) || 0;

    const { data, error } = await supabase
      .from('booking_modal_services')
      .update(updates)
      .eq('id', targetId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ service: data }, { status: 200 });
  } catch (error) {
    console.error('Error in booking-modal-services PATCH:', error);
    return NextResponse.json({ error: '서비스 수정에 실패했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabase.from('booking_modal_services').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in booking-modal-services DELETE:', error);
    return NextResponse.json({ error: '서비스 삭제에 실패했습니다.' }, { status: 500 });
  }
}

