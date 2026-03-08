'use client';

import { useMemo } from 'react';
import { useApiCache, invalidateCache } from './useApiCache';
import type { BookingItemEntry } from '@/lib/types';

interface UseBookingItemsOptions {
  enabled?: boolean;
  activeOnly?: boolean;
}

const API_URL = '/api/booking-items';

export function invalidateBookingItemsCache() {
  invalidateCache(API_URL);
}

export function useBookingItems(options: UseBookingItemsOptions = {}) {
  const { enabled = true, activeOnly = false } = options;

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (activeOnly) params.set('activeOnly', 'true');
    const qs = params.toString();
    return qs ? `${API_URL}?${qs}` : API_URL;
  }, [activeOnly]);

  const cacheKey = activeOnly ? 'active' : 'all';

  const { data: items, loading, error, refetch } = useApiCache<BookingItemEntry>(url, {
    enabled,
    cacheKey,
    extract: (json) => json.bookingItems || [],
    errorMessage: '예약항목을 불러오지 못했습니다.',
  });

  return { items, loading, error, refetch };
}
