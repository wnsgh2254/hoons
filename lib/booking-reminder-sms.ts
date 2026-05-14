// Comment: Shared 3-day reminder SMS — keep in sync with `supabase/functions/booking-reminder/index.ts` message helpers.

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** dd/mm (Sat) 11:00am — calendar date + wall time from stored booking_date + booking_time. */
export function formatReminderAppointmentLine(bookingDate: string, bookingTime: string | null): string {
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
    return `${dd}/${mm} (${dow}) ${displayHour}:${displayMinute}${ampm}`;
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
    `Appointment: \n` +
    `${params.appointmentLine}\n\n` +
    `Service: ${params.serviceLabel}\n\n` +
    `To Change or Cancel: \n` +
    `Must contact via Call or Text to ${contactPhone}\n\n` +
    `Deposit Policy:\n` +
    `* Today: Last day for 100% refund\n` +
    `* 1-2 days before: 50% refund\n` +
    `* Same-day: Non-refundable\n` +
    `* Late over 10 mins: Auto-canceled\n\n` +
    `Location: ${loc}\n\n` +
    `See you soon, Team Haeyoom`
  );
}
