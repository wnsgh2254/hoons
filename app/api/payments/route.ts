import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: GET - Fetch payments by booking IDs or customer ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingIds = searchParams.get('booking_ids');
    const customerId = searchParams.get('customer_id');

    let query = supabase.from('payments').select('*').order('created_at', { ascending: false });

    if (bookingIds) {
      const ids = bookingIds.split(',').map((id) => Number(id.trim()));
      query = query.in('booking_id', ids);
    } else if (customerId) {
      // Comment: Get payments for customer's bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('customer_id', Number(customerId));

      if (bookings && bookings.length > 0) {
        const bookingIds = bookings.map((b: { id: number }) => b.id);
        query = query.in('booking_id', bookingIds);
      } else {
        return NextResponse.json({ payments: [] });
      }
    } else {
      return NextResponse.json(
        { error: 'booking_ids or customer_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ payments: data || [] });
  } catch (error: any) {
    console.error('Error in payments GET route:', error);
    return NextResponse.json(
      { error: error.message || '결제 내역을 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}
