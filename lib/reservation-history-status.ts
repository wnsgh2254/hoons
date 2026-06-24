import { getBookingStatusColor } from '@/lib/utils/appointment-utils';

export type ReservationStatusFilter =
  | 'all'
  | 'BOOKED'
  | 'ARRIVED'
  | 'PAID'
  | 'NOSHOW'
  | 'CANCELLED';

/** Map raw DB booking status to reservation history filter enum. */
export function normalizeReservationStatusFilter(
  status: string | null | undefined,
): ReservationStatusFilter | null {
  const statusEnum = getBookingStatusColor(status).statusEnum;

  if (statusEnum === 'BOOKED') return 'BOOKED';
  if (statusEnum === 'ARRIVED') return 'ARRIVED';
  if (statusEnum === 'PAID') return 'PAID';
  if (statusEnum === 'NOSHOW') return 'NOSHOW';

  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'cancelled' || normalized === 'canceled') return 'CANCELLED';

  return null;
}

export function matchesReservationStatusFilter(
  status: string | null | undefined,
  filter: ReservationStatusFilter,
): boolean {
  if (filter === 'all') return true;
  return normalizeReservationStatusFilter(status) === filter;
}
