import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'My booking | HOONS',
  description: 'Look up a HOONS demo appointment by its booking reference.',
};

export default function BookingLookupLayout({ children }: { children: ReactNode }) {
  return children;
}
