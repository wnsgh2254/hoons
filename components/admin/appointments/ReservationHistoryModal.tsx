'use client';

import React, { useEffect, useMemo, useState } from 'react';
import ReservationHistoryFilters from './ReservationHistoryFilters';
import ReservationHistoryTable from './ReservationHistoryTable';

interface ReservationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStartDate: string;
  defaultEndDate: string;
  onEditBooking?: (booking: any) => void;
  onCancelBooking?: (booking: any) => void;
  onViewBooking?: (booking: any) => void;
  onCustomerClick?: (customerId: number) => void;
  refreshTrigger?: number; // Trigger refresh when this value changes
}

type BookingWithRelations = {
  id: number;
  booking_date: string;
  booking_time: string;
  status?: string | null;
  memo?: string | null;
  total_amount?: number | null;
  deposit_amount?: number | null;
  customer?: { id: number; name: string | null; phone: string | null } | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  designer?: { id: number; name: string | null } | null;
  service?: { id: number; name: string | null; duration_minutes?: number | null } | null;
  shop?: { id: number; name: string | null } | null;
  created_at?: string | null;
};

export default function ReservationHistoryModal({
  isOpen,
  onClose,
  defaultStartDate,
  defaultEndDate,
  onEditBooking,
  onCancelBooking,
  onViewBooking,
  onCustomerClick,
  refreshTrigger,
}: ReservationHistoryModalProps) {
  const [dateType, setDateType] = useState<'booking' | 'created'>('booking');
  const [dateMode, setDateMode] = useState<'single' | 'range'>('range');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'BOOKED' | 'ARRIVED' | 'PAID' | 'NOSHOW' | 'CANCELLED'
  >('all');
  const [designerFilter, setDesignerFilter] = useState<'all' | number>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [shouldSearch, setShouldSearch] = useState(false);

  // Comment: Reset filters when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setDateType('booking');
    setDateMode('range');
    setStatusFilter('all');
    setDesignerFilter('all');
    setSearchKeyword('');
    setSelectedIds(new Set());
    setShouldSearch(false);
  }, [isOpen, defaultStartDate, defaultEndDate]);

  // Comment: Load reservations from /api/appointment within date range
  useEffect(() => {
    if (!isOpen) return;
    if (!startDate || !endDate) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
          limit: '200',
        });
        const res = await fetch(`/api/appointment?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || '예약 내역을 불러오지 못했습니다.');
        }
        setBookings(json.bookings || []);
        setShouldSearch(false);
      } catch (e: any) {
        console.error('Error loading reservation history', e);
        setError(e?.message ?? '예약 내역을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    void fetchHistory();
  }, [isOpen, startDate, endDate, refreshTrigger]);

  // Comment: Trigger search when shouldSearch is true
  useEffect(() => {
    if (shouldSearch) {
      // Filtering is done client-side, so we just need to trigger a re-render
      setShouldSearch(false);
    }
  }, [shouldSearch]);

  const designers = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of bookings) {
      const id = b.designer?.id;
      const name = b.designer?.name;
      if (id && name) {
        map.set(id, name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const status = (b.status || '').toUpperCase();
      
      // Status filter (including cancelled when 'all' is selected)
      if (statusFilter !== 'all') {
        if (status !== statusFilter) return false;
      } else {
        // When 'all' is selected, show all including cancelled
        // No filtering needed
      }

      // Date type filter (booking_date or created_at)
      if (dateType === 'booking') {
        // Filter by booking_date
        const bookingDate = b.booking_date;
        if (dateMode === 'single') {
          if (bookingDate !== startDate) return false;
        } else {
          if (!bookingDate || bookingDate < startDate || bookingDate > endDate) return false;
        }
      } else {
        // Filter by created_at
        if (!b.created_at) return false;
        const createdDate = b.created_at.split(' ')[0]; // Extract date part
        if (dateMode === 'single') {
          if (createdDate !== startDate) return false;
        } else {
          if (createdDate < startDate || createdDate > endDate) return false;
        }
      }

      // Designer filter
      if (designerFilter !== 'all') {
        if (!b.designer || b.designer.id !== designerFilter) return false;
      }

      // Search keyword filter
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const name =
          (b.customer?.name || b.customer_name || '').toString().toLowerCase();
        const phone =
          (b.customer?.phone || b.customer_phone || '').toString().toLowerCase();
        if (
          !name.includes(kw) &&
          !phone.replace(/[^0-9]/g, '').includes(kw.replace(/[^0-9]/g, ''))
        ) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, statusFilter, designerFilter, searchKeyword, dateType, dateMode, startDate, endDate]);

  const handleSearch = () => {
    setShouldSearch(true);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(filteredBookings.map((b) => b.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: number, selected: boolean) => {
    const newSet = new Set(selectedIds);
    if (selected) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleEdit = (booking: BookingWithRelations) => {
    if (onEditBooking) {
      onEditBooking(booking);
    }
  };

  const handleView = (booking: BookingWithRelations) => {
    if (onViewBooking) {
      onViewBooking(booking);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">예약내역</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Filters */}
        <ReservationHistoryFilters
          dateType={dateType}
          setDateType={setDateType}
          dateMode={dateMode}
          setDateMode={setDateMode}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          designerFilter={designerFilter}
          setDesignerFilter={setDesignerFilter}
          searchKeyword={searchKeyword}
          setSearchKeyword={setSearchKeyword}
          onSearch={handleSearch}
          designers={designers}
        />

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-500">
              예약 내역을 불러오는 중입니다...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-40 text-sm text-red-500">
              {error}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-500">
              선택한 기간과 조건에 해당하는 예약이 없습니다.
            </div>
          ) : (
            <ReservationHistoryTable
              bookings={filteredBookings}
              selectedIds={selectedIds}
              onSelectAll={handleSelectAll}
              onSelectOne={handleSelectOne}
              onEdit={handleEdit}
              onCancel={onCancelBooking}
              onView={handleView}
              onCustomerClick={onCustomerClick}
            />
          )}
        </div>
      </div>
    </div>
  );
}
