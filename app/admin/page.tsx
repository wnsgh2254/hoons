'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Comment: Redirect to appointments page by default
    router.replace('/admin/appointments');
  }, [router]);

  return null;
}
