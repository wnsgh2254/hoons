// Comment: Invokes Supabase Edge `booking-confirmation-sms` (Twilio SMS) with the public anon key.
export async function invokeBookingConfirmationEdge(bookingId: number) {
  const projectUrl = process.env.SUPABASE_URL?.trim() || 'https://akzipcsakzuqpknkrjnb.supabase.co';
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

  if (!anonKey) {
    throw new Error('Missing SUPABASE_ANON_KEY for Edge Function invoke.');
  }

  const res = await fetch(`${projectUrl}/functions/v1/booking-confirmation-sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ booking_id: bookingId }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`booking-confirmation-sms failed (${res.status}): ${text}`);
  }

  return text;
}
