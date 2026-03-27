import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const serviceId = Number(id);

    if (Number.isNaN(serviceId)) {
      return NextResponse.json({ error: 'Invalid service ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, price, duration_minutes, is_active, visible_to, category, description } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = price;
    if (duration_minutes !== undefined) updates.duration_minutes = duration_minutes;
    if (is_active !== undefined) updates.is_active = is_active;
    if (visible_to !== undefined) updates.visible_to = visible_to;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) {
      updates.description =
        typeof description === 'string' && description.trim() ? description.trim() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', serviceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating service:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ service: data }, { status: 200 });
  } catch (error) {
    console.error('Error in services PATCH route:', error);
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const serviceId = Number(id);

    if (Number.isNaN(serviceId)) {
      return NextResponse.json({ error: 'Invalid service ID' }, { status: 400 });
    }

    const { error } = await supabase.from('services').delete().eq('id', serviceId);

    if (error) {
      console.error('Error deleting service:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in services DELETE route:', error);
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 });
  }
}
