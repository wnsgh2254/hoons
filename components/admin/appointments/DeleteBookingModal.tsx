'use client';

import { bookingTimeToLabel } from '@/lib/utils/appointment-utils';
import type { BookingWithRelations } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Z } from '@/lib/constants';

interface DeleteBookingModalProps {
  booking: BookingWithRelations;
  cancellingId: number | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteBookingModal({
  booking,
  cancellingId,
  onClose,
  onConfirm,
}: DeleteBookingModalProps) {
  const isDeleting = cancellingId === booking.id;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Delete Booking"
      zIndex={Z.MODAL_PRIMARY}
      maxWidth="max-w-sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={isDeleting} onClick={onConfirm}>Delete</Button>
        </>
      }
    >
      <p className="text-xs text-gray-500 mb-4">
        이 예약을 정말 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.
      </p>
      <div className="text-xs text-gray-600 space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Booking</span>
          <span className="font-semibold text-gray-900">#{booking.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Service</span>
          <span className="font-medium text-gray-900">{booking.service?.name || 'Service'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Designer</span>
          <span className="font-medium text-gray-900">{booking.designer?.name || 'Designer'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Date</span>
          <span className="font-medium text-gray-900">{booking.booking_date}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Time</span>
          <span className="font-medium text-gray-900">
            {booking.booking_time ? bookingTimeToLabel(booking.booking_time) : 'N/A'}
          </span>
        </div>
      </div>
    </Modal>
  );
}
