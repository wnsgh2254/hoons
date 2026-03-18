'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import type { BookingWithRelations } from '@/lib/types';
import {
  getBookingStatusColor,
  GRID_START_HOUR,
  GRID_30MIN_HEIGHT,
  COLOR_LABEL_MAP,
} from '@/lib/utils/appointment-utils';
import BookingContextMenu from './BookingContextMenu';

interface MenuPosition {
  top: number;
  left: number;
  width: number;
  scrollTop: number;
  scrollLeft: number;
}

interface BookingCardProps {
  booking: BookingWithRelations;
  // Positioning (determined by parent)
  className?: string;
  style: React.CSSProperties;
  // Hover/menu state
  hoveredBooking: number | null;
  bookingMenuOpen: number | null;
  hoverCardPosition: { top: number; left: number } | null;
  bookingMenuPosition: MenuPosition | null;
  isNewBookingOpen: boolean;
  // State setters
  setHoveredBooking: (id: number | null) => void;
  setHoverCardPosition: (pos: { top: number; left: number } | null) => void;
  hoverCardOriginalPositionRef: React.RefObject<{ top: number; left: number } | null>;
  setBookingMenuOpen: (id: number | null) => void;
  setBookingMenuPosition: (pos: MenuPosition | null) => void;
  bookingMenuOriginalPositionRef: React.RefObject<{ top: number; left: number; width: number } | null>;
  menuCloseTimeoutRef: React.RefObject<NodeJS.Timeout | null>;
  // BookingContextMenu callbacks
  onNewBooking: (booking: BookingWithRelations) => void;
  onEditBooking: (booking: BookingWithRelations) => void;
  onViewDetail: (booking: BookingWithRelations) => void;
  onViewCustomer: (booking: BookingWithRelations) => void;
  onStatusChange?: (booking: BookingWithRelations, newStatus: 'ARRIVED' | 'NOSHOW' | 'BOOKED') => Promise<void>;
  children?: React.ReactNode;
  // Optional (used when card is used in day view with full menu)
  emptySlotMenuOpen?: unknown;
  onMoveBooking?: (booking: BookingWithRelations) => void;
  onCancelBooking?: (booking: BookingWithRelations) => void;
  onRegisterSale?: (booking: BookingWithRelations) => void;
  onViewSaleDetail?: (booking: BookingWithRelations) => void;
  hasTempSale?: boolean;
  onOpenTempSale?: (booking: BookingWithRelations) => void;
}

