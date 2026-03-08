'use client';

// Comment: Week view grid - extracted from appointments page for readability and reuse

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { BookingWithRelations } from '@/lib/types';
import {
  GRID_START_HOUR,
  GRID_END_HOUR,
  GRID_30MIN_HEIGHT,
  DESIGNER_COLORS,
  getBookingStatusColor,
} from '@/lib/utils/appointment-utils';
import BookingContextMenu from './BookingContextMenu';
import BookingCard from './BookingCard';

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
  hoverCardPosition: { top: number; left: number } | null;
  hoverCardOriginalPositionRef: React.RefObject<{ top: number; left: number } | null>;
  setHoverCardPosition: (pos: { top: number; left: number } | null) => void;
  bookingMenuOpen: number | null;
  bookingMenuPosition: {
    top: number;
    left: number;
    width: number;
    scrollTop: number;
    scrollLeft: number;
  } | null;
  bookingMenuOriginalPositionRef: React.RefObject<{ top: number; left: number; width: number } | null>;
  setBookingMenuPosition: (pos: {
    top: number;
    left: number;
    width: number;
    scrollTop: number;
    scrollLeft: number;
  } | null) => void;
  menuCloseTimeoutRef: React.RefObject<NodeJS.Timeout | null>;
  menuOriginalPositionRef: React.RefObject<{ top: number; left: number; width: number } | null>;
  onOpenNewBooking: (data: { date: string; designerId: number; time: string; directVisit?: boolean }) => void;
  setBookingRestrictions: React.Dispatch<React.SetStateAction<any[]>>;
  setRestrictionDesignerId: (id: number | null) => void;
  setRestrictionDesignerName: (name: string) => void;
  setRestrictionDate: (date: string) => void;
  setRestrictionType: (type: 'date' | 'time') => void;
  setIsRestrictionModalOpen: (open: boolean) => void;
  setHoveredEmptySlot: (slot: EmptySlotIdentifier | null) => void;
  setEmptySlotMenuOpen: (slot: EmptySlotIdentifier | null) => void;
  setEmptySlotMenuPosition: (pos: EmptySlotMenuPosition | null) => void;
  setHoveredBooking: (id: number | null) => void;
  setBookingMenuOpen: (id: number | null) => void;
  setEditingBooking: (booking: BookingWithRelations | null) => void;
  setViewingBookingDetail: (booking: BookingWithRelations | null) => void;
  onBookingStatusChange?: (booking: BookingWithRelations, newStatus: 'ARRIVED' | 'NOSHOW') => Promise<void>;
  onCancelBooking?: (booking: BookingWithRelations) => void;
  onRegisterSale?: (booking: BookingWithRelations) => void;
  onViewSaleDetail?: (booking: BookingWithRelations) => void;
  weekViewAvailableDates?: Set<string>;
  // 임시저장 관련
  tempSaleBookingIds?: Set<number>;
  onOpenTempSale?: (booking: BookingWithRelations) => void;
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
  hoverCardPosition,
  hoverCardOriginalPositionRef,
  setHoverCardPosition,
  bookingMenuOpen,
  bookingMenuPosition,
  bookingMenuOriginalPositionRef,
  setBookingMenuPosition,
  menuCloseTimeoutRef,
  menuOriginalPositionRef,
  onOpenNewBooking,
  setBookingRestrictions,
  setRestrictionDesignerId,
  setRestrictionDesignerName,
  setRestrictionDate,
  setRestrictionType,
  setIsRestrictionModalOpen,
  setHoveredEmptySlot,
  setEmptySlotMenuOpen,
  setEmptySlotMenuPosition,
  setHoveredBooking,
  setBookingMenuOpen,
  setEditingBooking,
  setViewingBookingDetail,
  onBookingStatusChange,
  onCancelBooking,
  onRegisterSale,
  onViewSaleDetail,
  weekViewAvailableDates = new Set(),
  tempSaleBookingIds = new Set(),
  onOpenTempSale,
}: WeekViewGridProps) {
  // Comment: If designer not selected, nothing to render
  if (!weekViewDesignerId || !weekViewStartDate) return null;

  // Comment: 스크롤 이벤트 감지하여 호버 카드 위치 업데이트 (빈셀 메뉴와 동일한 방식)
  useEffect(() => {
    if (!hoverCardPosition || !hoveredBooking) {
      hoverCardOriginalPositionRef.current = null;
      return;
    }
    
    const scrollContainer = document.getElementById('schedule-scroll-container');
    if (!scrollContainer) return;
    
    // 호버 카드가 처음 표시될 때 원래 카드의 위치 저장 (스크롤 컨테이너 내부의 상대 위치)
    if (!hoverCardOriginalPositionRef.current) {
      const containerRect = scrollContainer.getBoundingClientRect();
      // 뷰포트 기준 위치에서 컨테이너의 뷰포트 위치를 빼서 상대 위치 계산
      const relativeTop = hoverCardPosition.top - containerRect.top + scrollContainer.scrollTop;
      const relativeLeft = hoverCardPosition.left - containerRect.left + scrollContainer.scrollLeft;
      hoverCardOriginalPositionRef.current = {
        top: relativeTop,
        left: relativeLeft
      };
    }
    
    const handleScroll = () => {
      if (!hoverCardOriginalPositionRef.current || !hoverCardPosition) return;
      
      // 호버 카드 요소를 직접 찾아서 위치 업데이트 (fixed 포지셔닝용)
      const hoverCardElement = document.querySelector('[data-hover-card]') as HTMLElement;
      if (hoverCardElement) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop;
        const scrollLeft = scrollContainer.scrollLeft;
        
        // 원래 카드의 뷰포트 기준 위치를 계산
        const viewportTop = containerRect.top + hoverCardOriginalPositionRef.current.top - scrollTop;
        const viewportLeft = containerRect.left + hoverCardOriginalPositionRef.current.left - scrollLeft;
        
        // fixed 포지셔닝에 맞게 뷰포트 기준 위치로 설정
        hoverCardElement.style.top = `${viewportTop}px`;
        hoverCardElement.style.left = `${viewportLeft}px`;
      }
    };
    
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [hoveredBooking, hoverCardPosition]);

  // Comment: 스크롤 이벤트 감지하여 예약 카드 메뉴 위치 업데이트 (빈셀 메뉴와 동일한 방식)
  useEffect(() => {
    if (!bookingMenuPosition || !bookingMenuOpen) {
      bookingMenuOriginalPositionRef.current = null;
      return;
    }
    
    const scrollContainer = document.getElementById('schedule-scroll-container');
    if (!scrollContainer) return;
    
    // 메뉴가 처음 열릴 때 원래 카드의 위치 저장 (스크롤 컨테이너 내부의 상대 위치)
    if (!bookingMenuOriginalPositionRef.current) {
      const containerRect = scrollContainer.getBoundingClientRect();
      // 뷰포트 기준 위치에서 컨테이너의 뷰포트 위치를 빼서 상대 위치 계산
      const relativeTop = bookingMenuPosition.top - containerRect.top + scrollContainer.scrollTop;
      const relativeLeft = bookingMenuPosition.left - containerRect.left + scrollContainer.scrollLeft;
      bookingMenuOriginalPositionRef.current = {
        top: relativeTop,
        left: relativeLeft,
        width: bookingMenuPosition.width
      };
    }
    
    const handleScroll = () => {
      if (!bookingMenuOriginalPositionRef.current || !bookingMenuPosition) return;
      
      // 메뉴 요소를 직접 찾아서 위치 업데이트 (fixed 포지셔닝용)
      const menuElement = document.querySelector('[data-booking-menu]') as HTMLElement;
      if (menuElement) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop;
        const scrollLeft = scrollContainer.scrollLeft;
        
        // 원래 카드의 뷰포트 기준 위치를 계산
        const viewportTop = containerRect.top + bookingMenuOriginalPositionRef.current.top - scrollTop;
        const viewportLeft = containerRect.left + bookingMenuOriginalPositionRef.current.left - scrollLeft;
        
        // fixed 포지셔닝에 맞게 뷰포트 기준 위치로 설정
        menuElement.style.top = `${viewportTop}px`;
        menuElement.style.left = `${viewportLeft}px`;
      }
    };
    
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [bookingMenuOpen, bookingMenuPosition]);

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
        const dayBookings = weekViewBookings.filter((b) => {
          if (b.booking_date !== dateStr) return false;
          // Comment: 취소된 예약은 타임테이블에서 제외
          const status = (b as any).status || (b as any).booking_status || '';
          const statusUpper = status.toUpperCase();
          if (statusUpper === 'CANCELLED' || statusUpper === 'CANCELED' || status === 'cancelled') {
            return false;
          }
          return true;
        });

        // Comment: Get restrictions for this designer on this date
        const dayRestrictions = bookingRestrictions.filter(
          (r) => r.designer_id === weekViewDesignerId && r.restriction_date === dateStr,
        );

        const color = DESIGNER_COLORS[0]; // Use first color for week view (kept for future color usage)
        const isDayOff = weekViewAvailableDates.size > 0 && !weekViewAvailableDates.has(dateStr);

        return (
          <div
            key={dayIndex}
            className={`relative h-full overflow-hidden ${isDayOff ? 'bg-gray-100/50' : ''}`}
            style={isDayOff ? { pointerEvents: 'none' as const } : undefined}
          >
            {/* Comment: Render restriction blocks (greyout) - skip on holidays */}
            {!isDayOff && dayRestrictions.map((restriction: any) => {
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

              if (hasBooking || !weekViewDesignerId || isDayOff) return null;

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
                      const timeStr = `${slotHour >= 12 ? slotHour - 12 : slotHour}:${String(
                        slotMin,
                      ).padStart(2, '0')} ${slotHour >= 12 ? 'PM' : 'AM'}`;
                      onOpenNewBooking({ date: dateStr, designerId: weekViewDesignerId, time: timeStr });
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
                  {/* More button - 메뉴가 열려있을 때도 보이도록 별도 렌더링 */}
                  {isHovered && (
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
                    </div>
                  )}

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
                                className="fixed bg-white rounded-lg shadow-lg z-[99999] min-w-[180px] flex flex-col"
                                style={{
                                  pointerEvents: 'auto',
                                  top: `${emptySlotMenuPosition.top}px`,
                                  left: `${emptySlotMenuPosition.left}px`,
                                  width: `${emptySlotMenuPosition.width}px`,
                                  height: 'auto',
                                  minHeight: 'fit-content',
                                  border: 'none',
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
                                  if (relatedTarget && relatedTarget instanceof Element) {
                                  if (
                                      relatedTarget.closest('.empty-slot-more-button') ||
                                      relatedTarget.closest('[data-empty-slot-menu]')
                                  ) {
                                    return;
                                    }
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
                                        const timeStr = `${slotHour >= 12 ? slotHour - 12 : slotHour}:${String(
                                          slotMin,
                                        ).padStart(2, '0')} ${
                                          slotHour >= 12 ? 'PM' : 'AM'
                                        }`;
                                        onOpenNewBooking({ date: dateStr, designerId: weekViewDesignerId || 0, time: timeStr });
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
                                        const timeStr = `${slotHour >= 12 ? slotHour - 12 : slotHour}:${String(
                                          slotMin,
                                        ).padStart(2, '0')} ${
                                          slotHour >= 12 ? 'PM' : 'AM'
                                        }`;
                                        onOpenNewBooking({ date: dateStr, designerId: weekViewDesignerId || 0, time: timeStr, directVisit: true });
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
                              document.body,
                            );
                          })()}
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
              const endMinutes = startMinutes + durationMinutes;

              // Check overlap with other bookings for this day
              let hasOverlap = false;
              let placeOnRight = false;
              dayBookings.forEach((other: any) => {
                if (other === b || !other.booking_time) return;
                const [ohStr, omStr] = other.booking_time.split(':');
                const oh = Number(ohStr);
                const om = Number(omStr);
                if (Number.isNaN(oh) || Number.isNaN(om)) return;
                const otherStart = (oh - GRID_START_HOUR) * 60 + om;
                const otherDuration =
                  other.service?.duration_minutes && other.service.duration_minutes > 0
                    ? other.service.duration_minutes
                    : 60;
                const otherEnd = otherStart + otherDuration;
                const overlap =
                  Math.max(startMinutes, otherStart) < Math.min(endMinutes, otherEnd);
                if (overlap) {
                  hasOverlap = true;
                  if ((other as any).id < (b as any).id) {
                    placeOnRight = true;
                  }
                }
              });

              const top = (startMinutes / 30) * GRID_30MIN_HEIGHT + 8;
              const height = Math.max((durationMinutes / 30) * GRID_30MIN_HEIGHT, 40);
              const widthPercent = hasOverlap ? 50 : 100;
              const leftPercent = hasOverlap && placeOnRight ? 50 : 0;

              const closeMenu = () => {
                setBookingMenuOpen(null);
                setBookingMenuPosition(null);
                if (bookingMenuOriginalPositionRef.current) {
                  bookingMenuOriginalPositionRef.current = null;
                }
              };

              return (
                <BookingCard
                  key={b.id}
                  booking={b}
                  className="absolute"
                  style={{ top, height, zIndex: 1, left: `${leftPercent}%`, width: `${widthPercent}%`, paddingLeft: 4, paddingRight: 4 }}
                  hoveredBooking={hoveredBooking}
                  bookingMenuOpen={bookingMenuOpen}
                  hoverCardPosition={hoverCardPosition}
                  bookingMenuPosition={bookingMenuPosition}
                  isNewBookingOpen={isNewBookingOpen}
                  setHoveredBooking={setHoveredBooking}
                  setHoverCardPosition={setHoverCardPosition}
                  hoverCardOriginalPositionRef={hoverCardOriginalPositionRef}
                  setBookingMenuOpen={setBookingMenuOpen}
                  setBookingMenuPosition={setBookingMenuPosition}
                  bookingMenuOriginalPositionRef={bookingMenuOriginalPositionRef}
                  menuCloseTimeoutRef={menuCloseTimeoutRef}
                  onNewBooking={(booking) => {
                    const bookingDate = booking.booking_date || '';
                    let bookingTime = '10:00 AM';
                    if (booking.booking_time) {
                      const [h, m] = booking.booking_time.split(':');
                      const hNum = Number(h);
                      const dh = hNum > 12 ? hNum - 12 : hNum === 0 ? 12 : hNum;
                      bookingTime = `${dh}:${m} ${hNum >= 12 ? 'PM' : 'AM'}`;
                    }
                    onOpenNewBooking({ date: bookingDate, designerId: booking.designer?.id || weekViewDesignerId || 0, time: bookingTime });
                    closeMenu();
                  }}
                  onEditBooking={(booking) => {
                    setEditingBooking(booking);
                    closeMenu();
                  }}
                  onViewDetail={(booking) => {
                    setViewingBookingDetail(booking);
                    closeMenu();
                  }}
                  onViewCustomer={(booking) => {
                    setViewingBookingDetail(booking);
                    closeMenu();
                  }}
                  onStatusChange={async (booking, newStatus) => {
                    if (onBookingStatusChange) {
                      await onBookingStatusChange(booking, newStatus);
                    }
                    closeMenu();
                  }}
                  onMoveBooking={(booking) => {
                    console.log('Move booking:', booking.id);
                    closeMenu();
                  }}
                  onCancelBooking={onCancelBooking ? (booking) => {
                    onCancelBooking(booking);
                    closeMenu();
                  } : undefined}
                  onRegisterSale={onRegisterSale ? (booking) => {
                    onRegisterSale(booking);
                    closeMenu();
                  } : undefined}
                  onViewSaleDetail={onViewSaleDetail ? (booking) => {
                    onViewSaleDetail(booking);
                    closeMenu();
                  } : undefined}
                  hasTempSale={tempSaleBookingIds.has(b.id)}
                  onOpenTempSale={onOpenTempSale}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

