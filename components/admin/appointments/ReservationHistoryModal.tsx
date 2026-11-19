'use client';

import { useAppointmentRequest } from '@/lib/appointment-request';
import React, { useEffect, useMemo, useState } from 'react';
import ReservationHistoryFilters from './ReservationHistoryFilters';
import ReservationHistoryTable from './ReservationHistoryTable';
import Modal from '@/components/ui/Modal';
import { Z } from '@/lib/constants';
import type { BookingWithRelations } from '@/lib/types';
import { matchesReservationStatusFilter } from '@/lib/reservation-history-status';
import { isCreatedAtInSydneyDateRange } from '@/lib/sydney-datetime-range';

interface ReservationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStartDate: string;
  defaultEndDate: string;
  onEditBooking?: (booking: any) => void;
  onCancelBooking?: (booking: any) => void;
  onViewBooking?: (booking: any) => void;
  onCustomerClick?: (customerId: number | null, phone?: string | null) => void;
  refreshTrigger?: number;
}

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
  const request = useAppointmentRequest();
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
  const [searchTrigger, setSearchTrigger] = useState(0);

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
    setSearchTrigger(0);
  }, [isOpen, defaultStartDate, defaultEndDate]);

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
          date_type: dateType,
          limit: '1000',
        });
        const res = await request(`/api/appointment?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || '예약 내역을 불러오지 못했습니다.');
        }
        setBookings(json.bookings || []);
      } catch (e: any) {
        console.error('Error loading reservation history', e);
        setError(e?.message ?? '예약 내역을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    void fetchHistory();
  }, [isOpen, startDate, endDate, dateType, refreshTrigger, searchTrigger]);

  const designers = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of bookings) {
      const id = b.designer?.id;
      const name = b.designer?.name;
      if (id && name) map.set(id, name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (!matchesReservationStatusFilter(b.status, statusFilter)) return false;

      if (dateType === 'booking') {
        const bookingDate = b.booking_date;
        if (dateMode === 'single') {
          if (bookingDate !== startDate) return false;
        } else {
          if (!bookingDate || bookingDate < startDate || bookingDate > endDate) return false;
        }
      } else if (b.created_at) {
        const rangeEnd = dateMode === 'single' ? startDate : endDate;
        if (!isCreatedAtInSydneyDateRange(b.created_at, startDate, rangeEnd)) return false;
      } else {
        return false;
      }

      if (designerFilter !== 'all') {
        if (!b.designer || b.designer.id !== designerFilter) return false;
      }

      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const name = (b.customer?.name || b.customer_name || '').toString().toLowerCase();
        const phone = (b.customer?.phone || b.customer_phone || '').toString().toLowerCase();
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

  const handleSearch = () => setSearchTrigger((value) => value + 1);

  const handleSelectAll = (selected: boolean) => {
    setSelectedIds(selected ? new Set(filteredBookings.map((b) => b.id)) : new Set());
  };

  const handleSelectOne = (id: number, selected: boolean) => {
    const newSet = new Set(selectedIds);
    if (selected) newSet.add(id);
    else newSet.delete(id);
    setSelectedIds(newSet);
  };

  const handleEdit = (booking: BookingWithRelations) => onEditBooking?.(booking);
  const handleView = (booking: BookingWithRelations) => onViewBooking?.(booking);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="예약내역"
      zIndex={Z.MODAL_BASE}
      maxWidth="max-w-7xl"
      className="max-h-[90vh] flex flex-col overflow-hidden"
      bodyClassName="flex-1 flex flex-col min-h-0 overflow-auto"
    >
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

      <div className="flex-1 min-h-0 flex flex-col mt-5.5">
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
    </Modal>
  );
}
