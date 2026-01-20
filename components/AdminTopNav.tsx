'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

type SubmenuItem = {
  href: string;
  icon: string;
  label: string;
};

type NavItem = {
  href: string;
  icon: string;
  label: string;
  submenu?: {
    title: string;
    items: SubmenuItem[];
  }[];
};

const navItems: NavItem[] = [
  { href: '/admin/appointments', icon: 'calendar_month', label: 'Appointments' },
  { href: '/admin/staff', icon: 'groups', label: 'Staff' },
  {
    href: '/admin/inventory?view=overview',
    icon: 'inventory_2',
    label: 'Inventory',
    submenu: [
      {
        title: '재고 관리',
        items: [
          { href: '/admin/inventory?view=usage', icon: 'monitoring', label: '내부 소모 내역' },
          { href: '/admin/inventory?view=adjustments', icon: 'tune', label: '재고 조정 내역' },
          { href: '/admin/inventory?view=history', icon: 'history', label: '재고 변동 이력' },
          { href: '/admin/inventory?view=overview', icon: 'inventory', label: '재고 현황' },
        ],
      },
      {
        title: '매입 관리',
        items: [
          { href: '/admin/inventory?view=purchases', icon: 'receipt_long', label: '매입' },
          { href: '/admin/inventory?view=vendors', icon: 'storefront', label: '매입처 관리' },
        ],
      },
    ],
  },
  { href: '/admin/services', icon: 'content_cut', label: 'Services' },
  { href: '/admin/prepaid', icon: 'card_membership', label: 'Prepaid Pass' },
  { href: '/admin/sales', icon: 'monitoring', label: 'Sales Overview' },
  { href: '/admin/wages', icon: 'payments', label: 'Wages' },
];

export default function AdminTopNav() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="h-16 flex items-center px-6 md:px-12 py-5 bg-white border-b border-gray-200 z-10 sticky top-0">
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

        {/* Navigation Items - Centered */}
        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          {navItems.map((item) => {
            const active = isActive(item.href.split('?')[0]);

            if (item.submenu) {
              return (
                <div key={item.href} className="group relative">
                  <Link
                    href={item.href}
                    className={`relative flex items-center justify-center w-12 h-12 rounded-lg transition-colors ${
                      active
                        ? 'bg-black text-white'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-black'
                    }`}
                    title={item.label}
                  >
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  </Link>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0 w-[360px] rounded-2xl bg-white text-gray-900 shadow-2xl border border-gray-200 opacity-0 translate-y-1 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto z-50">
                    <div className="p-4 grid grid-cols-2 gap-4">
                      {item.submenu.map((section) => (
                        <div key={section.title} className="flex flex-col gap-3">
                          <p className="text-sm font-semibold text-gray-900">{section.title}</p>
                          <div className="flex flex-col gap-2">
                            {section.items.map((subItem) => (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-50"
                              >
                                <span className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-700">
                                  <span className="material-symbols-outlined text-lg">
                                    {subItem.icon}
                                  </span>
                                </span>
                                <span className="text-sm font-medium text-gray-800">
                                  {subItem.label}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center justify-center w-12 h-12 rounded-lg transition-colors ${
                  active
                    ? 'bg-black text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-black'
                }`}
                title={item.label}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black text-white text-xs font-medium rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                  {item.label}
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45"></span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Right side - empty for balance */}
        <div className="w-[130px]"></div>
      </div>
    </header>
  );
}
