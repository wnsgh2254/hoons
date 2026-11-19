'use client';

import Link from 'next/link';
import { type ReactNode, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import styles from './booking.module.css';

export default function BookingShell({ children, lookup = false }: { children: ReactNode; lookup?: boolean }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [lookup]);

  return (
    <div className={styles.shell} lang="en-AU">
      <header className={styles.header}>
        <Link href="/" aria-label="HOONS home" className={styles.wordmark}>HOONS</Link>
        <nav aria-label="Booking navigation" className={styles.navigation}>
          <Link href="/"><ArrowLeft size={14} aria-hidden="true" /> Back to home</Link>
          <Link href={lookup ? '/booking' : '/booking/lookup'}>{lookup ? 'New booking' : 'My booking'}</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
