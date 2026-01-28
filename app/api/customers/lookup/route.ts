import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Helper to build local/E.164 variants and a normalized digits-only version for AU mobiles
function buildPhoneVariants(phoneRaw: string | undefined | null) {
  if (!phoneRaw) {
    return {
      local: null as string | null,
      e164: null as string | null,
      digitsOnly: null as string | null,
    };
  }

  const digitsOnly = phoneRaw.replace(/[^0-9]/g, '');

  // Already in +61 form (when caller passes +61...)
  const withPlus = phoneRaw.startsWith('+') ? phoneRaw : `+${phoneRaw.replace(/[^0-9]/g, '')}`;

  // Local 04.. style if 10 digits starting with 0
  let local: string | null = null;
  let e164: string | null = null;

  if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
    local = digitsOnly;
    e164 = `+61${digitsOnly.slice(1)}`;
  } else if (digitsOnly.startsWith('61') && digitsOnly.length === 11) {
    e164 = `+${digitsOnly}`;
    local = `0${digitsOnly.slice(2)}`;
  }

  return {
    local,
    e164: e164 ?? withPlus,
    digitsOnly,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    if (!orParts.length) {
      return NextResponse.json(
        { exists: false },
        { status: 200 },
      );
    }

    const { data, error } = await supabase
      .from('customers')
      .select('id, name, phone')
      .or(orParts.join(','))
      .limit(1)
      .maybeSingle();

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

