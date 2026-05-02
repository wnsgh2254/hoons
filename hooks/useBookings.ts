'use client';

import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import type { BookingWithRelations } from '@/lib/types';
import { getWeekStart, getWeekEnd } from '@/lib/utils/appointment-utils';

interface UseBookingsOptions {
  designerFilter?: string;
  shopFilter?: string;
  searchInput?: string;
  availableDesignerIds?: number[];
  skipInitialFetchOnce?: boolean;
}

export function useBookings(selectedDate: string, options: UseBookingsOptions = {}) {
  const {
    designerFilter = '전체',
    shopFilter = '전체',
    searchInput = '',
    availableDesignerIds = [],
    skipInitialFetchOnce = false,
  } = options;
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Track whether the initial skip has been consumed. Using a ref (not state) so that
  // navigating back to the initial date after visiting another date still triggers a fetch.
  // The old useState+date-comparison approach had a bug: A→B→A would skip the refetch for A
  // because skipForDate===selectedDate was true again, leaving stale B data on screen.
  const skipInitialRef = useRef(skipInitialFetchOnce);

  // Fetch bookings for selected week
  const fetchBookings = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    try {
      setLoading(true);
      setError(null);
      const weekStart = getWeekStart(selectedDate);
      const weekEnd = getWeekEnd(selectedDate);
      const res = await fetch(
        `/api/appointment?start_date=${encodeURIComponent(weekStart)}&end_date=${encodeURIComponent(weekEnd)}&limit=1000`
      );
      const data = await res.json();
      if (mountedRef.current && seq === requestSeqRef.current) {
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load bookings');
        }
        setBookings(data.bookings || []);
        setFilteredBookings(data.bookings || []);
      }
    } catch (err: any) {
      if (mountedRef.current && seq === requestSeqRef.current) {
        setError(err.message || 'Failed to load bookings');
      }
    } finally {
      if (mountedRef.current && seq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    // Skip only the very first fetch (initial data already loaded by consolidated API).
    // Consuming the ref here ensures navigating back to the initial date still triggers a fetch.
    if (skipInitialRef.current) {
      skipInitialRef.current = false;
      return;
    }
    fetchBookings();
  }, [fetchBookings]);

  // Apply shop, designer filter and search
  useEffect(() => {
    let filtered = bookings;

    // Shop filter — match booking row venue (shop_id), not "designers assigned to this shop"
    if (shopFilter !== '전체') {
      const shopId = Number(shopFilter);
      filtered = filtered.filter(
        (b) => b.shop_id != null && !Number.isNaN(shopId) && Number(b.shop_id) === shopId,
      );
    }

    if (designerFilter === '전체') {
      // No filter
    } else if (designerFilter === '전체(휴무 제외)') {
      filtered = filtered.filter((b) => {
        const id = b.designer?.id;
        if (!id) return true;
        return availableDesignerIds.includes(id);
      });
    } else {
      filtered = filtered.filter((b) => {
        return b.designer?.name === designerFilter;
      });
    }

    setFilteredBookings(filtered);
  }, [designerFilter, shopFilter, bookings, searchInput, availableDesignerIds]);

  return {
    bookings,
    filteredBookings,
    loading,
    error,
    setBookings,
    setFilteredBookings,
    refreshBookings: fetchBookings,
  };
}