function BookingCard({
  booking,
  children,
  className,
  style: outerStyle,
  emptySlotMenuOpen,
  isNewBookingOpen,
  hoveredBooking,
  bookingMenuOpen,
  hoverCardPosition,
  bookingMenuPosition,
  hoverCardOriginalPositionRef,
  setHoveredBooking,
  setHoverCardPosition,
  setBookingMenuOpen,
  setBookingMenuPosition,
  bookingMenuOriginalPositionRef,
  menuCloseTimeoutRef,
  onNewBooking,
  onEditBooking,
  onViewDetail,
  onViewCustomer,
  onStatusChange,
  onMoveBooking,
  onCancelBooking,
  onRegisterSale,
  onViewSaleDetail,
  hasTempSale,
  onOpenTempSale,
}: BookingCardProps) {
  const b = booking;
  if (!b.booking_time) return null;

  const [hourStr, minuteStr] = b.booking_time.split(':');
  const hour = Number(hourStr);
  const minutes = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minutes)) return null;

  const durationMinutes =
    b.service?.duration_minutes && b.service.duration_minutes > 0
      ? b.service.duration_minutes
      : 60;

  const serviceName =
    (booking as any).service_for_display ||
    (booking as any).custom_service_name ||
    booking.service?.name ||
    'Service';
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
  const depositPaid =
    Number((b as any).deposit_paid ?? (b as any).depositAmount ?? 0) || 0;
  const depositAmount =
    Number((b as any).deposit_amount ?? (b as any).depositAmount ?? 0) || 0;
  const totalAmount =
    Number((b as any).total_amount ?? (b as any).totalAmount ?? 0) || 0;
  const hasDepositPaid = depositPaid > 0;

  return (
    <div
      data-booking-card={b.id}
      className={className}
      style={outerStyle}
      onMouseEnter={() => {
        if (b.id) {
          const cardElement = document.querySelector(`[data-booking-card="${b.id}"]`) as HTMLElement;
          if (cardElement) {
            const cardRect = cardElement.getBoundingClientRect();
            setHoverCardPosition({
              top: cardRect.top,
              left: cardRect.right + 4,
            });
          }
          setHoveredBooking(b.id);
        }
      }}
      onMouseLeave={(e) => {
        const relatedTarget = e.relatedTarget;
        if (relatedTarget && relatedTarget instanceof Element) {
          if (
            relatedTarget.closest('[data-booking-menu]') ||
            relatedTarget.closest('[data-booking-card]')
          ) {
            return;
          }
        }
        setHoveredBooking(null);
        setHoverCardPosition(null);
        hoverCardOriginalPositionRef.current = null;
        if (bookingMenuOpen !== b.id) {
          setBookingMenuOpen(null);
        }
      }}
    >
      <div
        className={`h-full w-full ${statusColor.bg} border-l-4 ${statusColor.border} rounded transition-all cursor-pointer p-2 flex flex-col justify-between overflow-hidden relative`}
        style={{ zIndex: outerStyle.zIndex ?? 1 }}
        onClick={(e) => {
          e.stopPropagation();
          if (!b.id) return;
          setHoveredBooking(null);
          setHoverCardPosition(null);
          hoverCardOriginalPositionRef.current = null;

          if (bookingMenuOpen === b.id) {
            setBookingMenuOpen(null);
            setBookingMenuPosition(null);
            bookingMenuOriginalPositionRef.current = null;
          } else {
            const cardElement = e.currentTarget.closest('[data-booking-card]') as HTMLElement;
            if (cardElement) {
              const cardRect = cardElement.getBoundingClientRect();
              const cellContainer = cardElement.closest('.relative.h-full.overflow-hidden') as HTMLElement;
              const scrollContainer = document.getElementById('schedule-scroll-container');
              const scrollTop = scrollContainer?.scrollTop || 0;
              const scrollLeft = scrollContainer?.scrollLeft || 0;

              const menuTop = cardRect.bottom + 4;
              const menuLeft = cardRect.left;
              const menuWidth = cellContainer ? cellContainer.getBoundingClientRect().width - 8 : cardRect.width;

              setBookingMenuPosition({
                top: menuTop,
                left: menuLeft,
                width: menuWidth,
                scrollTop,
                scrollLeft,
              });
            }
            setBookingMenuOpen(b.id);
          }
        }}
      >
        {/* Top-right indicators container */}
        {(hasDepositPaid || hasTempSale) && (
          <div className="absolute top-1 right-1 z-10 flex items-center gap-1">
            {/* Deposit paid indicator */}
            {hasDepositPaid && (
              <div
                className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold"
                title={`Deposit paid: ${depositPaid.toLocaleString('ko-KR')} / Total: ${totalAmount.toLocaleString(
                  'ko-KR',
                )}`}
              >
                D
              </div>
            )}
            {/* Temp sale indicator */}
            {hasTempSale && (
              <button
                type="button"
                className="w-5 h-5 flex items-center justify-center rounded bg-red-500 hover:bg-red-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTempSale?.(b);
                }}
                title="임시 저장된 판매 등록"
              >
                <span className="material-symbols-outlined text-white" style={{ fontSize: '14px' }}>
                  credit_card
                </span>
              </button>
            )}
          </div>
        )}

        {/* Card content */}
        <div>
          <p className={`text-xs font-bold ${statusColor.text} mb-0.5 flex items-center`}>
            {(b as any).color_label && COLOR_LABEL_MAP[(b as any).color_label] && (
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm mr-1 shrink-0"
                style={{ backgroundColor: COLOR_LABEL_MAP[(b as any).color_label] }}
              />
            )}
            <span className="truncate">{customerName} ({customerId})</span>
          </p>
          <p className={`text-[11px] ${statusColor.text} opacity-70`}>{serviceName}</p>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className={`text-[10px] font-mono ${statusColor.text} opacity-60`}>
            {timeLabel}
          </span>
        </div>

        {/* Hover Card - Portal */}
        {hoveredBooking === b.id && !isNewBookingOpen && !bookingMenuOpen && hoverCardPosition && typeof window !== 'undefined' && (() => {
          return createPortal(
            <div
              data-hover-card
              className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[280px] p-3"
              style={{
                top: `${hoverCardPosition.top}px`,
                left: `${hoverCardPosition.left}px`,
              }}
            >
              <div className={`${statusColor.headerBg} ${statusColor.headerText} px-3 py-2 rounded-t-lg -mx-3 -mt-3 mb-2`}>
                <p className="text-xs font-bold">{statusColor.label}</p>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-16 shrink-0">시간</span>
                  <span className="text-gray-900">{timeLabel} ~ {(() => {
                    const endTime = new Date(`2000-01-01T${hourStr}:${minuteStr}`);
                    endTime.setMinutes(endTime.getMinutes() + durationMinutes);
                    return `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
                  })()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-16 shrink-0">고객명</span>
                  <span className="text-gray-900">{customerName} ({b.id || customerId})</span>
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
                    <div className="border-t border-gray-200 my-1.5"></div>
                    <div className="text-gray-700">{bookingMemo}</div>
                  </>
                )}
              </div>
            </div>,
            document.body
          );
        })()}

        {/* Context Menu - Portal */}
        {bookingMenuOpen === b.id && !isNewBookingOpen && bookingMenuPosition && typeof window !== 'undefined' && (() => {
          const scrollContainer = document.getElementById('schedule-scroll-container');
          if (!scrollContainer) return null;

          const containerRect = scrollContainer.getBoundingClientRect();
          if (!containerRect || containerRect.width === 0 || containerRect.height === 0) return null;

          const scrollTop = scrollContainer.scrollTop;
          const scrollLeft = scrollContainer.scrollLeft;

          const relativeTop = bookingMenuPosition.top - containerRect.top + scrollTop;
          const relativeLeft = bookingMenuPosition.left - containerRect.left + scrollLeft;

          if (isNaN(relativeTop) || isNaN(relativeLeft) || !isFinite(relativeTop) || !isFinite(relativeLeft)) {
            return null;
          }

          if (!bookingMenuOriginalPositionRef.current) {
            bookingMenuOriginalPositionRef.current = {
              top: relativeTop,
              left: relativeLeft,
              width: bookingMenuPosition.width,
            };
          }

          return createPortal(
            <div
              data-booking-menu
              className="fixed bg-transparent z-50"
              style={{
                top: `${bookingMenuPosition.top}px`,
                left: `${bookingMenuPosition.left}px`,
                width: `${bookingMenuPosition.width}px`,
              }}
              onMouseEnter={() => {
                if (menuCloseTimeoutRef.current) {
                  clearTimeout(menuCloseTimeoutRef.current);
                  menuCloseTimeoutRef.current = null;
                }
                setHoveredBooking(b.id || null);
              }}
              onMouseLeave={(e) => {
                const relatedTarget = e.relatedTarget;
                if (relatedTarget && relatedTarget instanceof Element) {
                  if (
                    relatedTarget.closest('[data-booking-card]') ||
                    relatedTarget.closest('[data-booking-menu]')
                  ) {
                    return;
                  }
                }
                const cardElement = document.querySelector(`[data-booking-card="${b.id}"]:hover`);
                if (cardElement) return;

                if (menuCloseTimeoutRef.current) {
                  clearTimeout(menuCloseTimeoutRef.current);
                }
                menuCloseTimeoutRef.current = setTimeout(() => {
                  const menuElement = document.querySelector('[data-booking-menu]');
                  const hoveredCard = document.querySelector(`[data-booking-card="${b.id}"]:hover`);
                  if (!menuElement?.matches(':hover') && !hoveredCard) {
                    setHoveredBooking(null);
                    setHoverCardPosition(null);
                    hoverCardOriginalPositionRef.current = null;
                    setBookingMenuOpen(null);
                    setBookingMenuPosition(null);
                    bookingMenuOriginalPositionRef.current = null;
                  }
                  menuCloseTimeoutRef.current = null;
                }, 200);
              }}
            >
              <BookingContextMenu
                booking={b}
                className="bg-white border border-gray-200 rounded-lg shadow-lg"
                style={{ width: '100%' }}
                onNewBooking={() => onNewBooking(b)}
                onEditBooking={onEditBooking}
                onViewDetail={onViewDetail}
                onViewCustomer={onViewCustomer}
                onStatusChange={onStatusChange}
                onMoveBooking={onMoveBooking}
                onCancelBooking={onCancelBooking}
                onRegisterSale={onRegisterSale}
                onViewSaleDetail={onViewSaleDetail}
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
