import { isValidAuMobilePhone } from '@/lib/data';
import {
  stripPromoFromConfirmationSmsServiceLabel,
  stripPromoFromCustomServiceNameForConfirmationSms,
  nullIfExcludedSmsServiceName,
} from '@/lib/booking-confirmation-sms';
import { smsServiceLabelEn } from '@/lib/public-booking-labels';
import { supabase } from '@/lib/supabase';
import { sendBookingConfirmation } from '@/lib/twilio';

// Comment: Local / dev fallback — send confirmation SMS from Next.js via Mobile Message (.env.local).
export async function sendBookingConfirmationSmsForBooking(bookingId: number): Promise<{
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  messageSid?: string;
  error?: string;
}> {
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(
      `
      id,
      booking_date,
      booking_time,
      custom_service_name,
      service:service_id ( name, english_name ),
      customer:customer_id ( phone ),
      shop:shop_id ( name, phone )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (error) {
    console.error('[booking-confirmation-sms] load booking failed', error);
    return { ok: false, error: 'Failed to load booking' };
  }

  if (!booking) {
    return { ok: false, error: 'Booking not found' };
  }

  const phone = (booking.customer as { phone?: string | null } | null)?.phone;
  if (!phone || !isValidAuMobilePhone(phone)) {
    console.warn('[booking-confirmation-sms] skip: missing or invalid AU mobile', bookingId);
    return { ok: true, skipped: true, reason: 'invalid_or_missing_phone' };
  }

  const shopRow = booking.shop as { name?: string | null; phone?: string | null } | null;
  const shopName = String(shopRow?.name ?? '').trim() || 'Salon';
  const venuePhone =
    shopRow?.phone != null && String(shopRow.phone).trim() ? String(shopRow.phone).trim() : null;

  const svc = booking.service as { name?: string | null; english_name?: string | null } | null;
  const customForSms = stripPromoFromCustomServiceNameForConfirmationSms(
    (booking as { custom_service_name?: string | null }).custom_service_name,
  );
  const serviceName = stripPromoFromConfirmationSmsServiceLabel(
    smsServiceLabelEn(
      nullIfExcludedSmsServiceName(svc?.english_name),
      nullIfExcludedSmsServiceName(svc?.name),
      customForSms,
    ),
  );

  const result = await sendBookingConfirmation({
    phone,
    bookingDate: booking.booking_date,
    bookingTime: booking.booking_time ?? '00:00:00',
    shopName,
    serviceName,
    venuePhone,
  });

  if (!result.success) {
    console.error('[booking-confirmation-sms] send failed', bookingId, result.error);
    return { ok: false, error: result.error || 'Failed to send SMS' };
  }

  return { ok: true, messageSid: result.messageSid };
}

/** Invoke Supabase Edge `booking-confirmation-sms` (Mobile Message secrets live on Supabase). */
export async function invokeBookingConfirmationEdge(bookingId: number) {
  const projectUrl = process.env.SUPABASE_URL?.trim() || 'https://akzipcsakzuqpknkrjnb.supabase.co';
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

  if (!anonKey) {
    throw new Error('Missing SUPABASE_ANON_KEY for Edge Function invoke.');
  }

  const res = await fetch(`${projectUrl}/functions/v1/booking-confirmation-sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ booking_id: bookingId }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`booking-confirmation-sms failed (${res.status}): ${text}`);
  }

  return text;
}
