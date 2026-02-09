'use client';

import { bookingTimeToLabel } from '@/lib/utils/appointment-utils';
import type { Booking } from '@/lib/types';

type BookingWithRelations = Booking & {
  designer?: { id: number; name: string } | null;
  service?: { id: number; name: string; duration_minutes?: number | null } | null;
};

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-black"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
        <h2 className="text-base font-bold text-black mb-2">Delete Booking</h2>
        <p className="text-xs text-gray-500 mb-4">
          이 예약을 정말 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.
        </p>
        <div className="text-xs text-gray-600 mb-4 space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Booking</span>
            <span className="font-semibold text-gray-900">
              #{booking.id}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Service</span>
            <span className="font-medium text-gray-900">
              {booking.service?.name || 'Service'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Designer</span>
            <span className="font-medium text-gray-900">
              {booking.designer?.name || 'Designer'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Date</span>
            <span className="font-medium text-gray-900">
              {booking.booking_date}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Time</span>
            <span className="font-medium text-gray-900">
              {booking.booking_time ? bookingTimeToLabel(booking.booking_time) : 'N/A'}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className={`px-5 py-2 rounded-lg text-xs md:text-sm font-semibold text-white flex items-center gap-2 ${
              isDeleting
                ? 'bg-gray-400 cursor-wait'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
