'use client';

import { useState } from 'react';
import type { BookingWithRelations } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { Z } from '@/lib/constants';

interface CancelBookingModalProps {
  isOpen: boolean;
  booking: BookingWithRelations | null;
  onClose: () => void;
  onSuccess: () => void;
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
  onSuccess,
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
      const res = await fetch(`/api/appointment/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          cancellation_reason: selectedReason || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '예약 취소에 실패했습니다.');
      }

      alert('예약이 취소되었습니다.');
      setSelectedReason('');
      onClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      alert(error.message || '예약 취소 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedReason('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen && !!booking}
      onClose={handleCancel}
      title="예약 취소"
      zIndex={Z.MODAL_PRIMARY}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="ghost" disabled={isSubmitting} onClick={handleCancel}>취소</Button>
          <Button loading={isSubmitting} onClick={handleConfirm}>저장</Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <Select
          label="취소 사유"
          options={CANCELLATION_REASONS}
          value={selectedReason}
          onChange={(e) => setSelectedReason(e.target.value)}
        />
        <p className="text-sm text-gray-900">
          {customerName} 고객님의 {bookingDate} 예약이 취소됩니다.
        </p>
      </div>
    </Modal>
  );
}
