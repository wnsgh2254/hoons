import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const designerId = params.id;
    const body = await request.json();
    const { name, role, shop_id, wage_type, percent_rate, hourly_rate, is_active } = body;

    console.log('Received PUT request for designer:', designerId, body);

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!role || !role.trim()) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

    if (!wage_type) {
      return NextResponse.json(
        { error: 'Wage type is required' },
        { status: 400 }
      );
    }

    // Validate wage type specific fields
    if (wage_type === 'percent' && !percent_rate) {
      return NextResponse.json(
        { error: 'percent_rate is required for commission type' },
        { status: 400 }
      );
    }

    if (wage_type === 'hourly' && !hourly_rate) {
      return NextResponse.json(
        { error: 'hourly_rate is required for hourly type' },
        { status: 400 }
      );
    }

    // Update designer
    const updateData = {
      name: name.trim(),
      role: role.trim(),
      shop_id: shop_id || null,
      wage_type,
      percent_rate: wage_type === 'percent' ? percent_rate : null,
      hourly_rate: wage_type === 'hourly' ? hourly_rate : null,
      is_active: is_active !== undefined ? is_active : true,
    };

    console.log('Updating designer:', updateData);

    const { data, error } = await supabase
      .from('designers')
      .update(updateData)
      .eq('id', designerId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }

    console.log('Designer updated successfully:', data);
    return NextResponse.json({ designer: data }, { status: 200 });
  } catch (error: any) {
    console.error('Error in staff PUT route:', error);
    return NextResponse.json(
      { error: error.message || '직원을 업데이트하지 못했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const designerId = params.id;

    console.log('Received DELETE request for designer:', designerId);

    const { error } = await supabase
      .from('designers')
      .delete()
      .eq('id', designerId);

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }

    console.log('Designer deleted successfully');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in staff DELETE route:', error);
    return NextResponse.json(
      { error: error.message || '직원을 삭제하지 못했습니다.' },
      { status: 500 }
    );
  }
}

