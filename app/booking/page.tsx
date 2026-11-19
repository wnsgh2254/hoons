import type { Metadata } from 'next';
import { HOONS_LOCATIONS } from '@/lib/hoons-locations';
import BookingFlow from './booking-flow';

export const metadata: Metadata = {
  title: 'Book an appointment | HOONS',
  description: 'Try the HOONS booking experience with sample services and availability.',
};

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string | string[] }>;
}) {
  const { location } = await searchParams;
  const initialLocation = HOONS_LOCATIONS.find(({ id }) => id === location)?.id;
  return <BookingFlow key={initialLocation ?? 'all'} initialLocation={initialLocation} />;
}
