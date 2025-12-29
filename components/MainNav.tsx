'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

// Comment: Global top navigation bar used across landing and booking pages
export function MainNav() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isBooking = pathname.startsWith('/booking');
  const isAdmin = pathname.startsWith('/admin');

  // Comment: Don't show navigation on admin pages
  if (isAdmin) {
    return null;
  }

  const sectionHref = (hash: string) => (isHome ? hash : `/${hash}`);

  const navBgClass = isBooking
    ? 'bg-gray-50/95 border-gray-200/80'
    : 'bg-white/90 border-gray-100/50';

  return (
    <nav className={`fixed top-0 z-50 w-full ${navBgClass} backdrop-blur-xl py-5 transition-all`}>
      <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="hover:opacity-70 transition-opacity">
          <Image
            src="/images/image3.png"
            alt="HAEYOOM Logo"
            width={130}
            height={28}
            className="h-7 w-auto object-contain"
          />
        </Link>
        <div className="hidden md:flex items-center gap-12">
          <div className="flex gap-8 text-sm font-medium text-gray-500">
            <Link className="hover:text-black transition-colors" href={sectionHref('#designers')}>
              Designers
            </Link>
            <Link className="hover:text-black transition-colors" href={sectionHref('#services')}>
              Menu
            </Link>
            <Link className="hover:text-black transition-colors" href={sectionHref('#gallery')}>
              Journal
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-xs text-gray-500 hover:text-black transition-colors">
              Staff Login
            </Link>
            <Link href="/booking">
              <button className="bg-chic-gradient text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300">
                Book Now
              </button>
            </Link>
          </div>
        </div>
        <button className="md:hidden text-black p-2">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>
    </nav>
  );
}


