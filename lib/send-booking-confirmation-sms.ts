import { supabase } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendBookingConfirmation } from '@/lib/twilio';
import { isValidAuMobilePhone } from '@/lib/data';
import { resolveReminderServiceLabel } from '@/lib/booking-reminder-sms';

// Comment: Immediate Twilio SMS after booking is created or deposit is confirmed (not Edge Function).
export async function sendBookingConfirmationSmsForBookingId(bookingId: number): Promise<void> {
  const admin = getSupabaseAdmin();
  const db = admin ?? supabase;
  if (!admin) {
    console.warn(
      '[booking confirmation SMS] SUPABASE_SERVICE_ROLE_KEY missing; using anon client (RLS may block reads)',
    );
  }

  const { data: booking, error } = await db
    .from('bookings')
    .select(
      `
      id,
      booking_date,
      booking_time,
      custom_service_name,
      service:service_id ( name ),
      customer:customer_id ( phone ),
      shop:shop_id ( name, phone )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !booking) {
    console.error('[booking confirmation SMS] load booking failed', bookingId, error);
    return;
  }

  const phone = (booking.customer as { phone?: string | null } | null)?.phone;
  if (!phone || !isValidAuMobilePhone(phone)) {
    console.warn('[booking confirmation SMS] skip: missing or invalid AU mobile', bookingId);
    return;
  }

  const shopRow = booking.shop as { name?: string | null; phone?: string | null } | null;
  const shopName = String(shopRow?.name ?? '').trim() || 'Salon';
  const venuePhone = shopRow?.phone != null && String(shopRow.phone).trim() ? String(shopRow.phone).trim() : null;
  if (!venuePhone) {
    console.warn('[booking confirmation SMS] shop phone missing for booking', bookingId, shopName);
  }

  const serviceName = resolveReminderServiceLabel(
    (booking as { custom_service_name?: string | null }).custom_service_name,
    (booking.service as { name?: string | null } | null)?.name,
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
    console.error('[booking confirmation SMS] Twilio send failed', bookingId, result.error);
  }
}
