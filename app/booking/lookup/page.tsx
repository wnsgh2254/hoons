'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCancellationRefundPolicy } from '@/lib/cancellation-policy';

type LookupBooking = {
  id: number;
  booking_date: string;
  booking_time: string | null;
  status: string | null;
  shop_name: string | null;
  designer_name: string | null;
  service_name: string | null;
};

function formatDisplayDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDisplayTime(bookingTime: string | null): string {
  if (!bookingTime) return '';
  const [hs, ms] = bookingTime.split(':');
  const h = Number(hs);
  const m = Number(ms);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return bookingTime;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function BookingLookupPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<LookupBooking[] | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  const handleCancel = async (bookingId: number) => {
    const booking = bookings?.find((b) => b.id === bookingId);
    const policy = getCancellationRefundPolicy(booking?.booking_date);
    const refundNote =
      policy.refundBand === 'full'
        ? 'Your deposit will be refunded in full (100%).'
        : policy.refundBand === 'half'
          ? 'Your deposit will be 50% refunded.'
          : 'Deposits are non-refundable for same-day cancellations, so your deposit will not be refunded.';
    if (!window.confirm(`Cancel this appointment? This cannot be undone.

${refundNote}`)) return;
    setCancelError(null);
    setCancelSuccess(null);
    setCancellingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCancelError(typeof data.error === 'string' ? data.error : 'Could not cancel this appointment.');
        return;
      }
      setBookings((prev) => (prev ? prev.filter((b) => b.id !== bookingId) : prev));
      setCancelSuccess('Your appointment has been cancelled.');
    } catch {
      setCancelError('Could not reach the server. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBookings(null);
    setLoading(true);
    try {
      const res = await fetch('/api/bookings/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Something went wrong.');
        setBookings([]);
        return;
      }
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch {
      setError('Could not reach the server. Please try again.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#F4F4F4] text-black px-4 sm:px-6 md:px-12 pt-24 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pt-28 md:pb-24">
      <div className="max-w-xl mx-auto w-full min-w-0">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-black/70 hover:text-black mb-10"
        >
          <ArrowLeft size={14} />
          Home
        </Link>

        <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tighter mb-2">
          My Booking
        </h1>
        <p className="text-sm md:text-base text-black/70 mb-10 leading-relaxed">
          Enter the Australian mobile number you used when booking. We&apos;ll show upcoming appointments only.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mb-12">
          <label htmlFor="phone" className="block text-xs uppercase tracking-widest text-black/60">
            Mobile number
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="04xx xxx xxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full min-h-11 border border-black bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-black/20 rounded-none touch-manipulation"
          />
          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="w-full min-h-11 border border-black bg-black text-white px-6 py-3.5 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation active:opacity-90"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        {error && (
          <p className="text-sm text-red-700 border border-red-200 bg-red-50 px-4 py-3 mb-8" role="alert">
            {error}
          </p>
        )}

        {cancelSuccess && (
          <p className="text-sm text-green-800 border border-green-200 bg-green-50 px-4 py-3 mb-8" role="status">
            {cancelSuccess}
          </p>
        )}

        {cancelError && (
          <p className="text-sm text-red-700 border border-red-200 bg-red-50 px-4 py-3 mb-8" role="alert">
            {cancelError}
          </p>
        )}

        {bookings !== null && !error && (
          <div className="border-t border-black pt-8">
            <h2 className="text-xs uppercase tracking-widest text-black/60 mb-6">Upcoming appointments</h2>
            {bookings.length === 0 ? (
              <p className="text-sm text-black/70 leading-relaxed">
                No upcoming bookings found for this number. If you just booked, please allow a moment and try again, or
                contact the salon.
              </p>
            ) : (
              <>
              <div className="bg-white/60 p-4 flex gap-3 items-start border border-black mb-6">
                <span className="material-symbols-outlined text-black mt-0.5 text-lg shrink-0">info</span>
                <div className="text-xs text-gray-700 leading-relaxed space-y-1.5">
                  <p className="font-bold text-black uppercase tracking-wide">Cancellation Policy</p>
                  <p>
                    <span className="font-bold text-black">3+ days before</span> your appointment —{' '}
                    <span className="font-bold text-black">100% refund</span>
                  </p>
                  <p>
                    <span className="font-bold text-black">1–2 days before</span> your appointment —{' '}
                    <span className="font-bold text-black">50% refund</span>
                  </p>
                  <p className="text-gray-500 pt-0.5">
                    Deposits are non-refundable for same-day cancellations. Rescheduling is available up
                    to 24 hours before your appointment.
                  </p>
                </div>
              </div>
              <ul className="space-y-6">
                {bookings.map((b) => (
                  <li key={b.id} className="border border-black bg-white p-5 md:p-6 overflow-hidden">
                    <p className="font-display text-lg sm:text-xl md:text-2xl uppercase tracking-tight mb-2 md:mb-3 leading-snug">
                      {formatDisplayDate(b.booking_date)}
                    </p>
                    <p className="text-base sm:text-lg mb-4 tabular-nums">{formatDisplayTime(b.booking_time)}</p>
                    <dl className="space-y-3 text-sm">
                      {b.shop_name && (
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2 sm:items-start">
                          <dt className="text-black/50 shrink-0 min-w-[5.5rem]">Location</dt>
                          <dd className="min-w-0 break-words">{b.shop_name}</dd>
                        </div>
                      )}
                      {b.service_name && (
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2 sm:items-start">
                          <dt className="text-black/50 shrink-0 min-w-[5.5rem]">Service</dt>
                          <dd className="min-w-0 break-words">{b.service_name}</dd>
                        </div>
                      )}
                      {b.designer_name && (
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2 sm:items-start">
                          <dt className="text-black/50 shrink-0 min-w-[5.5rem]">Stylist</dt>
                          <dd className="min-w-0 break-words">{b.designer_name}</dd>
                        </div>
                      )}
                    </dl>
                    <button
                      type="button"
                      onClick={() => handleCancel(b.id)}
                      disabled={cancellingId === b.id}
                      className="mt-5 w-full sm:w-auto min-h-11 border border-red-700 text-red-700 px-6 py-2.5 text-xs uppercase tracking-widest hover:bg-red-700 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation active:opacity-90"
                    >
                      {cancellingId === b.id ? 'Cancelling…' : 'Cancel appointment'}
                    </button>
                  </li>
                ))}
              </ul>
              </>
            )}
          </div>
        )}

        <p className="mt-12 text-xs text-black/50 leading-relaxed">
          Need a new appointment?{' '}
          <Link href="/booking" className="underline hover:text-black">
            Book online
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
