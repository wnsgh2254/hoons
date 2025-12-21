import { NextRequest, NextResponse } from 'next/server';
import { createPublicBooking } from '@/lib/data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, designerId, serviceId, day, timeLabel, totalAmount, depositAmount } = body;

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
    const date = searchParams.get('date');

    let query = supabase.from('bookings').select('*');

    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    if (date) {
      query = query.eq('booking_date', date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json(
        { error: '예약 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookings: data }, { status: 200 });
  } catch (error) {
    console.error('Error in appointment route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}



