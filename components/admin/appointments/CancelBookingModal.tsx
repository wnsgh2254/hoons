'use client';

import { useState, useEffect } from 'react';
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
  const [refundStripeDeposit, setRefundStripeDeposit] = useState(false);

  const depositPaid = booking
    ? Math.max(0, Number(booking.deposit_paid ?? (booking as any).depositPaid ?? 0) || 0)
    : 0;
  const alreadyRefunded = Boolean(booking?.deposit_refunded_at);
  const canOfferRefund = depositPaid > 0 && !alreadyRefunded;

  useEffect(() => {
    if (!isOpen || !booking) return;
    const paid = Math.max(0, Number(booking.deposit_paid ?? (booking as any).depositPaid ?? 0) || 0);
    const refunded = Boolean(booking.deposit_refunded_at);
    setRefundStripeDeposit(paid > 0 && !refunded);
    setSelectedReason('');
  }, [isOpen, booking?.id]);

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
          refund_stripe_deposit: canOfferRefund && refundStripeDeposit,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '예약 취소에 실패했습니다.');
      }

      if (canOfferRefund && refundStripeDeposit) {
        alert(
          '예약이 취소되었습니다. 카드 예약금 환불을 Stripe에 요청했으며, 고객 카드사 반영은 며칠 걸릴 수 있습니다.',
        );
      } else {
        alert('예약이 취소되었습니다.');
      }
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
        {alreadyRefunded && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
            이 예약의 카드 예약금은 이미 환불 처리된 기록이 있습니다.
          </p>
        )}
        {canOfferRefund && (
          <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-800">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-gray-300"
              checked={refundStripeDeposit}
              onChange={(e) => setRefundStripeDeposit(e.target.checked)}
            />
            <span>
              카드로 결제된 예약금{' '}
              <span className="font-semibold tabular-nums">
                {depositPaid.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
              </span>
              을 Stripe로 환불합니다
            </span>
          </label>
        )}
      </div>
    </Modal>
  );
}
