import { isValidAuMobilePhone } from '@/lib/data';
import {
  stripPromoFromConfirmationSmsServiceLabel,
  stripPromoFromCustomServiceNameForConfirmationSms,
} from '@/lib/booking-confirmation-sms';
import { smsServiceLabelEn } from '@/lib/public-booking-labels';
import { supabase } from '@/lib/supabase';
import { sendBookingConfirmation } from '@/lib/twilio';

// Comment: Load booking and send confirmation SMS via Mobile Message (in-app; no Edge invoke).
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
    smsServiceLabelEn(svc?.english_name, svc?.name, customForSms),
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

/** @deprecated Name kept for call sites — sends via Mobile Message in Next.js, not Supabase Edge. */
export async function invokeBookingConfirmationEdge(bookingId: number) {
  const result = await sendBookingConfirmationSmsForBooking(bookingId);
  if (!result.ok && !result.skipped) {
    throw new Error(result.error || 'booking-confirmation-sms failed');
  }
  return JSON.stringify({
    ok: true,
    booking_id: bookingId,
    skipped: result.skipped ?? false,
    reason: result.reason ?? null,
    message_sid: result.messageSid ?? null,
  });
}
