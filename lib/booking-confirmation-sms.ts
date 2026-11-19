// Comment: Shared confirmation SMS helpers — keep in sync with Supabase Edge `booking-confirmation-sms` when deployed.

/** Promo segments in comma-separated custom_service_name (pricing only, not for guest SMS). */
const CONFIRMATION_SMS_EXCLUDED_SERVICE_SEGMENT = /^website\s+exclusive\s*-\s*20\s*%?\s*off$/i;

function isExcludedConfirmationSmsServiceSegment(segment: string): boolean {
  const t = segment.trim();
  if (!t) return true;
  // Comment: Hide any service line that includes "Promotion" (case-insensitive).
  if (/promotion/i.test(t)) return true;
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

/** Drop a catalog name when it is promo-only so SMS can fall through to custom/other labels. */
export function nullIfExcludedSmsServiceName(name: string | null | undefined): string | null {
  const t = String(name ?? '').trim();
  if (!t || isExcludedConfirmationSmsServiceSegment(t)) return null;
  return t;
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
 * DO NOT REPLY
 *
 * Enquiry
 * Call or Text 0432 328 002
 *
 * 01/10 (Thu) 10:00am
 *
 * Womancut
 *
 * Hoons Meadowbank
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
    ? `Call or Text ${contactPhone}`
    : 'Call or Text your Hoons location';

  return (
    `DO NOT REPLY\n\n` +
    `Enquiry\n` +
    `${contactInstruction}\n\n` +
    `${params.appointmentLine}\n\n` +
    `${params.serviceName}\n\n` +
    `${params.headerLine}`
  );
}
