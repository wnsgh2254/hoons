import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { buildPhoneVariants, isValidAuMobilePhone } from '@/lib/data';
import { cancelBookingWithPolicyRefund } from '@/lib/booking-cancellation';

// Comment: Customer self-cancel. Identity check is the same phone number used on the
// "my booking" lookup page (no OTP, per product decision) — just confirms the booking
// actually belongs to a customer with that phone before cancelling it.
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const bookingId = Number(id);
    if (!Number.isFinite(bookingId)) {
      return NextResponse.json({ error: '유효하지 않은 예약 ID 입니다.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';
    if (!phoneRaw || !isValidAuMobilePhone(phoneRaw)) {
      return NextResponse.json(
        { error: 'Please enter a valid Australian mobile number starting with 04.' },
        { status: 400 },
      );
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, customer_id, customer:customer_id ( phone )')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
    }

    const { digitsOnly } = buildPhoneVariants(phoneRaw);
    const bookingPhone = (booking as any).customer?.phone ?? null;
    const { digitsOnly: bookingDigitsOnly } = buildPhoneVariants(bookingPhone);
    const matches = Boolean(digitsOnly && bookingDigitsOnly && digitsOnly === bookingDigitsOnly);

    if (!matches) {
      // Comment: Same "booking not found" message as a genuine 404 — don't reveal whether
      // the booking id exists for a different phone number.
      return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
    }

    const result = await cancelBookingWithPolicyRefund({
      bookingId,
      cancellationReason: 'customer_request',
      applyRefund: true,
      cancelledStatus: 'CANCELLED',
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ booking: result.booking }, { status: 200 });
  } catch (error) {
    console.error('[bookings/[id]/cancel]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
