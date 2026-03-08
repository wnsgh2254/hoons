'use client';

import { useState, useEffect, useRef } from 'react';
import type { BusinessHourEntry } from '@/lib/types';

interface UseBusinessHoursOptions {
  enabled?: boolean;
  shopId?: number | null;
}

let cachedHours: BusinessHourEntry[] | null = null;
let cacheTimestamp = 0;
let cacheShopId: number | null | undefined = undefined;
const CACHE_TTL = 30_000;

function isCacheValid(shopId?: number | null) {
  return (
    cachedHours !== null &&
    cacheShopId === shopId &&
    Date.now() - cacheTimestamp < CACHE_TTL
  );
}

export function invalidateBusinessHoursCache() {
  cachedHours = null;
  cacheTimestamp = 0;
  cacheShopId = undefined;
}

export function useBusinessHours(options: UseBusinessHoursOptions = {}) {
  const { enabled = true, shopId } = options;
  const [hours, setHours] = useState<BusinessHourEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchHours = (skipCache = false) => {
    if (!skipCache && isCacheValid(shopId) && cachedHours) {
      setHours(cachedHours);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (shopId) params.set('shopId', String(shopId));

    fetch(`/api/business-hours?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const list: BusinessHourEntry[] = data.businessHours || [];
        cachedHours = list;
        cacheTimestamp = Date.now();
        cacheShopId = shopId;
        if (mountedRef.current) setHours(list);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('useBusinessHours fetch error:', err);
        if (mountedRef.current) setError('영업시간을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled && mountedRef.current) setLoading(false);
      });

    return () => { cancelled = true; };
  };

  useEffect(() => {
    if (!enabled) return;
    return fetchHours();
  }, [enabled, shopId]);

  const refetch = () => {
    invalidateBusinessHoursCache();
    fetchHours(true);
  };

  return { hours, loading, error, refetch };
}
