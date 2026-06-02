import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { buildPhoneVariants } from '@/lib/data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nameInput = body?.name as string | undefined;
    const phoneInput = body?.phone as string | undefined;

    if (!phoneInput || !phoneInput.trim()) {
      return NextResponse.json(
        { error: '전화번호가 필요합니다.' },
        { status: 400 },
      );
    }

    const { local, e164, digitsOnly } = buildPhoneVariants(phoneInput);

    const orParts: string[] = [];

    // Comment: customers.phone 는 숫자만 저장하고 있으므로 digits-only 기준도 함께 비교
    if (digitsOnly) {
      orParts.push(`phone.eq.${digitsOnly}`);
    }
    if (local) {
      orParts.push(`phone.eq.${local.replace(/[^0-9]/g, '')}`);
    }
    if (e164) {
      orParts.push(`phone.eq.${e164}`);
    }

    if (!orParts.length) {
      return NextResponse.json(
        { exists: false },
        { status: 200 },
      );
    }

    let query = supabase
      .from('customers')
      .select('id, name, phone')
      .or(orParts.join(','));

    // Comment: If name is provided, resolve by name + phone to avoid wrong matches on shared phone numbers.
    if (nameInput && nameInput.trim()) {
      query = query.eq('name', nameInput.trim());
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      console.error('Error looking up customer by phone:', error);
      return NextResponse.json(
        { error: '고객 조회에 실패했습니다.' },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { exists: false },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        exists: true,
        customer: {
          id: data.id,
          name: data.name,
          phone: data.phone,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in customer lookup route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

