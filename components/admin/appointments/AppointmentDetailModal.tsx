'use client';

import type { BookingWithRelations } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Z } from '@/lib/constants';

interface AppointmentDetailModalProps {
  booking: BookingWithRelations | null;
  onClose: () => void;
  onEdit: (booking: any) => void;
  bookingTimeToLabel: (time: string) => string;
}

export default function AppointmentDetailModal({
  booking,
  onClose,
  onEdit,
  bookingTimeToLabel,
}: AppointmentDetailModalProps) {
  if (!booking) return null;

  return (
    <Modal
      isOpen={!!booking}
      onClose={onClose}
      title="예약 상세"
      zIndex={Z.MODAL_PRIMARY}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>닫기</Button>
          <Button
            onClick={() => {
              if (booking.booking_date && booking.booking_time) {
                onEdit(booking);
                onClose();
              }
            }}
          >
            수정
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">예약 번호</span>
          <span className="font-semibold text-gray-800">#{booking.id}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">시술</span>
          <span className="font-medium text-gray-900">{booking.service?.name || '—'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">디자이너</span>
          <span className="font-medium text-gray-900">{booking.designer?.name || '—'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">날짜</span>
          <span className="font-medium text-gray-900">{booking.booking_date}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">시간</span>
          <span className="font-medium text-gray-900">
            {booking.booking_time ? bookingTimeToLabel(booking.booking_time) : '—'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">금액</span>
          <span className="font-medium text-gray-900">
            {(booking.total_amount ?? 0) > 0
              ? `AU$${Number(booking.total_amount).toFixed(0)}`
              : 'Free'}
          </span>
        </div>
        <div className="pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">메모</span>
          <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">
            {booking.memo != null && booking.memo !== '' ? booking.memo : '—'}
          </p>
        </div>
      </div>
    </Modal>
  );
}
