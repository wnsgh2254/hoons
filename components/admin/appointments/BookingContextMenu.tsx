'use client';

import { getBookingStatusColor } from '@/lib/utils/appointment-utils';
import type { BookingWithRelations } from '@/lib/types';

interface BookingContextMenuProps {
  booking: BookingWithRelations;
  onNewBooking: () => void;
  onEditBooking: (booking: BookingWithRelations) => void;
  onViewDetail?: (booking: BookingWithRelations) => void;
  onViewCustomer: (booking: BookingWithRelations) => void;
  onStatusChange?: (booking: BookingWithRelations, newStatus: 'ARRIVED' | 'NOSHOW') => void;
  onMoveBooking?: (booking: BookingWithRelations) => void;
  onCancelBooking?: (booking: BookingWithRelations) => void;
  onRegisterSale?: (booking: BookingWithRelations) => void;
  onViewSaleDetail?: (booking: BookingWithRelations) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function BookingContextMenu({
  booking,
  onNewBooking,
  onEditBooking,
  onViewDetail,
  onViewCustomer,
  onStatusChange,
  onMoveBooking,
  onCancelBooking,
  onRegisterSale,
  onViewSaleDetail,
  className = 'absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]',
  style,
}: BookingContextMenuProps) {
  // fixed 포지셔닝을 위한 스타일 병합
  const mergedStyle = style || {};
  const statusColor = getBookingStatusColor((booking as any).status || (booking as any).booking_status);

  // 고객 입장 (ARRIVED) - 보라색
  if (statusColor.statusEnum === 'ARRIVED') {
    return (
      <div className={className} style={mergedStyle}>
        {onRegisterSale && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRegisterSale(booking);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
          >
            판매 등록
          </button>
        )}
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
        {onMoveBooking && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveBooking(booking);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            예약 이동
          </button>
        )}
        {onViewDetail && (
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
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewCustomer(booking);
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm text-purple-500">check</span>
          고객 입장
        </button>
      </div>
    );
  }

  // 계산 완료 (PAID) - 블루
  if (statusColor.statusEnum === 'PAID') {
    return (
      <div className={className} style={mergedStyle}>
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
        {onViewSaleDetail && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewSaleDetail(booking);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            판매 상세
          </button>
        )}
        {onViewDetail && (
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
        )}
      </div>
    );
  }

  // 예약 완료 (BOOKED) - 초록
  if (statusColor.statusEnum === 'BOOKED') {
    return (
      <div className={className} style={mergedStyle}>
        {onRegisterSale && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRegisterSale(booking);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
          >
            판매 등록
          </button>
        )}
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
        {onMoveBooking && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveBooking(booking);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            예약 이동
          </button>
        )}
        {onCancelBooking && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancelBooking(booking);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            예약 취소
          </button>
        )}
        {onViewDetail && (
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
        )}
        {onStatusChange && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(booking, 'ARRIVED');
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm text-purple-500">check</span>
              고객 입장
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(booking, 'NOSHOW');
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm text-red-500">check</span>
              노쇼
            </button>
          </>
        )}
      </div>
    );
  }

  // 노쇼 (NOSHOW) - 빨강
  if (statusColor.statusEnum === 'NOSHOW') {
    return (
      <div className={className} style={mergedStyle}>
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
        {onViewDetail && (
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
        )}
        {onStatusChange && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(booking, 'NOSHOW');
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm text-red-500">check</span>
            노쇼
          </button>
        )}
      </div>
    );
  }

  // 기본 메뉴 (알 수 없는 상태)
  return (
    <div className={className} style={mergedStyle}>
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
      {onViewDetail && (
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
      )}
    </div>
  );
}
