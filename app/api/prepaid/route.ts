import { NextRequest, NextResponse } from 'next/server';
import {
  getPrepaidPasses,
  getPrepaidPassById,
  getPrepaidPassByCustomerId,
  createPrepaidPass,
  updatePrepaidPass,
  deletePrepaidPass,
} from '@/lib/data';

// Comment: GET - Fetch all prepaid pass members or a single member by id or customer_id query parameter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const customerId = searchParams.get('customer_id');
    const search = searchParams.get('search') || undefined;
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    // Comment: If id is provided, fetch single member by id
    if (id) {
      const memberId = Number(id);
      const member = await getPrepaidPassById(memberId);
      return NextResponse.json({ member }, { status: 200 });
    }

    // Comment: If customer_id is provided, fetch member by customer_id
    if (customerId) {
      const customerIdNum = Number(customerId);
      const member = await getPrepaidPassByCustomerId(customerIdNum);
      if (!member) {
        return NextResponse.json({ error: '선불권 회원을 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json({ member }, { status: 200 });
    }

    // Comment: Otherwise, fetch members with pagination (with optional search)
    const result = await getPrepaidPasses(search, page, limit);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error in prepaid GET route:', error);
    const status = error.message.includes('찾을 수 없') ? 404 : error.message.includes('유효하지 않은') ? 400 : 500;
    return NextResponse.json(
      { error: error.message || '정액제 회원 조회에 실패했습니다.' },
      { status }
    );
  }
}

// Comment: POST - Create a new prepaid pass member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, points, expiresAt } = body;

    const member = await createPrepaidPass({
      name,
      phone,
      email,
      points,
      expiresAt,
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error: any) {
    console.error('Error in prepaid POST route:', error);
    return NextResponse.json(
      { error: error.message || '정액제 회원 생성에 실패했습니다.' },
      { status: 400 }
    );
  }
}

// Comment: PATCH - Update a prepaid pass member (id in query parameter)
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    const memberId = Number(id);
    const body = await request.json();
    const { name, phone, email, points, expiresAt, isActive } = body;

    const member = await updatePrepaidPass(memberId, {
      name,
      phone,
      email,
      points,
      expiresAt,
      isActive,
    });

    return NextResponse.json({ member }, { status: 200 });
  } catch (error: any) {
    console.error('Error in prepaid PATCH route:', error);
    return NextResponse.json(
      { error: error.message || '정액제 회원 수정에 실패했습니다.' },
      { status: 400 }
    );
  }
}

// Comment: DELETE - Delete a prepaid pass member (id in query parameter)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    const memberId = Number(id);
    await deletePrepaidPass(memberId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in prepaid DELETE route:', error);
    return NextResponse.json(
      { error: error.message || '정액제 회원 삭제에 실패했습니다.' },
      { status: 400 }
    );
  }
}

