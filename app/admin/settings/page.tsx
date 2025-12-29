'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';

export default function SettingsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
              <span className="font-medium text-gray-900">Settings</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center justify-center size-8 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">
              <span className="material-symbols-outlined text-xl">notifications</span>
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


