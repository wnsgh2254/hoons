'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EDIT_TIME_OPTIONS } from '@/lib/utils/appointment-utils';

type TimeSlot = {
  designerId: number | null;
  time: string;
  duration: number;
  serviceTab: 'service' | 'appointment';
  serviceId: number | null;
};

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  // State values
  newBookingCustomerSearch: string;
  newBookingDate: string;
  newBookingDirectVisit: boolean;
  newBookingTimeSlots: TimeSlot[];
  newBookingDesigners: any[];
  newBookingMemo: string;
  newBookingSubmitting: boolean;
  newBookingShopId: number | null;
  newBookingSelectedCustomerId: number | null;
  newBookingCustomerSearchResults: any[];
  newBookingIsCustomerSearching: boolean;
  // State setters
  setNewBookingCustomerSearch: (value: string) => void;
  setNewBookingDate: (value: string) => void;
  setNewBookingDirectVisit: (value: boolean) => void;
  setNewBookingTimeSlots: (value: TimeSlot[]) => void;
  setNewBookingMemo: (value: string) => void;
  setNewBookingSubmitting: (value: boolean) => void;
  setIsCustomerRegistrationModalOpen: (value: boolean) => void;
  setBookingSuccessMessage: (value: string | null) => void;
  setBookings: (value: any[]) => void;
  setNewBookingSelectedCustomerId: (value: number | null) => void;
  setNewBookingCustomerSearchResults: (value: any[]) => void;
  setNewBookingIsCustomerSearching: (value: boolean) => void;
}

