'use client';

import { usePathname } from 'next/navigation';
import { MainNav } from './MainNav';
import MainFooter from './MainFooter';

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isBookingDemo = pathname === '/booking' || pathname === '/booking/lookup';
  const isAdminPage = pathname?.startsWith('/admin');

  return (
    <>
      {!isAdminPage && !isHome && !isBookingDemo && <MainNav />}
      {children}
      {!isAdminPage && <MainFooter warm={isHome || isBookingDemo} showBooking={isHome} />}
    </>
  );
}
