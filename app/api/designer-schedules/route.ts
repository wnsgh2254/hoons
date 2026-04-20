import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { resolveShopIdForDesigner, upsertDesignerScheduleRow } from '@/lib/designer-schedule-server';
import { getAvailableDesignerIdsForShop } from '@/lib/designer-availability';

export const dynamic = 'force-dynamic';

// GET:
// - all=true: return active schedule rows
// - designer_id: return all schedule rows for one designer
// - date(+optional shopId): return available designer IDs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const shopIdParam = searchParams.get('shopId');
    const designerId = searchParams.get('designer_id');
    const allParam = searchParams.get('all');

    if (!designerId && !date && allParam === 'true') {
      let query = supabase
        .from('designer_schedules')
        .select('id, designer_id, shop_id, weekday, start_time, end_time')
        .is('effective_to', null)
        .order('designer_id', { ascending: true })
        .order('weekday', { ascending: true });

      if (shopIdParam) {
        query = query.eq('shop_id', Number(shopIdParam));
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching all schedules:', error);
        return NextResponse.json({ error: 'Failed to fetch schedules.' }, { status: 500 });
      }

      return NextResponse.json({ schedules: data || [] }, { status: 200 });
    }

    if (designerId) {
      const { data, error } = await supabase
        .from('designer_schedules')
        .select('*')
        .eq('designer_id', Number(designerId))
        .order('weekday', { ascending: true });

      if (error) {
        console.error('Error fetching designer schedules:', error);
        return NextResponse.json({ error: 'Failed to fetch designer schedules.' }, { status: 500 });
      }

      return NextResponse.json({ schedules: data || [] }, { status: 200 });
    }

    if (!date) {
      return NextResponse.json({ error: 'date parameter is required.' }, { status: 400 });
    }

    if (shopIdParam) {
      const designerIds = await getAvailableDesignerIdsForShop(supabase, date, Number(shopIdParam));
      return NextResponse.json({ designerIds }, { status: 200 });
    }

    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('id')
      .order('id', { ascending: true });

    if (shopsError) {
      console.error('Error fetching shops for designer availability:', shopsError);
      return NextResponse.json({ error: 'Failed to fetch shop availability.' }, { status: 500 });
    }

    const shopIds: number[] = Array.from(
      new Set((shops || []).map((row: { id: number }) => Number(row.id)).filter(Number.isFinite)),
    );

    if (shopIds.length === 0) {
      return NextResponse.json({ designerIds: [] }, { status: 200 });
    }

    const idsByShop = await Promise.all(
      shopIds.map((shopId) => getAvailableDesignerIdsForShop(supabase, date, shopId)),
    );

    const designerIds = Array.from(new Set(idsByShop.flat().map(Number))).filter(Number.isFinite);

    return NextResponse.json({ designerIds }, { status: 200 });
  } catch (error) {
    console.error('Error in designer-schedules route:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

// POST - Create or update a schedule for a designer.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { designer_id, shop_id, weekday, start_time, end_time, effective_from, effective_to } = body;

    if (!designer_id || weekday === undefined || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'designer_id, weekday, start_time, and end_time are required.' },
        { status: 400 },
      );
    }

    const resolvedShopId = await resolveShopIdForDesigner(Number(designer_id), shop_id);
    if (!resolvedShopId) {
      return NextResponse.json(
        { error: 'This designer does not have a valid shop assignment.' },
        { status: 400 },
      );
    }

    if (weekday < 0 || weekday > 6) {
      return NextResponse.json({ error: 'weekday must be between 0 and 6.' }, { status: 400 });
    }

    const { schedule, error: upsertErr } = await upsertDesignerScheduleRow({
      designer_id: Number(designer_id),
      resolvedShopId,
      weekday: Number(weekday),
      start_time,
      end_time,
      effective_from,
      effective_to,
    });

    if (upsertErr) {
      return NextResponse.json({ error: 'Failed to save schedule.' }, { status: 500 });
    }

    return NextResponse.json({ schedule }, { status: 200 });
  } catch (error) {
    console.error('Error in designer-schedules POST route:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

// PATCH - Update a specific schedule by ID.
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, start_time, end_time, effective_from, effective_to } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (effective_from !== undefined) updateData.effective_from = effective_from;
    if (effective_to !== undefined) updateData.effective_to = effective_to;

    const { data, error } = await supabase
      .from('designer_schedules')
      .update(updateData)
      .eq('id', Number(id))
      .select()
      .single();

    if (error) {
      console.error('Error updating schedule:', error);
      return NextResponse.json({ error: 'Failed to update schedule.' }, { status: 500 });
    }

    return NextResponse.json({ schedule: data }, { status: 200 });
  } catch (error) {
    console.error('Error in designer-schedules PATCH route:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

// DELETE - Delete a schedule by ID.
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id parameter is required.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('designer_schedules')
      .delete()
      .eq('id', Number(id));

    if (error) {
      console.error('Error deleting schedule:', error);
      return NextResponse.json({ error: 'Failed to delete schedule.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in designer-schedules DELETE route:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
