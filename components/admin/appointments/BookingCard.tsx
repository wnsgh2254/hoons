'use client';

import React from 'react';
import { getBookingStatusColor, GRID_START_HOUR, GRID_30MIN_HEIGHT } from '@/lib/utils/appointment-utils';
import type { Booking } from '@/lib/types';
import BookingContextMenu from './BookingContextMenu';
import { createPortal } from 'react-dom';

type BookingWithRelations = Booking & {
  designer?: { id: number; name: string } | null;
  service?: { id: number; name: string; duration_minutes?: number | null } | null;
};

interface BookingCardProps {
  booking: BookingWithRelations;
  emptySlotMenuOpen: { date: string; designerId: number; time: string } | null;
  isNewBookingOpen: boolean;
  hoveredBooking: number | null;
  bookingMenuOpen: number | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onCardClick: () => void;
  onNewBooking: () => void;
  onEditBooking: (booking: BookingWithRelations) => void;
  onViewDetail: (booking: BookingWithRelations) => void;
  onViewCustomer: (booking: BookingWithRelations) => void;
  onStatusChange?: (booking: BookingWithRelations, newStatus: 'ARRIVED' | 'NOSHOW' | 'BOOKED') => Promise<void>;
}

function BookingCard({
  booking,
  emptySlotMenuOpen,
  isNewBookingOpen,
  hoveredBooking,
  bookingMenuOpen,
  onMouseEnter,
  onMouseLeave,
  onCardClick,
  onNewBooking,
  onEditBooking,
  onViewDetail,
  onViewCustomer,
  onStatusChange,
}: BookingCardProps) {
  if (!booking.booking_time) return null;

  const [hourStr, minuteStr] = booking.booking_time.split(':');
  const hour = Number(hourStr);
  const minutes = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minutes)) return null;

  const startMinutes = (hour - GRID_START_HOUR) * 60 + minutes;
  if (startMinutes < 0) return null;

  const durationMinutes =
    booking.service?.duration_minutes && booking.service.duration_minutes > 0
      ? booking.service.duration_minutes
      : 60;
  const top = (startMinutes / 30) * GRID_30MIN_HEIGHT + 8;
  const height = Math.max((durationMinutes / 30) * GRID_30MIN_HEIGHT, 40);

  const serviceName =
    (booking as any).service_for_display ||
    (booking as any).custom_service_name ||
    booking.service?.name ||
    'Service';
  const timeLabel = `${hourStr.padStart(2, '0')}:${minuteStr}`;
  const statusColor = getBookingStatusColor((booking as any).status || (booking as any).booking_status);
  const customerName = (booking as any).customer?.name || (booking as any).customer_name || '고객';
  const customerId = (booking as any).customer?.id || (booking as any).customer_id || booking.id;
  const customerPhone = (booking as any).customer?.phone || (booking as any).customer_phone || '';
  const bookingMemo = (booking as any).memo || (booking as any).note || '';

  const isHovered = hoveredBooking === booking.id;
  const isMenuOpen = bookingMenuOpen === booking.id;

  return (
    <div
      data-booking-card={booking.id}
      className="absolute left-1 right-1"
      style={{ top, height, zIndex: emptySlotMenuOpen ? 0 : 1 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={(e) => {
        const relatedTarget = e.relatedTarget;
        // relatedTarget이 Element인지 확인
        if (relatedTarget && relatedTarget instanceof Element) {
          // 드롭다운 메뉴나 호버 카드로 이동하는 경우는 무시
          if (
            relatedTarget.closest('[data-booking-menu]') ||
            relatedTarget.closest('[data-booking-card]')
          ) {
            return;
          }
        }
        onMouseLeave();
      }}
    >
      <div
        className={`h-full w-full ${statusColor.bg} border-l-4 ${statusColor.border} rounded transition-all cursor-pointer p-2 flex flex-col justify-between overflow-hidden relative`}
        style={{ zIndex: emptySlotMenuOpen ? 0 : 1 }}
        onClick={onCardClick}
      >
        <div>
          <p className={`text-xs font-bold ${statusColor.text} mb-0.5`}>
            {customerName}
          </p>
          <p className={`text-[11px] ${statusColor.text} opacity-70`}>{serviceName}</p>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className={`text-[10px] font-mono ${statusColor.text} opacity-60`}>
            {timeLabel}
          </span>
        </div>

        {/* Hover Card - Portal로 렌더링 */}
        {isHovered && !isNewBookingOpen && !isMenuOpen && typeof window !== 'undefined' && (() => {
          // 예약 카드의 위치를 계산하여 호버 카드 위치 결정
          const cardElement = document.querySelector(`[data-booking-card="${booking.id}"]`) as HTMLElement;
          if (!cardElement) return null;
          
          const cardRect = cardElement.getBoundingClientRect();
          const hoverTop = cardRect.top;
          const hoverLeft = cardRect.right + 4; // 카드 오른쪽에 4px 간격
          
          return createPortal(
            <div 
              data-hover-card
              className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[280px] p-3"
              style={{
                top: `${hoverTop}px`,
                left: `${hoverLeft}px`,
              }}
            >
            <div className={`${statusColor.headerBg} ${statusColor.headerText} px-3 py-2 rounded-t-lg -mx-3 -mt-3 mb-2`}>
              <p className="text-xs font-bold">{statusColor.label}</p>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-16 shrink-0">시간</span>
                <span className="text-gray-900">
                  {timeLabel} ~ {(() => {
                    const endTime = new Date(`2000-01-01T${hourStr}:${minuteStr}`);
                    endTime.setMinutes(endTime.getMinutes() + durationMinutes);
                    return `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
                  })()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-16 shrink-0">고객명</span>
                <span className="text-gray-900">{customerName} ({booking.id || customerId})</span>
              </div>
                {/* phone - 모든 상태에서 표시 */}
                {customerPhone && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-16 shrink-0">전화번호</span>
                  <span className="text-gray-900">{customerPhone}</span>
                </div>
              )}
                {/* serviceName - 모든 상태에서 표시 */}
                {serviceName && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-16 shrink-0">시술명</span>
                  <span className="text-gray-900">{serviceName}</span>
                </div>
              )}
                {/* memo - 모든 상태에서 표시 */}
                {bookingMemo && (
                <>
                  <div className="border-t border-gray-200 my-1.5"></div>
                  <div className="text-gray-700">{bookingMemo}</div>
                </>
              )}
            </div>
            </div>,
            document.body
          );
        })()}

        {/* Context Menu - Portal로 렌더링 */}
        {isMenuOpen && !isNewBookingOpen && typeof window !== 'undefined' && (() => {
          // 예약 카드의 위치를 계산하여 드롭다운 메뉴 위치 결정
          const cardElement = document.querySelector(`[data-booking-card="${booking.id}"]`) as HTMLElement;
          if (!cardElement) return null;
          
          const cardRect = cardElement.getBoundingClientRect();
          // 셀 컨테이너의 전체 너비를 가져오기 위해 부모 요소 확인
          const cellContainer = cardElement.closest('.relative.h-full.overflow-hidden') as HTMLElement;
          const menuTop = cardRect.bottom + 4; // 카드 아래에 4px 간격
          const menuLeft = cardRect.left; // 예약 카드의 왼쪽에 맞춤
          const menuWidth = cellContainer ? cellContainer.getBoundingClientRect().width - 8 : cardRect.width; // 셀 전체 너비 (padding 제외)
          
          return createPortal(
            <div
              data-booking-menu
              onMouseEnter={() => {
                // 드롭다운 메뉴 위에 마우스가 있을 때는 메뉴를 유지
                onMouseEnter();
              }}
              onMouseLeave={(e) => {
                const relatedTarget = e.relatedTarget as HTMLElement | null;
                // 예약 카드로 다시 이동하는 경우는 무시
                if (relatedTarget?.closest('[data-booking-card]')) {
                  return;
                }
                onMouseLeave();
              }}
            >
          <BookingContextMenu
            booking={booking}
            onNewBooking={onNewBooking}
            onEditBooking={onEditBooking}
            onViewDetail={onViewDetail}
            onViewCustomer={onViewCustomer}
                onStatusChange={async (booking, newStatus) => {
                  if (onStatusChange) {
                    await onStatusChange(booking, newStatus);
                  }
                }}
                onMoveBooking={(booking) => {
                  // TODO: 예약 이동 구현
                  console.log('Move booking:', booking.id);
                }}
                onCancelBooking={(booking) => {
                  // TODO: 예약 취소 구현
                  console.log('Cancel booking:', booking.id);
                }}
                onRegisterSale={(booking) => {
                  // TODO: 판매 등록 구현
                  console.log('Register sale:', booking.id);
                }}
                onViewSaleDetail={(booking) => {
                  // TODO: 판매 상세 구현
                  console.log('View sale detail:', booking.id);
                }}
                className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                style={{
                  top: `${menuTop}px`,
                  left: `${menuLeft}px`,
                  width: `${menuWidth}px`,
                }}
              />
            </div>,
            document.body
          );
        })()}
        </div>
    </div>
  );
}

export default React.memo(BookingCard);
