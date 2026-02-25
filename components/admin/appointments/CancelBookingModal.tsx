'use client';

import { useState } from 'react';
import type { Booking } from '@/lib/types';

type BookingWithRelations = Booking & {
  designer?: { id: number; name: string } | null;
  service?: { id: number; name: string; duration_minutes?: number | null } | null;
  customer?: { id: number; name: string; phone?: string | null } | null;
};

interface CancelBookingModalProps {
  isOpen: boolean;
  booking: BookingWithRelations | null;
  onClose: () => void;
  onConfirm: (booking: BookingWithRelations, cancellationReason: string) => Promise<void>;
}

const CANCELLATION_REASONS = [
  { value: '', label: '선택 안 함' },
  { value: 'customer_request', label: '고객 요청' },
  { value: 'mistake', label: '실수로 인한 예약' },
  { value: 'duplicate', label: '중복 예약' },
  { value: 'no_deposit', label: '예약금 미입금' },
  { value: 'other', label: '기타' },
];

export default function CancelBookingModal({
  isOpen,
  booking,
  onClose,
  onConfirm,
}: CancelBookingModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !booking) return null;

  const customerName = (booking as any).customer?.name || (booking as any).customer_name || '고객';
  const bookingDate = booking.booking_date || '';

  const handleConfirm = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm(booking, selectedReason);
      setSelectedReason('');
      onClose();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('예약 취소 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedReason('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleCancel}
          className="absolute right-4 top-4 text-gray-400 hover:text-black"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Title */}
        <h2 className="text-lg font-bold text-black mb-2">예약 취소</h2>

        {/* Body */}
        <div className="space-y-4 text-sm">
          {/* Cancellation Reason Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              취소 사유
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent bg-white"
            >
              {CANCELLATION_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          {/* Confirmation Message */}
          <p className="text-sm text-gray-900">
            {customerName} 고객님의 {bookingDate} 예약이 취소됩니다.
          </p>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`px-5 py-2 rounded-lg text-xs md:text-sm font-semibold text-white flex items-center gap-2 ${
              isSubmitting ? 'bg-gray-400 cursor-wait' : 'bg-black hover:bg-gray-800'
            }`}
          >
            {isSubmitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
