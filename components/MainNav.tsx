'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';

// Comment: Global top navigation bar used across landing and booking pages
export function MainNav() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  // Comment: Don't show navigation on admin pages
  if (isAdmin) {
    return null;
  }

  return (
    <>
      {/* Minimal Sticky Header - Design 2 Style. Prevent overflow so mobile Menu is always visible. */}
      <header className="fixed top-0 left-0 right-0 w-full max-w-[100vw] z-50 mix-blend-difference text-white pointer-events-none overflow-x-hidden">
        <div className="w-full max-w-[100vw] px-4 sm:px-6 md:px-12 py-6 flex items-center justify-between gap-3 text-xs md:text-sm font-normal tracking-widest uppercase leading-none pointer-events-auto min-w-0">
          
          {/* Left: Brand Logo - allow shrink on mobile so Menu stays visible */}
          <Link href="/" className="block z-50 group shrink-0 min-w-0 md:shrink-0" style={{ isolation: 'isolate' }}>
            <Image 
              src="/images/logo-white.png" 
              alt="HOONS"
              width={140} 
              height={140}
              className="group-hover:opacity-70 transition-opacity max-h-6 w-auto"
              style={{ 
                height: '24px',
                width: 'auto'
                
              }}
              priority
            />
          </Link>

          {/* Center: Navigation (Desktop) */}
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 gap-4 lg:gap-8">
            <Link href="/#locations" className="hover:underline">Location</Link>
            <Link href="/booking/lookup" className="whitespace-nowrap hover:underline">
              My Booking
            </Link>
          </nav>

          {/* Right: My Booking + Book — desktop stacks Book Now; mobile shows compact links */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center justify-end gap-2 md:hidden" style={{ isolation: 'isolate' }}>
              <Link
                href="/booking/lookup"
                className="border border-black bg-white px-3 py-2 text-[10px] uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-white whitespace-nowrap"
                aria-label="My Booking"
              >
                My Booking
              </Link>
              <Link
                href="/booking"
                className="border border-black bg-white px-4 py-2 text-[11px] uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-white"
                aria-label="Go to booking"
              >
                Book
              </Link>
            </div>
            <div className="hidden md:flex items-center gap-4" style={{ isolation: 'isolate' }}>
              <Link 
                href="/booking" 
                className="flex items-center gap-1 border border-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                style={{ 
                  mixBlendMode: 'normal',
                  paddingTop: '12px',
                  paddingBottom: '12px',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                  backgroundColor: 'white',
                  color: 'black'
                }}
              >
                <span>Book Now</span>
                <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}


