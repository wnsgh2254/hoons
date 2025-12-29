'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function AdminDashboardPage() {
  const [timeRange, setTimeRange] = useState('Today');

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
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black text-white shadow-lg shadow-black/20"
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
              href="/admin/service-history"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">history</span>
              <span className="text-sm font-medium">Service History</span>
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
              href="/admin/prepaid"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">card_membership</span>
              <span className="text-sm font-medium">Prepaid Pass</span>
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
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
            <span className="font-medium text-white">Dashboard</span>
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
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-white">
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-black">Admin Dashboard</h2>
                <p className="text-gray-500 text-sm">Welcome back! Here&apos;s an overview of your salon.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-gray-100 rounded-lg p-1 flex border border-gray-200">
                  {['Today', 'Week', 'Month', 'Year'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        timeRange === range
                          ? 'bg-black text-white shadow-sm'
                          : 'text-gray-500 font-medium hover:text-black hover:bg-gray-200'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/admin/sales"
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-gray-50 p-2 rounded-lg text-gray-400 group-hover:text-black transition-colors">
                    <span className="material-symbols-outlined">monitoring</span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm font-medium mb-1">Sales Overview</p>
                <h3 className="text-2xl font-bold text-black">View Reports</h3>
              </Link>
              <Link
                href="/admin/appointments"
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-gray-50 p-2 rounded-lg text-gray-400 group-hover:text-black transition-colors">
                    <span className="material-symbols-outlined">calendar_month</span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm font-medium mb-1">Appointments</p>
                <h3 className="text-2xl font-bold text-black">Manage</h3>
              </Link>
              <Link
                href="/admin/staff"
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-gray-50 p-2 rounded-lg text-gray-400 group-hover:text-black transition-colors">
                    <span className="material-symbols-outlined">groups</span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm font-medium mb-1">Staff Management</p>
                <h3 className="text-2xl font-bold text-black">Designers</h3>
              </Link>
              <Link
                href="/admin/inventory"
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-gray-50 p-2 rounded-lg text-gray-400 group-hover:text-black transition-colors">
                    <span className="material-symbols-outlined">inventory_2</span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm font-medium mb-1">Inventory</p>
                <h3 className="text-2xl font-bold text-black">Products</h3>
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-black mb-4">Quick Actions</h3>
                <div className="flex flex-col gap-3">
                  <Link
                    href="/admin/staff/designers"
                    className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-gray-600">person_add</span>
                    <span className="text-sm font-medium text-black">Add New Designer</span>
                  </Link>
                  <Link
                    href="/admin/appointments"
                    className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-gray-600">event</span>
                    <span className="text-sm font-medium text-black">View Today&apos;s Appointments</span>
                  </Link>
                  <Link
                    href="/admin/inventory"
                    className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-gray-600">add_shopping_cart</span>
                    <span className="text-sm font-medium text-black">Add Inventory Item</span>
                  </Link>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-black mb-4">Recent Activity</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                    <div className="bg-gray-100 rounded-full p-2">
                      <span className="material-symbols-outlined text-sm text-gray-600">receipt</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black">New booking received</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                    <div className="bg-gray-100 rounded-full p-2">
                      <span className="material-symbols-outlined text-sm text-gray-600">person</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black">Designer schedule updated</p>
                      <p className="text-xs text-gray-500">5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-gray-100 rounded-full p-2">
                      <span className="material-symbols-outlined text-sm text-gray-600">inventory</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black">Inventory restocked</p>
                      <p className="text-xs text-gray-500">Yesterday</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

