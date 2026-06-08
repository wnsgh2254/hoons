// Comment: Shared confirmation SMS helpers — keep in sync with Supabase Edge `booking-confirmation-sms` when deployed.

/** Promo segments in comma-separated custom_service_name (pricing only, not for guest SMS). */
const CONFIRMATION_SMS_EXCLUDED_SERVICE_SEGMENT = /^website\s+exclusive\s*-\s*20\s*%?\s*off$/i;

function isExcludedConfirmationSmsServiceSegment(segment: string): boolean {
  const t = segment.trim();
  if (!t) return true;
  return CONFIRMATION_SMS_EXCLUDED_SERVICE_SEGMENT.test(t);
}

/** Strip promo lines from stored custom_service_name before building the SMS service label. */
export function stripPromoFromCustomServiceNameForConfirmationSms(
  customName: string | null | undefined,
): string | null {
  const raw = String(customName ?? '').trim();
  if (!raw) return null;
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  const kept = parts.filter((p) => !isExcludedConfirmationSmsServiceSegment(p));
  if (kept.length === 0) return null;
  return kept.join(', ');
}

/** Strip promo lines from the final Service line in confirmation SMS. */
export function stripPromoFromConfirmationSmsServiceLabel(label: string): string {
  const raw = String(label ?? '').trim();
  if (!raw) return raw;
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  const kept = parts.filter((p) => !isExcludedConfirmationSmsServiceSegment(p));
  if (kept.length > 0) return kept.join(', ');
  return 'Hair service';
}

/** Format AU salon number for SMS (e.g. +61432… or 0432… -> 0432 328 002). */
export function formatAuPhoneForSmsDisplay(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const digits = s.replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('61') && local.length >= 9) {
    local = `0${local.slice(2)}`;
  }
  if (local.startsWith('0') && local.length === 10) {
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  if (local.length >= 8) {
    return s;
  }
  return s;
}

/**
 * Booking confirmation SMS body — keep in sync with Supabase Edge `booking-confirmation-sms`.
 *
 * Haeyoom Meadowbank
 *
 * Appointment:
 * 11/06 (Thu) 7:00pm
 * Service: Hair service
 *
 * To Change or Cancel:
 * Call or Text to 0432 328 002
 */
export function buildBookingConfirmationSmsBody(params: {
  headerLine: string;
  appointmentLine: string;
  serviceName: string;
  venuePhone: string | null;
}): string {
  const formattedContact = formatAuPhoneForSmsDisplay(params.venuePhone);
  const rawVenuePhone = String(params.venuePhone ?? '').trim();
  const contactPhone: string | null =
    formattedContact ?? (rawVenuePhone.length > 0 ? rawVenuePhone : null);
  const contactInstruction = contactPhone
    ? `Call or Text to ${contactPhone}`
    : 'Call or Text your Haeyoom location';

  return (
    `${params.headerLine}\n\n` +
    `Appointment: \n` +
    `${params.appointmentLine} \n` +
    `Service: ${params.serviceName}\n\n` +
    `To Change or Cancel: \n` +
    `${contactInstruction}`
  );
}
