'use client';

import React, { useEffect, useState, useRef } from 'react';
import { EDIT_TIME_OPTIONS, getWeekStart, getWeekEnd, COLOR_LABEL_OPTIONS } from '@/lib/utils/appointment-utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { Z } from '@/lib/constants';
import { useServices } from '@/hooks/useServices';
import BookingItemPickerModal from './BookingItemPickerModal';

type SelectedBookingItem = { id: number; type: string; name: string; durationMinutes?: number };
type TimeSlot = {
  designerId: number | null;
  time: string;
  duration: number;
  serviceTab: 'service';
  serviceId: number | null;
  selectedItems: SelectedBookingItem[];
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
  newBookingServices: { id: number; name: string; duration_minutes: number }[];
  newBookingMemo: string;
  newBookingSubmitting: boolean;
  newBookingLoadingOptions: boolean;
  newBookingShopId: number | null;
  newBookingSelectedCustomerId: number | null;
  newBookingCustomerSearchResults: any[];
  newBookingIsCustomerSearching: boolean;
  // State setters
  setNewBookingCustomerSearch: (value: string) => void;
  setNewBookingDate: (value: string) => void;
  setNewBookingDirectVisit: (value: boolean) => void;
  setNewBookingTimeSlots: React.Dispatch<React.SetStateAction<TimeSlot[]>>;
  setNewBookingMemo: (value: string) => void;
  setNewBookingSubmitting: (value: boolean) => void;
  setIsCustomerRegistrationModalOpen: (value: boolean) => void;
  setBookingSuccessMessage: (value: string | null) => void;
  setBookings: (value: any[]) => void;
  setFilteredBookings: (value: any[]) => void;
  setNewBookingSelectedCustomerId: (value: number | null) => void;
  setNewBookingCustomerSearchResults: (value: any[]) => void;
  setNewBookingIsCustomerSearching: (value: boolean) => void;
  onViewCustomer?: (customerId: number) => void;
  onOpenCustomerRegistration?: () => void;
  /** Called when booking is created successfully (e.g. from customers page) */
  onSuccess?: (message: string) => void;
  /** Pre-fill customer when opening from customer list */
  registeredCustomer?: { id: number; name: string; phone: string } | null;
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
  newBookingServices,
  newBookingMemo,
  newBookingSubmitting,
  newBookingLoadingOptions,
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
  setFilteredBookings,
  setNewBookingSelectedCustomerId,
  setNewBookingCustomerSearchResults,
  setNewBookingIsCustomerSearching,
  onViewCustomer,
  onOpenCustomerRegistration,
  onSuccess,
  registeredCustomer,
}: NewBookingModalProps) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [isCustomerSearching, setIsCustomerSearching] = useState(false);
  const [directVisit, setDirectVisit] = useState(false);
  const [bookingDate, setBookingDate] = useState(selectedDate);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { designerId: null, time: '10:00 AM', duration: 30, serviceTab: 'service', serviceId: null, selectedItems: [] },
  ]);
  const [memo, setMemo] = useState('');
  const [colorLabel, setColorLabel] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Booking item picker state
  const [isBookingItemPickerOpen, setIsBookingItemPickerOpen] = useState(false);
  const [bookingItemPickerInitialTab, setBookingItemPickerInitialTab] = useState<'service' | 'booking_item'>('service');
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);

  const [shops, setShops] = useState<any[]>([]);
  const [shopId, setShopId] = useState<number | null>(null);
  const shopManuallySet = useRef(false);
  const [designers, setDesigners] = useState<any[]>([]);
  const { services } = useServices();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  const selectedCustomerDetail = customerSearchResults.find((r: any) => r.id === selectedCustomerId) ?? null;
  type CustomerStats = { lastVisitDate?: string; daysSinceLastVisit?: number; appointmentsCount?: number; cancelledCount?: number };
  const customerStats: CustomerStats = {};

  // Duration options in 30-min steps only
  const durationOptions = [30, 60, 90, 120, 150, 180];

  const formatDurationLabel = (min: number) => `${min}분`;

  const handleRemoveBookingItem = (slotIndex: number, itemId: number, itemType: string) => {
    const next = newBookingTimeSlots.map((slot: TimeSlot, i: number) =>
      i === slotIndex
        ? { ...slot, selectedItems: slot.selectedItems.filter((it: SelectedBookingItem) => it.id !== itemId || it.type !== itemType) }
        : slot
    );
    setNewBookingTimeSlots(next);
  };

  const handleBookingItemsSelected = (items: SelectedBookingItem[]) => {
    if (activeSlotIndex === null) return;
    const next = newBookingTimeSlots.map((slot: TimeSlot, i: number) =>
      i === activeSlotIndex ? { ...slot, selectedItems: [...slot.selectedItems, ...items] } : slot
    );
    setNewBookingTimeSlots(next);
    setIsBookingItemPickerOpen(false);
  };

  // Comment: 7 category services (must exist in services table) - only these appear in dropdown
  const CATEGORY_NAMES = ['커트', '드라이', '펌', '매직', '핫펌', '염색', '클리닉'] as const;
  const categoryServices = Array.isArray(newBookingServices)
    ? newBookingServices.filter((s) => CATEGORY_NAMES.includes(s.name as any))
    : [];

  const handleCancel = () => {
    onClose();
    setNewBookingTimeSlots([
      { designerId: null, time: '10:00 AM', duration: 30, serviceTab: 'service', serviceId: null, selectedItems: [] },
    ]);
    setNewBookingSelectedCustomerId(null);
    setNewBookingCustomerSearchResults([]);
  };

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      alert('고객이 선택되지 않았습니다.');
      return;
    }

    const firstSlot = timeSlots[0];
    if (!firstSlot?.designerId || !bookingDate || !firstSlot?.time) {
      alert('디자이너, 날짜, 시작 시간을 모두 선택해주세요.');
      return;
    }

    try {
      const [hourStr, minuteStr] = firstSlot.time.split(':');
      const startHour = Number(hourStr);
      const startMinute = Number(minuteStr);
      const newStartMinutes = startHour * 60 + startMinute;
      const newEndMinutes = newStartMinutes + (firstSlot.duration || 60);

      const resExisting = await fetch(
        `/api/appointment?date=${encodeURIComponent(bookingDate)}&designer_id=${encodeURIComponent(
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
          const overlap = Math.max(newStartMinutes, existStart) < Math.min(newEndMinutes, existEnd);
          if (overlap) maxOverlap += 1;
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
      customerSearchResults.find((c: any) => c.id === selectedCustomerId) || null;

    setSubmitting(true);
    try {
      const resCreate = await fetch('/api/appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          designerId: firstSlot.designerId,
          serviceId: firstSlot.serviceId ?? null,
          day: Number(bookingDate.split('-')[2]),
          timeLabel: firstSlot.time,
          totalAmount: null,
          depositAmount: null,
          fullDate: bookingDate,
          memo,
          colorLabel,
          customerName: selectedCustomer?.name ?? null,
          customerPhone: selectedCustomer?.phone ?? (customerSearch || null),
          existingCustomerId: selectedCustomer?.id ?? selectedCustomerId ?? null,
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
        const successMessage = '예약이 성공적으로 등록되었습니다.';
        setBookingSuccessMessage(successMessage);
        onSuccess?.(successMessage);
      }

      onClose();
      setNewBookingTimeSlots([
        { designerId: null, time: '10:00 AM', duration: 30, serviceTab: 'service', serviceId: null, selectedItems: [] },
      ]);

      // Comment: Refetch full week range (same as main schedule) so UI shows correct data
      const weekStart = getWeekStart(selectedDate);
      const weekEnd = getWeekEnd(selectedDate);
      const res = await fetch(
        `/api/appointment?start_date=${encodeURIComponent(weekStart)}&end_date=${encodeURIComponent(weekEnd)}`
      );
      const data = await res.json();
      if (res.ok) {
        const bookings = Array.isArray(data.bookings) ? data.bookings : [];
        let updatedBookings = bookings;

        setBookings(updatedBookings);
        setFilteredBookings(updatedBookings);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Close date picker on outside click
  useEffect(() => {
    if (!isDatePickerOpen) return;
    const handleClickOutside = () => setIsDatePickerOpen(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isDatePickerOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isDatePickerOpen) {
          setIsDatePickerOpen(false);
          return;
        }
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDatePickerOpen]);

  const shopOptions = shops.map((s: any) => ({ value: s.id, label: s.name }));
  const designerOptions = designers.map((d: any) => ({ value: d.id, label: d.name }));
  const timeOptions = EDIT_TIME_OPTIONS.map((label) => ({
    value: label,
    label: label.replace('AM', '오전').replace('PM', '오후'),
  }));
  const durationSelectOptions = durationOptions.map((min) => ({ value: min, label: formatDurationLabel(min) }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="예약 등록"
      zIndex={Z.MODAL_PRIMARY}
      maxWidth="max-w-6xl"
      scrollable
      footer={
        <>
          <Button variant="ghost" onClick={handleCancel}>취소</Button>
          <Button
            loading={submitting}
            disabled={!timeSlots[0]?.designerId || !bookingDate || !timeSlots[0]?.time}
            onClick={handleSubmit}
          >
            저장
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column: Customer Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="고객명 또는 휴대폰"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  if (selectedCustomerId) {
                    setSelectedCustomerId(null);
                  }
                }}
                onFocus={() => {
                  if (customerSearchResults.length > 0 && !selectedCustomerId) {
                    setIsCustomerDropdownOpen(true);
                  }
                }}
                className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />

              {/* Autocomplete dropdown */}
              {isCustomerDropdownOpen && !selectedCustomerId && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {isCustomerSearching && (
                    <div className="px-3 py-2 text-xs text-gray-500">검색 중...</div>
                  )}
                  {!isCustomerSearching && customerSearchResults.length === 0 && customerSearch.trim() && (
                    <div className="px-3 py-2 text-xs text-gray-500">검색 결과가 없습니다.</div>
                  )}
                  {!isCustomerSearching && customerSearchResults.length > 0 && (
                    <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg">
                      {customerSearchResults.map((customer: any) => (
                        <li
                          key={customer.id}
                          className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                          onClick={() => {
                            setSelectedCustomerId(customer.id);
                            setCustomerSearch(
                              `${customer.name || ''}${customer.phone ? ` (${customer.phone})` : ''}`.trim(),
                            );
                            setIsCustomerDropdownOpen(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{customer.name || '이름 없음'} ({customer.customer_number || customer.id})</span>
                            {customer.phone && (
                              <span className="text-[11px] text-gray-500">{customer.phone}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <Button onClick={onOpenCustomerRegistration}>고객등록</Button>
          </div>

          {selectedCustomerId && selectedCustomerDetail ? (
            <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
              {/* Customer header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedCustomerDetail.name} ({selectedCustomerDetail.customer_number || selectedCustomerDetail.id})
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedCustomerDetail.phone || '-'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onViewCustomer && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onViewCustomer(selectedCustomerId)}
                    >
                      상세정보
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(null);
                      setCustomerSearch('');
                      setCustomerSearchResults([]);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              </div>
              {/* Customer details */}
              <div className="px-4 py-3 space-y-3">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-500 w-20 flex-shrink-0">담당자</p>
                  <p className="text-sm font-medium text-black">{selectedCustomerDetail.assigned_designer?.name || '-'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-500 w-20 flex-shrink-0">최근 방문일</p>
                  <p className="text-sm font-medium text-black">
                    {customerStats?.lastVisitDate
                      ? `${customerStats.daysSinceLastVisit}일전`
                      : '-'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-500 w-20 flex-shrink-0">최근 1년 예약</p>
                  <p className="text-sm font-medium text-black">
                    {customerStats
                      ? `${customerStats.appointmentsCount}건${(customerStats.cancelledCount ?? 0) > 0 ? ` (취소 ${customerStats.cancelledCount ?? 0}건)` : ''}`
                      : '-'}
                  </p>
                </div>
                <div>
                  <textarea
                    value={selectedCustomerDetail.memo || ''}
                    readOnly
                    placeholder="메모 없음"
                    className="w-full min-h-[80px] border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none bg-gray-50 text-gray-700"
                  />
                </div>
              </div>
            </div>
          ) : !selectedCustomerId ? (
            <div className="text-xs text-gray-500">
              <p>신규 고객은 먼저 고객을 등록하세요.</p>
            </div>
          ) : null}
        </div>

        {/* Right Column: Appointment Details */}
        <div className="space-y-4">
          {/* Date */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">날짜</label>
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDatePickerOpen((prev) => !prev);
                    setDatePickerMonth(new Date(bookingDate));
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                >
                  {bookingDate.replace(/-/g, '.')}
                </button>

                {/* Calendar Popup */}
                {isDatePickerOpen && (
                  <div
                    className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10 p-4 min-w-[280px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          const prev = new Date(datePickerMonth);
                          prev.setMonth(prev.getMonth() - 1);
                          setDatePickerMonth(prev);
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                      </button>
                      <span className="text-sm font-semibold text-gray-900">
                        {datePickerMonth.getFullYear()}년 {datePickerMonth.getMonth() + 1}월
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Date(datePickerMonth);
                          next.setMonth(next.getMonth() + 1);
                          setDatePickerMonth(next);
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                      </button>
                    </div>

                    {/* Weekday Header */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                        <div key={day} className="text-center text-xs font-medium text-gray-600 py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Day Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const year = datePickerMonth.getFullYear();
                        const month = datePickerMonth.getMonth();
                        const firstDay = new Date(year, month, 1);
                        const startDate = new Date(firstDay);
                        startDate.setDate(startDate.getDate() - firstDay.getDay());
                        const days: Date[] = [];
                        for (let i = 0; i < 42; i++) {
                          const date = new Date(startDate);
                          date.setDate(startDate.getDate() + i);
                          days.push(date);
                        }
                        return days.map((date, idx) => {
                          const pad = (n: number) => String(n).padStart(2, '0');
                          const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                          const isCurrentMonth = date.getMonth() === month;
                          const isSelected = dateStr === bookingDate;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBookingDate(dateStr);
                                setIsDatePickerOpen(false);
                              }}
                              disabled={!isCurrentMonth}
                              className={`aspect-square text-xs rounded-lg transition-colors ${
                                !isCurrentMonth ? 'text-gray-300' : 'text-gray-900 hover:bg-gray-100'
                              } ${isSelected ? 'bg-black !text-white' : ''}`}
                            >
                              {date.getDate()}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
              <input
                type="checkbox"
                checked={directVisit}
                onChange={(e) => setDirectVisit(e.target.checked)}
                className="w-4 h-4"
              />
              바로 방문
            </label>
          </div>

          {/* Shop Select */}
          {shops.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">지점</label>
              <div className="flex-1 max-w-[200px]">
                <Select
                  options={shopOptions}
                  value={shopId ?? ''}
                  onChange={(e) => {
                    setShopId(Number(e.target.value));
                    shopManuallySet.current = true;
                  }}
                />
              </div>
            </div>
          )}

          {/* Per-slot cards */}
          <div className="space-y-3">
            {timeSlots.map((slot, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
                {/* Row 1: Designer + Add/Remove + Start Time + Duration */}
                <div className="grid grid-cols-[1fr_auto_1fr_1fr] gap-3 items-end">
                  <Select
                    label="자원"
                    options={designerOptions}
                    placeholder="선택하세요"
                    value={slot.designerId ?? ''}
                    onChange={(e) => {
                      const newDesignerId = e.target.value ? Number(e.target.value) : null;
                      const updated = [...timeSlots];
                      updated[idx] = { ...updated[idx], designerId: newDesignerId };
                      setTimeSlots(updated);
                      // 첫 번째 슬롯 디자이너 변경 시, 수동 설정 아닌 경우 지점 자동 변경
                      if (idx === 0 && newDesignerId && !shopManuallySet.current) {
                        const designer = designers.find((d: any) => d.id === newDesignerId);
                        if (designer?.shop_id) {
                          setShopId(designer.shop_id);
                        }
                      }
                    }}
                    wrapperClassName="min-w-0"
                  />
                  <div className="flex items-center gap-1 pb-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setTimeSlots((prev) => {
                          const newSlots = [...prev];
                          newSlots.splice(idx + 1, 0, {
                            designerId: null, time: '10:00 AM', duration: 30,
                            serviceTab: 'service', serviceId: null, selectedItems: [],
                          });
                          return newSlots;
                        });
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                      title="자원 추가"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                    </button>
                    {timeSlots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setTimeSlots((prev) => prev.filter((_, i) => i !== idx));
                          if (activeSlotIndex === idx) setActiveSlotIndex(null);
                          else if (activeSlotIndex !== null && activeSlotIndex > idx) {
                            setActiveSlotIndex(activeSlotIndex - 1);
                          }
                        }}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-300 transition-colors"
                        title="자원 삭제"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    )}
                  </div>
                  <Select
                    label="시작시간"
                    options={timeOptions}
                    value={slot.time}
                    onChange={(e) => {
                      const updated = [...timeSlots];
                      updated[idx] = { ...updated[idx], time: e.target.value };
                      setTimeSlots(updated);
                    }}
                    wrapperClassName="min-w-0"
                  />
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    바로 방문
                    <span className="material-symbols-outlined text-sm text-gray-400">help</span>
                  </span>
              </div>

              {/* Designer, Start Time, Duration Groups */}
              <div className="space-y-4">
                {newBookingTimeSlots.map((slot, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                      {/* Service - category services only (saved with service_id) */}
                      <div className="min-w-0">
                        <label className="block text-sm font-medium text-gray-700 mb-1">서비스</label>
                        <select
                          disabled={newBookingLoadingOptions}
                          value={slot.serviceId != null ? String(slot.serviceId) : ''}
                          onChange={(e) => {
                            const updated = [...newBookingTimeSlots];
                            const val = e.target.value;
                            updated[index].serviceId = val ? Number(val) : null;
                            if (val) {
                              const svc = categoryServices.find((s) => s.id === Number(val));
                              if (svc?.duration_minutes) {
                                const rounded = Math.round(svc.duration_minutes / 30) * 30;
                                updated[index].duration = Math.min(180, Math.max(30, rounded));
                              }
                            }
                            setNewBookingTimeSlots(updated);
                          }}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                        >
                          <option value="">
                            {newBookingLoadingOptions ? '로딩 중...' : '선택하세요'}
                          </option>
                          {!newBookingLoadingOptions &&
                            categoryServices.map((s) => (
                              <option key={s.id} value={String(s.id)}>
                                {s.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Designer */}
                      <div className="min-w-0">
                        <label className="block text-sm font-medium text-gray-700 mb-1">디자이너</label>
                        <select
                          disabled={newBookingLoadingOptions}
                          value={slot.designerId ?? ''}
                          onChange={(e) => {
                            const updated = [...newBookingTimeSlots];
                            updated[index].designerId = e.target.value ? Number(e.target.value) : null;
                            setNewBookingTimeSlots(updated);
                          }}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                        >
                          <option value="">
                            {newBookingLoadingOptions ? '로딩 중...' : '선택하세요'}
                          </option>
                          {!newBookingLoadingOptions &&
                            newBookingDesigners.map((d: any) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                {/* Row 2: Item selection buttons */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">항목 선택</label>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setActiveSlotIndex(idx);
                      setBookingItemPickerInitialTab('service');
                      setIsBookingItemPickerOpen(true);
                    }}
                  >
                    서비스
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setActiveSlotIndex(idx);
                      setBookingItemPickerInitialTab('booking_item');
                      setIsBookingItemPickerOpen(true);
                    }}
                  >
                    예약 항목
                  </Button>
                </div>

                {/* Row 3: Selected items for this slot */}
                {slot.selectedItems.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    {slot.selectedItems.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-b-0"
                      >
                        <div>
                          <span className="text-sm text-gray-900">{item.name}</span>
                          <span className="text-xs text-gray-500 ml-2">{formatDurationLabel(item.durationMinutes ?? 0)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBookingItem(index, item.id, item.type)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
            </div>
            ))}
          </div>

          {/* Color Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">아이콘 표시</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setColorLabel(null)}
                className={`w-7 h-7 rounded border-2 flex items-center justify-center transition-all ${
                  colorLabel === null ? 'border-black' : 'border-gray-200 hover:border-gray-400'
                }`}
                title="없음"
              >
                <span className="material-symbols-outlined text-gray-400 text-sm">close</span>
              </button>
              {COLOR_LABEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColorLabel(opt.value)}
                  className={`w-7 h-7 rounded border-2 transition-all ${
                    colorLabel === opt.value ? 'border-black scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: opt.hex }}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          {/* Appointment Memo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">예약 메모</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모를 입력하세요"
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Booking Item Picker Modal */}
      <BookingItemPickerModal
        isOpen={isBookingItemPickerOpen}
        initialTab={bookingItemPickerInitialTab}
        onClose={() => setIsBookingItemPickerOpen(false)}
        onSelect={handleBookingItemsSelected}
      />
    </Modal>
  );
}