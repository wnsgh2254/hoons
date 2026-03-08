'use client';

import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import type { BookingWithRelations } from '@/lib/types';
import { getWeekStart, getWeekEnd } from '@/lib/utils/appointment-utils';

interface UseBookingsOptions {
  designerFilter?: string;
  shopFilter?: string;
  shopFilteredDesignerIds?: number[];
  searchInput?: string;
  availableDesignerIds?: number[];
}

export function useBookings(selectedDate: string, options: UseBookingsOptions = {}) {
  const { designerFilter = '전체', shopFilter = '전체', shopFilteredDesignerIds = [], searchInput = '', availableDesignerIds = [] } = options;
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch bookings for selected week
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const weekStart = getWeekStart(selectedDate);
      const weekEnd = getWeekEnd(selectedDate);
      const res = await fetch(
        `/api/appointment?start_date=${encodeURIComponent(weekStart)}&end_date=${encodeURIComponent(weekEnd)}`
      );
      const data = await res.json();
      if (mountedRef.current) {
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load bookings');
        }
        setBookings(data.bookings || []);
        setFilteredBookings(data.bookings || []);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || 'Failed to load bookings');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Apply shop, designer filter and search
  useEffect(() => {
    let filtered = bookings;

    // Shop filter
    if (shopFilter !== '전체' && shopFilteredDesignerIds.length > 0) {
      filtered = filtered.filter((b) => {
        const designerId = b.designer?.id;
        return designerId ? shopFilteredDesignerIds.includes(designerId) : false;
      });
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

    if (!searchInput.trim()) {
      setFilteredBookings(filtered);
    }
  }, [designerFilter, shopFilter, shopFilteredDesignerIds, bookings, searchInput, availableDesignerIds]);

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
