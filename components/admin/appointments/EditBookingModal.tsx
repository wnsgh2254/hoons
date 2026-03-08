'use client';

import { useState, useEffect } from 'react';
import { EDIT_TIME_OPTIONS, SERVICE_PICKER_CATEGORY_ORDER, getServiceCategoryForPicker, labelToDbTime, COLOR_LABEL_OPTIONS } from '@/lib/utils/appointment-utils';
import ServicePickerModal from './ServicePickerModal';
import type { BookingWithRelations } from '@/lib/types';
import { useServices } from '@/hooks/useServices';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Z } from '@/lib/constants';

interface EditBookingModalProps {
  booking: BookingWithRelations;
  selectedDate: string;
  onClose: () => void;
  onSave: (bookingId: number, updates: { booking_date: string; booking_time: string; service_id?: number; memo: string; color_label?: string | null }) => Promise<void>;
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
  const { services: editServices } = useServices({ excludePattern: /\(cash\)/i });
  const [isServicePickerOpen, setIsServicePickerOpen] = useState(false);
  const [editMemo, setEditMemo] = useState<string>('');
  const [editColorLabel, setEditColorLabel] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

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
    if ((booking as any)?.color_label) {
      setEditColorLabel((booking as any).color_label);
    }
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
        color_label: editColorLabel,
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

  const timeOptions = EDIT_TIME_OPTIONS.map((t) => ({ value: t, label: t }));

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title="예약 수정"
        zIndex={Z.MODAL_PRIMARY}
        maxWidth="max-w-md"
        className="overflow-visible"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>취소</Button>
            <Button
              loading={editSubmitting}
              disabled={!editDate || !editTime || !booking.id}
              onClick={handleSave}
            >
              변경 저장
            </Button>
          </>
        }
      >
        <p className="text-xs text-gray-500 mb-4">
          기존 예약의 날짜·시작 시간·시술·메모를 한 번에 수정합니다. 시술을 바꾸면 캘린더에서 예약 높이가 해당 시술 시간에 맞게 바뀝니다.
        </p>
        <div className="space-y-4 text-sm">
          <div className="flex justify-between text-xs text-gray-500">
            <span>예약 번호</span>
            <span className="font-semibold text-gray-800">#{booking.id}</span>
          </div>
          <Input
            label="날짜"
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
          <div className="relative">
            <Select
              label="시작 시간"
              options={timeOptions}
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              className="relative z-[100002]"
              style={{ position: 'relative', zIndex: 100002 }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">시술</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">아이콘 표시</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditColorLabel(null)}
                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                  editColorLabel === null ? 'border-black' : 'border-gray-200 hover:border-gray-400'
                }`}
                title="없음"
              >
                <span className="material-symbols-outlined text-gray-400 text-xs">close</span>
              </button>
              {COLOR_LABEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEditColorLabel(opt.value)}
                  className={`w-6 h-6 rounded border-2 transition-all ${
                    editColorLabel === opt.value ? 'border-black scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: opt.hex }}
                  title={opt.label}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">메모</label>
            <textarea
              value={editMemo}
              onChange={(e) => setEditMemo(e.target.value)}
              placeholder="예약 메모"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent resize-none"
            />
          </div>
        </div>
      </Modal>
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
