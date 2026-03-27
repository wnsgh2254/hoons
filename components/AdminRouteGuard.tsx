'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { hasAccess } from '@/lib/auth';
import type { UserRole } from '@/lib/auth';

// Comment: Client-side guard that checks auth session and redirects if no access
export default function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Comment: Skip guard on login page
    if (pathname.startsWith('/admin/login')) {
      setChecked(true);
      return;
    }

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();

        if (!data.authenticated) {
          router.replace('/admin/login');
          return;
        }

        const role = data.user.role as UserRole;
        if (!hasAccess(role, pathname)) {
          // Comment: Redirect designer to appointments (most restricted safe default)
          router.replace('/admin/appointments');
          return;
        }

        setChecked(true);
      } catch {
        router.replace('/admin/login');
      }
    };

    checkAuth();
  }, [pathname, router]);

  // Comment: Render nothing until auth is confirmed to prevent flash of restricted content
  if (!checked && !pathname.startsWith('/admin/login')) {
    return null;
  }

  return <>{children}</>;
}
