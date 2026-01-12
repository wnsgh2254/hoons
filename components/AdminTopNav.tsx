'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin/appointments', icon: 'calendar_month', label: 'Appointments' },
  { href: '/admin/staff', icon: 'groups', label: 'Staff' },
  { href: '/admin/service-history', icon: 'history', label: 'Service History' },
  { href: '/admin/inventory', icon: 'inventory_2', label: 'Inventory' },
  { href: '/admin/prepaid', icon: 'card_membership', label: 'Prepaid Pass' },
  { href: '/admin/sales', icon: 'monitoring', label: 'Sales Overview' },
  { href: '/admin/test-env', icon: 'visibility', label: 'Design 2' },
];

export default function AdminTopNav() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="h-16 flex items-center justify-between px-6 md:px-12 py-5 bg-white border-b border-gray-200 z-10 sticky top-0">
      <div className="container mx-auto flex items-center justify-between w-full">
        {/* Logo */}
        <Link href="/" className="flex items-center hover:opacity-70 transition-opacity">
          <Image
            src="/images/image3.png"
            alt="HAEYOOM Logo"
            width={130}
            height={28}
            className="h-7 w-auto object-contain"
          />
        </Link>

        {/* Navigation Items */}
        <nav className="flex items-center gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative flex items-center justify-center w-12 h-12 rounded-lg transition-colors ${
              isActive(item.href)
                ? 'bg-black text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-black'
            }`}
            title={item.label}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            {/* Tooltip on hover */}
            <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black text-white text-xs font-medium rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
              {item.label}
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45"></span>
            </span>
          </Link>
        ))}
      </nav>

        {/* Right side - notifications */}
        <div className="flex items-center gap-4">
          <button className="flex items-center justify-center size-8 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
        </div>
      </div>
    </header>
  );
}
