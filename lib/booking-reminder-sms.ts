// Comment: Shared 3-day reminder SMS body (sent via Mobile Message from the app).
// Comment: Keep in sync with `supabase/functions/booking-reminder/index.ts`.

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

type AppointmentLineOptions = {
  /** When true: `07/08 (Sat) 4:30pm`. When false: `07/08 4:30pm` (reminder SMS). */
  includeWeekday?: boolean;
};

/** Calendar date + wall time from stored booking_date + booking_time. */
export function formatReminderAppointmentLine(
  bookingDate: string,
  bookingTime: string | null,
  options?: AppointmentLineOptions,
): string {
  const includeWeekday = options?.includeWeekday !== false;
  try {
    const [year, month, day] = bookingDate.split('-').map((v) => Number(v));
    const [hStr, mStr] = (bookingTime ?? '00:00:00').split(':');
    const hour = Number(hStr);
    const minute = Number(mStr);
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    const dow = WEEKDAY_SHORT[date.getUTCDay()];
    let displayHour = date.getUTCHours();
    const displayMinute = String(date.getUTCMinutes()).padStart(2, '0');
    const ampm = displayHour >= 12 ? 'pm' : 'am';
    displayHour = displayHour % 12;
    if (displayHour === 0) displayHour = 12;
    if (includeWeekday) {
      return `${dd}/${mm} (${dow}) ${displayHour}:${displayMinute}${ampm}`;
    }
    return `${dd}/${mm} ${displayHour}:${displayMinute}${ampm}`;
  } catch {
    return `${bookingDate} ${bookingTime ?? ''}`.trim();
  }
}

export function resolveReminderServiceLabel(
  customServiceName: string | null | undefined,
  catalogServiceName: string | null | undefined,
): string {
  const custom = String(customServiceName ?? '').trim();
  if (custom) return custom;
  const catalog = String(catalogServiceName ?? '').trim();
  if (catalog) return catalog;
  return 'Appointment';
}

/**
 * [Haeyoom Reminder]
 *
 * 07/08 4:30pm
 * Colour / Men's haircut
 *
 * Change/Cancel:
 * 0432 328 002
 *
 * Meadowbank Store
 * Please do not reply.
 */
export function buildBookingReminderSmsBody(params: {
  appointmentLine: string;
  serviceLabel: string;
  shopLocation: string;
  shopPhone?: string | null;
}): string {
  const contactPhone = String(params.shopPhone ?? '').trim() || '0432 328 002';
  const loc = String(params.shopLocation ?? '').trim() || 'Haeyoom salon';

  return (
    `[Haeyoom Reminder]\n\n` +
    `${params.appointmentLine}\n` +
    `${params.serviceLabel}\n\n` +
    `Change/Cancel:\n` +
    `${contactPhone}\n\n` +
    `${loc}\n` +
    `Please do not reply.`
  );
}
