'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import type { BookingWithRelations } from '@/lib/types';
import {
  resolveBookingCardStatusColor,
  COLOR_LABEL_MAP,
  getBookingDurationMinutes,
  type BookingHoverCardPosition,
} from '@/lib/utils/appointment-utils';
import BookingContextMenu from './BookingContextMenu';

export interface ScheduleDayViewMenuHandlers {
  onNewBooking: (booking: BookingWithRelations) => void;
  onEditBooking: (booking: BookingWithRelations) => void;
  onViewDetail: (booking: BookingWithRelations) => Promise<void>;
  onViewCustomer: (booking: BookingWithRelations) => Promise<void>;
  onStatusChange: (booking: BookingWithRelations, newStatus: 'ARRIVED' | 'NOSHOW' | 'BOOKED') => Promise<void>;
  onMoveBooking: (booking: BookingWithRelations) => void;
  onCancelBooking: (booking: BookingWithRelations) => void;
  onRegisterSale: (booking: BookingWithRelations) => void;
  onViewSaleDetail: (booking: BookingWithRelations) => void;
}

interface ScheduleDayViewBookingCardProps {
  booking: BookingWithRelations;
  top: number;
  height: number;
  widthPercent: number;
  leftPercent: number;
  emptySlotMenuOpen: {
    date: string;
    designerId: number;
    columnShopId: number;
    time: string;
  } | null;
  isMenuOpen: boolean;
  isHovered: boolean;
  isNewBookingOpen: boolean;
  hoverCardPosition: BookingHoverCardPosition | null;
  bookingMenuPosition: {
    top: number;
    triggerTop: number;
    left: number;
    width: number;
    scrollTop: number;
    scrollLeft: number;
    placement: 'top' | 'bottom';
  } | null;
  onCardClick: (e: React.MouseEvent, bookingId: number) => void;
  onMouseEnter: (bookingId: number) => void;
  onMouseLeave: (e: React.MouseEvent, bookingId: number) => void;
  menuHandlers: ScheduleDayViewMenuHandlers;
  onMenuMouseEnter: (bookingId: number) => void;
  onMenuMouseLeave: (e: React.MouseEvent, bookingId: number) => void;
  menuCloseTimeoutRef: React.RefObject<NodeJS.Timeout | null>;
  bookingMenuOriginalPositionRef: React.RefObject<{ top: number; left: number; width: number } | null>;
}

