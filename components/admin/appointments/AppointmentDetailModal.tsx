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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-black"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
        <h2 className="text-lg font-bold text-black mb-4">예약 상세</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">예약 번호</span>
            <span className="font-semibold text-gray-800">#{booking.id}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">시술</span>
            <span className="font-medium text-gray-900">
              {(booking as any).custom_service_name || booking.service?.name || '—'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">디자이너</span>
            <span className="font-medium text-gray-900">
              {booking.designer?.name || '—'}
            </span>
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
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            닫기
          </button>
          <button
            type="button"
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
