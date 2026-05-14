import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { buildPhoneVariants, isValidAuMobilePhone } from '@/lib/data';
import { isCancelledBookingStatus, normalizeBookingStatus } from '@/lib/booking-status';
import { getSydneyToday } from '@/lib/utils/appointment-utils';
import { publicServiceLabelEn, publicStylistLabelEn } from '@/lib/public-booking-labels';

/** Normalize booking_time to HH:mm:ss for lexicographic compare */
function normalizeBookingTime(bookingTime: string | null | undefined): string {
  if (!bookingTime) return '00:00:00';
  const parts = bookingTime.split(':');
  const hh = String(Number(parts[0] ?? 0)).padStart(2, '0');
  const mm = String(Number(parts[1] ?? 0)).padStart(2, '0');
  const ss = String(Number((parts[2] ?? '0').replace(/\D/g, '') || 0)).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/** Sortable key for Sydney-local booking_date + booking_time */
function bookingSortKey(bookingDate: string, bookingTime: string | null | undefined): string {
  return `${bookingDate} ${normalizeBookingTime(bookingTime)}`;
}

/** Current Sydney moment as same sort key shape */
function sydneyNowSortKey(): string {
  const d = new Date();
  const dateFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Australia/Sydney',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const second = parts.find((p) => p.type === 'second')?.value ?? '00';
  const dateStr = dateFmt.format(d);
  return `${dateStr} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
}

function isExcludedStatus(status: string | null | undefined): boolean {
  if (isCancelledBookingStatus(status)) return true;
  const n = normalizeBookingStatus(status);
  if (n === 'noshow' || n === 'no_show') return true;
  if (n === 'blocked') return true;
  return false;
}

type JoinedNameRow = { id?: number; name?: string | null } | null;

type DesignerLookupJoin = {
  id?: number;
  name?: string | null;
  english_name?: string | null;
} | null;

type ServiceLookupJoin = {
  id?: number;
  name?: string | null;
  english_name?: string | null;
} | null;

type BookingLookupRow = {
  id: number;
  booking_date: string;
  booking_time: string | null;
  status: string | null;
  sale_completed?: number | boolean | null;
  custom_service_name?: string | null;
  shop?: JoinedNameRow;
  designer?: DesignerLookupJoin;
  service?: ServiceLookupJoin;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';

    if (!phoneRaw || !isValidAuMobilePhone(phoneRaw)) {
      return NextResponse.json(
        { error: 'Please enter a valid Australian mobile number starting with 04.' },
        { status: 400 },
      );
    }

    const { local, e164, digitsOnly } = buildPhoneVariants(phoneRaw);
    const orParts: string[] = [];
    if (local) orParts.push(`phone.eq.${local}`);
    if (e164) orParts.push(`phone.eq.${e164}`);
    if (digitsOnly) orParts.push(`phone.eq.${digitsOnly}`);
    if (orParts.length === 0) {
      return NextResponse.json({ bookings: [] });
    }

    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .or(orParts.join(','));

    if (customerError) {
      console.error('[bookings/lookup] customers:', customerError);
      return NextResponse.json({ error: 'Lookup failed. Please try again later.' }, { status: 500 });
    }

    const customerIds = [...new Set((customers || []).map((c: { id: number }) => Number(c.id)).filter(Boolean))];
    if (customerIds.length === 0) {
      return NextResponse.json({ bookings: [] });
    }

    const todaySydney = getSydneyToday();

    const { data: rows, error: bookingsError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        booking_date,
        booking_time,
        status,
        sale_completed,
        custom_service_name,
        shop:shop_id ( id, name ),
        designer:designer_id ( id, name, english_name ),
        service:service_id ( id, name, english_name )
      `,
      )
      .in('customer_id', customerIds)
      .gte('booking_date', todaySydney)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });

    if (bookingsError) {
      console.error('[bookings/lookup] bookings:', bookingsError);
      return NextResponse.json({ error: 'Lookup failed. Please try again later.' }, { status: 500 });
    }

    const nowKey = sydneyNowSortKey();

    const typedRows = (rows || []) as BookingLookupRow[];

    const upcoming = typedRows.filter((row) => {
      if (isExcludedStatus(row.status)) return false;
      const saleDone = Number(row.sale_completed ?? 0) === 1;
      if (saleDone) return false;
      const dateStr = String(row.booking_date ?? '');
      const timeStr = row.booking_time;
      return bookingSortKey(dateStr, timeStr) >= nowKey;
    });

    const bookings = upcoming.map((row) => {
      const shop = row.shop;
      const designer = row.designer;
      const service = row.service;
      const serviceName = publicServiceLabelEn(
        service?.english_name,
        service?.name ?? null,
        row.custom_service_name ?? null,
      );

      return {
        id: row.id,
        booking_date: row.booking_date,
        booking_time: row.booking_time,
        status: row.status,
        shop_name: shop?.name ?? null,
        designer_name: publicStylistLabelEn(designer?.english_name, designer?.name ?? null),
        service_name: serviceName,
      };
    });

    return NextResponse.json({ bookings });
  } catch (e) {
    console.error('[bookings/lookup]', e);
    return NextResponse.json({ error: 'Lookup failed. Please try again later.' }, { status: 500 });
  }
}