function ScheduleDayViewBookingCard({
  booking,
  top,
  height,
  widthPercent,
  leftPercent,
  emptySlotMenuOpen,
  isMenuOpen,
  isHovered,
  isNewBookingOpen,
  hoverCardPosition,
  bookingMenuPosition,
  onCardClick,
  onMouseEnter,
  onMouseLeave,
  menuHandlers,
  onMenuMouseEnter,
  onMenuMouseLeave,
  menuCloseTimeoutRef,
  bookingMenuOriginalPositionRef,
}: ScheduleDayViewBookingCardProps) {
  const [hourStr, minuteStr] = (booking.booking_time || '').split(':');
  const hour = Number(hourStr);
  const minutes = Number(minuteStr);
  const durationMinutes = getBookingDurationMinutes(booking as any);

  const serviceName =
    (booking as any).service_for_display ||
    (booking as any).custom_service_name ||
    booking.service?.name ||
    'Service';
  const timeLabel = `${hourStr.padStart(2, '0')}:${minuteStr}`;
  const statusColor = resolveBookingCardStatusColor(booking as any);
  const customerName = (booking as any).customer?.name || (booking as any).customer_name || '고객';
  const customerId = (booking as any).customer?.id ?? (booking as any).customer_id ?? null;
  const customerPhone = (booking as any).customer?.phone || (booking as any).customer_phone || '';
  const bookingMemo = (booking as any).memo || (booking as any).note || '';

  const depositPaid =
    Number((booking as any).deposit_paid ?? (booking as any).depositAmount ?? 0) || 0;
  const depositAmount =
    Number((booking as any).deposit_amount ?? (booking as any).depositAmount ?? 0) || 0;
  const totalAmount =
    Number((booking as any).total_amount ?? (booking as any).totalAmount ?? 0) || 0;
  const hasDepositPaid = depositPaid > 0;

  const endTimeLabel = (() => {
    const endTime = new Date(`2000-01-01T${hourStr}:${minuteStr}`);
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);
    return `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
  })();

  return (
    <div
      data-booking-card={booking.id}
      className="absolute"
      style={{
        top,
        height,
        zIndex: emptySlotMenuOpen ? 0 : 1,
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        paddingLeft: 4,
        paddingRight: 4,
        pointerEvents: 'auto',
      }}
      onMouseEnter={() => booking.id && onMouseEnter(booking.id)}
      onMouseLeave={(e) => booking.id && onMouseLeave(e, booking.id)}
    >
      <div
        className={`h-full w-full ${statusColor.bg} border-l-4 ${statusColor.border} border-t-2 border-t-white border-b-2 border-b-white rounded transition-all cursor-pointer p-2 flex flex-col justify-between overflow-hidden relative`}
        style={{ zIndex: emptySlotMenuOpen ? 0 : 1 }}
        onClick={(e) => {
          e.stopPropagation();
          booking.id && onCardClick(e, booking.id);
        }}
      >
        {/* Top-right indicators */}
        {hasDepositPaid && (
          <div className="absolute top-1 right-1 z-10 flex items-center gap-1">
            <div
              className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold"
              title={`Deposit paid: ${depositPaid.toLocaleString('ko-KR')} / Total: ${totalAmount.toLocaleString('ko-KR')}`}
            >
              D
            </div>
          </div>
        )}

        <div>
          <p className={`text-xs font-bold ${statusColor.text} mb-0.5 flex items-center`}>
            {(booking as any).color_label && COLOR_LABEL_MAP[(booking as any).color_label] && (
              <span
                className="inline-block w-3 h-3 rounded-sm mr-1 shrink-0"
                style={{ backgroundColor: COLOR_LABEL_MAP[(booking as any).color_label] }}
              />
            )}
            <span className="truncate">{customerName}</span>
          </p>
          <p className={`text-[11px] ${statusColor.text} opacity-70`}>{serviceName}</p>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className={`text-[10px] font-mono ${statusColor.text} opacity-60`}>
            {timeLabel}
          </span>
        </div>

        {/* Hover Card - Portal */}
        {isHovered && !isNewBookingOpen && !isMenuOpen && hoverCardPosition && typeof window !== 'undefined' && (
          createPortal(
            <div
              data-hover-card
              className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[200] min-w-[280px] p-3"
              style={{
                top: `${hoverCardPosition.top}px`,
                left: `${hoverCardPosition.left}px`,
                transform: hoverCardPosition.placement === 'top' ? 'translateY(-100%)' : undefined,
              }}
            >
              <div className={`${statusColor.headerBg} ${statusColor.headerText} px-3 py-2 rounded-t-lg -mx-3 -mt-3 mb-2`}>
                <p className="text-xs font-bold">{statusColor.label}</p>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-16 shrink-0">시간</span>
                  <span className="text-gray-900">{timeLabel} ~ {endTimeLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-16 shrink-0">고객명</span>
                  <span className="text-gray-900">{customerName} ({customerId ?? '-'})</span>
                </div>
                {customerPhone && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-16 shrink-0">전화번호</span>
                    <span className="text-gray-900">{customerPhone}</span>
                  </div>
                )}
                {serviceName && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-16 shrink-0">시술명</span>
                    <span className="text-gray-900">{serviceName}</span>
                  </div>
                )}
                {(depositAmount > 0 || depositPaid > 0) && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-16 shrink-0">Deposit</span>
                    <span className="text-gray-900">
                      ₩{depositPaid.toLocaleString('ko-KR')}
                      {totalAmount > 0 && (
                        <>
                          {' '}
                          <span className="text-gray-500">
                            / ₩{totalAmount.toLocaleString('ko-KR')}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                )}
                {bookingMemo && (
                  <>
                    <div className="border-t border-gray-200 my-1.5" />
                    <div className="text-gray-700">{bookingMemo}</div>
                  </>
                )}
              </div>
            </div>,
            document.body
          )
        )}

        {/* Context Menu - Portal */}
        {isMenuOpen && !isNewBookingOpen && bookingMenuPosition && typeof window !== 'undefined' && (() => {
          const scrollContainer = document.getElementById('schedule-scroll-container');
          if (!scrollContainer) return null;
          const containerRect = scrollContainer.getBoundingClientRect();
          if (!containerRect?.width || !containerRect?.height) return null;
          const scrollTop = scrollContainer.scrollTop;
          const scrollLeft = scrollContainer.scrollLeft;
          const relativeTop = bookingMenuPosition.top - containerRect.top + scrollTop;
          const relativeLeft = bookingMenuPosition.left - containerRect.left + scrollLeft;
          if (isNaN(relativeTop) || isNaN(relativeLeft) || !isFinite(relativeTop) || !isFinite(relativeLeft)) {
            return null;
          }
          if (!bookingMenuOriginalPositionRef.current) {
            (bookingMenuOriginalPositionRef as React.MutableRefObject<{ top: number; left: number; width: number } | null>).current = {
              top: relativeTop,
              left: relativeLeft,
              width: bookingMenuPosition.width,
            };
          }
          return createPortal(
            <div
              data-booking-menu
              className="fixed bg-transparent z-[99999]"
              style={{
                top: `${bookingMenuPosition.top}px`,
                left: `${bookingMenuPosition.left}px`,
                width: `${bookingMenuPosition.width}px`,
              }}
              onMouseEnter={() => booking.id && onMenuMouseEnter(booking.id)}
              onMouseLeave={(e) => booking.id && onMenuMouseLeave(e, booking.id)}
            >
              <BookingContextMenu
                booking={booking}
                className="bg-white border border-gray-200 rounded-lg shadow-lg"
                style={{
                  width: '100%',
                  transform: bookingMenuPosition.placement === 'top' ? 'translateY(-100%)' : undefined,
                }}
                onNewBooking={() => menuHandlers.onNewBooking(booking)}
                onEditBooking={(b) => menuHandlers.onEditBooking(b)}
                onViewDetail={(b) => menuHandlers.onViewDetail(b)}
                onViewCustomer={(b) => menuHandlers.onViewCustomer(b)}
                onStatusChange={(b, s) => menuHandlers.onStatusChange(b, s)}
                onMoveBooking={(b) => menuHandlers.onMoveBooking(b)}
                onCancelBooking={(b) => menuHandlers.onCancelBooking(b)}
                onRegisterSale={(b) => menuHandlers.onRegisterSale(b)}
                onViewSaleDetail={(b) => menuHandlers.onViewSaleDetail(b)}
              />
            </div>,
            document.body
          );
        })()}
      </div>
    </div>
  );
}

export default React.memo(ScheduleDayViewBookingCard);
