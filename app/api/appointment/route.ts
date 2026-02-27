import { NextRequest, NextResponse } from 'next/server';
import { createPublicBooking } from '@/lib/data';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      shopId,
      designerId,
      serviceId,
      day,
      timeLabel,
      totalAmount,
      depositAmount,
      fullDate,
      customerName, // Comment: Customer name from booking flow
      customerPhone, // Comment: Customer phone number from booking flow
      existingCustomerId, // Comment: Optional existing customer ID if already looked up
      serviceCategory, // Comment: Optional big category name from admin booking (e.g. 커트)
    } = body;

    if (!shopId || !day || !timeLabel) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    // Comment: Helper to normalize AU phone numbers into local and E.164 variants
    const buildPhoneVariants = (phoneRaw: string | undefined | null) => {
      if (!phoneRaw) return { local: null as string | null, e164: null as string | null };
      const digitsOnly = phoneRaw.replace(/[^0-9+]/g, '');
      // Already in +61 form
      if (digitsOnly.startsWith('+61')) {
        const withoutCountry = digitsOnly.slice(3);
        const local =
          withoutCountry.length === 9 && !withoutCountry.startsWith('0')
            ? `0${withoutCountry}`
            : digitsOnly;
        return { local, e164: digitsOnly };
      }
      // Starts with 61...
      if (!digitsOnly.startsWith('+') && digitsOnly.startsWith('61')) {
        const e164 = `+${digitsOnly}`;
        const withoutCountry = digitsOnly.slice(2);
        const local =
          withoutCountry.length === 9 && !withoutCountry.startsWith('0')
            ? `0${withoutCountry}`
            : e164;
        return { local, e164 };
      }
      // Local 04.. style
      if (digitsOnly.startsWith('0') && digitsOnly.length >= 9) {
        const local = digitsOnly;
        const e164 = `+61${digitsOnly.slice(1)}`;
        return { local, e164 };
      }
      return { local: digitsOnly, e164: null as string | null };
    };

    let customerId: number | null = null;

    // Comment: Try to resolve or create customer if name/phone are provided
    if (customerPhone && customerName) {
      const { local, e164 } = buildPhoneVariants(customerPhone);

      // Comment: If existingCustomerId is provided, trust and verify it first
      if (existingCustomerId) {
        const { data: existingById } = await supabase
          .from('customers')
          .select('id')
          .eq('id', existingCustomerId)
          .maybeSingle();
        if (existingById?.id) {
          customerId = existingById.id;
        }
      }

      if (!customerId) {
        // Comment: Try to find by phone (either local or e164)
        const orFilterParts: string[] = [];
        if (local) orFilterParts.push(`phone.eq.${local}`);
        if (e164) orFilterParts.push(`phone.eq.${e164}`);

        const { data: existingByPhone } = await supabase
          .from('customers')
          .select('id, name, phone')
          .or(orFilterParts.join(','))
          .limit(1)
          .maybeSingle();

        if (existingByPhone?.id) {
          customerId = existingByPhone.id;
        }
      }

      if (!customerId) {
        // Comment: Create a new customer row
        const { data: createdCustomer } = await supabase
          .from('customers')
          .insert({
            name: String(customerName).trim(),
            phone: buildPhoneVariants(customerPhone).local,
          })
          .select('id')
          .single();
        if (createdCustomer?.id) {
          customerId = createdCustomer.id;
        }
      }
    }

    const booking = await createPublicBooking({
      shopId: Number(shopId),
      designerId: designerId != null ? Number(designerId) : null,
      serviceId: serviceId != null ? Number(serviceId) : null,
      day: Number(day),
      timeLabel,
      totalAmount: typeof totalAmount === 'number' ? totalAmount : null,
      depositAmount: typeof depositAmount === 'number' ? depositAmount : null,
      fullDate: typeof fullDate === 'string' ? fullDate : undefined,
      customerId: customerId,
      customServiceName:
        typeof serviceCategory === 'string' && serviceCategory.trim()
          ? serviceCategory.trim()
          : null,
      customServiceDuration: null,
    });
    return NextResponse.json(
      {
        success: true,
        booking,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error in appointment POST route:', error);
    return NextResponse.json({ error: '예약 생성에 실패했습니다.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shop_id');
    const designerId = searchParams.get('designer_id');
    const customerId = searchParams.get('customer_id');
    const date = searchParams.get('date');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    let query = supabase
      .from('bookings')
      .select(
      `
        *,
        designer:designer_id ( id, name ),
        service:service_id ( id, name, duration_minutes ),
        shop:shop_id ( id, name ),
        customer:customer_id ( id, name, phone )
      `,
        { count: 'exact' }
      )
      .order('booking_date', { ascending: false })
      .order('booking_time', { ascending: false });

    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    if (designerId) {
      query = query.eq('designer_id', designerId);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (startDate && endDate) {
      query = query.gte('booking_date', startDate).lte('booking_date', endDate);
    } else if (date) {
      query = query.eq('booking_date', date);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json(
        { error: '예약 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        bookings: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in appointment route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}