export default function NewBookingModal({
  isOpen,
  onClose,
  selectedDate,
  newBookingCustomerSearch,
  newBookingDate,
  newBookingDirectVisit,
  newBookingTimeSlots,
  newBookingDesigners,
  newBookingMemo,
  newBookingSubmitting,
  newBookingShopId,
  newBookingSelectedCustomerId,
  newBookingCustomerSearchResults,
  newBookingIsCustomerSearching,
  setNewBookingCustomerSearch,
  setNewBookingDate,
  setNewBookingDirectVisit,
  setNewBookingTimeSlots,
  setNewBookingMemo,
  setNewBookingSubmitting,
  setIsCustomerRegistrationModalOpen,
  setBookingSuccessMessage,
  setBookings,
  setNewBookingSelectedCustomerId,
  setNewBookingCustomerSearchResults,
  setNewBookingIsCustomerSearching,
}: NewBookingModalProps) {
  const router = useRouter();

  const handleCancel = () => {
    onClose();
    setNewBookingTimeSlots([
      { designerId: null, time: '10:00 AM', duration: 30, serviceTab: 'service', serviceId: null },
    ]);
    setNewBookingSelectedCustomerId(null);
    setNewBookingCustomerSearchResults([]);
  };

  const handleSubmit = async () => {
    const firstSlot = newBookingTimeSlots[0];
    if (!firstSlot?.designerId || !newBookingDate || !firstSlot?.time) {
      alert('디자이너, 날짜, 시작 시간을 모두 선택해주세요.');
      return;
    }

    // Comment: Prevent more than 2 overlapping bookings in the same slot for a designer
    try {
      const [hourStr, minuteStr] = firstSlot.time.split(':');
      const startHour = Number(hourStr);
      const startMinute = Number(minuteStr);
      const newStartMinutes = startHour * 60 + startMinute;
      const newEndMinutes = newStartMinutes + (firstSlot.duration || 60);

      const resExisting = await fetch(
        `/api/appointment?date=${encodeURIComponent(newBookingDate)}&designer_id=${encodeURIComponent(
          String(firstSlot.designerId),
        )}`,
      );
      const dataExisting = await resExisting.json();
      if (resExisting.ok && Array.isArray(dataExisting.bookings)) {
        let maxOverlap = 0;
        for (const b of dataExisting.bookings) {
          if (!b.booking_time) continue;
          const [bh, bm] = String(b.booking_time).split(':');
          const existStart = Number(bh) * 60 + Number(bm);
          const existDuration =
            b.service?.duration_minutes && b.service.duration_minutes > 0
              ? b.service.duration_minutes
              : 60;
          const existEnd = existStart + existDuration;

          const overlap =
            Math.max(newStartMinutes, existStart) < Math.min(newEndMinutes, existEnd);
          if (overlap) {
            maxOverlap += 1;
          }
        }
        if (maxOverlap >= 2) {
          alert('같은 시간대에 이미 2개의 예약이 있어 더 이상 등록할 수 없습니다.');
          return;
        }
      }
    } catch (e) {
      console.error('Error checking overlapping bookings', e);
    }

    const selectedCustomer =
      newBookingCustomerSearchResults.find((c: any) => c.id === newBookingSelectedCustomerId) || null;

    setNewBookingSubmitting(true);
    try {
      const resCreate = await fetch('/api/appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: newBookingShopId,
          designerId: firstSlot.designerId,
          serviceId: firstSlot.serviceId ?? null,
          day: Number(newBookingDate.split('-')[2]),
          timeLabel: firstSlot.time,
          totalAmount: null,
          depositAmount: null,
          fullDate: newBookingDate,
          memo: newBookingMemo,
          customerName: selectedCustomer?.name ?? null,
          customerPhone: selectedCustomer?.phone ?? (newBookingCustomerSearch || null),
          existingCustomerId: selectedCustomer?.id ?? newBookingSelectedCustomerId ?? null,
        }),
      });

      if (!resCreate.ok) {
        const errorText = await resCreate.text();
        console.error('Failed to create booking', errorText);
        try {
          const parsed = JSON.parse(errorText);
          alert(parsed.error || '예약 생성에 실패했습니다.');
        } catch {
          alert('예약 생성에 실패했습니다.');
        }
      } else {
        setBookingSuccessMessage('예약이 성공적으로 등록되었습니다.');
        setTimeout(() => {
          setBookingSuccessMessage(null);
        }, 3000);
      }

      onClose();
      setNewBookingTimeSlots([
        { designerId: null, time: '10:00 AM', duration: 30, serviceTab: 'service', serviceId: null },
      ]);

      const res = await fetch(`/api/appointment?date=${encodeURIComponent(selectedDate)}`);
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
      }
    } finally {
      setNewBookingSubmitting(false);
    }
  };

  const handleCustomerSearch = async () => {
    const query = newBookingCustomerSearch.trim();
    if (!query) {
      setNewBookingCustomerSearchResults([]);
      setNewBookingSelectedCustomerId(null);
      return;
    }

    setNewBookingIsCustomerSearching(true);
    try {
      const res = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        setNewBookingCustomerSearchResults(data.customers || []);
      } else {
        console.error('Failed to search customers:', data.error);
        setNewBookingCustomerSearchResults([]);
      }
    } catch (error) {
      console.error('Unexpected error searching customers:', error);
      setNewBookingCustomerSearchResults([]);
    } finally {
      setNewBookingIsCustomerSearching(false);
    }
  };

  // Comment: Close modal on Escape key when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Comment: Close modal when clicking backdrop (outside content)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  // Comment: Open full customer registration page in a new tab
  const handleOpenCustomerRegistration = () => {
    setIsCustomerRegistrationModalOpen(true);
    router.push('/admin/customers');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">예약 등록</h2>
          <button
            type="button"
            onClick={handleCancel}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6">
          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column: Customer Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="고객명 또는 휴대폰"
                      value={newBookingCustomerSearch}
                      onChange={(e) => setNewBookingCustomerSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleCustomerSearch();
                        }
                      }}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                      search
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCustomerSearch()}
                    className="px-3 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                  >
                    검색
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCustomerRegistration}
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-900 whitespace-nowrap"
                >
                  고객등록
                </button>
              </div>

              <div className="space-y-1 text-xs text-gray-600">
                <p>신규 고객은 먼저 고객을 등록하세요.</p>
              </div>

              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {newBookingIsCustomerSearching && (
                  <p className="text-xs text-gray-500">고객을 검색 중입니다...</p>
                )}
                {!newBookingIsCustomerSearching && newBookingCustomerSearchResults.length > 0 && (
                  <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
                    {newBookingCustomerSearchResults.map((customer: any) => (
                      <li
                        key={customer.id}
                        className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                          newBookingSelectedCustomerId === customer.id ? 'bg-gray-100' : ''
                        }`}
                        onClick={() => {
                          setNewBookingSelectedCustomerId(customer.id);
                          setNewBookingCustomerSearch(
                            `${customer.name || ''}${customer.phone ? ` (${customer.phone})` : ''}`.trim(),
                          );
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">
                            {customer.name || '이름 없음'}
                          </span>
                          {customer.phone && (
                            <span className="text-[11px] text-gray-500">{customer.phone}</span>
                          )}
                        </div>
                        {newBookingSelectedCustomerId === customer.id && (
                          <span className="material-symbols-outlined text-sm text-black">check</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Right Column: Appointment Details */}
            <div className="space-y-4">
              {/* Date */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">날짜</label>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={newBookingDate.replace(/-/g, '.')}
                    readOnly
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setNewBookingDate(selectedDate)}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                  </button>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={newBookingDirectVisit}
                    onChange={(e) => setNewBookingDirectVisit(e.target.checked)}
                    className="w-4 h-4"
                  />
                  바로 방문
                  <span className="material-symbols-outlined text-sm text-gray-400">help</span>
                </label>
              </div>

              {/* Designer, Start Time, Duration Groups */}
              <div className="space-y-4">
                {newBookingTimeSlots.map((slot, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-3 gap-4">
                      {/* Designer */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">디자이너</label>
                        <div className="flex items-center gap-2">
                          <select
                            value={slot.designerId || ''}
                            onChange={(e) => {
                              const updated = [...newBookingTimeSlots];
                              updated[index].designerId = e.target.value ? Number(e.target.value) : null;
                              setNewBookingTimeSlots(updated);
                            }}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                          >
                            <option value="">선택하세요</option>
                            {newBookingDesigners.map((d: any) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                          {index === newBookingTimeSlots.length - 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setNewBookingTimeSlots([
                                  ...newBookingTimeSlots,
                                  { designerId: null, time: '10:00 AM', duration: 30, serviceTab: 'service', serviceId: null },
                                ]);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-black text-white rounded-lg hover:bg-gray-900"
                            >
                              <span className="material-symbols-outlined text-sm">add</span>
                            </button>
                          )}
                          {newBookingTimeSlots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = newBookingTimeSlots.filter((_, i) => i !== index);
                                setNewBookingTimeSlots(updated);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-gray-300 text-white rounded-lg hover:bg-gray-400"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Start Time */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">시작시간</label>
                        <select
                          value={slot.time}
                          onChange={(e) => {
                            const updated = [...newBookingTimeSlots];
                            updated[index].time = e.target.value;
                            setNewBookingTimeSlots(updated);
                          }}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                        >
                          {EDIT_TIME_OPTIONS.map((label) => (
                            <option key={label} value={label}>
                              {label.replace('AM', '오전').replace('PM', '오후')}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">소요시간</label>
                        <select
                          value={slot.duration}
                          onChange={(e) => {
                            const updated = [...newBookingTimeSlots];
                            updated[index].duration = Number(e.target.value);
                            setNewBookingTimeSlots(updated);
                          }}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                        >
                          {[15, 30, 45, 60, 90, 120, 150, 180].map((min) => (
                            <option key={min} value={min}>
                              {min} 분
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Service Selection removed: service will be chosen in a dedicated flow */}
                  </div>
                ))}
              </div>

              {/* SMS / Deposit options removed for simpler booking flow */}

              {/* Appointment Memo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">예약 메모</label>
                <textarea
                  value={newBookingMemo}
                  onChange={(e) => setNewBookingMemo(e.target.value)}
                  placeholder="메모를 입력하세요"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-black"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={
                    !newBookingTimeSlots[0]?.designerId ||
                    !newBookingDate ||
                    !newBookingTimeSlots[0]?.time ||
                    newBookingSubmitting
                  }
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-60 transition-colors"
                >
                  {newBookingSubmitting ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
