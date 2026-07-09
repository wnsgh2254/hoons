import { NextRequest, NextResponse } from 'next/server';
import { createPublicBooking, buildPhoneVariants, getCustomerIdByNameAndPhone, isValidAuMobilePhone } from '@/lib/data';
import { isCancelledBookingStatus } from '@/lib/booking-status';
import { fetchMonthBookingDayCounts } from '@/lib/month-booking-day-counts';
import { supabase } from '@/lib/supabase';
import { invokeBookingConfirmationEdge } from '@/lib/booking-confirmation-edge';
import { getSydneyDayUtcRange } from '@/lib/sydney-datetime-range';
import {
  assertBookingFitsWorkingHours,
  resolveBookingDurationMinutes,
} from '@/lib/server-booking-availability';

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
      customServiceDuration, // Comment: Optional custom duration in minutes from admin booking
      memo, // Comment: Optional booking memo
      colorLabel, // Comment: Optional color label icon
      status, // Comment: Optional status override (e.g. 'CONFIRMED' for admin bookings)
    } = body;

    if (!shopId || !day || !timeLabel) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    if (designerId != null && typeof fullDate === 'string' && fullDate.trim()) {
      const durationMinutes = await resolveBookingDurationMinutes(supabase, {
        durationMinutes: typeof customServiceDuration === 'number' ? customServiceDuration : null,
        serviceId: serviceId != null ? Number(serviceId) : null,
      });
      const hoursCheck = await assertBookingFitsWorkingHours(supabase, {
        designerId: Number(designerId),
        shopId: Number(shopId),
        date: fullDate.trim(),
        timeLabel,
        durationMinutes,
      });
      if (!hoursCheck.ok) {
        return NextResponse.json({ error: hoursCheck.message }, { status: 400 });
      }
    }

    let customerId: number | null = null;

    // Comment: Try to resolve or create customer if name/phone are provided
    if (customerPhone && customerName) {
      if (!isValidAuMobilePhone(customerPhone)) {
        return NextResponse.json(
          { error: '전화번호는 04로 시작하는 호주 모바일 번호(10자리)여야 합니다.' },
          { status: 400 }
        );
      }
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
        // Comment: Resolve by exact name + phone to avoid mismatching customers sharing the same phone number.
        customerId = await getCustomerIdByNameAndPhone(customerName, customerPhone);
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
      customServiceDuration:
        typeof customServiceDuration === 'number' && customServiceDuration > 0
          ? customServiceDuration
          : null,
      memo: typeof memo === 'string' && memo.trim() ? memo.trim() : null,
      colorLabel: typeof colorLabel === 'string' && colorLabel.trim() ? colorLabel.trim() : null,
      status: typeof status === 'string' && status.trim() ? status.trim() : null,
    });

    try {
      await invokeBookingConfirmationEdge(Number(booking.id));
    } catch (smsErr) {
      console.error('[appointment POST] confirmation SMS Edge invoke failed', smsErr);
    }

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
    const dateType = searchParams.get('date_type') === 'created' ? 'created' : 'booking';
    // Comment: minimal=true returns per-day booking counts for the calendar (paginated server-side)
    const minimal = searchParams.get('minimal') === 'true';

    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const numericShopFilter =
      shopId != null && shopId !== ''
        ? (() => {
            const n = Number(shopId);
            return Number.isFinite(n) && n > 0 ? n : null;
          })()
        : null;

    if (minimal) {
      // Comment: Paginated aggregation for calendar day counts (Supabase caps at 1000 rows per request)
      const rangeStart = startDate && endDate ? startDate : date;
      const rangeEnd = startDate && endDate ? endDate : date;
      if (!rangeStart || !rangeEnd) {
        return NextResponse.json({ error: '날짜 범위가 필요합니다.' }, { status: 400 });
      }
      try {
        const dayCounts = await fetchMonthBookingDayCounts(supabase, rangeStart, rangeEnd, {
          shopId: numericShopFilter,
          designerId: designerId ? Number(designerId) : undefined,
        });
        return NextResponse.json({ dayCounts }, { status: 200 });
      } catch (minError) {
        console.error('Error fetching minimal booking day counts:', minError);
        return NextResponse.json({ error: '예약 조회에 실패했습니다.' }, { status: 500 });
      }
    }

    let query = supabase
      .from('bookings')
      .select(
      `
        *,
        designer:designer_id ( id, name ),
        service:service_id ( id, name, duration_minutes ),
        shop:shop_id ( id, name ),
        customer:customer_id ( id, name, phone )
      `
      )
      .order('booking_date', { ascending: false })
      .order('booking_time', { ascending: false });

    if (numericShopFilter != null) {
      query = query.eq('shop_id', numericShopFilter);
    }

    if (designerId) {
      query = query.eq('designer_id', designerId);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (startDate && endDate) {
      if (dateType === 'created') {
        const { gteIso, ltIso } = getSydneyDayUtcRange(startDate, endDate);
        query = query.gte('created_at', gteIso).lt('created_at', ltIso);
      } else {
        query = query.gte('booking_date', startDate).lte('booking_date', endDate);
      }
    } else if (date) {
      if (dateType === 'created') {
        const { gteIso, ltIso } = getSydneyDayUtcRange(date, date);
        query = query.gte('created_at', gteIso).lt('created_at', ltIso);
      } else {
        query = query.eq('booking_date', date);
      }
    }

    // Comment: Single-day + designer overlap checks must see every row — default pagination could omit noon slots.
    const fetchAllForDesignerDay =
      Boolean(date && designerId && !startDate && !endDate);
    if (!fetchAllForDesignerDay) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

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
        total: data?.length ?? 0,
        page,
        limit,
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



