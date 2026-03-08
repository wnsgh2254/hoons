'use client';

import Link from 'next/link';
import { AdminPageLayout, PageHeader } from '@/components/ui';

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
    <AdminPageLayout maxWidth="max-w-5xl">
      <PageHeader title="설정" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsCategories.map((category) => (
          <Link
            key={category.id}
            href={category.href}
            className="group bg-white p-5.5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col gap-4"
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

      <div className="mt-7.5 pt-7.5 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
        <p>&copy; 2024 Haeyoom Salon. All rights reserved.</p>
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
    </AdminPageLayout>
  );
}
