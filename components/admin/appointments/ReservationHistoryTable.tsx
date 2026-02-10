'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

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

interface ReservationHistoryTableProps {
  bookings: BookingWithRelations[];
  selectedIds: Set<number>;
  onSelectAll: (selected: boolean) => void;
  onSelectOne: (id: number, selected: boolean) => void;
  onEdit?: (booking: BookingWithRelations) => void;
  onCancel?: (booking: BookingWithRelations) => void;
  onView?: (booking: BookingWithRelations) => void;
  onCustomerClick?: (customerId: number) => void;
}

const STATUS_LABELS: Record<string, string> = {
  BOOKED: '예약완료',
  ARRIVED: '고객입장',
  PAID: '계산완료',
  NOSHOW: '노쇼',
  CANCELLED: '예약취소됨',
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

function formatCurrency(amount: number | null | undefined) {
  if (!amount || amount === 0) return '-';
  return `₩${Number(amount).toLocaleString('ko-KR')}`;
}

export default function ReservationHistoryTable({
  bookings,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onEdit,
  onCancel,
  onView,
  onCustomerClick,
}: ReservationHistoryTableProps) {
  const allSelected = bookings.length > 0 && bookings.every((b) => selectedIds.has(b.id));
  const someSelected = bookings.some((b) => selectedIds.has(b.id));
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId !== null) {
        const buttonElement = buttonRefs.current.get(openMenuId);
        if (buttonElement && !buttonElement.contains(event.target as Node)) {
          const target = event.target as HTMLElement;
          if (!target.closest('[data-edit-menu]')) {
            setOpenMenuId(null);
            setMenuPosition(null);
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const handleEditClick = (e: React.MouseEvent, booking: BookingWithRelations) => {
    e.stopPropagation();
    const button = e.currentTarget as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 4,
      left: rect.left,
    });
    setOpenMenuId(booking.id);
  };

  const handleEditBooking = (e: React.MouseEvent, booking: BookingWithRelations) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setMenuPosition(null);
    if (onEdit) {
      onEdit(booking);
    }
  };

  const handleCancelBooking = (e: React.MouseEvent, booking: BookingWithRelations) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setMenuPosition(null);
    if (onCancel) {
      onCancel(booking);
    }
  };

  return (
    <div className="px-6 py-4">
      {/* 상단 요약 및 전체 선택 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">
            총 {bookings.length} 예약
          </span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) input.indeterminate = someSelected && !allSelected;
              }}
              onChange={(e) => onSelectAll(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">전체 항목 선택</span>
          </label>
        </div>
      </div>

      {/* 테이블 */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-10">
                  선택
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">등록일</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">예약일</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  예약시간 (소요시간)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">고객명</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">휴대폰 번호</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">자원</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">예약항목</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">상태</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">예약금</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">메모</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">수정</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">예약</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((b) => {
              const status = (b.status || '').toUpperCase();
              const statusLabel = STATUS_LABELS[status] || status || '-';
              const customerName = b.customer?.name || b.customer_name || '';
              const customerPhone = b.customer?.phone || b.customer_phone || '';
              const serviceName = b.service?.name || '';
              const durationMinutes = b.service?.duration_minutes || 60;

              const statusClass =
                status === 'NOSHOW' || status === 'CANCELLED'
                  ? 'text-red-500'
                  : status === 'PAID'
                  ? 'text-blue-600'
                  : status === 'BOOKED'
                  ? 'text-orange-500'
                  : status === 'ARRIVED'
                  ? 'text-purple-600'
                  : 'text-gray-700';

              const canEdit = status !== 'CANCELLED' && status !== 'PAID';
              const canView = true;

              return (
                <tr
                  key={b.id}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(b.id)}
                      onChange={(e) => onSelectOne(b.id, e.target.checked)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatDateTime(b.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatDate(b.booking_date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {b.booking_time} ({durationMinutes})
                  </td>
                  <td 
                    className="px-4 py-3 text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      const customerId = b.customer?.id || (b as any).customer_id || b.id;
                      if (onCustomerClick) {
                        onCustomerClick(customerId);
                      }
                    }}
                  >
                    {customerName || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {customerPhone || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {b.designer?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {serviceName || '-'}
                  </td>
                  <td className={`px-4 py-3 text-sm font-medium ${statusClass}`}>
                    {statusLabel}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatCurrency(b.deposit_amount || b.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                    {b.memo || ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 relative">
                    {canEdit ? (
                      <>
                        <button
                          type="button"
                          ref={(el) => {
                            if (el) buttonRefs.current.set(b.id, el);
                          }}
                          onClick={(e) => handleEditClick(e, b)}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        {openMenuId === b.id && menuPosition && typeof window !== 'undefined' && createPortal(
                          <div
                            data-edit-menu
                            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[100001] min-w-[140px]"
                            style={{
                              top: `${menuPosition.top}px`,
                              left: `${menuPosition.left}px`,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => handleEditBooking(e, b)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                            >
                              예약 수정
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleCancelBooking(e, b)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                            >
                              예약 취소
                            </button>
                          </div>,
                          document.body
                        )}
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {canView && onView ? (
                      <button
                        type="button"
                        onClick={() => onView(b)}
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
