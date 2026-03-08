'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const CACHE_TTL = 30_000; // 30 seconds

interface CacheEntry<T> {
  data: T[];
  timestamp: number;
  key: string;
}

const cacheStore = new Map<string, CacheEntry<any>>();

function isCacheValid<T>(url: string, cacheKey: string): T[] | null {
  const entry = cacheStore.get(url);
  if (entry && entry.key === cacheKey && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T[];
  }
  return null;
}

function updateCache<T>(url: string, data: T[], cacheKey: string) {
  cacheStore.set(url, { data, timestamp: Date.now(), key: cacheKey });
}

export function invalidateCache(url: string) {
  cacheStore.delete(url);
}

interface UseApiCacheOptions<T> {
  /** Skip fetching until this becomes true. Default: true */
  enabled?: boolean;
  /** Cache key discriminator (e.g. for different filter states). Default: 'default' */
  cacheKey?: string;
  /** Extract array from response JSON. Default: returns first array value found */
  extract?: (json: any) => T[];
  /** Post-filter applied to cached/fetched data before returning */
  filter?: (data: T[]) => T[];
  /** Error message shown to user */
  errorMessage?: string;
}

export function useApiCache<T>(url: string, options: UseApiCacheOptions<T> = {}) {
  const {
    enabled = true,
    cacheKey = 'default',
    extract,
    filter,
    errorMessage = '데이터를 불러오지 못했습니다.',
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const extractData = useCallback((json: any): T[] => {
    if (extract) return extract(json);
    // Auto-detect: find first array property
    for (const value of Object.values(json)) {
      if (Array.isArray(value)) return value as T[];
    }
    return Array.isArray(json) ? json : [];
  }, [extract]);

  const applyFilter = useCallback((items: T[]): T[] => {
    return filter ? filter(items) : items;
  }, [filter]);

  const fetchData = useCallback((skipCache = false) => {
    if (!skipCache) {
      const cached = isCacheValid<T>(url, cacheKey);
      if (cached) {
        setData(applyFilter(cached));
        return;
      }
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const list = extractData(json);
        updateCache(url, list, cacheKey);
        if (mountedRef.current) {
          setData(applyFilter(list));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(`useApiCache(${url}) fetch error:`, err);
        if (mountedRef.current) {
          setError(errorMessage);
        }
      })
      .finally(() => {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [url, cacheKey, extractData, applyFilter, errorMessage]);

  useEffect(() => {
    if (!enabled) return;
    return fetchData();
  }, [enabled, fetchData]);

  const refetch = useCallback(() => {
    invalidateCache(url);
    fetchData(true);
  }, [url, fetchData]);

  return { data, loading, error, refetch };
}
