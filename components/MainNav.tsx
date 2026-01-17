'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

// Comment: Global top navigation bar used across landing and booking pages
export function MainNav() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isBooking = pathname.startsWith('/booking');
  const isAdmin = pathname.startsWith('/admin');
  const [isOpen, setIsOpen] = useState(false);

  // Comment: Don't show navigation on admin pages
  if (isAdmin) {
    return null;
  }

  const sectionHref = (hash: string) => (isHome ? hash : `/${hash}`);
  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Minimal Sticky Header - Design 2 Style */}
      <header className="fixed top-0 left-0 w-full z-50 mix-blend-difference text-white pointer-events-none">
        <div className="w-full px-6 md:px-12 py-6 flex items-center justify-between text-xs md:text-sm font-light tracking-widest uppercase leading-none pointer-events-auto">
          
          {/* Left: Brand Logo (Text) */}
          <Link href="/" className="block z-50 group" onClick={closeMenu}>
            <span className="font-display text-3xl font-medium tracking-tighter group-hover:opacity-70 transition-opacity">
              HAEYOOM
            </span>
          </Link>

          {/* Center: Navigation (Desktop) */}
          <nav className="hidden md:flex space-x-12 absolute left-1/2 transform -translate-x-1/2">
            <Link href={sectionHref('#services')} className="hover:underline">Menu</Link>
            <Link href={sectionHref('#locations')} className="hover:underline">Locations</Link>
            <Link href="/designers" className="hover:underline">Designers</Link>
            <Link href={sectionHref('#portfolio')} className="hover:underline">Portfolio</Link>
          </nav>

          {/* Right: Book Now / Staff Login / Mobile Menu */}
          <div className="flex flex-col items-end gap-1">
            <div className="md:hidden">
              <button className="uppercase" onClick={toggleMenu}>
                {isOpen ? 'Close' : 'Menu'}
              </button>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <Link href="/admin/appointments" className="hover:underline text-xs">
                Staff Login
              </Link>
              <Link href="/booking" className="flex items-center gap-1 hover:underline">
                <span>Book Now</span>
                <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-40 bg-[#F4F4F4] text-black transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} md:hidden pt-24 px-4`}>
        <nav className="flex flex-col space-y-0 border-t border-black">
          {[
            { name: 'Home', path: '/', hash: '' },
            { name: 'Menu', path: '/', hash: '#services' },
            { name: 'Locations', path: '/', hash: '#locations' },
            { name: 'Designers', path: '/designers', hash: '' },
            { name: 'Portfolio', path: '/', hash: '#portfolio' },
            { name: 'Staff Login', path: '/admin/appointments', hash: '' },
            { name: 'Book Now', path: '/booking', hash: '' },
          ].map((item) => (
            <Link 
              key={item.name}
              href={`${item.path}${item.hash}`} 
              onClick={closeMenu}
              className="text-4xl font-display font-light uppercase tracking-tighter py-6 border-b border-black hover:bg-black hover:text-white transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}


