'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminDashboardPage() {
  const [timeRange, setTimeRange] = useState('Today');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Comment: Close sidebar when clicking outside
  useEffect(() => {
    if (!isSidebarOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const sidebar = document.getElementById('admin-sidebar');
      const menuButton = target.closest('button[aria-label="Toggle sidebar"]');
      
      // Comment: Don't close if clicking inside sidebar or menu button
      if (sidebar && sidebar.contains(target)) {
        return;
      }
      if (menuButton) {
        return;
      }
      
      setIsSidebarOpen(false);
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen]);

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex">
      <AdminSidebar isSidebarOpen={isSidebarOpen} />

      {/* Main content */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden relative bg-white transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'ml-64' : ''
      }`}>
        <header className="h-16 flex items-center justify-between px-6 md:px-10 py-4 bg-gray-100 text-gray-900 z-10">
          <div className="flex items-center gap-4 flex-1">
            {/* Navigation Menu Button */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            {/* Home Button */}
            <Link
              href="/admin/dashboard"
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">home</span>
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-900">Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center justify-center size-8 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">
              <span className="material-symbols-outlined text-xl">notifications</span>
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

