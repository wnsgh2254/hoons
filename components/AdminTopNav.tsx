'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { hasAccess } from '@/lib/auth';
import type { UserRole } from '@/lib/auth';

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
  { href: '/admin/sales', icon: 'monitoring', label: 'Sales Overview' },
  { href: '/admin/customers', icon: 'people', label: 'Customers' },
  { href: '/admin/prepaid', icon: 'card_membership', label: 'Prepaid Pass' },
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
  { href: '/admin/staff', icon: 'groups', label: 'Staff' },
  { href: '/admin/wages', icon: 'payments', label: 'Wages' },
  {
    href: '/admin/settings/reservation',
    icon: 'settings',
    label: 'Settings',
    submenu: [
      {
        title: '설정',
        items: [
          { href: '/admin/settings/services', icon: 'content_cut', label: '서비스 및 제품' },
          { href: '/admin/settings/reservation', icon: 'calendar_clock', label: '예약 설정' },
        ],
      },
    ],
  },
];

export default function AdminTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Comment: Fetch user session to determine role
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUserRole(data.user.role);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const isActive = (path: string) => {
    const basePath = path.split('?')[0];
    return pathname === basePath || pathname.startsWith(basePath + '/');
  };

  // Comment: Filter nav items based on user role
  const filteredNavItems = navItems.filter((item) => {
    if (!userRole) return false;
    const basePath = item.href.split('?')[0];
    return hasAccess(userRole, basePath);
  });

  // Comment: Keep admin top nav above other overlays so inventory menu is always visible on hover
  return (
    <header className="h-16 flex items-center px-5.5 md:px-11.5 py-4.5 bg-white border-b border-gray-200 z-[12000] sticky top-0">
      <div className="container mx-auto flex items-center justify-between w-full">
        {/* Logo */}
        <Link href="/admin/appointments" className="flex items-center hover:opacity-70 transition-opacity">
          <Image
            src="/images/image3.png"
            alt="HAEYOOM Logo"
            width={105}
            height={22}
            className="h-5.5 w-auto object-contain"
          />
        </Link>

        {/* Hamburger - tablet/mobile only */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="flex items-center justify-center w-12 h-12 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

        {/* Navigation Items - Centered, desktop only */}
        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-2">
          {filteredNavItems.map((item) => {
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
                  <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-0 rounded-2xl bg-white text-gray-900 shadow-2xl border border-gray-200 opacity-0 translate-y-1 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto z-[9999] ${item.submenu.length > 1 ? 'w-[360px]' : 'w-auto min-w-[200px]'}`}>
                    <div className={`p-4 grid gap-4 ${item.submenu.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
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

        {/* Right side - Logout button, desktop only when nav visible */}
        <div className="hidden md:flex w-[130px] justify-end">
          {!loading && userRole && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              title="Logout"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              <span className="hidden md:inline">Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile/tablet menu overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[11998] md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed top-16 left-0 right-0 bottom-0 z-[11999] md:hidden overflow-y-auto bg-white border-t border-gray-200">
            <nav className="p-4 flex flex-col gap-1">
              {filteredNavItems.map((item) => {
                const active = isActive(item.href.split('?')[0]);
                if (item.submenu) {
                  return (
                    <div key={item.href} className="flex flex-col gap-1">
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                          active ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                      </Link>
                      {item.submenu.map((section) => (
                        <div key={section.title} className="pl-4 flex flex-col gap-1">
                          <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {section.title}
                          </p>
                          {section.items.map((subItem) => (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg text-gray-500">
                                {subItem.icon}
                              </span>
                              <span className="text-sm">{subItem.label}</span>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      active ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
              {!loading && userRole && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors w-full text-left"
                >
                  <span className="material-symbols-outlined text-xl">logout</span>
                  <span className="font-medium">Logout</span>
                </button>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
