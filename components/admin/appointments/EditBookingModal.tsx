'use client';

import { useState, useEffect } from 'react';
import { EDIT_TIME_OPTIONS, SERVICE_PICKER_CATEGORY_ORDER, getServiceCategoryForPicker, labelToDbTime } from '@/lib/utils/appointment-utils';
import ServicePickerModal from './ServicePickerModal';
import type { Booking } from '@/lib/types';

type BookingWithRelations = Booking & {
  designer?: { id: number; name: string } | null;
  service?: { id: number; name: string; duration_minutes?: number | null } | null;
};

interface EditBookingModalProps {
  booking: BookingWithRelations;
  selectedDate: string;
  onClose: () => void;
  onSave: (bookingId: number, updates: { booking_date: string; booking_time: string; service_id?: number; memo: string }) => Promise<void>;
}

export default function EditBookingModal({
  booking,
  selectedDate,
  onClose,
  onSave,
}: EditBookingModalProps) {
  const [editDate, setEditDate] = useState<string>(selectedDate);
  const [editTime, setEditTime] = useState<string>('10:00 AM');
  const [editServiceId, setEditServiceId] = useState<number | null>(null);
  const [editServices, setEditServices] = useState<{ id: number; name: string; duration_minutes?: number | null }[]>([]);
  const [isServicePickerOpen, setIsServicePickerOpen] = useState(false);
  const [editMemo, setEditMemo] = useState<string>('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Comment: Sync edit modal fields when opening edit
  useEffect(() => {
    if (booking?.booking_date) {
      setEditDate(booking.booking_date);
    }
    if (booking?.booking_time) {
      const [hhStr, mmStr] = booking.booking_time.split(':');
      const hh = Number(hhStr);
      if (!Number.isNaN(hh)) {
        const isPM = hh >= 12;
        const displayHour = hh % 12 === 0 ? 12 : hh % 12;
        setEditTime(`${displayHour}:${mmStr.padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`);
      }
    }
    if (booking?.service?.id) {
      setEditServiceId(booking.service.id);
    }
    if ((booking as any)?.memo || (booking as any)?.note) {
      setEditMemo((booking as any).memo || (booking as any).note || '');
    }
  }, [booking?.id]);

  // Comment: Load all services for edit modal service picker (card only)
  useEffect(() => {
    if (!booking) {
      setEditServices([]);
      return;
    }
    let isMounted = true;
    fetch('/api/services')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted || !data.services) return;
        const cardOnly = (data.services as { id: number; name: string; duration_minutes?: number | null }[]).filter(
          (s) => !s.name.toLowerCase().includes('(cash)')
        );
        setEditServices(cardOnly);
      })
      .catch(() => {
        if (isMounted) setEditServices([]);
      });
    return () => {
      isMounted = false;
    };
  }, [booking?.id]);

  const handleSave = async () => {
    if (!editDate || !editTime || !booking?.id) return;
    const dbTime = labelToDbTime(editTime);
    if (!dbTime) return;
    setEditSubmitting(true);
    try {
      await onSave(booking.id, {
        booking_date: editDate,
        booking_time: dbTime,
        ...(editServiceId != null && { service_id: editServiceId }),
        memo: editMemo,
      });
      onClose();
    } finally {
      setEditSubmitting(false);
    }
  };

  const selectedService = editServices.find((s) => s.id === editServiceId);
  const serviceDisplayName = selectedService
    ? (() => {
        const name = selectedService.name.replace(/\s*\(card\)\s*/gi, '').trim();
        const dur = selectedService.duration_minutes != null ? `${selectedService.duration_minutes}분` : '';
        return dur ? `${name} · ${dur}` : name;
      })()
    : '시술 선택';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-black"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          <h2 className="text-lg font-bold text-black mb-2">예약 수정</h2>
          <p className="text-xs text-gray-500 mb-4">
            기존 예약의 날짜·시작 시간·시술·메모를 한 번에 수정합니다. 시술을 바꾸면 캘린더에서 예약 높이가 해당 시술 시간에 맞게 바뀝니다.
          </p>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between text-xs text-gray-500">
              <span>예약 번호</span>
              <span className="font-semibold text-gray-800">#{booking.id}</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">날짜</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">시작 시간</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
              >
                {EDIT_TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">시술</label>
              <button
                type="button"
                onClick={() => setIsServicePickerOpen(true)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between bg-white hover:bg-gray-50"
              >
                <span className="text-gray-800">{serviceDisplayName}</span>
                <span className="material-symbols-outlined text-gray-400 text-lg">expand_more</span>
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">메모</label>
              <textarea
                value={editMemo}
                onChange={(e) => setEditMemo(e.target.value)}
                placeholder="예약 메모"
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent resize-none"
              />
            </div>
          </div>
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              disabled={!editDate || !editTime || editSubmitting || !booking.id}
              onClick={handleSave}
              className={`px-5 py-2 rounded-lg text-xs md:text-sm font-semibold text-white flex items-center gap-2 ${
                editSubmitting ? 'bg-gray-400 cursor-wait' : 'bg-black hover:bg-gray-800'
              }`}
            >
              {editSubmitting ? '저장 중...' : '변경 저장'}
            </button>
          </div>
        </div>
      </div>
      {isServicePickerOpen && (
        <ServicePickerModal
          services={editServices}
          selectedServiceId={editServiceId}
          onSelect={(serviceId) => {
            setEditServiceId(serviceId);
            setIsServicePickerOpen(false);
          }}
          onClose={() => setIsServicePickerOpen(false)}
        />
      )}
    </>
  );
}
