'use client';

// Comment: Week view grid - extracted from appointments page for readability and reuse

import React from 'react';
import { createPortal } from 'react-dom';
import type { Booking } from '@/lib/types';
import {
  GRID_START_HOUR,
  GRID_END_HOUR,
  GRID_30MIN_HEIGHT,
  DESIGNER_COLORS,
  getBookingStatusColor,
} from '@/lib/utils/appointment-utils';

type BookingWithRelations = Booking & {
  designer?: { id: number; name: string } | null;
  service?: { id: number; name: string; duration_minutes?: number | null } | null;
};

interface EmptySlotIdentifier {
  date: string;
  designerId: number;
  time: string;
}

interface EmptySlotMenuPosition {
  top: number;
  left: number;
  width: number;
  scrollTop: number;
  scrollLeft: number;
}

interface WeekViewGridProps {
  weekViewDesignerId: number | null;
  weekViewDesignerName: string;
  weekViewStartDate: string;
  weekViewBookings: BookingWithRelations[];
  bookingRestrictions: any[];
  hoveredEmptySlot: EmptySlotIdentifier | null;
  emptySlotMenuOpen: EmptySlotIdentifier | null;
  emptySlotMenuPosition: EmptySlotMenuPosition | null;
  isNewBookingOpen: boolean;
  hoveredBooking: number | null;
  bookingMenuOpen: number | null;
  menuCloseTimeoutRef: React.RefObject<NodeJS.Timeout | null>;
  menuOriginalPositionRef: React.RefObject<{ top: number; left: number; width: number } | null>;
  setNewBookingDate: (date: string) => void;
  setNewBookingTimeSlots: React.Dispatch<
    React.SetStateAction<
      Array<{
        designerId: number | null;
        time: string;
        duration: number;
        serviceTab: 'service' | 'appointment';
        serviceId: number | null;
      }>
    >
  >;
  setIsNewBookingOpen: (open: boolean) => void;
  setNewBookingDirectVisit: (value: boolean) => void;
  setBookingRestrictions: React.Dispatch<React.SetStateAction<any[]>>;
  setRestrictionDesignerId: (id: number | null) => void;
  setRestrictionDesignerName: (name: string) => void;
  setRestrictionDate: (date: string) => void;
  setRestrictionType: (type: 'date' | 'time') => void;
  setRestrictionStartTime: (time: string) => void;
  setRestrictionEndTime: (time: string) => void;
  setExistingRestriction: (restriction: any | null) => void;
  setIsRestrictionModalOpen: (open: boolean) => void;
  setHoveredEmptySlot: (slot: EmptySlotIdentifier | null) => void;
  setEmptySlotMenuOpen: (slot: EmptySlotIdentifier | null) => void;
  setEmptySlotMenuPosition: (pos: EmptySlotMenuPosition | null) => void;
  setHoveredBooking: (id: number | null) => void;
  setBookingMenuOpen: (id: number | null) => void;
  setEditingBooking: (booking: BookingWithRelations | null) => void;
  setViewingBookingDetail: (booking: BookingWithRelations | null) => void;
}

