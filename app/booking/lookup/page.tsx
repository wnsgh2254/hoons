import BookingLookup from './booking-lookup';

export default async function BookingLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string | string[] }>;
}) {
  const { reference } = await searchParams;
  const initialReference = typeof reference === 'string' ? reference : '';
  return <BookingLookup key={initialReference} initialReference={initialReference} />;
}
