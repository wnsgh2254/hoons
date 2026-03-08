'use client';

import { useMemo } from 'react';
import { useApiCache, invalidateCache } from './useApiCache';

interface ServiceItem {
  id: number;
  name: string;
  price?: number;
  duration_minutes?: number;
  category?: string | null;
  is_active?: boolean;
  visible_to?: string;
  [key: string]: unknown;
}

interface UseServicesOptions {
  /** Skip fetching until this becomes true. Default: true */
  enabled?: boolean;
  /** Exclude services whose name matches this pattern (e.g. /\(cash\)/i) */
  excludePattern?: RegExp;
}

const API_URL = '/api/services';

export function invalidateServicesCache() {
  invalidateCache(API_URL);
}

export function useServices(options: UseServicesOptions = {}) {
  const { enabled = true, excludePattern } = options;

  const filter = useMemo(() => {
    if (!excludePattern) return undefined;
    return (items: ServiceItem[]) => items.filter((s) => !excludePattern.test(s.name));
  }, [excludePattern]);

  const { data: services, loading, error, refetch } = useApiCache<ServiceItem>(API_URL, {
    enabled,
    extract: (json) => json.services || json || [],
    filter,
    errorMessage: '서비스 목록을 불러오지 못했습니다.',
  });

  return { services, loading, error, refetch };
}
