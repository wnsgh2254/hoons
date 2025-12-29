import { NextRequest, NextResponse } from 'next/server';
import { createPublicBooking } from '@/lib/data';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Seed example data for admin/testing
    if (body?.seedExample) {
      const SHOP_ID = 5;

      // Load designers and services for this shop
      const [{ data: designers, error: designersError }, { data: services, error: servicesError }] =
        await Promise.all([
          supabase.from('designers').select('id, name').eq('shop_id', SHOP_ID),
          supabase.from('services').select('id, name, price').eq('shop_id', SHOP_ID),
        ]);

      if (designersError || servicesError) {
        console.error('Error loading designers/services for seeding', {
          designersError,
          servicesError,
        });
        return NextResponse.json(
          { error: '예시 데이터를 위한 디자이너/서비스 조회에 실패했습니다.' },
          { status: 500 }
        );
      }

      const findDesignerId = (name: string) =>
        designers?.find((d: { id: number; name: string }) => d.name === name)?.id ?? null;
      const findService = (name: string) =>
        services?.find((s: { id: number; name: string; price?: number }) => s.name === name) ?? null;

      const baseDate = '2025-12-22';

      const examples = [
        {
          date: baseDate,
          time: '10:00',
          designerName: '윤훈',
          serviceName: 'Cut & Style',
          status: 'confirmed' as const,
        },
        {
          date: baseDate,
          time: '11:30',
          designerName: '태훈',
          serviceName: 'Root Touch Up',
          status: 'confirmed' as const,
        },
        {
          date: baseDate,
          time: '13:00',
          designerName: '여정',
          serviceName: 'Digital Perm',
          status: 'pending' as const,
        },
        {
          date: baseDate,
          time: '15:30',
          designerName: '찬우',
          serviceName: 'Head Spa',
          status: 'confirmed' as const,
        },
        {
          date: '2025-12-21',
          time: '16:00',
          designerName: '윤훈',
          serviceName: 'Coloring',
          status: 'cancelled' as const,
        },
        {
          date: '2025-12-23',
          time: '09:30',
          designerName: '태훈',
          serviceName: 'Cut & Style',
          status: 'confirmed' as const,
        },
      ];

      const rows = examples
        .map((ex) => {
          const designerId = findDesignerId(ex.designerName);
          const service = findService(ex.serviceName);

          if (!designerId || !service) {
            return null;
          }

          return {
            shop_id: SHOP_ID,
            designer_id: designerId,
            service_id: service.id,
            customer_id: null,
            booking_date: ex.date,
            booking_time: ex.time,
            status: ex.status,
            deposit_amount: 0,
            total_amount: service.price ?? null,
          };
        })
        .filter(Boolean);

      if (!rows.length) {
        return NextResponse.json(
          { error: '예시 데이터를 만들 수 없습니다. 디자이너/서비스를 먼저 생성해 주세요.' },
          { status: 400 }
        );
      }

      const { data: inserted, error: insertError } = await supabase
        .from('bookings')
        .insert(rows)
        .select();

      if (insertError) {
        console.error('Error inserting seed bookings:', insertError);
        return NextResponse.json(
          { error: '예시 예약 데이터 생성에 실패했습니다.' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: true, count: inserted?.length ?? 0, bookings: inserted },
        { status: 201 }
      );
    }

    const {
      shopId,
      designerId,
      serviceId,
      day,
      timeLabel,
      totalAmount,
      depositAmount,
      fullDate,
    } = body;

    if (!shopId || !day || !timeLabel) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
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
    });

    return NextResponse.json({ success: true, booking }, { status: 201 });
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
        shop:shop_id ( id, name )
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



