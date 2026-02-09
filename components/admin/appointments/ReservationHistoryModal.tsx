'use client';

import React, { useEffect, useMemo, useState } from 'react';

interface ReservationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStartDate: string;
  defaultEndDate: string;
}

type BookingWithRelations = {
  id: number;
  booking_date: string;
  booking_time: string;
  status?: string | null;
  memo?: string | null;
  customer?: { id: number; name: string | null; phone: string | null } | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  designer?: { id: number; name: string | null } | null;
  shop?: { id: number; name: string | null } | null;
  created_at?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  BOOKED: '예약',
  ARRIVED: '고객입장',
  PAID: '계산완료',
  NOSHOW: '노쇼',
  CANCELLED: '취소',
  PENDING: '대기',
};

function formatDate(date: string) {
  if (!date) return '';
  return date.replace(/-/g, '.');
}

function formatDateTime(dateTime?: string | null) {
  if (!dateTime) return '';
  try {
    const d = new Date(dateTime);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes(),
    ).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

export default function ReservationHistoryModal({
  isOpen,
  onClose,
  defaultStartDate,
  defaultEndDate,
}: ReservationHistoryModalProps) {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [statusFilter, setStatusFilter] = useState<'all' | 'BOOKED' | 'ARRIVED' | 'PAID' | 'NOSHOW'>(
    'all',
  );
  const [designerFilter, setDesignerFilter] = useState<'all' | number>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comment: Reset filters when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setStatusFilter('all');
    setDesignerFilter('all');
    setSearchKeyword('');
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
      } catch (e: any) {
        console.error('Error loading reservation history', e);
        setError(e?.message ?? '예약 내역을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    void fetchHistory();
  }, [isOpen, startDate, endDate]);

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
      if (statusFilter !== 'all' && status !== statusFilter) return false;

      if (designerFilter !== 'all') {
        if (!b.designer || b.designer.id !== designerFilter) return false;
      }

      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const name =
          (b.customer?.name || b.customer_name || '').toString().toLowerCase();
        const phone =
          (b.customer?.phone || b.customer_phone || '').toString().toLowerCase();
        if (!name.includes(kw) && !phone.replace(/[^0-9]/g, '').includes(kw.replace(/[^0-9]/g, ''))) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, statusFilter, designerFilter, searchKeyword]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">예약 내역</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Period filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium whitespace-nowrap">
                기간별
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              />
              <span className="text-xs text-gray-500">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              />
            </div>

            {/* Status filter */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">상태</span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as typeof statusFilter)
                }
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm min-w-[120px]"
              >
                <option value="all">전체</option>
                <option value="BOOKED">예약</option>
                <option value="ARRIVED">고객입장</option>
                <option value="PAID">계산완료</option>
                <option value="NOSHOW">노쇼</option>
              </select>
            </div>

            {/* Designer filter */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">자원</span>
              <select
                value={designerFilter === 'all' ? 'all' : String(designerFilter)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'all') setDesignerFilter('all');
                  else setDesignerFilter(Number(v));
                }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm min-w-[140px]"
              >
                <option value="all">전체</option>
                {designers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search by name / phone */}
            <div className="flex flex-1 min-w-[200px] flex-col gap-1">
              <span className="text-xs text-gray-500">검색 (고객명 / 휴대폰)</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="고객명 또는 휴대폰 번호"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

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
            <div className="px-6 py-4">
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 w-10">
                        선택
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        등록일
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        예약일
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        예약시간
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        고객명
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        휴대폰
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        자원
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        상태
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        메모
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => {
                      const status = (b.status || '').toUpperCase();
                      const statusLabel = STATUS_LABELS[status] || status || '-';
                      const customerName =
                        b.customer?.name || b.customer_name || '';
                      const customerPhone =
                        b.customer?.phone || b.customer_phone || '';

                      const statusClass =
                        status === 'NOSHOW'
                          ? 'text-red-500'
                          : status === 'PAID'
                          ? 'text-blue-600'
                          : status === 'BOOKED'
                          ? 'text-orange-500'
                          : status === 'ARRIVED'
                          ? 'text-purple-600'
                          : 'text-gray-700';

                      return (
                        <tr
                          key={b.id}
                          className="border-b border-gray-100 hover:bg-gray-50/60"
                        >
                          <td className="px-3 py-2 align-middle">
                            <input type="checkbox" className="w-3 h-3" />
                          </td>
                          <td className="px-3 py-2 align-middle text-gray-700">
                            {formatDateTime(b.created_at)}
                          </td>
                          <td className="px-3 py-2 align-middle text-gray-700">
                            {formatDate(b.booking_date)}
                          </td>
                          <td className="px-3 py-2 align-middle text-gray-700">
                            {b.booking_time}
                          </td>
                          <td className="px-3 py-2 align-middle text-gray-900 font-medium">
                            {customerName || '-'}
                          </td>
                          <td className="px-3 py-2 align-middle text-gray-700">
                            {customerPhone || '-'}
                          </td>
                          <td className="px-3 py-2 align-middle text-gray-700">
                            {b.designer?.name || '-'}
                          </td>
                          <td className={`px-3 py-2 align-middle font-medium ${statusClass}`}>
                            {statusLabel}
                          </td>
                          <td className="px-3 py-2 align-middle text-gray-700 max-w-xs truncate">
                            {b.memo || ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

