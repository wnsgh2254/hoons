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
  const isAdminPage = pathname?.startsWith('/admin');

  return (
    <>
      {!isAdminPage && <MainNav />}
      {children}
      {!isAdminPage && <MainFooter />}
    </>
  );
}
