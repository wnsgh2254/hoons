import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { getWeekStart, getWeekEnd } from '@/lib/utils/appointment-utils';
import { loadDesignerShopsMap, mergeDesignerShopIds } from '@/lib/designer-multi-venue';
import { getAvailableDesignerIdsForShop } from '@/lib/designer-availability';

function getMonthRange(monthKey: string): { start: string; end: string } {
  const [year, month] = monthKey.split('-').map((v) => Number(v));
  const safeYear = Number.isFinite(year) && year > 0 ? year : new Date().getFullYear();
  const safeMonth = Number.isFinite(month) && month >= 1 && month <= 12 ? month : new Date().getMonth() + 1;
  const daysInMonth = new Date(safeYear, safeMonth, 0).getDate();
  const mm = String(safeMonth).padStart(2, '0');
  return {
    start: `${safeYear}-${mm}-01`,
    end: `${safeYear}-${mm}-${String(daysInMonth).padStart(2, '0')}`,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    if (!date || !month) {
      return NextResponse.json({ error: 'date와 month 파라미터가 필요합니다.' }, { status: 400 });
    }

    const weekStart = getWeekStart(date);
    const weekEnd = getWeekEnd(date);
    const { start: monthStart, end: monthEnd } = getMonthRange(month);

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin_session');
    let userRole: string | null = null;
    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie.value) as { role?: string; expiresAt?: string };
        if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
          userRole = session.role || null;
        }
      } catch {
        userRole = null;
      }
    }

    const [designersRes, shopsRes, servicesRes, weekBookingsRes, monthBookingsRes, restrictionsRes, memoRes, designerShopsMap] =
      await Promise.all([
        supabase
          .from('designers')
          .select('id, name, english_name, role, shop_id, instagramLink, is_active')
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase.from('shops').select('*').order('name', { ascending: true }),
        supabase.from('services').select('*').order('name', { ascending: true }),
        supabase
          .from('bookings')
          .select(
            `
            *,
            designer:designer_id ( id, name ),
            service:service_id ( id, name, duration_minutes ),
            shop:shop_id ( id, name ),
            customer:customer_id ( id, name, phone )
          `,
          )
          .gte('booking_date', weekStart)
          .lte('booking_date', weekEnd)
          .order('booking_date', { ascending: false })
          .order('booking_time', { ascending: false }),
        supabase
          .from('bookings')
          .select('booking_date, status')
          .gte('booking_date', monthStart)
          .lte('booking_date', monthEnd),
        supabase
          .from('booking_restrictions')
          .select('*')
          .eq('restriction_date', date)
          .order('restriction_date', { ascending: true }),
        supabase.from('admin_memo').select('content').eq('id', 1).maybeSingle(),
        loadDesignerShopsMap(),
      ]);

    if (designersRes.error || shopsRes.error || servicesRes.error || weekBookingsRes.error || monthBookingsRes.error || restrictionsRes.error || memoRes.error) {
      console.error('Error loading appointments initial data:', {
        designers: designersRes.error,
        shops: shopsRes.error,
        services: servicesRes.error,
        weekBookings: weekBookingsRes.error,
        monthBookings: monthBookingsRes.error,
        restrictions: restrictionsRes.error,
        memo: memoRes.error,
      });
      return NextResponse.json({ error: '초기 데이터 로딩에 실패했습니다.' }, { status: 500 });
    }

    const weekBookings = weekBookingsRes.data || [];
    const bookingIds = weekBookings.map((b: any) => b.id).filter((id: any) => Number.isFinite(id));

    let tempSaleBookingIds: number[] = [];
    if (bookingIds.length > 0) {
      const { data: tempSaleRows, error: tempSalesError } = await supabase
        .from('temp_sales')
        .select('booking_id')
        .in('booking_id', bookingIds);
      if (!tempSalesError) {
        tempSaleBookingIds = (tempSaleRows || []).map((row: any) => row.booking_id);
      }
    }

    const shops = shopsRes.data || [];
    const availableDesignerIdsByShop: Record<number, number[]> = {};

    // Use direct Supabase queries instead of HTTP self-calls for each shop
    await Promise.all(
      shops.map(async (shop: any) => {
        try {
          availableDesignerIdsByShop[shop.id] = await getAvailableDesignerIdsForShop(supabase, date, shop.id);
        } catch {
          availableDesignerIdsByShop[shop.id] = [];
        }
      }),
    );

    const dayCounts: Record<number, number> = {};
    (monthBookingsRes.data || []).forEach((b: { booking_date: string; status: string | null }) => {
      if (String(b.status || '').toLowerCase() === 'cancelled') return;
      const day = new Date(b.booking_date).getDate();
      if (!Number.isNaN(day)) {
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
    });

    return NextResponse.json(
      {
        userRole,
        memo: memoRes.data?.content || '',
        designers: (designersRes.data || []).map((d: any) => ({
          ...d,
          shop_ids_at: mergeDesignerShopIds(d.shop_id, designerShopsMap.get(d.id)),
        })),
        shops,
        services: servicesRes.data || [],
        bookings: weekBookings,
        bookingRestrictions: restrictionsRes.data || [],
        dayCounts,
        availableDesignerIdsByShop,
        tempSaleBookingIds,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in appointments initial-data route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

