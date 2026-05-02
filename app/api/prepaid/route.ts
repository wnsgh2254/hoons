import { NextRequest, NextResponse } from 'next/server';
import {
  getPrepaidPasses,
  getPrepaidPassById,
  createPrepaidPass,
  updatePrepaidPass,
  deletePrepaidPass,
} from '@/lib/data';
import { supabase } from '@/lib/supabase';

function normalizeComparablePhone(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '');
}

function normalizeComparableName(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

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

    // Comment: If customer_id is provided, fetch all active prepaid passes for the customer
    // and also expose a "usable" summary for deduction flows.
    if (customerId) {
      const customerIdNum = Number(customerId);
      if (!Number.isFinite(customerIdNum)) {
        return NextResponse.json({ error: '유효하지 않은 고객 ID입니다.' }, { status: 400 });
      }

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('id', customerIdNum)
        .maybeSingle();

      if (customerError || !customer) {
        return NextResponse.json({ error: '고객을 찾을 수 없습니다.' }, { status: 404 });
      }

      const { data, error } = await supabase
        .from('prepaid_passes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const members = (data || []).filter((m: any) => {
        if (m.customer_id != null && Number(m.customer_id) === customerIdNum) return true;
        return (
          normalizeComparableName(m.name) === normalizeComparableName(customer.name) &&
          normalizeComparablePhone(m.phone) === normalizeComparablePhone(customer.phone)
        );
      });
      const now = new Date();
      const usableMembers = members.filter((m: any) => {
        if (!m.expires_at) return true;
        const expires = new Date(m.expires_at);
        return !Number.isNaN(expires.getTime()) && expires >= now;
      });

      const totalPoints = usableMembers.reduce(
        (sum: number, m: any) => sum + Number(m.points || 0),
        0,
      );
      const primaryMember = usableMembers[0]
        ? {
            ...usableMembers[0],
            name: customer.name,
            phone: customer.phone,
            customer_id: customerIdNum,
            points: totalPoints,
          }
        : null;

      // Backward-compatible shapes:
      // - member: first usable member (or null)
      // - prepaid: list used by existing customer info reducers
      return NextResponse.json(
        {
          member: primaryMember,
          members,
          usableMembers,
          prepaid: usableMembers.map((m: any) => ({
            id: m.id,
            name: m.name,
            balance: Number(m.points || 0),
            points: Number(m.points || 0),
            expires_at: m.expires_at || null,
            is_active: m.is_active ?? true,
          })),
          totalPoints,
        },
        { status: 200 },
      );
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
    const { customer_id, name, phone, email, points, expiresAt } = body;

    if (customer_id == null || customer_id === '') {
      return NextResponse.json(
        { error: '고객을 선택해야 합니다.' },
        { status: 400 }
      );
    }

    const { member, merged } = await createPrepaidPass({
      customerId: Number(customer_id),
      name,
      phone,
      email,
      points,
      expiresAt,
    });

    return NextResponse.json({ member, merged }, { status: merged ? 200 : 201 });
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
    const { customer_id, name, phone, email, points, expiresAt, isActive } = body;

    const member = await updatePrepaidPass(memberId, {
      customerId:
        customer_id != null && customer_id !== '' ? Number(customer_id) : undefined,
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

