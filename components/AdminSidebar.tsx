'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

type AdminSidebarProps = {
  isSidebarOpen?: boolean;
};

export default function AdminSidebar({ isSidebarOpen = false }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <aside 
      id="admin-sidebar"
      className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 flex flex-col justify-between overflow-y-auto transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col gap-8 p-6">
        <Link href="/" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
          <Image
            src="/images/image3.png"
            alt="HAEYOOM Logo"
            width={130}
            height={28}
            className="h-7 w-auto object-contain"
          />
        </Link>
        <nav className="flex flex-col gap-2">
          <Link
            href="/admin/appointments"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive('/admin/appointments')
                ? 'bg-black text-white shadow-lg shadow-black/20'
                : 'text-gray-500 hover:bg-gray-50 hover:text-black'
            }`}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span className="text-sm font-medium">Appointments</span>
          </Link>
          <Link
            href="/admin/sales"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive('/admin/sales')
                ? 'bg-black text-white shadow-lg shadow-black/20'
                : 'text-gray-500 hover:bg-gray-50 hover:text-black'
            }`}
          >
            <span className="material-symbols-outlined">monitoring</span>
            <span className="text-sm font-medium">Sales Overview</span>
          </Link>
          <Link
            href="/admin/appointments"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive('/admin/appointments')
                ? 'bg-black text-white shadow-lg shadow-black/20'
                : 'text-gray-500 hover:bg-gray-50 hover:text-black'
            }`}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span className="text-sm font-medium">Appointments</span>
          </Link>
          <Link
            href="/admin/service-history"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive('/admin/service-history')
                ? 'bg-black text-white shadow-lg shadow-black/20'
                : 'text-gray-500 hover:bg-gray-50 hover:text-black'
            }`}
          >
            <span className="material-symbols-outlined">history</span>
            <span className="text-sm font-medium">Service History</span>
          </Link>
          <Link
            href="/admin/staff"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive('/admin/staff')
                ? 'bg-black text-white shadow-lg shadow-black/20'
                : 'text-gray-500 hover:bg-gray-50 hover:text-black'
            }`}
          >
            <span className="material-symbols-outlined">groups</span>
            <span className="text-sm font-medium">Staff</span>
          </Link>
          <Link
            href="/admin/inventory"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive('/admin/inventory')
                ? 'bg-black text-white shadow-lg shadow-black/20'
                : 'text-gray-500 hover:bg-gray-50 hover:text-black'
            }`}
          >
            <span className="material-symbols-outlined">inventory_2</span>
            <span className="text-sm font-medium">Inventory</span>
          </Link>
          <Link
            href="/admin/prepaid"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive('/admin/prepaid')
                ? 'bg-black text-white shadow-lg shadow-black/20'
                : 'text-gray-500 hover:bg-gray-50 hover:text-black'
            }`}
          >
            <span className="material-symbols-outlined">card_membership</span>
            <span className="text-sm font-medium">Prepaid Pass</span>
          </Link>
          <Link
            href="/admin/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive('/admin/settings')
                ? 'bg-black text-white shadow-lg shadow-black/20'
                : 'text-gray-500 hover:bg-gray-50 hover:text-black'
            }`}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-medium">Settings</span>
          </Link>
          <Link
            href="/admin/test-env"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive('/admin/test-env')
                ? 'bg-black text-white shadow-lg shadow-black/20'
                : 'text-gray-500 hover:bg-gray-50 hover:text-black'
            }`}
          >
            <span className="material-symbols-outlined">visibility</span>
            <span className="text-sm font-medium">Design 2</span>
          </Link>
        </nav>
      </div>
      <div className="p-6 border-t border-gray-100">
          <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-full bg-cover bg-center grayscale"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAjhD0WmE9CSsv_JWqCz325cTf4HM2m39YT5VSu09Lc2YQqci2GEmubVTLNi3mhaSzXeI1aOETFfv9VpKUOwV_LoiTkw5FBCVBNCznsSmppHNQiAWcQrAE7cw73i0kzJkDOrZHBn-rVhTR-sBvQ9yPTejyv271gCTallJe0gM8N5_cOiuGK0ZhmDcFdRyL97zFu_5tj-DgObrIlkZqquHTlK8OeBJB297gGVKfjJWl_e8t3cnmO4nqHfGDOJjhwTSHFyyB9M083o3dh')",
            }}
          />
          <div className="flex flex-col">
            <p className="text-sm font-medium text-black">Sarah Kim</p>
            <p className="text-xs text-gray-500">Senior Designer</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

