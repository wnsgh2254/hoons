'use client';

import { getBookingStatusColor, GRID_START_HOUR, GRID_30MIN_HEIGHT } from '@/lib/utils/appointment-utils';
import type { Booking } from '@/lib/types';

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
}

export default function BookingCard({
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

  const serviceName = booking.service?.name || 'Service';
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
      className="absolute left-1 right-1"
      style={{ top, height, zIndex: emptySlotMenuOpen ? 0 : 1 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
          <span className={`text-[10px] font-bold ${statusColor.text} bg-white/50 px-1.5 py-0.5 rounded`}>
            {customerId}
          </span>
        </div>

        {/* Hover Card */}
        {isHovered && !isNewBookingOpen && (
          <div className="absolute top-0 left-full ml-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[280px] p-3">
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
              {(statusColor.statusEnum === 'PAID' || statusColor.statusEnum === 'BOOKED') && customerPhone && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-16 shrink-0">전화번호</span>
                  <span className="text-gray-900">{customerPhone}</span>
                </div>
              )}
              {(statusColor.statusEnum === 'ARRIVED' || statusColor.statusEnum === 'PAID' || statusColor.statusEnum === 'BOOKED') && serviceName && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-16 shrink-0">시술명</span>
                  <span className="text-gray-900">{serviceName}</span>
                </div>
              )}
              {(statusColor.statusEnum === 'ARRIVED' || statusColor.statusEnum === 'BOOKED' || statusColor.statusEnum === 'NOSHOW') && bookingMemo && (
                <>
                  <div className="border-t border-gray-200 my-1.5"></div>
                  <div className="text-gray-700">{bookingMemo}</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Context Menu */}
        {isMenuOpen && !isNewBookingOpen && (
          <BookingContextMenu
            booking={booking}
            statusColor={statusColor}
            onNewBooking={onNewBooking}
            onEditBooking={onEditBooking}
            onViewDetail={onViewDetail}
            onViewCustomer={onViewCustomer}
          />
        )}
      </div>
    </div>
  );
}

interface BookingContextMenuProps {
  booking: BookingWithRelations;
  statusColor: ReturnType<typeof getBookingStatusColor>;
  onNewBooking: () => void;
  onEditBooking: (booking: BookingWithRelations) => void;
  onViewDetail: (booking: BookingWithRelations) => void;
  onViewCustomer: (booking: BookingWithRelations) => void;
}

function BookingContextMenu({
  booking,
  statusColor,
  onNewBooking,
  onEditBooking,
  onViewDetail,
  onViewCustomer,
}: BookingContextMenuProps) {
  if (statusColor.statusEnum === 'ARRIVED') {
    return (
      <div data-booking-menu className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: 판매 등록
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
        >
          판매 등록
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNewBooking();
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          예약 등록
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditBooking(booking);
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          예약 수정
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: 예약 이동
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          예약 이동
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(booking);
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          고객 정보
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: 상태 변경
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">check</span>
          고객 입장
        </button>
      </div>
    );
  }

  if (statusColor.label === '계산완료') {
    return (
      <div data-booking-menu className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNewBooking();
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
        >
          예약 등록
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditBooking(booking);
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          예약 수정
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: 판매 상세
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          판매 상세
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(booking);
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
        >
          고객 정보
        </button>
      </div>
    );
  }

  if (statusColor.statusEnum === 'BOOKED') {
    return (
      <div data-booking-menu className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: 판매 등록
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
        >
          판매 등록
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNewBooking();
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          예약 등록
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditBooking(booking);
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          예약 수정
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: 예약 이동
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          예약 이동
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: 예약 취소
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          예약 취소
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(booking);
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          고객 정보
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: 상태 변경 - 고객 입장
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          고객 입장
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: 상태 변경 - 노쇼
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
        >
          노쇼
        </button>
      </div>
    );
  }

  if (statusColor.statusEnum === 'NOSHOW') {
    return (
      <div data-booking-menu className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNewBooking();
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
        >
          예약 등록
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditBooking(booking);
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          예약 수정
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(booking);
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          고객 정보
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: 상태 변경 - 노쇼 해제
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">check</span>
          노쇼
        </button>
      </div>
    );
  }

  return null;
}