export default function WeekViewGrid({
  weekViewDesignerId,
  weekViewDesignerName,
  weekViewStartDate,
  weekViewBookings,
  bookingRestrictions,
  hoveredEmptySlot,
  emptySlotMenuOpen,
  emptySlotMenuPosition,
  isNewBookingOpen,
  hoveredBooking,
  bookingMenuOpen,
  menuCloseTimeoutRef,
  menuOriginalPositionRef,
  setNewBookingDate,
  setNewBookingTimeSlots,
  setIsNewBookingOpen,
  setNewBookingDirectVisit,
  setBookingRestrictions,
  setRestrictionDesignerId,
  setRestrictionDesignerName,
  setRestrictionDate,
  setRestrictionType,
  setRestrictionStartTime,
  setRestrictionEndTime,
  setExistingRestriction,
  setIsRestrictionModalOpen,
  setHoveredEmptySlot,
  setEmptySlotMenuOpen,
  setEmptySlotMenuPosition,
  setHoveredBooking,
  setBookingMenuOpen,
  setEditingBooking,
  setViewingBookingDetail,
}: WeekViewGridProps) {
  // Comment: If designer not selected, nothing to render
  if (!weekViewDesignerId || !weekViewStartDate) return null;

  return (
    <div
      className="grid flex-1 bg-white relative"
      style={{ gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))' }}
    >
      {/* Vertical column dividers for week view - positioned to extend full scrollable height */}
      {/* Note: These dividers are rendered at lines 1166-1179 in the original page. */}
      {Array.from({ length: 7 }).map((_, colIndex) => {
        const columnWidth = 100 / 7;
        // Comment: Calculate total height based on time slots to match grid body height
        // This ensures dividers extend to the full height of the scrollable content
        const totalHeight =
          (GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16; // Add padding
        return (
          <div
            key={`week-divider-${colIndex}`}
            className="absolute border-r border-[#e2e8f0] pointer-events-none z-0"
            style={{
              left: `${(colIndex + 1) * columnWidth}%`,
              width: '1px',
              top: 0,
              height: `${totalHeight}px`,
              position: 'absolute',
            }}
          />
        );
      })}

      {/* Hour guidelines - 30 minute intervals with padding, full width */}
      <div className="absolute inset-0 pointer-events-none flex flex-col z-0 pt-2 pb-2" style={{ width: '100%' }}>
        {Array.from({ length: (GRID_END_HOUR - GRID_START_HOUR) * 2 }).map((_, i) => (
          <div
            key={i}
            className="h-[40px] border-b border-[#f1f5f9] border-dashed w-full"
          />
        ))}
      </div>

      {/* Show 7 days */}
      {Array.from({ length: 7 }).map((_, dayIndex) => {
        const currentDate = new Date(weekViewStartDate);
        currentDate.setDate(currentDate.getDate() + dayIndex);
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayBookings = weekViewBookings.filter((b) => b.booking_date === dateStr);

        // Comment: Get restrictions for this designer on this date
        const dayRestrictions = bookingRestrictions.filter(
          (r) => r.designer_id === weekViewDesignerId && r.restriction_date === dateStr,
        );

        const color = DESIGNER_COLORS[0]; // Use first color for week view (kept for future color usage)

        return (
          <div key={dayIndex} className="relative h-full">
            {/* Comment: Render restriction blocks (greyout) */}
            {dayRestrictions.map((restriction: any) => {
              if (restriction.restriction_type === 'date') {
                // Comment: Full day restriction - 진한 그레이 컬러
                return (
                  <div
                    key={`restriction-${restriction.id}`}
                    className="absolute inset-0 bg-gray-500/60 pointer-events-none z-5"
                  />
                );
              }
              if (
                restriction.restriction_type === 'time' &&
                restriction.start_time &&
                restriction.end_time
              ) {
                // Comment: Time range restriction - 진한 그레이 컬러
                const [startHour, startMin] = restriction.start_time.split(':').map(Number);
                const [endHour, endMin] = restriction.end_time.split(':').map(Number);
                const startMinutes = (startHour - GRID_START_HOUR) * 60 + startMin;
                const endMinutes = (endHour - GRID_START_HOUR) * 60 + endMin;
                if (startMinutes < 0 || endMinutes < 0) return null;

                const top = (startMinutes / 30) * GRID_30MIN_HEIGHT + 8;
                const height = ((endMinutes - startMinutes) / 30) * GRID_30MIN_HEIGHT;
                const slotTime = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(
                  2,
                  '0',
                )}`;

                return (
                  <div
                    key={`restriction-${restriction.id}`}
                    className="absolute left-0 right-0 bg-gray-500/60 z-[40] cursor-pointer"
                    style={{ top, height, pointerEvents: 'auto' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      console.log('Restriction cell clicked (week view):', {
                        dateStr,
                        weekViewDesignerId,
                        slotTime,
                        restriction,
                      });
                      // 예약금지 셀 클릭 시 드롭다운 메뉴 표시
                      const rect = e.currentTarget.getBoundingClientRect();
                      const cellElement = e.currentTarget.closest(
                        '[class*="relative h-full"]',
                      ) as HTMLElement | null;
                      const cellRect = cellElement?.getBoundingClientRect();
                      const menuWidth = cellRect ? cellRect.width : 180;
                      // 메뉴를 셀의 왼쪽에 맞춤
                      const menuLeft = cellRect ? cellRect.left : rect.left;

                      // 스크롤 컨테이너의 스크롤 위치 가져오기
                      const scrollContainer = document.getElementById('schedule-scroll-container');
                      const scrollTop = scrollContainer?.scrollTop || 0;
                      const scrollLeft = scrollContainer?.scrollLeft || 0;

                      // 뷰포트 기준 위치 저장 (메뉴 렌더링 시 상대 위치로 변환됨)
                      setEmptySlotMenuPosition({
                        top: rect.bottom,
                        left: menuLeft,
                        width: menuWidth,
                        scrollTop,
                        scrollLeft,
                      });
                      setEmptySlotMenuOpen({
                        date: dateStr,
                        designerId: weekViewDesignerId,
                        time: slotTime,
                      });
                    }}
                  />
                );
              }
              return null;
            })}

            {/* Empty slots with hover UI for week view */}
            {Array.from({ length: (GRID_END_HOUR - GRID_START_HOUR) * 2 }).map((_, slotIndex) => {
              const slotMinutes = slotIndex * 30;
              const slotHour = Math.floor((GRID_START_HOUR * 60 + slotMinutes) / 60);
              const slotMin = (GRID_START_HOUR * 60 + slotMinutes) % 60;
              const slotTime = `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(
                2,
                '0',
              )}`;
              const slotTop = (slotMinutes / 30) * GRID_30MIN_HEIGHT + 8;
              const slotHeight = GRID_30MIN_HEIGHT;

              // Check if this slot has a booking
              const hasBooking = dayBookings.some((b) => {
                if (!b.booking_time) return false;
                const [bHour, bMin] = b.booking_time.split(':').map(Number);
                const bStartMinutes = (bHour - GRID_START_HOUR) * 60 + bMin;
                const bDuration = b.service?.duration_minutes || 60;
                const bEndMinutes = bStartMinutes + bDuration;
                return slotMinutes >= bStartMinutes && slotMinutes < bEndMinutes;
              });

              // Check if this slot is restricted and get restriction info
              const slotRestriction = dayRestrictions.find((r: any) => {
                if (r.restriction_type === 'date') return true;
                if (r.restriction_type === 'time' && r.start_time && r.end_time) {
                  const [rStartHour, rStartMin] = r.start_time.split(':').map(Number);
                  const [rEndHour, rEndMin] = r.end_time.split(':').map(Number);
                  const rStartMinutes = (rStartHour - GRID_START_HOUR) * 60 + rStartMin;
                  const rEndMinutes = (rEndHour - GRID_START_HOUR) * 60 + rEndMin;
                  return slotMinutes >= rStartMinutes && slotMinutes < rEndMinutes;
                }
                return false;
              });
              const isRestricted = !!slotRestriction;

              if (hasBooking || !weekViewDesignerId) return null;

              const slotKey = `week-${dateStr}-${weekViewDesignerId}-${slotTime}`;
              const isHovered =
                hoveredEmptySlot?.date === dateStr &&
                hoveredEmptySlot?.designerId === weekViewDesignerId &&
                hoveredEmptySlot?.time === slotTime;
              const isMenuOpen =
                emptySlotMenuOpen?.date === dateStr &&
                emptySlotMenuOpen?.designerId === weekViewDesignerId &&
                emptySlotMenuOpen?.time === slotTime;

              // Debug log
              if (isMenuOpen) {
                console.log('Menu should be open (week view):', {
                  dateStr,
                  weekViewDesignerId,
                  slotTime,
                  emptySlotMenuOpen,
                });
              }

              return (
                <div
                  key={slotKey}
                  className="absolute left-0 right-0 z-0 select-none"
                  style={{
                    top: slotTop,
                    height: slotHeight,
                    pointerEvents:
                      (emptySlotMenuOpen && !isMenuOpen) || (isRestricted && slotRestriction)
                        ? 'none'
                        : 'auto',
                    cursor: !isRestricted && weekViewDesignerId ? 'pointer' : 'default',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                  onMouseDown={(e) => {
                    // Comment: Ignore clicks coming from more button or its menu (week view)
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('button[type="button"]') ||
                      target.closest('[data-empty-slot-menu]') ||
                      target.closest('.empty-slot-more-button')
                    ) {
                      return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    // Comment: Open "New Booking" modal immediately on click (week view)
                    if (!isRestricted && weekViewDesignerId) {
                      console.log('Empty slot clicked (week view - outer): opening new booking modal', {
                        dateStr,
                        weekViewDesignerId,
                        slotTime,
                      });
                      setNewBookingDate(dateStr);
                      const timeStr = `${slotHour >= 12 ? slotHour - 12 : slotHour}:${String(
                        slotMin,
                      ).padStart(2, '0')} ${slotHour >= 12 ? 'PM' : 'AM'}`;
                      setNewBookingTimeSlots([
                        {
                          designerId: weekViewDesignerId,
                          time: timeStr,
                          duration: 30,
                          serviceTab: 'service',
                          serviceId: null,
                        },
                      ]);
                      setIsNewBookingOpen(true);
                      setHoveredEmptySlot(null);
                    }
                  }}
                  onMouseEnter={() => {
                    // 메뉴가 열려있으면 다른 셀의 호버 무시
                    if (emptySlotMenuOpen) {
                      return;
                    }
                    // 예약 금지 셀은 호버하지 않음 (restriction 블록이 처리)
                    if (!isRestricted) {
                      setHoveredEmptySlot({ date: dateStr, designerId: weekViewDesignerId, time: slotTime });
                    }
                  }}
                  onMouseLeave={() => {
                    // 메뉴가 열려있으면 다른 셀로 이동해도 hoveredEmptySlot을 변경하지 않음
                    if (isMenuOpen) {
                      return;
                    }
                    // 메뉴가 열려있지 않을 때만 hoveredEmptySlot을 null로 설정
                    setHoveredEmptySlot(null);
                  }}
                >
                  {isHovered && (
                    <div
                      className="h-full w-full relative group"
                      style={{ zIndex: isMenuOpen ? 10000 : undefined }}
                    >
                      <div
                        className="absolute right-1 top-1/2 -translate-y-1/2 z-[9999] empty-slot-more-button"
                        style={{ pointerEvents: 'auto' }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const menuData = {
                              date: dateStr,
                              designerId: weekViewDesignerId,
                              time: slotTime,
                            };
                            console.log('Setting emptySlotMenuOpen (week view):', menuData);
                            // 현재 메뉴가 이미 열려있으면 닫고, 아니면 열기
                            if (isMenuOpen) {
                              setEmptySlotMenuOpen(null);
                              setEmptySlotMenuPosition(null);
                            } else {
                              // 버튼 위치 계산
                              const rect = e.currentTarget.getBoundingClientRect();
                              // 버튼의 부모 셀 찾기
                              const cellElement = e.currentTarget.closest(
                                '[class*="absolute left-0 right-0"]',
                              ) as HTMLElement | null;
                              const cellRect = cellElement?.getBoundingClientRect();

                              // 셀의 너비를 메뉴 너비로 사용
                              const menuWidth = cellRect ? cellRect.width : 180;

                              // 메뉴를 버튼의 오른쪽에 맞추되, 셀 경계를 넘지 않도록 조정
                              let menuLeft = rect.right;
                              if (cellRect && menuLeft + menuWidth > cellRect.right) {
                                // 셀을 넘어가면 셀의 왼쪽에 맞춤
                                menuLeft = cellRect.left;
                              }

                              // 스크롤 컨테이너의 스크롤 위치 가져오기
                              const scrollContainer = document.getElementById(
                                'schedule-scroll-container',
                              );
                              const scrollTop = scrollContainer?.scrollTop || 0;
                              const scrollLeft = scrollContainer?.scrollLeft || 0;

                              // 뷰포트 기준 위치 저장 (메뉴 렌더링 시 상대 위치로 변환됨)
                              setEmptySlotMenuPosition({
                                top: rect.bottom,
                                left: menuLeft,
                                width: menuWidth,
                                scrollTop,
                                scrollLeft,
                              });
                              setEmptySlotMenuOpen(menuData);
                            }
                          }}
                          onMouseEnter={() => {
                            // 버튼으로 다시 들어오면 타이머 취소
                            if (menuCloseTimeoutRef.current) {
                              clearTimeout(menuCloseTimeoutRef.current);
                              menuCloseTimeoutRef.current = null;
                            }
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors shadow-sm"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <span className="material-symbols-outlined text-sm text-gray-600 pointer-events-none">
                            more_vert
                          </span>
                        </button>

                        {/* Empty slot context menu - Portal로 렌더링 */}
                        {isMenuOpen &&
                          !isNewBookingOpen &&
                          emptySlotMenuPosition &&
                          typeof window !== 'undefined' &&
                          (() => {
                            const scrollContainer = document.getElementById(
                              'schedule-scroll-container',
                            );
                            if (!scrollContainer) return null;

                            // 스크롤 컨테이너 내부의 상대 위치 계산
                            const containerRect = scrollContainer.getBoundingClientRect();
                            const scrollTop = scrollContainer.scrollTop;
                            const scrollLeft = scrollContainer.scrollLeft;

                            // 셀의 절대 위치를 스크롤 컨테이너 기준 상대 위치로 변환
                            const relativeTop =
                              emptySlotMenuPosition.top - containerRect.top + scrollTop;
                            const relativeLeft =
                              emptySlotMenuPosition.left - containerRect.left + scrollLeft;

                            // 원래 위치 저장 (한 번만)
                            if (!menuOriginalPositionRef.current) {
                              menuOriginalPositionRef.current = {
                                top: relativeTop,
                                left: relativeLeft,
                                width: emptySlotMenuPosition.width,
                              };
                            }

                            return createPortal(
                              <div
                                data-empty-slot-menu
                                className="absolute bg-white border border-gray-200 rounded-lg shadow-lg z-[99999] min-w-[180px]"
                                style={{
                                  pointerEvents: 'auto',
                                  top: `${menuOriginalPositionRef.current?.top || relativeTop}px`,
                                  left: `${menuOriginalPositionRef.current?.left || relativeLeft}px`,
                                  width: `${emptySlotMenuPosition.width}px`,
                                }}
                                onMouseEnter={() => {
                                  // 메뉴로 다시 들어오면 타이머 취소
                                  if (menuCloseTimeoutRef.current) {
                                    clearTimeout(menuCloseTimeoutRef.current);
                                    menuCloseTimeoutRef.current = null;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  // 메뉴를 벗어날 때 약간의 지연을 두고 닫기
                                  const relatedTarget = e.relatedTarget as HTMLElement | null;
                                  // 버튼이나 메뉴 내부로 이동하는 경우는 무시
                                  if (
                                    relatedTarget?.closest('.empty-slot-more-button') ||
                                    relatedTarget?.closest('[data-empty-slot-menu]')
                                  ) {
                                    return;
                                  }
                                  // relatedTarget이 null이거나 없을 때도 버튼 위에 마우스가 있는지 확인
                                  const buttonElement = document.querySelector(
                                    '.empty-slot-more-button:hover',
                                  );
                                  if (buttonElement) {
                                    return;
                                  }
                                  // 기존 타이머가 있으면 취소
                                  if (menuCloseTimeoutRef.current) {
                                    clearTimeout(menuCloseTimeoutRef.current);
                                  }
                                  // 약간의 지연을 두고 메뉴 닫기 (마우스가 다시 메뉴로 돌아올 수 있도록)
                                  menuCloseTimeoutRef.current = setTimeout(() => {
                                    // 메뉴나 버튼 위에 마우스가 없을 때만 닫기
                                    const menuElement = document.querySelector(
                                      '[data-empty-slot-menu]',
                                    );
                                    const hoverButtonElement = document.querySelector(
                                      '.empty-slot-more-button:hover',
                                    );
                                    if (
                                      !menuElement?.matches(':hover') &&
                                      !hoverButtonElement
                                    ) {
                                      setEmptySlotMenuOpen(null);
                                      setEmptySlotMenuPosition(null);
                                    }
                                    menuCloseTimeoutRef.current = null;
                                  }, 200);
                                }}
                              >
                                {isRestricted && slotRestriction ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        // 예약금지 취소 - 바로 삭제
                                        if (!confirm('예약금지를 취소하시겠습니까?')) {
                                          return;
                                        }
                                        try {
                                          const res = await fetch(
                                            `/api/booking-restrictions?id=${slotRestriction.id}`,
                                            {
                                              method: 'DELETE',
                                            },
                                          );
                                          if (res.ok) {
                                            // 예약 금지 목록 새로고침
                                            const startDate = new Date(weekViewStartDate);
                                            const endDate = new Date(startDate);
                                            endDate.setDate(endDate.getDate() + 6);
                                            const startDateStr =
                                              startDate.toISOString().split('T')[0];
                                            const endDateStr =
                                              endDate.toISOString().split('T')[0];

                                            const restrictionsRes = await fetch(
                                              `/api/booking-restrictions?designer_id=${weekViewDesignerId}&start_date=${startDateStr}&end_date=${endDateStr}`,
                                            );
                                            const restrictionsData =
                                              await restrictionsRes.json();
                                            if (restrictionsRes.ok) {
                                              setBookingRestrictions(
                                                restrictionsData.restrictions || [],
                                              );
                                            }
                                            setEmptySlotMenuOpen(null);
                                            setEmptySlotMenuPosition(null);
                                            setHoveredEmptySlot(null);
                                          } else {
                                            const data = await res.json();
                                            alert(
                                              data.error ||
                                                '예약금지 취소에 실패했습니다.',
                                            );
                                          }
                                        } catch (error) {
                                          console.error(
                                            'Error deleting restriction:',
                                            error,
                                          );
                                          alert('예약금지 취소에 실패했습니다.');
                                        }
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                                    >
                                      예약금지 취소
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // 예약금지 수정 - 모달 띄움
                                        setRestrictionDesignerId(weekViewDesignerId);
                                        setRestrictionDesignerName(weekViewDesignerName);
                                        setRestrictionDate(dateStr);
                                        setRestrictionType(
                                          slotRestriction.restriction_type || 'time',
                                        );
                                        if (slotRestriction.restriction_type === 'time') {
                                          setRestrictionStartTime(
                                            slotRestriction.start_time?.substring(0, 5) ||
                                              slotTime,
                                          );
                                          setRestrictionEndTime(
                                            slotRestriction.end_time?.substring(0, 5) || '',
                                          );
                                        } else {
                                          setRestrictionStartTime('');
                                          setRestrictionEndTime('');
                                        }
                                        setExistingRestriction(slotRestriction);
                                        setIsRestrictionModalOpen(true);
                                        setEmptySlotMenuOpen(null);
                                        setEmptySlotMenuPosition(null);
                                        setHoveredEmptySlot(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                                    >
                                      예약금지 수정
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNewBookingDate(dateStr);
                                        const timeStr = `${slotHour >= 12 ? slotHour - 12 : slotHour}:${String(
                                          slotMin,
                                        ).padStart(2, '0')} ${
                                          slotHour >= 12 ? 'PM' : 'AM'
                                        }`;
                                        setNewBookingTimeSlots([
                                          {
                                            designerId: weekViewDesignerId,
                                            time: timeStr,
                                            duration: 30,
                                            serviceTab: 'service',
                                            serviceId: null,
                                          },
                                        ]);
                                        setIsNewBookingOpen(true);
                                        setEmptySlotMenuOpen(null);
                                        setEmptySlotMenuPosition(null);
                                        setHoveredEmptySlot(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                                    >
                                      예약 등록
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // 바로 방문: 예약 등록 모달에 "바로 방문" 체크박스 체크된 상태로 열기
                                        setNewBookingDate(dateStr);
                                        const timeStr = `${slotHour >= 12 ? slotHour - 12 : slotHour}:${String(
                                          slotMin,
                                        ).padStart(2, '0')} ${
                                          slotHour >= 12 ? 'PM' : 'AM'
                                        }`;
                                        setNewBookingTimeSlots([
                                          {
                                            designerId: weekViewDesignerId,
                                            time: timeStr,
                                            duration: 30,
                                            serviceTab: 'service',
                                            serviceId: null,
                                          },
                                        ]);
                                        setNewBookingDirectVisit(true); // 바로 방문 체크박스 체크
                                        setIsNewBookingOpen(true);
                                        setEmptySlotMenuOpen(null);
                                        setEmptySlotMenuPosition(null);
                                        setHoveredEmptySlot(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      바로 방문
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        // 예약 금지 바로 적용
                                        const endTime = new Date(`2000-01-01T${slotTime}`);
                                        endTime.setMinutes(endTime.getMinutes() + 30);
                                        const endTimeStr = `${String(
                                          endTime.getHours(),
                                        ).padStart(2, '0')}:${String(
                                          endTime.getMinutes(),
                                        ).padStart(2, '0')}`;

                                        try {
                                          const res = await fetch('/api/booking-restrictions', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              designer_id: weekViewDesignerId,
                                              restriction_type: 'time',
                                              restriction_date: dateStr,
                                              start_time: slotTime,
                                              end_time: endTimeStr,
                                            }),
                                          });
                                          if (res.ok) {
                                            // 예약 금지 목록 새로고침
                                            const startDate = new Date(weekViewStartDate);
                                            const endDate = new Date(startDate);
                                            endDate.setDate(endDate.getDate() + 6);
                                            const startDateStr =
                                              startDate.toISOString().split('T')[0];
                                            const endDateStr =
                                              endDate.toISOString().split('T')[0];

                                            const restrictionsRes = await fetch(
                                              `/api/booking-restrictions?designer_id=${weekViewDesignerId}&start_date=${startDateStr}&end_date=${endDateStr}`,
                                            );
                                            const restrictionsData =
                                              await restrictionsRes.json();
                                            if (restrictionsRes.ok) {
                                              setBookingRestrictions(
                                                restrictionsData.restrictions || [],
                                              );
                                            }
                                            setEmptySlotMenuOpen(null);
                                            setEmptySlotMenuPosition(null);
                                            setHoveredEmptySlot(null);
                                          } else {
                                            const data = await res.json();
                                            alert(
                                              data.error ||
                                                '예약금지 등록에 실패했습니다.',
                                            );
                                          }
                                        } catch (error) {
                                          console.error('Error creating restriction:', error);
                                          alert('예약금지 등록에 실패했습니다.');
                                        }
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                                    >
                                      예약 금지
                                    </button>
                                  </>
                                )}
                              </div>,
                              (() => {
                                const scrollContainer = document.getElementById(
                                  'schedule-scroll-container',
                                );
                                return scrollContainer || document.body;
                              })(),
                            );
                          })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bookings for this day (week view) */}
            {dayBookings.map((b) => {
              if (!b.booking_time) return null;
              const [hourStr, minuteStr] = b.booking_time.split(':');
              const hour = Number(hourStr);
              const minutes = Number(minuteStr);
              if (Number.isNaN(hour) || Number.isNaN(minutes)) return null;

              const startMinutes = (hour - GRID_START_HOUR) * 60 + minutes;
              if (startMinutes < 0) return null;

              const durationMinutes =
                b.service?.duration_minutes && b.service.duration_minutes > 0
                  ? b.service.duration_minutes
                  : 60;
              const top = (startMinutes / 30) * GRID_30MIN_HEIGHT + 8;
              const height = Math.max((durationMinutes / 30) * GRID_30MIN_HEIGHT, 40);

              const serviceName = b.service?.name || 'Service';
              const timeLabel = `${hourStr.padStart(2, '0')}:${minuteStr}`;
              const statusColor = getBookingStatusColor(
                (b as any).status || (b as any).booking_status,
              );
              const customerName =
                (b as any).customer?.name || (b as any).customer_name || '고객';
              const customerId =
                (b as any).customer?.id || (b as any).customer_id || b.id;
              const customerPhone =
                (b as any).customer?.phone || (b as any).customer_phone || '';
              const bookingMemo = (b as any).memo || (b as any).note || '';

              return (
              <div
                key={b.id}
                className="absolute left-1 right-1"
                style={{ top, height, zIndex: 1 }}
                onMouseEnter={() => setHoveredBooking(b.id || null)}
                onMouseLeave={() => {
                  setHoveredBooking(null);
                  setBookingMenuOpen((prev) => (prev === b.id ? null : prev));
                }}
              >
                  <div
                    className={`h-full w-full ${statusColor.bg} border-l-4 ${statusColor.border} rounded transition-all cursor-pointer p-2 flex flex-col justify-between overflow-visible relative`}
                    style={{ zIndex: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (b.id) {
                        setBookingMenuOpen((prev) => (prev === b.id ? null : b.id));
                      }
                    }}
                  >
                    <div>
                      <p className={`text-xs font-bold ${statusColor.text} mb-0.5`}>
                        {customerName}
                      </p>
                      <p className={`text-[11px] ${statusColor.text} opacity-70`}>
                        {serviceName}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] font-mono ${statusColor.text} opacity-60`}>
                        {timeLabel}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${statusColor.text} bg-white/50 px-1.5 py-0.5 rounded`}
                      >
                        {customerId}
                      </span>
                    </div>

                    {/* Hover Card */}
                    {hoveredBooking === b.id && !isNewBookingOpen && (
                      <div className="absolute top-0 left-full ml-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[280px] p-3">
                        <div
                          className={`${statusColor.headerBg} ${statusColor.headerText} px-3 py-2 rounded-t-lg -mx-3 -mt-3 mb-2`}
                        >
                          <p className="text-xs font-bold">{statusColor.label}</p>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          {/* timeRange */}
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-16 shrink-0">시간</span>
                            <span className="text-gray-900">
                              {timeLabel} ~
                              {(() => {
                                const endTime = new Date(
                                  `2000-01-01T${hourStr}:${minuteStr}`,
                                );
                                endTime.setMinutes(endTime.getMinutes() + durationMinutes);
                                return ` ${String(endTime.getHours()).padStart(
                                  2,
                                  '0',
                                )}:${String(endTime.getMinutes()).padStart(2, '0')}`;
                              })()}
                            </span>
                          </div>
                          {/* customerName */}
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-16 shrink-0">고객명</span>
                            <span className="text-gray-900">
                              {customerName} ({b.id || customerId})
                            </span>
                          </div>
                          {/* phone */}
                          {(statusColor.statusEnum === 'PAID' ||
                            statusColor.statusEnum === 'BOOKED') &&
                            customerPhone && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-16 shrink-0">전화번호</span>
                                <span className="text-gray-900">{customerPhone}</span>
                              </div>
                            )}
                          {/* serviceName */}
                          {(statusColor.statusEnum === 'ARRIVED' ||
                            statusColor.statusEnum === 'PAID' ||
                            statusColor.statusEnum === 'BOOKED') &&
                            serviceName && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-16 shrink-0">시술명</span>
                                <span className="text-gray-900">{serviceName}</span>
                              </div>
                            )}
                          {/* memo */}
                          {(statusColor.statusEnum === 'ARRIVED' ||
                            statusColor.statusEnum === 'BOOKED' ||
                            statusColor.statusEnum === 'NOSHOW') &&
                            bookingMemo && (
                              <>
                                <div className="border-t border-gray-200 my-1.5" />
                                <div className="text-gray-700">{bookingMemo}</div>
                              </>
                            )}
                        </div>
                      </div>
                    )}

                    {/* Context Menu - 통합 4개 항목 */}
                    {bookingMenuOpen === b.id && !isNewBookingOpen && (
                      <div
                        data-booking-menu
                        className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsNewBookingOpen(true);
                            setBookingMenuOpen(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                        >
                          예약 등록
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBooking(b);
                            setBookingMenuOpen(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          예약 수정
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: 판매 상세 구현
                            setBookingMenuOpen(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          판매 상세
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingBookingDetail(b);
                            setBookingMenuOpen(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                        >
                          고객 정보
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

