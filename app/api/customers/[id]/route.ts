import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Get single customer with basic stats for customer info drawer
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const customerId = Number(id);
    if (!customerId || Number.isNaN(customerId)) {
      return NextResponse.json(
        { error: '유효하지 않은 고객 ID 입니다.' },
        { status: 400 }
      );
    }

    // Comment: Load customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .maybeSingle();

    if (customerError) {
      console.error('Error fetching customer by id:', customerError);
      return NextResponse.json(
        { error: '고객 정보를 불러오지 못했습니다.' },
        { status: 500 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        { error: '고객을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Comment: Include assigned_designer when assigned_designer_id exists
    let assignedDesigner = null;
    if (customer.assigned_designer_id) {
      const { data: designerData } = await supabase
        .from('designers')
        .select('id, name')
        .eq('id', customer.assigned_designer_id)
        .maybeSingle();
      assignedDesigner = designerData;
    }

    return NextResponse.json(
      {
        customer: {
          ...customer,
          assigned_designer: assignedDesigner,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in customers [id] GET route:', error);
    return NextResponse.json(
      { error: '고객 정보를 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}

// Comment: Partial update for a customer (currently used for memo-only edits from the customer info drawer)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const customerId = Number(id);
    if (!customerId || Number.isNaN(customerId)) {
      return NextResponse.json(
        { error: '유효하지 않은 고객 ID 입니다.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (typeof body.memo === 'string' || body.memo === null) {
      updates.memo = body.memo ? String(body.memo) : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: '수정할 항목이 없습니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error patching customer:', error);
      return NextResponse.json(
        { error: '고객 정보 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ customer: data }, { status: 200 });
  } catch (error) {
    console.error('Error in customers [id] PATCH route:', error);
    return NextResponse.json(
      { error: '고객 정보 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}

