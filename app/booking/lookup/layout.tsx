import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'My Booking | Haeyoom',
  description: 'View your upcoming Haeyoom appointments with your mobile number.',
};

export default function BookingLookupLayout({ children }: { children: ReactNode }) {
  return children;
}
