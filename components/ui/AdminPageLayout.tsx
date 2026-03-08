'use client';

import AdminTopNav from '@/components/AdminTopNav';
import { cn } from '@/lib/utils';

interface AdminPageLayoutProps {
  children: React.ReactNode;
  /** Override max-width class. Default: 'max-w-7xl' */
  maxWidth?: string;
}

export default function AdminPageLayout({
  children,
  maxWidth = 'max-w-7xl',
}: AdminPageLayoutProps) {
  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex flex-col">
      <AdminTopNav />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <div className="flex-1 overflow-y-auto p-5.5 md:p-9.5 scroll-smooth bg-gray-50/50">
          <div className={cn(maxWidth, 'mx-auto flex flex-col gap-8')}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
