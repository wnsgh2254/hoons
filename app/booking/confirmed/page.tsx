'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function BookingConfirmedContent() {
  const searchParams = useSearchParams();

  const shop = searchParams.get('shop') || 'HAEYOOM';
  const designer = searchParams.get('designer') || '';
  const service = searchParams.get('service') || '';
  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';
  const deposit = searchParams.get('deposit') || '';

  return (
    <div className="w-full bg-[#F4F4F4] font-display min-h-screen flex flex-col overflow-x-hidden antialiased pt-24">
      <main className="grow w-full max-w-[1280px] mx-auto px-6 md:px-12 py-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center justify-center  bg-emerald-100 text-emerald-700 px-4 py-2 text-sm font-medium gap-2">
            <span className="material-symbols-outlined">check_circle</span>
            <span>Booking Confirmed</span>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-light tracking-tight text-slate-900 uppercase">
              Your appointment is confirmed
            </h1>
            <p className="text-gray-500">
              Thank you. Your deposit has been received and your spot is now secured.
            </p>
          </div>
          <div className="mt-6 inline-flex flex-col items-start gap-3 bg-[#F4F4F4] border border-black  px-6 py-5 text-left">
            <p className="text-sm font-semibold text-gray-700">Booking details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between sm:block">
                <span className="text-gray-500">Location</span>
                <span className="sm:block font-medium text-slate-900">{shop}</span>
              </div>
              {designer && (
                <div className="flex justify-between sm:block">
                  <span className="text-gray-500">Designer</span>
                  <span className="sm:block font-medium text-slate-900">{designer}</span>
                </div>
              )}
              {service && (
                <div className="flex justify-between sm:block">
                  <span className="text-gray-500">Service</span>
                  <span className="sm:block font-medium text-slate-900">{service}</span>
                </div>
              )}
              {(date || time) && (
                <div className="flex justify-between sm:block">
                  <span className="text-gray-500">Date &amp; Time</span>
                  <span className="sm:block font-medium text-slate-900">
                    {date} {time && `at ${time}`}
                  </span>
                </div>
              )}
            </div>
            {deposit && (
              <div className="pt-3 border-t border-black w-full flex justify-between text-sm">
                <span className="text-gray-500">Deposit paid</span>
                <span className="font-bold text-slate-900">${deposit}</span>
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4 pt-4">
            <Link
              href="/booking"
              className="px-6 py-3 text-sm font-light uppercase tracking-widest border border-black text-black hover:bg-black hover:text-white transition-colors"
            >
              Make another booking
            </Link>
            <Link
              href="/"
              className="px-6 py-3  text-sm font-light uppercase tracking-widest border border-black text-black hover:bg-black hover:text-white transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function ConfirmedFallback() {
  return (
    <div className="w-full bg-[#F4F4F4] font-display min-h-screen flex flex-col overflow-x-hidden antialiased pt-24">
      <main className="grow w-full max-w-[1280px] mx-auto px-6 md:px-12 py-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center justify-center text-gray-500 text-sm">
            Loading...
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BookingConfirmedPage() {
  return (
    <Suspense fallback={<ConfirmedFallback />}>
      <BookingConfirmedContent />
    </Suspense>
  );
}
