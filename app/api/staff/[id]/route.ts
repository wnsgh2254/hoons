import { NextRequest, NextResponse } from 'next/server';
import { getDesignerById, updateDesigner, deleteDesigner } from '@/lib/data';

// Comment: GET - Get single staff member by id
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    const designer = await getDesignerById(Number(id));
    return NextResponse.json({ designer }, { status: 200 });
  } catch (error: any) {
    console.error('Error in staff GET route:', error);
    const status = error.message?.includes('찾을 수 없') ? 404 : 500;
    return NextResponse.json(
      { error: error.message || '직원을 불러오지 못했습니다.' },
      { status }
    );
  }
}

// Comment: PATCH - Update a staff member
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    const body = await request.json();
    const { name, role, shop_id, wage_type, percent_rate, hourly_rate, is_active } = body;

    const designer = await updateDesigner(Number(id), {
      name,
      role,
      shop_id,
      wage_type,
      percent_rate,
      hourly_rate,
      is_active,
    });

    return NextResponse.json({ designer }, { status: 200 });
  } catch (error: any) {
    console.error('Error in staff PATCH route:', error);
    return NextResponse.json(
      { error: error.message || '직원을 업데이트하지 못했습니다.' },
      { status: 400 }
    );
  }
}

// Comment: DELETE - Delete a staff member
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    await deleteDesigner(Number(id));
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in staff DELETE route:', error);
    return NextResponse.json(
      { error: error.message || '직원을 삭제하지 못했습니다.' },
      { status: 400 }
    );
  }
}

