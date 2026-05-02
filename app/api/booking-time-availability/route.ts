import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { loadDesignerAvailabilityForPublicBooking } from '@/lib/server-booking-availability';
import { isPublicBookingDateBeyondHorizon } from '@/lib/utils/appointment-utils';

export const dynamic = 'force-dynamic';

// Comment: Public GET — designer date occupancy + restrictions for /booking time grid
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const designerId = searchParams.get('designer_id');
    const shopId = searchParams.get('shop_id');
    const date = searchParams.get('date');

    if (!designerId || !shopId || !date) {
      return NextResponse.json(
        { error: 'designer_id, shop_id, and date are required.' },
        { status: 400 },
      );
    }

    if (isPublicBookingDateBeyondHorizon(date)) {
      return NextResponse.json(
        { error: 'date is beyond the allowed booking window.' },
        { status: 400 },
      );
    }

    const data = await loadDesignerAvailabilityForPublicBooking(supabase, {
      designerId: Number(designerId),
      shopId: Number(shopId),
      date,
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('booking-time-availability GET:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
