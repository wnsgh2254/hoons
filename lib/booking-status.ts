export function normalizeBookingStatus(status: string | null | undefined): string {
  return String(status || '').trim().toLowerCase();
}

export function isCancelledBookingStatus(status: string | null | undefined): boolean {
  const normalized = normalizeBookingStatus(status);
  return normalized === 'cancelled' || normalized === 'canceled';
}

export function isUpcomingBookingStatus(status: string | null | undefined): boolean {
  const normalized = normalizeBookingStatus(status);
  if (!normalized) return true;
  return (
    normalized === 'booked' ||
    normalized === 'reserved' ||
    normalized === 'confirmed' ||
    normalized === 'pending'
  );
}

export function isCompletedBookingStatus(status: string | null | undefined): boolean {
  const normalized = normalizeBookingStatus(status);
  return normalized === 'paid' || normalized === 'completed';
}
