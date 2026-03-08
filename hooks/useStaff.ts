'use client';

import { useMemo } from 'react';
import { useApiCache, invalidateCache } from './useApiCache';

interface StaffMember {
  id: number;
  name: string;
  english_name?: string | null;
  role?: string;
  is_active?: boolean;
  shop_id?: number | null;
  wage_type?: string;
  percent_rate?: number | null;
  hourly_rate?: number | null;
  instagramLink?: string | null;
  [key: string]: unknown;
}

interface UseStaffOptions {
  /** Only return active staff (is_active === true). Default: false */
  onlyActive?: boolean;
  /** Skip fetching until this becomes true. Default: true */
  enabled?: boolean;
}

const API_URL = '/api/staff';

export function invalidateStaffCache() {
  invalidateCache(API_URL);
}

export function useStaff(options: UseStaffOptions = {}) {
  const { onlyActive = false, enabled = true } = options;

  const filter = useMemo(() => {
    if (!onlyActive) return undefined;
    return (items: StaffMember[]) => items.filter((s) => s.is_active);
  }, [onlyActive]);

  const { data: staff, loading, error, refetch } = useApiCache<StaffMember>(API_URL, {
    enabled,
    extract: (json) => json.staff || json || [],
    filter,
    errorMessage: '스태프 목록을 불러오지 못했습니다.',
  });

  return { staff, loading, error, refetch };
}
