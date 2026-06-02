// Comment: Shared confirmation SMS helpers — keep in sync with Supabase Edge `booking-confirmation-sms`.

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
