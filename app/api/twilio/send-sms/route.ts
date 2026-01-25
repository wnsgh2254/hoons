import { NextRequest, NextResponse } from 'next/server';
import { sendSMS, sendBookingReminder } from '@/lib/twilio';
import { supabase } from '@/lib/supabase';

// Comment: Send SMS manually (for testing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message, bookingId } = body;

    if (!to) {
      return NextResponse.json({ error: '전화번호가 필요합니다.' }, { status: 400 });
    }

    // Comment: If bookingId is provided, send booking reminder
    if (bookingId) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          service:service_id ( name ),
          designer:designer_id ( name ),
          customer:customer_id ( phone )
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
      }

      const customerPhone = (booking.customer as any)?.phone;
      if (!customerPhone) {
        return NextResponse.json({ error: '고객 전화번호가 없습니다.' }, { status: 400 });
      }

      const result = await sendBookingReminder(
        customerPhone,
        booking.booking_date,
        booking.booking_time,
        (booking.service as any)?.name,
        (booking.designer as any)?.name
      );

      return NextResponse.json(result, { status: result.success ? 200 : 500 });
    }

    // Comment: Send custom message
    if (!message) {
      return NextResponse.json({ error: '메시지 내용이 필요합니다.' }, { status: 400 });
    }

    const result = await sendSMS(to, message);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    console.error('Error in send-sms route:', error);
    return NextResponse.json(
      { error: error.message || 'SMS 전송에 실패했습니다.' },
      { status: 500 }
    );
  }
}
