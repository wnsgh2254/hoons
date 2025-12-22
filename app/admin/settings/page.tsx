'use client';

import Link from 'next/link';

export default function SettingsPage() {
  const settingsCategories = [
    {
      id: 1,
      title: 'Shop Profile & Hours',
      description: 'Update salon address, contact info, and weekly operating hours.',
      icon: 'storefront',
      href: '#',
    },
    {
      id: 2,
      title: 'Services & Pricing',
      description: 'Manage service categories, durations, and prices (AUD).',
      icon: 'spa',
      href: '#',
    },
    {
      id: 3,
      title: 'Staff & Schedule',
      description: 'Manage team members, roles, permissions, and roster schedules.',
      icon: 'badge',
      href: '#',
    },
    {
      id: 4,
      title: 'Reservation Settings',
      description: 'Configure time slots, buffer times, and online booking availability.',
      icon: 'calendar_clock',
      href: '#',
    },
    {
      id: 5,
      title: 'Payments & Taxes',
      description: 'Setup payment gateways, deposits, and GST rates for AUD transactions.',
      icon: 'payments',
      href: '#',
    },
    {
      id: 6,
      title: 'Notifications',
      description: 'Customize SMS reminders, email confirmations, and marketing templates.',
      icon: 'notifications_active',
      href: '#',
    },
    {
      id: 7,
      title: 'Customer & Loyalty',
      description: 'Configure client tags, membership levels, and loyalty point systems.',
      icon: 'loyalty',
      href: '#',
    },
    {
      id: 8,
      title: 'Security & Access',
      description: 'Update admin passwords, 2FA settings, and IP access restrictions.',
      icon: 'lock',
      href: '#',
    },
    {
      id: 9,
      title: 'Integrations',
      description: 'Connect with Accounting Software, Social Media, and Google Calendar.',
      icon: 'extension',
      href: '#',
    },
  ];

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex">
      <aside className="w-64 shrink-0 flex flex-col justify-between bg-white border-r border-gray-200 h-full overflow-y-auto hidden md:flex">
        <div className="flex flex-col gap-8 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-black flex items-center justify-center rounded-full size-10 text-white">
              <span className="material-symbols-outlined">content_cut</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-wider text-black">HAEYOOM</h1>
              <p className="text-xs text-gray-500 font-medium tracking-widest">SEOUL • SYDNEY</p>
            </div>
          </div>
          <nav className="flex flex-col gap-2">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
            <Link
              href="/admin/sales"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">monitoring</span>
              <span className="text-sm font-medium">Sales Overview</span>
            </Link>
            <Link
              href="/admin/appointments"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">calendar_month</span>
              <span className="text-sm font-medium">Appointments</span>
            </Link>
            <Link
              href="/admin/staff"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">groups</span>
              <span className="text-sm font-medium">Staff</span>
            </Link>
            <Link
              href="/admin/inventory"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">inventory_2</span>
              <span className="text-sm font-medium">Inventory</span>
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black text-white shadow-lg shadow-black/20"
            >
              <span className="material-symbols-outlined">settings</span>
              <span className="text-sm font-medium">Settings</span>
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
              <p className="text-xs text-gray-500">Manager</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <header className="h-16 flex items-center justify-between px-6 md:px-10 py-4 bg-[#1a1a1a] text-white z-10 shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Dashboard</span>
            <span className="text-gray-500">/</span>
            <span className="font-medium text-white">Settings</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center justify-center size-8 rounded-full hover:bg-white/10 text-gray-300 transition-colors">
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
            <button className="flex items-center justify-center size-8 rounded-full hover:bg-white/10 text-gray-300 md:hidden transition-colors">
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-gray-50">
          <div className="max-w-5xl mx-auto flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-black">Settings</h2>
                <p className="text-gray-500 text-sm">Manage your salon configuration, services, and team preferences.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {settingsCategories.map((category) => (
                <Link
                  key={category.id}
                  href={category.href}
                  className="group bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col gap-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="size-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-black group-hover:text-white">
                      <span className="material-symbols-outlined text-2xl">{category.icon}</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 group-hover:text-black transition-colors">arrow_outward</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-black mb-1">{category.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{category.description}</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
              <p>© 2024 Haeyoom Salon. All rights reserved.</p>
              <div className="flex gap-4 mt-4 md:mt-0">
                <a className="hover:text-black transition-colors" href="#">
                  Support Center
                </a>
                <a className="hover:text-black transition-colors" href="#">
                  Privacy Policy
                </a>
                <a className="hover:text-black transition-colors" href="#">
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


