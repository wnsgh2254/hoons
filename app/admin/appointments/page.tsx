'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type React from 'react';
import type { Booking, BookingWithRelations, NewBookingTimeSlot } from '@/lib/types';
import { DEFAULT_NEW_BOOKING_TIME_SLOT } from '@/lib/types';
import AdminTopNav from '@/components/AdminTopNav';
import { useAdminMemo } from '@/hooks/useAdminMemo';
import { useScheduleSearch } from '@/hooks/useScheduleSearch';
import { useBookings } from '@/hooks/useBookings';
import NewBookingModal from '@/components/admin/appointments/NewBookingModal';
import AppointmentDetailModal from '@/components/admin/appointments/AppointmentDetailModal';
import CustomerInfoDrawer from '@/components/admin/appointments/CustomerInfoDrawer';
import SalesRegistrationModal from '@/components/admin/appointments/SalesRegistrationModal';
import SalesItemPickerModal from '@/components/admin/appointments/SalesItemPickerModal';
import AppointmentCalendar from '@/components/admin/appointments/AppointmentCalendar';
import AdminMemo from '@/components/admin/appointments/AdminMemo';
import BookingCard from '@/components/admin/appointments/BookingCard';
import AddCustomerModal from '@/components/admin/customers/AddCustomerModal';
import DeleteBookingModal from '@/components/admin/appointments/DeleteBookingModal';
import ScheduleHeaderControls from '@/components/admin/appointments/ScheduleHeaderControls';
import ScheduleGridHeader from '@/components/admin/appointments/ScheduleGridHeader';
import TimeColumn from '@/components/admin/appointments/TimeColumn';
import CurrentTimeLine from '@/components/admin/appointments/CurrentTimeLine';
import WeekViewGrid from '@/components/admin/appointments/WeekViewGrid';
import ReservationHistoryModal from '@/components/admin/appointments/ReservationHistoryModal';
import HolidayCalendarModal from '@/components/admin/appointments/HolidayCalendarModal';
import TimeOffModal from '@/components/admin/appointments/TimeOffModal';
import RestrictionModal from '@/components/admin/appointments/RestrictionModal';
import HolidaySettingModal from '@/components/admin/appointments/HolidaySettingModal';
import AttendanceModal from '../../../components/admin/appointments/AttendanceModal';
import BookingContextMenu from '@/components/admin/appointments/BookingContextMenu';
import ScheduleDayViewBookingCard, {
  type ScheduleDayViewMenuHandlers,
} from '@/components/admin/appointments/ScheduleDayViewBookingCard';
import CancelBookingModal from '@/components/admin/appointments/CancelBookingModal';
import EditPrepaidMemberModal from '@/components/admin/appointments/EditPrepaidMemberModal';
import SalesDetailModal from '@/components/admin/appointments/SalesDetailModal';
import RefundRegistrationModal from '@/components/admin/appointments/RefundRegistrationModal';
import { AlertModal } from '@/components/ui';
import { Z } from '@/lib/constants';
import { mapSaleRecordToDetailData } from '@/lib/sales-detail-mapper';
import { isCancelledBookingStatus, isUpcomingBookingStatus } from '@/lib/booking-status';
import {
  GRID_START_HOUR,
  GRID_END_HOUR,
  GRID_HOUR_HEIGHT,
  GRID_30MIN_HEIGHT,
  DESIGNER_COLORS,
  getSydneyToday,
  getWeekStart,
  getWeekEnd,
  formatDateRange,
  buildDateFromDay,
  bookingTimeToLabel,
  labelToDbTime,
  parseLocalDateString,
  getBookingDurationMinutes,
} from '@/lib/utils/appointment-utils';

const CANCELLED_STATUSES = new Set(['cancelled', 'canceled']);

function isDirectorRole(role: string | null | undefined): boolean {
  return String(role || '').toLowerCase().includes('director');
}

// Comment: Match admin/staff venue (designers.shop_id + shop name). Directors: every shop. Non-directors: home shop only (ignore designer_shops for column placement).
function designerBelongsToShop(d: { shop_id?: number | null; shop_ids_at?: number[]; role?: string | null }, shopId: number): boolean {
  if (isDirectorRole(d.role)) return true;
  return d.shop_id != null && Number(d.shop_id) === shopId;
}

function sortKeyPrimaryShop(d: { shop_id?: number | null; shop_ids_at?: number[]; role?: string | null } | undefined): number {
  if (!d) return 0;
  if (isDirectorRole(d.role)) {
    const ids =
      d.shop_ids_at && d.shop_ids_at.length > 0 ? d.shop_ids_at : d.shop_id != null ? [d.shop_id] : [];
    return ids.length ? Math.min(...ids) : 0;
  }
  return d.shop_id != null && Number.isFinite(Number(d.shop_id)) ? Number(d.shop_id) : 0;
}

type ScheduleColumn = {
  columnKey: string;
  designerId: number;
  name: string;
  columnShopId: number;
};

// Comment: Group bookings per grid. column (designer + venue) — uses designerId to avoid name-collision bugs
function bookingColumnKeyForGrid(b: BookingWithRelations, allDesigners: any[]): string {
  const designerId = b.designer?.id;
  const designer = designerId ? allDesigners.find((d) => d.id === designerId) : undefined;
  let sid = b.shop_id ?? null;
  if (sid == null && designer) {
    if (isDirectorRole(designer.role)) {
      const ids =
        designer.shop_ids_at && designer.shop_ids_at.length > 0
          ? designer.shop_ids_at
          : designer.shop_id != null
            ? [designer.shop_id]
            : [];
      sid = ids[0] ?? null;
    } else {
      sid = designer.shop_id != null ? Number(designer.shop_id) : null;
    }
  }
  return `${designerId ?? 'unassigned'}::${sid === null ? 'null' : String(sid)}`;
}

// Comment: Must stay in sync with bookingColumnKeyForGrid — both use designerId::shopId
function columnKeyForBookingsLookup(
  col: ScheduleColumn,
  designer: { shop_ids_at?: number[]; shop_id?: number | null; role?: string | null } | undefined,
): string {
  const sid =
    col.columnShopId === 0
      ? sortKeyPrimaryShop(designer) || null
      : col.columnShopId;
  return `${col.designerId}::${sid === null ? 'null' : String(sid)}`;
}


export default function AppointmentsManagementPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getSydneyToday());
  const [dayCounts, setDayCounts] = useState<Record<number, number>>({});
  const [initialDataReady, setInitialDataReady] = useState(false);
  const [usedInitialDataApi, setUsedInitialDataApi] = useState(false);
  const [skipMemoInitialFetch, setSkipMemoInitialFetch] = useState(true);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [currentSydneyTime, setCurrentSydneyTime] = useState<{
    label: string;
    top: number;
  } | null>(null);

  // Comment: Admin "New Booking" modal state (form state managed inside NewBookingModal)
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [newBookingShops, setNewBookingShops] = useState<any[]>([]);
  const [newBookingDesigners, setNewBookingDesigners] = useState<any[]>([]);
  const [newBookingServices, setNewBookingServices] = useState<any[]>([]);
  const [newBookingShopId, setNewBookingShopId] = useState<number | null>(null);
  const [newBookingServiceId, setNewBookingServiceId] = useState<number | null>(null);
  const [newBookingDate, setNewBookingDate] = useState<string>(selectedDate);
  const [newBookingCustomerSearch, setNewBookingCustomerSearch] = useState('');
  const [newBookingMemo, setNewBookingMemo] = useState('');
  const [newBookingSelectedCustomerId, setNewBookingSelectedCustomerId] = useState<number | null>(null);
  const [newBookingCustomerSearchResults, setNewBookingCustomerSearchResults] = useState<any[]>([]);
  const [newBookingIsCustomerSearching, setNewBookingIsCustomerSearching] = useState(false);
  const [isCustomerRegistrationModalOpen, setIsCustomerRegistrationModalOpen] = useState(false);
  const [registeredCustomer, setRegisteredCustomer] = useState<any | null>(null);
  const [newBookingTimeSlots, setNewBookingTimeSlots] = useState<NewBookingTimeSlot[]>([
    { ...DEFAULT_NEW_BOOKING_TIME_SLOT },
  ]);
  const [newBookingSubmitting, setNewBookingSubmitting] = useState(false);
  const [newBookingLoadingOptions, setNewBookingLoadingOptions] = useState(false);
  const [availableDesignerIdsByShop, setAvailableDesignerIdsByShop] = useState<Record<number, number[]>>(
    {},
  );
  const [loadingDesignerAvailability, setLoadingDesignerAvailability] = useState(false);
  // Comment: Incrementing this key re-triggers the availability fetch (e.g. after holiday modal save)
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);

  const availableDesignerIds = useMemo(() => {
    const ids = new Set<number>();
    Object.values(availableDesignerIdsByShop).forEach((arr) => {
      arr.forEach((id) => ids.add(id));
    });
    return Array.from(ids);
  }, [availableDesignerIdsByShop]);

  // Comment: Editing existing booking from Upcoming list
  const [editingBooking, setEditingBooking] = useState<BookingWithRelations | null>(null);
  const isBookingFormModalOpen = isNewBookingOpen || editingBooking != null;

  useEffect(() => {
    if (editingBooking?.shop_id != null && Number.isFinite(Number(editingBooking.shop_id))) {
      setNewBookingShopId(Number(editingBooking.shop_id));
    }
  }, [editingBooking?.id]);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [isCancelBookingModalOpen, setIsCancelBookingModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<BookingWithRelations | null>(null);

  // Comment: Confirm delete from Upcoming
  const [bookingToDelete, setBookingToDelete] = useState<BookingWithRelations | null>(null);

  // Comment: Global success message for creating bookings
  const [bookingSuccessMessage, setBookingSuccessMessage] = useState<string | null>(null);

  // Comment: Track booking focused from Schedule to highlight in Upcoming
  const [focusedBookingId, setFocusedBookingId] = useState<number | null>(null);
  // Comment: Appointment detail modal (click card in schedule grid)
  const [viewingBookingDetail, setViewingBookingDetail] = useState<BookingWithRelations | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const dateButtonWrapperRef = useRef<HTMLDivElement | null>(null);
  const menuCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuOriginalPositionRef = useRef<{ top: number; left: number; width: number } | null>(null);

  // Comment: Designer time off management
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  const [timeOffDesigners, setTimeOffDesigners] = useState<any[]>([]);
  const [timeOffRecords, setTimeOffRecords] = useState<any[]>([]);

  // Comment: Calendar date range filter
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');

  // Comment: Designer dropdown menu state
  const [openDesignerDropdown, setOpenDesignerDropdown] = useState<string | null>(null);
  const [allDesigners, setAllDesigners] = useState<any[]>([]);
  const [allShops, setAllShops] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedShopFilter, setSelectedShopFilter] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { memo, setMemo, memoLoading, memoSaving, setMemoSaving, memoSuccessMessage, setMemoSuccessMessage, saveMemo } = useAdminMemo({
    skipInitialFetchOnce: skipMemoInitialFetch,
  });

  // Comment: Week view state (replaces modal with main timetable view)
  const [isWeekViewMode, setIsWeekViewMode] = useState(false);
  const [weekViewDesignerId, setWeekViewDesignerId] = useState<number | null>(null);
  const [weekViewDesignerName, setWeekViewDesignerName] = useState<string>('');
  const [weekViewBookings, setWeekViewBookings] = useState<BookingWithRelations[]>([]);
  const [weekViewStartDate, setWeekViewStartDate] = useState<string>('');
  const [weekViewAvailableDates, setWeekViewAvailableDates] = useState<Set<string>>(new Set());

  // Comment: Booking restriction modal state
  const [isRestrictionModalOpen, setIsRestrictionModalOpen] = useState(false);
  const [restrictionDesignerId, setRestrictionDesignerId] = useState<number | null>(null);
  const [restrictionDesignerName, setRestrictionDesignerName] = useState<string>('');
  const [restrictionType, setRestrictionType] = useState<'date' | 'time'>('date');
  const [restrictionDate, setRestrictionDate] = useState<string>('');

  // Comment: Holiday and special work day modal state
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isHolidayCalendarModalOpen, setIsHolidayCalendarModalOpen] = useState(false);
  const [holidayDesignerId, setHolidayDesignerId] = useState<number | null>(null);
  const [holidayDesignerName, setHolidayDesignerName] = useState<string>('전체');
  /** When opening 휴일 모달 from a schedule column, use that venue (avoids wrong shop when filter is "전체"). */
  const [holidayModalShopId, setHolidayModalShopId] = useState<number | null>(null);
  const [holidayCalendarRefreshKey, setHolidayCalendarRefreshKey] = useState(0);

  const holidayModalDefaultShopId = useMemo(() => {
    if (holidayModalShopId != null && holidayModalShopId > 0) return holidayModalShopId;
    if (selectedShopFilter !== '전체') {
      const n = Number(selectedShopFilter);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return allShops[0]?.id ?? null;
  }, [holidayModalShopId, selectedShopFilter, allShops]);

  // Comment: Attendance (clock-in/out) modal state
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceModalDesignerId, setAttendanceModalDesignerId] = useState<number | null>(null);
  const [attendanceModalDesignerName, setAttendanceModalDesignerName] = useState<string>('');
  // Comment: Only manager and director can use attendance management
  const [userRole, setUserRole] = useState<string | null>(null);

  // Comment: Booking restrictions state (예약금지/휴무 정보)
  const [bookingRestrictions, setBookingRestrictions] = useState<any[]>([]);

  // Comment: Calendar view mode - always show booking count instead of green dot
  const [showBookingCount] = useState(true);

  // Comment: REQ_SCH_001_01 - Left panel toggle state; default to hidden on mobile (< lg)
  const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(true);
  useEffect(() => {
    if (window.innerWidth < 1024) setIsLeftPanelVisible(false);

    const handleResize = () => {
      if (window.innerWidth < 1024) setIsLeftPanelVisible(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Comment: REQ_SCH_001_02 - Designer filter state
  const [selectedDesignerFilter, setSelectedDesignerFilter] = useState<string>('전체');

  // Comment: REQ_SCH_001_03~06 - Date navigation state
  const [isCalendarPopupOpen, setIsCalendarPopupOpen] = useState(false);
  const [calendarPopupMonth, setCalendarPopupMonth] = useState<Date>(new Date());

  // Comment: REQ_SCH_001_07~08 - Search state (extracted to hook)
  const {
    searchInput, setSearchInput,
    isSearchDropdownOpen, setIsSearchDropdownOpen,
    searchDropdownPosition, setSearchDropdownPosition,
    searchInputRef,
    recentSearches,
    searchCriteria, setSearchCriteria,
    isSearching, setIsSearching,
    searchAutocompleteResults,
    isSearchAutocompleteLoading,
    setRecentSearches,
    saveRecentSearch,
    handleDeleteRecentSearch,
  } = useScheduleSearch();

  // Comment: Designer IDs filtered by shop (Directors appear in every shop)
  const shopFilteredDesignerIds = useMemo(() => {
    if (selectedShopFilter === '전체') return [];
    const shopId = Number(selectedShopFilter);
    return allDesigners.filter((d) => designerBelongsToShop(d, shopId)).map((d) => d.id);
  }, [allDesigners, selectedShopFilter]);

  // Bookings data (extracted to hook)
  const {
    bookings, filteredBookings, loading, error,
    setBookings, setFilteredBookings, refreshBookings,
  } = useBookings(selectedDate, {
    designerFilter: selectedDesignerFilter,
    shopFilter: selectedShopFilter,
    shopFilteredDesignerIds,
    searchInput,
    availableDesignerIds,
    skipInitialFetchOnce: true,
  });
  
  // Comment: Customer info modal state
  const [viewingCustomerId, setViewingCustomerId] = useState<number | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<any | null>(null);
  const [customerInfoLoading, setCustomerInfoLoading] = useState(false);
  const [customerInfoTab, setCustomerInfoTab] = useState<'sales' | 'bookings' | 'prepaid'>('sales');
  
  // Sales Registration Modal State
  const [isSalesRegistrationModalOpen, setIsSalesRegistrationModalOpen] = useState(false);
  const [salesRegistrationCustomer, setSalesRegistrationCustomer] = useState<{
    id: number;
    name: string;
    phone?: string | null;
    points?: number;
    prepaid_balance?: number;
  } | null>(null);
  const [isSalesItemPickerModalOpen, setIsSalesItemPickerModalOpen] = useState(false);
  const [salesItemPickerTab, setSalesItemPickerTab] = useState<'service' | 'product' | 'prepaid'>('service');
  /** true: 항목 선택에서 취소 시 판매 등록 모달까지 닫음 (예약에서 판매등록으로 연 경우만) */
  const [closeSalesFlowOnPickerClose, setCloseSalesFlowOnPickerClose] = useState(false);
  
  // Edit Prepaid Member Modal State
  const [isEditPrepaidMemberModalOpen, setIsEditPrepaidMemberModalOpen] = useState(false);
  
  // Sales Detail Modal State
  const [isSalesDetailModalOpen, setIsSalesDetailModalOpen] = useState(false);
  const [salesDetailData, setSalesDetailData] = useState<any | null>(null);

  // Sales Edit/Delete State
  const [editingSaleData, setEditingSaleData] = useState<any | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [isDeleteSaleAlertOpen, setIsDeleteSaleAlertOpen] = useState(false);
  const [deletingSaleId, setDeletingSaleId] = useState<number | null>(null);

  // Temporary Sales State (임시저장)
  /** 예약 카드에서 판매등록 열 때 연결할 bookings.id (계산완료 플래그용) */
  const [salesLinkedBookingId, setSalesLinkedBookingId] = useState<number | null>(null);
  /** 예약에 이미 납부된 예수금 (AUD), 판매 모달 합계 차감용 */
  const [salesLinkedDepositPaid, setSalesLinkedDepositPaid] = useState(0);
  const [salesDefaultDate, setSalesDefaultDate] = useState<string | null>(null);
  const [salesDefaultTime, setSalesDefaultTime] = useState<string | null>(null);

  // Shop ID for sales/refund modals
  const [salesRegistrationShopId, setSalesRegistrationShopId] = useState<number | null>(null);
  const [salesDefaultManager, setSalesDefaultManager] = useState<string | null>(null);

  // Refund Registration Modal State (환불등록)
  const [isRefundRegistrationModalOpen, setIsRefundRegistrationModalOpen] = useState(false);
  const [refundRegistrationCustomer, setRefundRegistrationCustomer] = useState<{
    id: number;
    name: string;
    phone?: string | null;
    points?: number;
    prepaid_balance?: number;
  } | null>(null);
  const [isRefundItemPickerModalOpen, setIsRefundItemPickerModalOpen] = useState(false);
  const [refundItemPickerTab, setRefundItemPickerTab] = useState<'service' | 'product' | 'prepaid'>('service');

  // Comment: REQ_SCH_001_09 - Menu dropdown state
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState(false);
  const [menuDropdownPosition, setMenuDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  // Comment: Reservation history modal state
  const [isReservationHistoryOpen, setIsReservationHistoryOpen] = useState(false);
  const [reservationHistoryRefreshTrigger, setReservationHistoryRefreshTrigger] = useState(0);

  // Comment: Empty slot hover and context menu state
  const [hoveredEmptySlot, setHoveredEmptySlot] = useState<{
    date: string;
    designerId: number;
    columnShopId: number;
    time: string;
  } | null>(null);
  const [emptySlotMenuOpen, setEmptySlotMenuOpen] = useState<{
    date: string;
    designerId: number;
    columnShopId: number;
    time: string;
  } | null>(null);
  const [emptySlotMenuPosition, setEmptySlotMenuPosition] = useState<{
    top: number;
    triggerTop: number;
    left: number;
    width: number;
    scrollTop: number;
    scrollLeft: number;
  } | null>(null);

  // Comment: Booking move state (for moving an existing booking to another slot)
  const [movingBooking, setMovingBooking] = useState<BookingWithRelations | null>(null);
  const [moveTargetSlot, setMoveTargetSlot] = useState<{
    date: string;
    designerId: number;
    columnShopId: number;
    time: string;
  } | null>(null);
  const [isMoveConfirmOpen, setIsMoveConfirmOpen] = useState(false);
  
  // Comment: 스크롤 이벤트 감지하여 메뉴 위치 업데이트
  useEffect(() => {
    if (!emptySlotMenuPosition || !emptySlotMenuOpen) {
      menuOriginalPositionRef.current = null;
      return;
    }
    
    const scrollContainer = document.getElementById('schedule-scroll-container');
    if (!scrollContainer) return;
    
    // 메뉴가 처음 열릴 때 원래 셀의 위치 저장 (스크롤 컨테이너 내부의 상대 위치)
    if (!menuOriginalPositionRef.current) {
      const containerRect = scrollContainer.getBoundingClientRect();
      // 뷰포트 기준 위치에서 컨테이너의 뷰포트 위치를 빼서 상대 위치 계산
      const relativeTop = emptySlotMenuPosition.top - containerRect.top + scrollContainer.scrollTop;
      const relativeLeft = emptySlotMenuPosition.left - containerRect.left + scrollContainer.scrollLeft;
      menuOriginalPositionRef.current = {
        top: relativeTop,
        left: relativeLeft,
        width: emptySlotMenuPosition.width
      };
    }
    
    const rafRef = { current: 0 };
    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        if (!menuOriginalPositionRef.current || !emptySlotMenuPosition) return;
        const menuElement = document.querySelector('[data-empty-slot-menu]') as HTMLElement;
        if (menuElement) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const scrollTop = scrollContainer.scrollTop;
          const scrollLeft = scrollContainer.scrollLeft;
          const viewportTop = containerRect.top + menuOriginalPositionRef.current.top - scrollTop;
          const viewportLeft = containerRect.left + menuOriginalPositionRef.current.left - scrollLeft;
          menuElement.style.top = `${viewportTop}px`;
          menuElement.style.left = `${viewportLeft}px`;
        }
      });
    };
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [emptySlotMenuOpen, emptySlotMenuPosition]);
  
  // Comment: Booking hover card state
  const [hoveredBooking, setHoveredBooking] = useState<number | null>(null);
  const [hoverCardPosition, setHoverCardPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const hoverCardOriginalPositionRef = useRef<{ top: number; left: number } | null>(null);
  
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
    
    const rafRef = { current: 0 };
    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        if (!hoverCardOriginalPositionRef.current || !hoverCardPosition) return;
        const hoverCardElement = document.querySelector('[data-hover-card]') as HTMLElement;
        if (hoverCardElement) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const scrollTop = scrollContainer.scrollTop;
          const scrollLeft = scrollContainer.scrollLeft;
          const viewportTop = containerRect.top + hoverCardOriginalPositionRef.current.top - scrollTop;
          const viewportLeft = containerRect.left + hoverCardOriginalPositionRef.current.left - scrollLeft;
          hoverCardElement.style.top = `${viewportTop}px`;
          hoverCardElement.style.left = `${viewportLeft}px`;
        }
      });
    };
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [hoveredBooking, hoverCardPosition]);
  
  // Comment: Booking context menu state
  const [bookingMenuOpen, setBookingMenuOpen] = useState<number | null>(null);
  const [bookingMenuPosition, setBookingMenuPosition] = useState<{
    top: number;
    triggerTop: number;
    left: number;
    width: number;
    scrollTop: number;
    scrollLeft: number;
    placement: 'top' | 'bottom';
  } | null>(null);
  const bookingMenuOriginalPositionRef = useRef<{ top: number; left: number; width: number } | null>(null);

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
    
    const rafRef = { current: 0 };
    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        if (!bookingMenuOriginalPositionRef.current || !bookingMenuPosition) return;
        const menuElement = document.querySelector('[data-booking-menu]') as HTMLElement;
        if (menuElement) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const scrollTop = scrollContainer.scrollTop;
          const scrollLeft = scrollContainer.scrollLeft;
          const viewportTop = containerRect.top + bookingMenuOriginalPositionRef.current.top - scrollTop;
          const viewportLeft = containerRect.left + bookingMenuOriginalPositionRef.current.left - scrollLeft;
          menuElement.style.top = `${viewportTop}px`;
          menuElement.style.left = `${viewportLeft}px`;
        }
      });
    };
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [bookingMenuOpen, bookingMenuPosition]);

  // Comment: Refs and handlers for click-drag scrolling on schedule grid
  const scheduleRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragScrollTopRef = useRef(0);
  const hasCenteredCurrentTimeRef = useRef(false);

  const monthLabel = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [selectedDate]);

  const monthKey = selectedDate.slice(0, 7); // YYYY-MM

  // Track what date/month was already loaded by the initial-data API
  // so that dependent effects can skip their own fetches on the first render.
  const [hydratedDate, setHydratedDate] = useState<string | null>(null);
  const [hydratedMonthKey, setHydratedMonthKey] = useState<string | null>(null);
  const selectedDateRef = useRef(selectedDate);
  const monthKeyRef = useRef(monthKey);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
    monthKeyRef.current = monthKey;
  }, [selectedDate, monthKey]);

  // Comment: Consolidated initial load for appointments page to reduce client-side API fan-out
  useEffect(() => {
    let isMounted = true;
    const requestDate = selectedDate;
    const requestMonthKey = monthKey;
    const loadInitialData = async () => {
      try {
        const res = await fetch(
          `/api/appointments/initial-data?date=${encodeURIComponent(requestDate)}&month=${encodeURIComponent(requestMonthKey)}`,
        );
        const data = await res.json();
        if (!isMounted) return;
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load appointments initial data');
        }

        // Comment: Ignore stale initial-data responses if the user already changed date/month.
        const isStaleRequest =
          selectedDateRef.current !== requestDate ||
          monthKeyRef.current !== requestMonthKey;

        setUserRole(data.userRole || null);
        setMemo(data.memo || '');
        setAllDesigners(data.designers || []);
        setAllShops(data.shops || []);
        setNewBookingServices(data.bookingModalServices || []);
        if (!isStaleRequest) {
          setBookingRestrictions(data.bookingRestrictions || []);
          setDayCounts(data.dayCounts || {});
          setAvailableDesignerIdsByShop(data.availableDesignerIdsByShop || {});

          const nextBookings = data.bookings || [];
          setBookings(nextBookings);
          setFilteredBookings(nextBookings);
        }
        try {
          if (Array.isArray(data.designers) && data.designers.length > 0) {
            sessionStorage.setItem('haeyoom_designers', JSON.stringify(data.designers));
          }
          if (Array.isArray(data.shops) && data.shops.length > 0) {
            sessionStorage.setItem('haeyoom_shops', JSON.stringify(data.shops));
          }
        } catch {
          // Ignore browser storage failures
        }

        // Record the hydrated date/month so effects can skip redundant fetches
        if (!isStaleRequest) {
          setHydratedDate(requestDate);
          setHydratedMonthKey(requestMonthKey);
        }
        setUsedInitialDataApi(true);
        setInitialDataReady(true);
      } catch (err) {
        console.error('Error loading appointments initial data:', err);
        // Comment: Fallback to legacy per-endpoint loading when consolidated API fails
        setSkipMemoInitialFetch(false);
        void refreshBookings();
        setInitialDataReady(true);
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Comment: Fetch user session + all designers in parallel on mount to cut waterfall latency
  useEffect(() => {
    if (!initialDataReady) return;
    const fetchSessionAndDesigners = async () => {
      try {
        // Comment: Restore designers from sessionStorage immediately for instant grid render
        const cached = sessionStorage.getItem('haeyoom_designers');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setAllDesigners(parsed);
            }
          } catch {/* ignore corrupt cache */}
        }

        // Comment: Fire session + designers fetch in parallel
        const [sessionRes, designersRes] = await Promise.all([
          fetch('/api/auth/session'),
          fetch('/api/designers'),
        ]);
        const [sessionData, designersData] = await Promise.all([
          sessionRes.json(),
          designersRes.json(),
        ]);

        if (sessionData.authenticated && sessionData.user?.role) {
          setUserRole(sessionData.user.role);
        }

        if (designersRes.ok) {
          const designers = designersData.designers || [];
          if (designers.length > 0) {
            setAllDesigners(designers);
            // Comment: Cache designers in sessionStorage to avoid re-fetch on back-navigation
            try { sessionStorage.setItem('haeyoom_designers', JSON.stringify(designers)); } catch {/* quota exceeded */}
          }
        } else {
          console.error('Failed to load designers:', designersData.error || designersData);
        }
      } catch (err) {
        console.error('Error loading session/designers:', err);
      }
    };

    if (!usedInitialDataApi) {
      fetchSessionAndDesigners();
    }
    // Comment: Refresh designers every 5 minutes to pick up changes without a full reload
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/designers');
        const data = await res.json();
        if (res.ok && data.designers?.length > 0) {
          setAllDesigners(data.designers);
          try { sessionStorage.setItem('haeyoom_designers', JSON.stringify(data.designers)); } catch {/* ignore */}
        }
      } catch {/* silent */}
    }, 300_000);
    return () => clearInterval(interval);
  }, [initialDataReady, usedInitialDataApi]);

  const canUseAttendanceManagement = userRole === 'manager' || userRole === 'director';

  // Comment: Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentSearches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading recent searches:', err);
    }
  }, []);

  // Comment: Load customer info for modal (memoized)
  const loadCustomerInfo = useCallback(async (customerId: number) => {
    setCustomerInfoLoading(true);
    try {
      // Step 1: 빠른 기본 고객 정보 조회 (모달을 빨리 띄우기 위함)
      const customerRes = await fetch(`/api/customers/${customerId}`);
      const customerData = await customerRes.json();

      if (!customerRes.ok || !customerData.customer) {
        alert('고객 정보를 불러올 수 없습니다.');
        setViewingCustomerId(null);
        return;
      }

      const baseCustomer = customerData.customer;
      // Comment: 기본 고객 정보만으로 먼저 모달을 보여준다.
      setViewingCustomer(baseCustomer);

      // Step 2: 상세 통계(예약/정액권)는 백그라운드에서 별도로 계산
      void (async () => {
        try {
          const [bookingsRes, prepaidRes, salesRes, refundsRes] = await Promise.all([
            fetch(`/api/appointment?customer_id=${customerId}&limit=500`),
            fetch(`/api/prepaid?customer_id=${customerId}`).catch(() => null),
            fetch(`/api/sales?customer_id=${customerId}`),
            fetch(`/api/refunds?customer_id=${customerId}`),
          ]);

          const bookingsData = await bookingsRes.json();
          const prepaidData = prepaidRes ? await prepaidRes.json() : null;
          const salesPayload = await salesRes.json().catch(() => ({}));
          const refundsPayload = await refundsRes.json().catch(() => ({}));

          const bookings = bookingsData.bookings || [];

          // Comment: Net total sales — same as GET /api/customers and SalesHistoryTable (sales minus refunds)
          const salesList = salesPayload.sales || [];
          const refundsList = refundsPayload.refunds || [];
          const totalSales =
            salesList.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0) -
            refundsList.reduce((sum: number, r: any) => sum + Number(r.total_amount || 0), 0);

          // Comment: 최근 방문일 / 방문 후 경과일
          const completedBookings = bookings.filter(
            (b: any) => b.status === 'PAID' || b.status === 'COMPLETED',
          );
          const lastBooking = completedBookings.sort((a: any, b: any) => {
            const dateA = new Date(
              `${a.booking_date}T${a.booking_time || '00:00:00'}`,
            );
            const dateB = new Date(
              `${b.booking_date}T${b.booking_time || '00:00:00'}`,
            );
            return dateB.getTime() - dateA.getTime();
          })[0];

          const lastVisitDate = lastBooking ? lastBooking.booking_date : null;
          let daysSinceLastVisit = null as number | null;
          if (lastVisitDate) {
            const lastVisit = new Date(lastVisitDate);
            const today = new Date();
            const diffTime = today.getTime() - lastVisit.getTime();
            daysSinceLastVisit = Math.floor(
              diffTime / (1000 * 60 * 60 * 24),
            );
          }

          // Comment: 최근 1년 예약/취소 건수
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          const recentBookings = bookings.filter((b: any) => {
            const bookingDate = new Date(b.booking_date);
            return bookingDate >= oneYearAgo;
          });
          const appointmentsCount = recentBookings.length;
          const cancelledCount = recentBookings.filter(
            (b: any) => isCancelledBookingStatus(b.status),
          ).length;

          // Comment: 다음 예약
          const upcomingBookings = bookings
            .filter((b: any) => {
              const bookingDate = new Date(
                `${b.booking_date}T${b.booking_time || '00:00:00'}`,
              );
              return (
                bookingDate > new Date() &&
                isUpcomingBookingStatus(b.status)
              );
            })
            .sort((a: any, b: any) => {
              const dateA = new Date(
                `${a.booking_date}T${a.booking_time || '00:00:00'}`,
              );
              const dateB = new Date(
                `${b.booking_date}T${b.booking_time || '00:00:00'}`,
              );
              return dateA.getTime() - dateB.getTime();
            });
          const nextAppointment = upcomingBookings[0]
            ? {
                date: upcomingBookings[0].booking_date,
                time: upcomingBookings[0].booking_time || '',
              }
            : null;

          // Comment: 정액권 / 포인트
          const prepaidTickets = prepaidData?.prepaid || [];
          const totalPrepaidBalance =
            Number(prepaidData?.totalPoints ?? 0) ||
            prepaidTickets.reduce(
              (sum: number, ticket: any) =>
                sum + (Number(ticket.balance ?? ticket.points) || 0),
              0,
            );

          // Comment: 동일 고객일 때만 최신 통계를 merge
          setViewingCustomer((prev: any) => {
            if (!prev || prev.id !== baseCustomer.id) return prev;
            return {
              ...prev,
              last_visit_date: lastVisitDate,
              days_since_last_visit: daysSinceLastVisit,
              appointments_count: appointmentsCount,
              cancelled_count: cancelledCount,
              next_appointment: nextAppointment,
              prepaid_tickets: prepaidTickets,
              prepaid_balance: totalPrepaidBalance,
              total_sales: totalSales,
            };
          });
        } catch (err) {
          console.error('Error loading detailed customer stats:', err);
        }
      })();
    } catch (err) {
      console.error('Error loading customer info:', err);
      alert('고객 정보를 불러오는 중 오류가 발생했습니다.');
      setViewingCustomerId(null);
    } finally {
      setCustomerInfoLoading(false);
    }
  }, []);

  // Comment: Save recent search (memoized for stable callback)
  const saveRecentSearchStable = useCallback((name: string, phone?: string, id?: number) => {
    try {
      setRecentSearches((prev) => {
        const newSearch = { name, phone, id };
        const updated = [newSearch, ...prev.filter((s) => s.id !== id && s.name !== name)].slice(0, 10);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error('Error saving recent search:', err);
    }
  }, []);

  // Comment: Handle customer selection from autocomplete
  const handleCustomerSelect = useCallback(
    async (customer: { id: number; name: string; phone?: string }) => {
      setSearchInput(customer.name);
      setIsSearchDropdownOpen(false);
      setSearchDropdownPosition(null);
      setViewingCustomerId(customer.id);
      await loadCustomerInfo(customer.id);
      saveRecentSearchStable(customer.name, customer.phone, customer.id);
    },
    [loadCustomerInfo, saveRecentSearchStable]
  );

  // Comment: Handle search - open customer info modal
  const handleSearch = useCallback(async () => {
    if (!searchInput.trim()) {
      alert('검색어를 입력하세요.');
      return;
    }
    setIsSearching(true);
    try {
      const searchTerm = searchInput.trim();
      const customerRes = await fetch(`/api/customers?search=${encodeURIComponent(searchTerm)}&limit=1`);
      const customerData = await customerRes.json();
      if (customerData.customers && customerData.customers.length > 0) {
        const firstCustomer = customerData.customers[0];
        setViewingCustomerId(firstCustomer.id);
        await loadCustomerInfo(firstCustomer.id);
        saveRecentSearchStable(firstCustomer.name, firstCustomer.phone, firstCustomer.id);
      } else {
        alert('검색 결과가 없습니다.');
      }
      setIsSearchDropdownOpen(false);
      setSearchDropdownPosition(null);
    } catch (err) {
      console.error('Error searching:', err);
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  }, [searchInput, loadCustomerInfo, saveRecentSearchStable]);

  // Comment: Precompute designer IDs that are fully off (하루 전체 휴무) on the selected date
  // 시간 단위 예약금지는 "휴무"가 아니라 단순 예약 불가 구간으로만 보고, 여기서는 제외한다.
  const offDesignerIdsForSelectedDate = useMemo(() => {
    const offIds = new Set<number>();
    bookingRestrictions.forEach((r: any) => {
      if (
        r.designer_id &&
        r.restriction_date === selectedDate &&
        r.restriction_type === 'date'
      ) {
        offIds.add(r.designer_id as number);
      }
    });
    return offIds;
  }, [bookingRestrictions, selectedDate]);

  // Comment: Load booking restrictions for selected date or week range
  useEffect(() => {
    if (!initialDataReady) return;
    // Skip if this date was already loaded by the initial-data API (non-week-view only)
    if (!isWeekViewMode && selectedDate === hydratedDate) return;
    let isMounted = true;
    const fetchRestrictions = async () => {
      try {
        if (isWeekViewMode && weekViewStartDate) {
          // Comment: Load restrictions for the entire week
          const startDate = new Date(weekViewStartDate);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
          const startDateStr = startDate.toISOString().split('T')[0];
          const endDateStr = endDate.toISOString().split('T')[0];
          
          const res = await fetch(
            `/api/booking-restrictions?designer_id=${weekViewDesignerId}&start_date=${startDateStr}&end_date=${endDateStr}`
          );
          const data = await res.json();
          if (isMounted && res.ok) {
            setBookingRestrictions(data.restrictions || []);
          }
        } else {
          const res = await fetch(
            `/api/booking-restrictions?date=${encodeURIComponent(selectedDate)}`
          );
          const data = await res.json();
          if (isMounted && res.ok) {
            setBookingRestrictions(data.restrictions || []);
          }
        }
      } catch (err) {
        console.error('Error fetching restrictions:', err);
      }
    };

    fetchRestrictions();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, isWeekViewMode, weekViewStartDate, weekViewDesignerId, initialDataReady, hydratedDate]);


  // Comment: Load week view bookings when week view mode is active
  useEffect(() => {
    if (!isWeekViewMode || !weekViewDesignerId || !weekViewStartDate) {
      setWeekViewBookings([]);
      return;
    }

    let isMounted = true;
    const fetchWeekBookings = async () => {
      try {
        const startDate = new Date(weekViewStartDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        const res = await fetch(
          `/api/appointment?designer_id=${weekViewDesignerId}&start_date=${startDateStr}&end_date=${endDateStr}&limit=1000`
        );
        const data = await res.json();
        if (isMounted && res.ok) {
          setWeekViewBookings(data.bookings || []);
        }
      } catch (error) {
        console.error('Error fetching week bookings:', error);
      }
    };

    fetchWeekBookings();
    return () => {
      isMounted = false;
    };
  }, [isWeekViewMode, weekViewDesignerId, weekViewStartDate]);

  // Comment: Load monthly booking counts to power calendar dots — uses minimal=true to avoid joins+COUNT overhead
  useEffect(() => {
    if (!initialDataReady) return;
    // Skip if this month was already loaded by the initial-data API
    if (monthKey === hydratedMonthKey) return;
    let isMounted = true;
    const fetchMonth = async () => {
      try {
        const [year, month] = monthKey.split('-').map((v) => Number(v));
        if (!year || !month) return;
        const daysInMonth = new Date(year, month, 0).getDate();
        const start = `${monthKey}-01`;
        const end = `${monthKey}-${String(daysInMonth).padStart(2, '0')}`;

        // Comment: minimal=true returns only booking_date+status — no joins, no COUNT query
        const res = await fetch(
          `/api/appointment?minimal=true&start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`
        );
        const data = await res.json();
        if (!isMounted) return;

        if (!res.ok) throw new Error(data.error || 'Failed to load monthly bookings');

        const counts: Record<number, number> = {};
        (data.bookings || []).forEach((b: { booking_date: string; status: string }) => {
          if (isCancelledBookingStatus(b.status)) return;
          const d = new Date(b.booking_date);
          if (Number.isNaN(d.getTime())) return;
          counts[d.getDate()] = (counts[d.getDate()] || 0) + 1;
        });
        if (isMounted) setDayCounts(counts);
      } catch (err) {
        // Silent fail – calendar dots are non-critical
        if (isMounted) {
          console.error(err);
          setDayCounts({});
        }
      }
    };

    fetchMonth();
    return () => { isMounted = false; };
  }, [monthKey, initialDataReady, hydratedMonthKey]);

  // Comment: Load shops + designer availability together in one pass to avoid render waterfall.
  // Shops are fetched once on first run; subsequent runs (date change, refresh) reuse cached allShops.
  // availabilityRefreshKey is incremented after holiday/special-day saves to force a re-fetch.
  useEffect(() => {
    if (!initialDataReady) return;
    // Skip if this date was already loaded by initial-data (only for the first render, not forced refreshes)
    if (selectedDate === hydratedDate && availabilityRefreshKey === 0) return;
    let isMounted = true;
    const fetchShopsAndAvailability = async () => {
      setLoadingDesignerAvailability(true);
      try {
        // Comment: Fetch shops — use sessionStorage cache to avoid round-trip on repeat visits
        let shops = allShops;
        if (shops.length === 0) {
          // Comment: Try sessionStorage cache first for instant shop data
          const cachedShops = sessionStorage.getItem('haeyoom_shops');
          if (cachedShops) {
            try {
              const parsed = JSON.parse(cachedShops);
              if (Array.isArray(parsed) && parsed.length > 0) {
                shops = parsed;
                if (isMounted) setAllShops(parsed);
              }
            } catch {/* ignore */}
          }
          // Comment: Always refetch from API to keep shops fresh (background update)
          const shopsRes = await fetch('/api/shops');
          const shopsData = await shopsRes.json();
          const fetchedShops = shopsData.shops || [];
          if (fetchedShops.length > 0) {
            shops = fetchedShops;
            if (isMounted) setAllShops(fetchedShops);
            try { sessionStorage.setItem('haeyoom_shops', JSON.stringify(fetchedShops)); } catch {/* ignore */}
          }
        }

        if (shops.length === 0) {
          // Comment: No shops configured — fall back to global (non-per-shop) query
          const res = await fetch(
            `/api/designer-schedules?date=${encodeURIComponent(selectedDate)}`,
          );
          const data = await res.json();
          if (isMounted) {
            setAvailableDesignerIdsByShop(res.ok ? { 0: data.designerIds || [] } : {});
          }
        } else {
          // Comment: Fetch all shops' availability in parallel
          const results = await Promise.all(
            shops.map(async (shop) => {
              const res = await fetch(
                `/api/designer-schedules?date=${encodeURIComponent(selectedDate)}&shopId=${shop.id}`,
              );
              const data = await res.json();
              return [shop.id, res.ok ? (data.designerIds || []) : []] as const;
            }),
          );
          if (isMounted) {
            const byShop: Record<number, number[]> = {};
            results.forEach(([id, ids]) => {
              byShop[id] = ids;
            });
            setAvailableDesignerIdsByShop(byShop);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading shops/availability:', err);
          setAvailableDesignerIdsByShop({});
        }
      } finally {
        if (isMounted) setLoadingDesignerAvailability(false);
      }
    };

    fetchShopsAndAvailability();
    return () => { isMounted = false; };
    // Comment: allShops intentionally omitted — it is loaded inline above on first run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, availabilityRefreshKey, initialDataReady, hydratedDate]);


  // Comment: Load per-day designer availability for week view (7 days)
  useEffect(() => {
    if (!isWeekViewMode || !weekViewDesignerId || !weekViewStartDate) {
      setWeekViewAvailableDates(new Set());
      return;
    }

    let isMounted = true;
    const fetchWeekAvailability = async () => {
      try {
        const dates: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(weekViewStartDate);
          d.setDate(d.getDate() + i);
          dates.push(d.toISOString().split('T')[0]);
        }

        const results = await Promise.all(
          dates.map(async (dateStr) => {
            const res = await fetch(`/api/designer-schedules?date=${encodeURIComponent(dateStr)}`);
            if (!res.ok) return { date: dateStr, available: false };
            const data = await res.json();
            const designerIds: number[] = data.designerIds || [];
            return { date: dateStr, available: designerIds.includes(weekViewDesignerId!) };
          })
        );

        if (isMounted) {
          const availableSet = new Set<string>();
          results.forEach(({ date, available }) => {
            if (available) availableSet.add(date);
          });
          setWeekViewAvailableDates(availableSet);
        }
      } catch (err) {
        console.error('Error loading week view availability:', err);
        if (isMounted) {
          setWeekViewAvailableDates(new Set());
        }
      }
    };

    fetchWeekAvailability();
    return () => { isMounted = false; };
  }, [isWeekViewMode, weekViewDesignerId, weekViewStartDate]);

  // Comment: When a booking is focused from the schedule, scroll/highlight it in Upcoming
  useEffect(() => {
    if (!focusedBookingId) return;
    const el = document.getElementById(`upcoming-${focusedBookingId}`);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusedBookingId]);

  // Comment: Load New Booking options from already hydrated page data only (no extra API calls).
  useEffect(() => {
    if (!isBookingFormModalOpen) return;
    setNewBookingLoadingOptions(true);
    // Shops/services are already hydrated at page load; just reflect them into modal state.
    const shopsList = allShops;
    setNewBookingShops(shopsList);
    if (shopsList.length > 0) {
      setNewBookingShopId((prev) => prev ?? shopsList[0].id);
    }

    const shopIdForSched =
      newBookingShopId ??
      (selectedShopFilter !== '전체' ? Number(selectedShopFilter) : null) ??
      shopsList[0]?.id ??
      null;

    if (shopIdForSched != null) {
      // Use already loaded per-venue availability map.
      // Note: availability map is hydrated for selectedDate and refreshed when selectedDate changes.
      const availableIds = availableDesignerIdsByShop[shopIdForSched] || [];
      const idSet = new Set<number>(availableIds);
      const designersForModal = allDesigners
        .filter((d) => idSet.has(d.id))
        .filter((d) => designerBelongsToShop(d, shopIdForSched));
      setNewBookingDesigners(designersForModal);
    } else {
      setNewBookingDesigners([]);
    }

    setNewBookingLoadingOptions(false);
  }, [
    isBookingFormModalOpen,
    newBookingShopId,
    selectedShopFilter,
    allShops,
    allDesigners,
    availableDesignerIdsByShop,
  ]);

  // Comment: Load designers and time off records when Time Off modal opens
  useEffect(() => {
    if (!isTimeOffModalOpen) return;

    const loadTimeOffData = async () => {
      try {
        const [designersRes, recordsRes] = await Promise.all([
          fetch('/api/staff?role=designer'),
          fetch('/api/designer-time-off'),
        ]);
        const designersData = await designersRes.json();
        const recordsData = await recordsRes.json();
        if (designersRes.ok && designersData.staff) {
          setTimeOffDesigners(designersData.staff);
        }
        if (recordsRes.ok && recordsData.timeOffs) {
          setTimeOffRecords(recordsData.timeOffs);
        }
      } catch (err) {
        console.error('Error loading time off data:', err);
      }
    };

    loadTimeOffData();
  }, [isTimeOffModalOpen]);

  // Comment: Designers are now loaded inside the combined session+designers effect above

  // Comment: Shops are now loaded inside the combined shops+availability effect above

  // Comment: Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // 드롭다운 버튼이나 메뉴를 클릭한 경우는 무시
      if (target.closest('[data-search-dropdown]') ||
          target.closest('[data-search-dropdown-menu]') ||
          target.closest('[data-menu-dropdown]') ||
          target.closest('[data-menu-button]') ||
          target.closest('[data-menu-dropdown-menu]') ||
          target.closest('[data-calendar-popup]')) {
        return;
      }

      if (openDesignerDropdown !== null) {
        setOpenDesignerDropdown(null);
      }
      // Close other dropdowns
      setIsCalendarPopupOpen(false);
      setIsSearchDropdownOpen(false);
      setSearchDropdownPosition(null);
      setIsMenuDropdownOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDesignerDropdown]);

  // Comment: Close popups with ESC key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCalendarPopupOpen(false);
        setIsSearchDropdownOpen(false);
        setSearchDropdownPosition(null);
        setIsMenuDropdownOpen(false);
        setEmptySlotMenuOpen(null);
        setEmptySlotMenuPosition(null);
        setBookingMenuOpen(null);
        setBookingMenuPosition(null);
        bookingMenuOriginalPositionRef.current = null;
        setHoveredEmptySlot(null);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  // Comment: Close empty slot menu and booking menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // more 버튼이나 메뉴 내부를 클릭한 경우는 무시
      if (target.closest('[data-empty-slot-menu]') || 
          target.closest('[data-booking-menu]') ||
          target.closest('.empty-slot-more-button') ||
          target.closest('button[type="button"]')) {
        return;
      }
      setEmptySlotMenuOpen(null);
      setEmptySlotMenuPosition(null);
      setBookingMenuOpen(null);
      setBookingMenuPosition(null);
      bookingMenuOriginalPositionRef.current = null;
      setHoveredEmptySlot(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Comment: Cleanup menu close timeout on unmount
  useEffect(() => {
    return () => {
      if (menuCloseTimeoutRef.current) {
        clearTimeout(menuCloseTimeoutRef.current);
      }
    };
  }, []);

  // Comment: Compute current time line position for Sydney time (only when viewing today)
  useEffect(() => {
    const todaySydney = getSydneyToday();

    const updateCurrentTime = () => {
      if (selectedDate !== todaySydney) {
        setCurrentSydneyTime(null);
        hasCenteredCurrentTimeRef.current = false;
        return;
      }

      const nowSydney = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
      );

      const hour = nowSydney.getHours();
      const minute = nowSydney.getMinutes();

      if (hour < GRID_START_HOUR || hour >= GRID_END_HOUR) {
        // Outside visible grid
        setCurrentSydneyTime(null);
        return;
      }

      const minutesSinceStart = (hour - GRID_START_HOUR) * 60 + minute;
      const top = (minutesSinceStart / 60) * GRID_HOUR_HEIGHT;

      const label = nowSydney.toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      setCurrentSydneyTime({
        label,
        top,
      });
      // Allow re-centering when time updates for the same day
      hasCenteredCurrentTimeRef.current = false;
    };

    updateCurrentTime();
    const id = setInterval(updateCurrentTime, 60_000);
    return () => clearInterval(id);
  }, [selectedDate]);

  // Comment: No auto-centering now – user controls vertical position with drag

  // Comment: Get week dates array (7 days starting from selected date)
  // Comment: Show only the selected date (day view)
  const weekDates = useMemo(() => {
    return [selectedDate];
  }, [selectedDate]);

  // Comment: Group bookings by date and designer name for the weekly schedule grid
  const bookingsByDateAndDesigner = useMemo(() => {
    const map: Record<string, Record<string, BookingWithRelations[]>> = {};
    weekDates.forEach((dateStr) => {
      map[dateStr] = {};
    });
    for (const b of filteredBookings) {
      const status = String((b as any).status || (b as any).booking_status || '').toLowerCase();
      if (CANCELLED_STATUSES.has(status)) continue;
      const dateStr = b.booking_date;
      if (!dateStr || !weekDates.includes(dateStr)) continue;
      const key = bookingColumnKeyForGrid(b, allDesigners);
      if (!map[dateStr][key]) map[dateStr][key] = [];
      map[dateStr][key].push(b);
    }
    return map;
  }, [filteredBookings, weekDates, allDesigners]);

  // Comment: Mobile view — bookings for the current date from active top filters, sorted by time
  const mobileDesignerBookings = useMemo(() => {
    return filteredBookings
      .filter((b) => {
        const status = String((b as any).status || (b as any).booking_status || '').toLowerCase();
        if (CANCELLED_STATUSES.has(status)) return false;
        return b.booking_date === selectedDate;
      })
      .sort((a, b) => {
        const aTime = a.booking_time || '00:00';
        const bTime = b.booking_time || '00:00';
        return aTime.localeCompare(bTime);
      });
  }, [filteredBookings, selectedDate]);

  // Comment: Mobile "all designers" view groups bookings by designer for clearer scanning.
  const mobileBookingsByDesigner = useMemo(() => {
    const groups = new Map<number, { designerId: number; designerName: string; bookings: BookingWithRelations[] }>();
    const fallbackDesignerId = -1;
    const fallbackDesignerName = '미지정';

    mobileDesignerBookings.forEach((booking) => {
      const designerIdRaw = booking.designer?.id ?? (booking as any).designer_id;
      const designerId = typeof designerIdRaw === 'number' ? designerIdRaw : fallbackDesignerId;
      const designerName = booking.designer?.name || (designerId === fallbackDesignerId ? fallbackDesignerName : 'Unknown');

      if (!groups.has(designerId)) {
        groups.set(designerId, { designerId, designerName, bookings: [] });
      }
      groups.get(designerId)!.bookings.push(booking);
    });

    const designerOrder = new Map<number, number>();
    allDesigners.forEach((d, index) => {
      designerOrder.set(d.id, index);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        bookings: [...group.bookings].sort((a, b) => (a.booking_time || '00:00').localeCompare(b.booking_time || '00:00')),
      }))
      .sort((a, b) => {
        const ai = designerOrder.has(a.designerId) ? designerOrder.get(a.designerId)! : Number.MAX_SAFE_INTEGER;
        const bi = designerOrder.has(b.designerId) ? designerOrder.get(b.designerId)! : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return a.designerName.localeCompare(b.designerName);
      });
  }, [mobileDesignerBookings, allDesigners]);

  // Comment: One grid column per (designer, venue) when "전체"; non-directors use designers.shop_id only (same as admin/staff)
  const scheduleColumns = useMemo((): ScheduleColumn[] => {
    if (allDesigners.length === 0) return [];

    const roleOrder: Record<string, number> = {
      Director: 1,
      'Senior Designer': 2,
      Designer: 3,
    };

    const sortDesigners = (a: (typeof allDesigners)[0], b: (typeof allDesigners)[0]) => {
      const shopA = sortKeyPrimaryShop(a);
      const shopB = sortKeyPrimaryShop(b);
      if (shopA !== shopB) return shopA - shopB;
      const roleA = (a.role || '').trim();
      const roleB = (b.role || '').trim();
      const orderA = roleOrder[roleA] || 999;
      const orderB = roleOrder[roleB] || 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    };

    const sortWithinShop = (a: (typeof allDesigners)[0], b: (typeof allDesigners)[0]) => {
      const roleA = (a.role || '').trim();
      const roleB = (b.role || '').trim();
      const orderA = roleOrder[roleA] || 999;
      const orderB = roleOrder[roleB] || 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    };

    let filtered = [...allDesigners];

    if (selectedShopFilter !== '전체') {
      const shopId = Number(selectedShopFilter);
      filtered = filtered.filter((d) => designerBelongsToShop(d, shopId));
    }

    if (selectedDesignerFilter === '전체') {
      // no extra filter
    } else if (selectedDesignerFilter === '전체(휴무 제외)') {
      filtered = filtered.filter((d) => availableDesignerIds.includes(d.id));
    } else {
      filtered = filtered.filter((d) => d.name === selectedDesignerFilter);
    }

    const sorted = filtered.sort(sortDesigners);

    if (selectedShopFilter === '전체') {
      if (allShops.length === 0) {
        return sorted.map((d) => ({
          columnKey: `${d.id}-0`,
          designerId: d.id,
          name: d.name,
          columnShopId: 0,
        }));
      }
      const shopsOrdered = [...allShops].sort((a, b) => a.id - b.id);
      const columns: ScheduleColumn[] = [];
      for (const shop of shopsOrdered) {
        const inShop = sorted.filter((d) => designerBelongsToShop(d, shop.id)).sort(sortWithinShop);
        for (const d of inShop) {
          columns.push({
            columnKey: `${d.id}-${shop.id}`,
            designerId: d.id,
            name: d.name,
            columnShopId: shop.id,
          });
        }
      }
      return columns;
    }

    const shopId = Number(selectedShopFilter);
    return sorted.map((d) => ({
      columnKey: `${d.id}-${shopId}`,
      designerId: d.id,
      name: d.name,
      columnShopId: shopId,
    }));
  }, [
    allDesigners,
    allShops,
    selectedShopFilter,
    selectedDesignerFilter,
    availableDesignerIds,
  ]);

  // Comment: Designers filtered by shop for the designer select dropdown (Directors in every shop)
  const shopFilteredDesigners = useMemo(() => {
    if (selectedShopFilter === '전체') return allDesigners;
    const shopId = Number(selectedShopFilter);
    return allDesigners.filter((d) => designerBelongsToShop(d, shopId));
  }, [allDesigners, selectedShopFilter]);

  // Comment: Stable color assignment per grid column
  const designerColorMap = useMemo(() => {
    const entries = scheduleColumns.map((col, index) => {
      const color = DESIGNER_COLORS[index % DESIGNER_COLORS.length];
      return [col.columnKey, color] as const;
    });
    return Object.fromEntries(entries) as Record<
      string,
      { bg: string; text: string; border: string }
    >;
  }, [scheduleColumns]);

  // Comment: Grey-out per column — use per-shop availability directly.
  // The designer-schedules API already excludes designers with 임의 휴일 for that specific shop,
  // so availableDesignerIdsByShop[shopId] is the single source of truth per venue.
  const columnDesignerOffMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const col of scheduleColumns) {
      const designerId = col.designerId;
      if (!designerId) { m[col.columnKey] = false; continue; }
      if (col.columnShopId === 0) {
        m[col.columnKey] = !availableDesignerIds.includes(designerId);
      } else {
        const ids = availableDesignerIdsByShop[col.columnShopId];
        m[col.columnKey] = ids != null ? !ids.includes(designerId) : !availableDesignerIds.includes(designerId);
      }
    }
    return m;
  }, [scheduleColumns, availableDesignerIds, availableDesignerIdsByShop]);

  // Comment: Sort bookings by time for upcoming list (all bookings for the day)
  const sortedBookings = useMemo(
    () =>
      [...filteredBookings].sort((a, b) =>
        (a.booking_time || '').localeCompare(b.booking_time || '')
      ),
    [filteredBookings]
  );

  // Comment: Filter upcoming bookings (exclude cancelled + past times for today in Sydney)
  const upcomingBookings = useMemo(() => {
    const base = sortedBookings.filter((b) => !isCancelledBookingStatus(b.status));

    const todaySydney = getSydneyToday();
    if (selectedDate !== todaySydney) {
      return base;
    }

    const nowSydney = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
    );

    return base.filter((b) => {
      if (!b.booking_time) return false;
      const [hourStr, minuteStr] = b.booking_time.split(':');
      const hour = Number(hourStr);
      const minutes = Number(minuteStr);
      if (Number.isNaN(hour) || Number.isNaN(minutes)) return false;

      const bookingDateTime = new Date(`${selectedDate}T${hourStr.padStart(2, '0')}:${minuteStr.padStart(2, '0')}:00`);
      return bookingDateTime.getTime() >= nowSydney.getTime();
    });
  }, [sortedBookings, selectedDate]);

  const selectedDayLabel = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [selectedDate]);

  const selectedDayNumber = useMemo(
    () => Number(selectedDate.split('-')[2] || '0'),
    [selectedDate]
  );

  // Comment: Toggle custom inline date popover near the button (memoized)
  const handleOpenDatePicker = useCallback(() => {
    setIsDatePopoverOpen((prev) => !prev);
  }, []);

  // Comment: Mouse handlers for drag-to-scroll on the schedule grid (memoized)
  const handleScheduleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = scheduleRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragScrollLeftRef.current = el.scrollLeft;
    dragStartYRef.current = e.clientY;
    dragScrollTopRef.current = el.scrollTop;
    el.classList.add('cursor-grabbing');
  }, []);

  const handleScheduleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const el = scheduleRef.current;
    if (!el) return;
    const dx = e.clientX - dragStartXRef.current;
    const dy = e.clientY - dragStartYRef.current;
    el.scrollLeft = dragScrollLeftRef.current - dx;
    el.scrollTop = dragScrollTopRef.current - dy;
  }, []);

  const endScheduleDrag = useCallback(() => {
    const el = scheduleRef.current;
    isDraggingRef.current = false;
    if (el) {
      el.classList.remove('cursor-grabbing');
    }
  }, []);

  // Comment: Helper function to get Monday of the week for a given date
  const getMondayOfWeek = (date: Date): string => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday 기준
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  // Comment: Handlers for designer header dropdown menu (memoized)
  const handleOpenWeekView = useCallback((designerId: number, name: string) => {
    const mondayStr = getMondayOfWeek(new Date(selectedDate));
    setWeekViewDesignerId(designerId);
    setWeekViewDesignerName(name);
    setWeekViewStartDate(mondayStr);
    setIsWeekViewMode(true);
    setSelectedDesignerFilter(name);
  }, [selectedDate]);

  const handleCloseWeekView = useCallback(() => {
    setIsWeekViewMode(false);
    setWeekViewDesignerId(null);
    setWeekViewDesignerName('');
    setWeekViewBookings([]);
  }, []);

  // Comment: Handle designer filter changes when in week view mode
  useEffect(() => {
    if (!isWeekViewMode || !selectedDesignerFilter) return;

    if (selectedDesignerFilter === '전체' || selectedDesignerFilter === '전체(휴무 제외)') {
      // If "전체" is selected, exit week view mode
      setIsWeekViewMode(false);
      setWeekViewDesignerId(null);
      setWeekViewDesignerName('');
      setWeekViewBookings([]);
      return;
    }

    // If a specific designer is selected, update week view to that designer
    const designer = allDesigners.find((d) => d.name === selectedDesignerFilter);
    if (designer && designer.id !== weekViewDesignerId) {
      const mondayStr = getMondayOfWeek(new Date(selectedDate));
      setWeekViewDesignerId(designer.id);
      setWeekViewDesignerName(designer.name);
      setWeekViewStartDate(mondayStr);
    }
  }, [selectedDesignerFilter, isWeekViewMode, allDesigners, weekViewDesignerId, selectedDate]);

  const handleOpenRestrictionModal = useCallback((designerId: number, name: string) => {
    setRestrictionDesignerId(designerId);
    setRestrictionDesignerName(name);
    setRestrictionDate(selectedDate);
    setIsRestrictionModalOpen(true);
  }, [selectedDate]);

  const handleOpenHolidayModal = useCallback((designerId: number, name: string, columnShopId?: number) => {
    setHolidayDesignerId(designerId);
    setHolidayDesignerName(name);
    setHolidayModalShopId(
      columnShopId != null && Number.isFinite(columnShopId) && columnShopId > 0 ? columnShopId : null,
    );
    setIsHolidayModalOpen(true);
  }, []);

  const handleOpenAttendanceModal = useCallback((designerId: number, name: string) => {
    setAttendanceModalDesignerId(designerId);
    setAttendanceModalDesignerName(name);
    setIsAttendanceModalOpen(true);
  }, []);

  // Comment: Memo save handler (memoized to avoid AdminMemo re-renders)
  const handleMemoSave = useCallback(async () => {
    setMemoSaving(true);
    try {
      const res = await fetch('/api/admin-memo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: memo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save memo');
      setMemoSuccessMessage('전달사항이 저장되었습니다.');
      setTimeout(() => setMemoSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving memo:', err);
      alert('전달사항 저장에 실패했습니다.');
    } finally {
      setMemoSaving(false);
    }
  }, [memo]);

  // Comment: Schedule day view booking card - stable handlers for React.memo optimization
  const handleDayViewCardClick = useCallback(
    (e: React.MouseEvent, bookingId: number) => {
      setHoveredBooking(null);
      setHoverCardPosition(null);
      hoverCardOriginalPositionRef.current = null;
      if (bookingMenuOpen === bookingId) {
        setBookingMenuOpen(null);
        setBookingMenuPosition(null);
        bookingMenuOriginalPositionRef.current = null;
      } else {
        const el = e.currentTarget as HTMLElement;
        let cardElement = el?.closest?.('[data-booking-card]') as HTMLElement | null;
        if (!cardElement) {
          cardElement = document.querySelector(`[data-booking-card="${bookingId}"]`) as HTMLElement;
        }
        if (cardElement) {
          const cardRect = cardElement.getBoundingClientRect();
          const cellContainer = cardElement.closest('.relative.h-full.overflow-hidden') as HTMLElement;
          const scrollContainer = document.getElementById('schedule-scroll-container');
          const scrollTop = scrollContainer?.scrollTop || 0;
          const scrollLeft = scrollContainer?.scrollLeft || 0;
          const menuEstimatedHeight = 280;
          const viewportPadding = 12;
          const spaceBelow = window.innerHeight - cardRect.bottom;
          const spaceAbove = cardRect.top;
          const placement =
            spaceBelow < menuEstimatedHeight && spaceAbove > spaceBelow ? 'top' : 'bottom';
          const menuTop = placement === 'top' ? cardRect.top - 4 : cardRect.bottom + 4;
          const menuLeft = cardRect.left;
          const menuWidth = cellContainer
            ? Math.max(cellContainer.getBoundingClientRect().width - 8, 180)
            : cardRect.width;
          setBookingMenuPosition({
            top: Math.max(menuTop, viewportPadding),
            triggerTop: cardRect.top,
            left: menuLeft,
            width: menuWidth,
            scrollTop,
            scrollLeft,
            placement,
          });
        }
        setBookingMenuOpen(bookingId);
      }
    },
    [bookingMenuOpen]
  );

  const handleDayViewMouseEnter = useCallback((bookingId: number) => {
    const cardElement = document.querySelector(`[data-booking-card="${bookingId}"]`) as HTMLElement;
    if (cardElement) {
      const cardRect = cardElement.getBoundingClientRect();
      setHoverCardPosition({ top: cardRect.top, left: cardRect.right + 4 });
    }
    setHoveredBooking(bookingId);
  }, []);

  const handleDayViewMouseLeave = useCallback(
    (e: React.MouseEvent, bookingId: number) => {
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
      if (bookingMenuOpen !== bookingId) {
        setBookingMenuOpen(null);
      }
    },
    [bookingMenuOpen]
  );

  const handleDayViewMenuMouseEnter = useCallback((bookingId: number) => {
    if (menuCloseTimeoutRef.current) {
      clearTimeout(menuCloseTimeoutRef.current);
      menuCloseTimeoutRef.current = null;
    }
    setHoveredBooking(bookingId);
  }, []);

  const handleDayViewMenuMouseLeave = useCallback(
    (e: React.MouseEvent, bookingId: number) => {
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && relatedTarget instanceof Element) {
        if (
          relatedTarget.closest('[data-booking-card]') ||
          relatedTarget.closest('[data-booking-menu]')
        ) {
          return;
        }
      }
      const cardElement = document.querySelector(`[data-booking-card="${bookingId}"]:hover`);
      if (cardElement) return;
      if (menuCloseTimeoutRef.current) clearTimeout(menuCloseTimeoutRef.current);
      menuCloseTimeoutRef.current = setTimeout(() => {
        const menuElement = document.querySelector('[data-booking-menu]');
        const cardEl = document.querySelector(`[data-booking-card="${bookingId}"]:hover`);
        if (!menuElement?.matches(':hover') && !cardEl) {
          setHoveredBooking(null);
          setHoverCardPosition(null);
          hoverCardOriginalPositionRef.current = null;
          setBookingMenuOpen(null);
          setBookingMenuPosition(null);
          bookingMenuOriginalPositionRef.current = null;
        }
        menuCloseTimeoutRef.current = null;
      }, 200);
    },
    []
  );

  const scheduleDayViewMenuHandlers: ScheduleDayViewMenuHandlers = useMemo(
    () => ({
      onNewBooking: (booking) => {
        setEditingBooking(null);
        setNewBookingDate(booking.booking_date || selectedDate);
        setRegisteredCustomer(null);
        setNewBookingSelectedCustomerId(null);
        if (booking.shop_id != null) {
          setNewBookingShopId(Number(booking.shop_id));
        }
        if (booking.booking_time) {
          const [hourStr2, minuteStr2] = booking.booking_time.split(':');
          const hourNum2 = Number(hourStr2);
          const ampm2 = hourNum2 >= 12 ? 'PM' : 'AM';
          const displayHour2 =
            hourNum2 > 12 ? hourNum2 - 12 : hourNum2 === 0 ? 12 : hourNum2;
          const timeLabel2 = `${displayHour2}:${minuteStr2} ${ampm2}`;
          setNewBookingTimeSlots([
            {
              designerId: booking.designer?.id || null,
              time: timeLabel2,
              duration: 30,
              serviceTab: 'service',
              serviceId: null,
              selectedItems: [],
            },
          ]);
        } else {
          setNewBookingTimeSlots([
            {
              designerId: booking.designer?.id || null,
              time: '10:00 AM',
              duration: 30,
              serviceTab: 'service',
              serviceId: null,
              selectedItems: [],
            },
          ]);
        }
        setIsNewBookingOpen(true);
        setBookingMenuOpen(null);
      },
      onEditBooking: (booking) => {
        setIsNewBookingOpen(false);
        setRegisteredCustomer(null);
        setEditingBooking(booking);
        setBookingMenuOpen(null);
      },
      onViewDetail: async (booking) => {
        setBookingMenuOpen(null);
        const customerId =
          (booking as any).customer?.id ||
          (booking as any).customer_id ||
          null;
        if (!customerId) {
          alert('고객 정보가 없습니다.');
          return;
        }
        setViewingCustomerId(customerId);
        await loadCustomerInfo(customerId);
      },
      onViewCustomer: async (booking) => {
        setBookingMenuOpen(null);
        setBookingMenuPosition(null);
        bookingMenuOriginalPositionRef.current = null;
        const customerId =
          (booking as any).customer?.id ||
          (booking as any).customer_id ||
          null;
        if (!customerId) {
          alert('고객 정보가 없습니다.');
          return;
        }
        setViewingCustomerId(customerId);
        await loadCustomerInfo(customerId);
      },
      onStatusChange: async (booking, newStatus) => {
        if (!booking.id) {
          alert('예약 ID가 없습니다.');
          return;
        }
        try {
          const response = await fetch(`/api/appointment/${booking.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          });
          if (!response.ok) {
            const errorData = await response.json();
            console.error('API error:', errorData);
            throw new Error(errorData.error || '상태 변경에 실패했습니다.');
          }
          const responseData = await response.json();
          if (isWeekViewMode && weekViewDesignerId && weekViewStartDate) {
            const startDate = new Date(weekViewStartDate);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            const weekRes = await fetch(
              `/api/appointment?designer_id=${weekViewDesignerId}&start_date=${startDateStr}&end_date=${endDateStr}&limit=1000`
            );
            const weekData = await weekRes.json();
            if (weekRes.ok && weekData.bookings) {
              setWeekViewBookings(weekData.bookings);
            }
          }
          const weekStart = getWeekStart(selectedDate);
          const weekEnd = getWeekEnd(selectedDate);
          const res = await fetch(
            `/api/appointment?start_date=${encodeURIComponent(weekStart)}&end_date=${encodeURIComponent(weekEnd)}&limit=1000`
          );
          const data = await res.json();
          if (data.bookings) {
            setBookings(data.bookings);
            setFilteredBookings(data.bookings);
          }
          setBookingMenuOpen(null);
          setBookingMenuPosition(null);
          bookingMenuOriginalPositionRef.current = null;
        } catch (error: any) {
          console.error('Status change error:', error);
          alert(error.message || '상태 변경에 실패했습니다.');
          setBookingMenuOpen(null);
          setBookingMenuPosition(null);
          bookingMenuOriginalPositionRef.current = null;
          throw error;
        }
      },
      onMoveBooking: (booking) => {
        setMovingBooking(booking);
        setMoveTargetSlot(null);
        setIsMoveConfirmOpen(false);
        setBookingMenuOpen(null);
        setBookingMenuPosition(null);
        bookingMenuOriginalPositionRef.current = null;
      },
      onCancelBooking: (booking) => {
        setBookingToCancel(booking);
        setIsCancelBookingModalOpen(true);
        setBookingMenuOpen(null);
        setBookingMenuPosition(null);
        bookingMenuOriginalPositionRef.current = null;
      },
      onRegisterSale: (booking) => {
        const customerId = (booking as any).customer?.id || (booking as any).customer_id;
        const customerName = (booking as any).customer?.name || (booking as any).customer_name || '고객';
        const customerPhone = (booking as any).customer?.phone || (booking as any).customer_phone;
        setBookingMenuOpen(null);
        setBookingMenuPosition(null);
        bookingMenuOriginalPositionRef.current = null;
        if (!customerId) {
          alert('이 예약에 연결된 고객이 없습니다. 판매를 등록하려면 먼저 고객을 등록해주세요.');
          return;
        }
        if (booking.id) {
          setSalesLinkedBookingId(booking.id);
        }
        setSalesDefaultDate((booking as any).booking_date || selectedDate);
        setSalesDefaultTime(
          typeof (booking as any).booking_time === 'string' && (booking as any).booking_time.length >= 5
            ? (booking as any).booking_time.slice(0, 5)
            : null,
        );
        setSalesRegistrationShopId(Number((booking as any).shop_id) || null);
        setSalesDefaultManager((booking as any).designer?.name || null);
        setSalesLinkedDepositPaid(
          Math.max(0, Number((booking as any).deposit_paid ?? (booking as any).depositPaid ?? 0) || 0),
        );
        if (customerId) {
          setCloseSalesFlowOnPickerClose(true);
          setViewingCustomerId(customerId);
          loadCustomerInfo(customerId);
          setSalesRegistrationCustomer({
            id: customerId,
            name: customerName,
            phone: customerPhone,
          });
          setIsSalesRegistrationModalOpen(true);
          setSalesItemPickerTab('service');
          setIsSalesItemPickerModalOpen(true);
        } else {
          alert('고객 정보가 없어 판매 등록을 할 수 없습니다.\n예약 수정에서 고객을 연결해 주세요.');
        }
        setBookingMenuOpen(null);
        setBookingMenuPosition(null);
        bookingMenuOriginalPositionRef.current = null;
      },
      onViewSaleDetail: async (booking) => {
        setBookingMenuOpen(null);
        setBookingMenuPosition(null);
        bookingMenuOriginalPositionRef.current = null;

        const customerId = (booking as any).customer?.id ?? (booking as any).customer_id;
        if (!customerId) return;

        try {
          const res = await fetch(`/api/sales?customer_id=${customerId}`);
          if (!res.ok) return;
          const { sales = [] } = await res.json();
          if (!sales.length) return;

          const bookingDate = (booking as any).booking_date;
          const bookingTime = (booking as any).booking_time || '';
          const sameDay = sales.filter((s: any) => s.sales_date === bookingDate);
          const candidates = sameDay.length > 0 ? sameDay : sales;
          const sale = candidates.reduce((best: any, cur: any) => {
            if (!best) return cur;
            const bestDiff = Math.abs(String(best.sales_time || '').localeCompare(bookingTime));
            const curDiff = Math.abs(String(cur.sales_time || '').localeCompare(bookingTime));
            return curDiff < bestDiff ? cur : best;
          }, null as any);
          if (!sale) return;

          const customerName =
            (booking as any).customer?.name || (booking as any).customer_name || '';
          const salesDetail = {
            id: sale.id,
            customer_id: sale.customer_id ?? customerId,
            shop_id: sale.shop_id ?? null,
            customer_name: customerName,
            sales_date: sale.sales_date,
            sales_time: sale.sales_time || '',
            sales_amount: sale.sales_amount || 0,
            discount_amount: sale.discount_amount || 0,
            total_amount: sale.total_amount || 0,
            cash_amount: sale.cash_amount || 0,
            card_amount: sale.card_amount || 0,
            bank_transfer_amount: sale.bank_transfer_amount || 0,
            payment_method: sale.payment_method || null,
            point_accumulation: sale.point_accumulation || 0,
            memo: sale.memo || null,
            items: (sale.sales_items || []).map((i: any) => ({
              item_type: i.item_type || 'service',
              item_name: i.item_name || '-',
              unit_price: Number(i.unit_price) || 0,
              quantity: Number(i.quantity) || 1,
              discount: Number(i.discount) || 0,
              discount_type: i.discount_type || null,
              discount_value: i.discount_value ?? null,
              amount: Number(i.amount) || 0,
              manager: i.manager || null,
              sales_classification: i.sales_classification || null,
              prepaid_deduction: Number(i.prepaid_deduction) || 0,
            })),
            created_by: sale.created_by,
            created_at: sale.created_at,
            edit_history: sale.edit_history || [],
          };
          setSalesDetailData(salesDetail);
          setIsSalesDetailModalOpen(true);
        } catch (err) {
          console.error('onViewSaleDetail error:', err);
        }
      },
    }),
    [
      selectedDate,
      isWeekViewMode,
      weekViewDesignerId,
      weekViewStartDate,
      loadCustomerInfo,
    ]
  );

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex flex-col">
      <AdminTopNav />
      {/* Full-screen loading overlay while initial data is being fetched */}
      {!initialDataReady && (
        <div className="fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
          <p className="text-sm text-gray-500">예약 정보를 불러오는 중...</p>
        </div>
      )}
      {/* Success toast for new bookings */}
      {bookingSuccessMessage && (
        <div className="pointer-events-none fixed right-4 top-20 z-50">
          <div className="pointer-events-auto rounded-xl bg-black text-white shadow-lg px-4 py-3 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>{bookingSuccessMessage}</span>
          </div>
        </div>
      )}
      {/* Success toast for memo */}
      {memoSuccessMessage && (
        <div className="pointer-events-none fixed right-4 top-20 z-50">
          <div className="pointer-events-auto rounded-xl bg-black text-white shadow-lg px-4 py-3 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>{memoSuccessMessage}</span>
          </div>
        </div>
      )}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        {/* REQ_SCH_001 - Top Header Controls */}
        <ScheduleHeaderControls
          isLeftPanelVisible={isLeftPanelVisible}
          selectedDate={selectedDate}
          selectedShopFilter={selectedShopFilter}
          allShops={allShops}
          onShopFilterChange={(value) => {
            setSelectedShopFilter(value);
            setSelectedDesignerFilter('전체');
          }}
          selectedDesignerFilter={selectedDesignerFilter}
          allDesigners={shopFilteredDesigners}
          searchInput={searchInput}
          isSearchDropdownOpen={isSearchDropdownOpen}
          searchDropdownPosition={searchDropdownPosition}
          isCalendarPopupOpen={isCalendarPopupOpen}
          calendarPopupMonth={calendarPopupMonth}
          isMenuDropdownOpen={isMenuDropdownOpen}
          menuDropdownPosition={menuDropdownPosition}
          searchAutocompleteResults={searchAutocompleteResults}
          isSearchAutocompleteLoading={isSearchAutocompleteLoading}
          recentSearches={recentSearches}
          searchInputRef={searchInputRef}
          menuButtonRef={menuButtonRef}
          onToggleLeftPanel={() => setIsLeftPanelVisible(!isLeftPanelVisible)}
          onDateChange={setSelectedDate}
          onDesignerFilterChange={(value) => {
            setSelectedDesignerFilter(value);
            if (value !== '전체' && value !== '전체(휴무 제외)') {
              // 특정 디자이너 선택 → 주간 뷰 자동 활성화
              const designer = allDesigners.find((d) => d.name === value);
              if (designer) {
                const mondayStr = getMondayOfWeek(new Date(selectedDate));
                setWeekViewDesignerId(designer.id);
                setWeekViewDesignerName(designer.name);
                setWeekViewStartDate(mondayStr);
                setIsWeekViewMode(true);
              }
            } else {
              // 전체 선택 → 일일 뷰로 복귀
              setIsWeekViewMode(false);
              setWeekViewDesignerId(null);
              setWeekViewDesignerName('');
              setWeekViewBookings([]);
            }
          }}
          onSearchInputChange={(value) => {
            setSearchInput(value);
            if (!value.trim()) {
              setFilteredBookings(bookings);
            }
          }}
          onSearchFocus={() => {
            if (searchInputRef.current) {
              const rect = searchInputRef.current.getBoundingClientRect();
              setSearchDropdownPosition({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width
              });
            }
            setIsSearchDropdownOpen(true);
          }}
          onSearchToggle={() => {
            if (searchInputRef.current) {
              const rect = searchInputRef.current.getBoundingClientRect();
              setSearchDropdownPosition({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width
              });
            }
            setIsSearchDropdownOpen(!isSearchDropdownOpen);
          }}
          onSearch={handleSearch}
          onCustomerSelect={handleCustomerSelect}
          onDeleteRecentSearch={handleDeleteRecentSearch}
          onCalendarPopupToggle={() => {
            setIsCalendarPopupOpen(!isCalendarPopupOpen);
            setCalendarPopupMonth(new Date(selectedDate));
          }}
          onCalendarMonthChange={setCalendarPopupMonth}
          onMenuToggle={() => {
            if (menuButtonRef.current) {
              const rect = menuButtonRef.current.getBoundingClientRect();
              setMenuDropdownPosition({
                top: rect.bottom + 4,
                left: rect.right,
                width: rect.width
              });
            }
            setIsMenuDropdownOpen(!isMenuDropdownOpen);
          }}
          onSetSearchDropdownPosition={setSearchDropdownPosition}
          onSetMenuDropdownPosition={setMenuDropdownPosition}
          onSetIsSearchDropdownOpen={setIsSearchDropdownOpen}
          onSetIsCalendarPopupOpen={setIsCalendarPopupOpen}
          onSetIsMenuDropdownOpen={setIsMenuDropdownOpen}
          onSetRecentSearches={setRecentSearches}
          onSetViewingCustomerId={setViewingCustomerId}
          onLoadCustomerInfo={loadCustomerInfo}
          onOpenReservationHistory={() => setIsReservationHistoryOpen(true)}
          onOpenHolidayCalendar={() => setIsHolidayCalendarModalOpen(true)}
          isWeekViewMode={isWeekViewMode}
          weekViewStartDate={weekViewStartDate}
          onWeekNavigate={(newStartDate) => {
            setWeekViewStartDate(newStartDate);
            setSelectedDate(newStartDate);
          }}
        />

        <div className="flex-1 overflow-y-auto p-5.5 md:p-9.5 scroll-smooth bg-gray-50/50">
          <div className="max-w-full mx-auto flex flex-col gap-6 h-full">


            <div className={`grid grid-cols-1 ${isLeftPanelVisible ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-6 flex-1 min-h-0`}>
              {/* Left: Calendar panel
                  - Mobile: fixed overlay below header (out of grid flow)
                  - Desktop lg+: normal grid col-span-3 */}
              {isLeftPanelVisible && (
                <>
                  {/* Mobile-only backdrop — click to close calendar */}
                  <div
                    className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                    onClick={() => setIsLeftPanelVisible(false)}
                  />
                  <div className="fixed top-16 left-0 right-0 z-50 bg-white shadow-xl overflow-y-auto max-h-[80vh] rounded-b-2xl lg:static lg:top-auto lg:left-auto lg:right-auto lg:z-auto lg:max-h-none lg:overflow-visible lg:shadow-none lg:rounded-none lg:col-span-3 lg:flex lg:flex-col lg:gap-6 lg:min-h-0 lg:h-full">
                    <div className="p-4 flex flex-col gap-4 lg:p-0 lg:gap-6 lg:flex-1 lg:min-h-0">
                      <AppointmentCalendar
                        selectedDate={selectedDate}
                        dayCounts={dayCounts}
                        showBookingCount={showBookingCount}
                        onDateSelect={(date) => {
                          setSelectedDate(date);
                          // Auto-close calendar overlay on mobile after date selection
                          if (window.innerWidth < 1024) setIsLeftPanelVisible(false);
                        }}
                      />
                      {/* Memo — hidden on mobile overlay, visible on desktop sidebar */}
                      <div className="hidden lg:flex lg:flex-1 lg:min-h-0">
                        <AdminMemo
                          memo={memo}
                          memoLoading={memoLoading}
                          memoSaving={memoSaving}
                          onMemoChange={setMemo}
                          onSave={handleMemoSave}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Center: Full Schedule — always full width on mobile */}
              <div className={`${isLeftPanelVisible ? 'lg:col-span-9' : 'lg:col-span-12'} col-span-1 flex flex-col gap-4 min-h-0`}>

                {/* ===== MOBILE VIEW: list filtered by top controls ===== */}
                <div className="hidden flex-col gap-3">
                  {/* Booking list */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Date header */}
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-black">
                        {(() => {
                          const d = parseLocalDateString(selectedDate);
                          const dayName = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
                          return `${d.getMonth() + 1}월 ${d.getDate()}일 (${dayName})`;
                        })()}
                      </span>
                      <span className="text-xs text-gray-500">{mobileDesignerBookings.length}건</span>
                    </div>

                    {mobileDesignerBookings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2">event_busy</span>
                        <p className="text-sm">예약이 없습니다</p>
                      </div>
                    ) : selectedDesignerFilter === '전체' ? (
                      <div className="divide-y divide-gray-100">
                        {mobileBookingsByDesigner.map((group) => (
                          <div key={`mobile-group-${group.designerId}`} className="py-2">
                            <div className="px-4 py-2 bg-gray-50 border-y border-gray-100 flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-700">{group.designerName}</span>
                              <span className="text-[11px] text-gray-500">{group.bookings.length}건</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {group.bookings.map((booking) => {
                                const timeLabel = booking.booking_time
                                  ? booking.booking_time.slice(0, 5)
                                  : '—';
                                const customerName = (booking as any).customer?.name || (booking as any).customer_name || '고객';
                                const serviceName = (booking as any).service?.name || (booking as any).service_name || '';
                                const duration = getBookingDurationMinutes(booking as any);
                                const status = String((booking as any).status || (booking as any).booking_status || '').toLowerCase();
                                const statusLabel =
                                  status === 'confirmed' ? '확정' :
                                  status === 'pending' ? '대기' :
                                  status === 'completed' ? '완료' :
                                  status === 'no_show' ? '노쇼' : status;
                                const statusColor =
                                  status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                  status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                  status === 'no_show' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600';

                                return (
                                  <button
                                    key={booking.id}
                                    type="button"
                                    onClick={() => setViewingBookingDetail(booking)}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                  >
                                    <div className="shrink-0 w-12 text-center">
                                      <span className="text-sm font-bold text-black">{timeLabel}</span>
                                      {duration && (
                                        <p className="text-[10px] text-gray-400 mt-0.5">{duration}분</p>
                                      )}
                                    </div>
                                    <div className="w-px h-10 bg-gray-200 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-black truncate">{customerName}</p>
                                      {serviceName && (
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{serviceName}</p>
                                      )}
                                    </div>
                                    {statusLabel && (
                                      <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${statusColor}`}>
                                        {statusLabel}
                                      </span>
                                    )}
                                    <span className="material-symbols-outlined text-gray-300 text-lg shrink-0">chevron_right</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {mobileDesignerBookings.map((booking) => {
                          const timeLabel = booking.booking_time
                            ? booking.booking_time.slice(0, 5)
                            : '—';
                          const customerName = (booking as any).customer?.name || (booking as any).customer_name || '고객';
                          const serviceName = (booking as any).service?.name || (booking as any).service_name || '';
                          const duration = getBookingDurationMinutes(booking as any);
                          const status = String((booking as any).status || (booking as any).booking_status || '').toLowerCase();
                          const statusLabel =
                            status === 'confirmed' ? '확정' :
                            status === 'pending' ? '대기' :
                            status === 'completed' ? '완료' :
                            status === 'no_show' ? '노쇼' : status;
                          const statusColor =
                            status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            status === 'no_show' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600';

                          return (
                            <button
                              key={booking.id}
                              type="button"
                              onClick={() => setViewingBookingDetail(booking)}
                              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                            >
                              {/* Time */}
                              <div className="shrink-0 w-12 text-center">
                                <span className="text-sm font-bold text-black">{timeLabel}</span>
                                {duration && (
                                  <p className="text-[10px] text-gray-400 mt-0.5">{duration}분</p>
                                )}
                              </div>
                              {/* Divider */}
                              <div className="w-px h-10 bg-gray-200 shrink-0" />
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-black truncate">{customerName}</p>
                                {serviceName && (
                                  <p className="text-xs text-gray-500 truncate mt-0.5">{serviceName}</p>
                                )}
                              </div>
                              {/* Status */}
                              {statusLabel && (
                                <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${statusColor}`}>
                                  {statusLabel}
                                </span>
                              )}
                              {/* Chevron */}
                              <span className="material-symbols-outlined text-gray-300 text-lg shrink-0">chevron_right</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                {/* ===== END MOBILE VIEW ===== */}

                {/* ===== DESKTOP VIEW: time grid (hidden on mobile) ===== */}
                <div
                  ref={scheduleRef}
                  className="flex flex-col flex-1 overflow-hidden bg-[#f8f9fc] relative rounded-2xl border border-gray-200 shadow-sm min-h-0"
                >
                  {/* Loading overlay */}
                  {loadingDesignerAvailability && (
                    <div className="absolute inset-0 bg-gray-500/30 backdrop-blur-sm z-50 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                        <span className="text-sm font-medium text-gray-700">로딩 중...</span>
                      </div>
                    </div>
                  )}
                  {/* Move mode banner */}
                  {movingBooking && (
                    <div className="flex items-center justify-center bg-sky-400 text-white px-4 py-2.5 rounded-t-2xl shrink-0 relative">
                      <span className="text-sm font-medium leading-none">예약을 이동시킬 셀을 클릭하세요</span>
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-white/80 transition-colors flex items-center justify-center"
                        onClick={() => {
                          setMovingBooking(null);
                          setMoveTargetSlot(null);
                          setIsMoveConfirmOpen(false);
                        }}
                      >
                        <span className="material-symbols-outlined leading-none" style={{ fontSize: '20px' }}>close</span>
                      </button>
                    </div>
                  )}
                  <div className="h-full overflow-auto relative" id="schedule-scroll-container">
                    {/* Vertical column dividers for entire scrollable area - positioned outside grid to extend full height */}
                    {/* Note: These dividers are rendered here (lines 921-939) to ensure they extend the full scrollable height.
                         They are positioned absolutely relative to the scroll container, not the grid, so they remain visible
                         even when scrolling horizontally. This fixes the issue where dividers were cut off after certain columns. */}
                    {!isWeekViewMode && scheduleColumns.length > 0 && (
                      <div 
                        className="absolute pointer-events-none z-0" 
                        style={{ 
                          left: '80px', // Time column width
                          right: 0,
                          top: 0,
                          height: `${(GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16}px`,
                        }}
                      >
                        {scheduleColumns.map((col, colIndex) => {
                          const nextCol = scheduleColumns[colIndex + 1];
                          const isShopBoundary =
                            !!nextCol && nextCol.columnShopId !== col.columnShopId;
                          const columnWidth = 100 / scheduleColumns.length;
                          return (
                            <div
                              key={`full-divider-${col.columnKey}`}
                              className={`absolute border-r ${isShopBoundary ? 'border-r-[3px] border-[#64748b]' : 'border-[#e2e8f0]'}`}
                              style={{
                                left: `${(colIndex + 1) * columnWidth}%`,
                                width: '0px',
                                top: 0,
                                bottom: 0,
                                height: '100%',
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                    {/* Sticky Header: show time and week dates with designers */}
                    <ScheduleGridHeader
                      isWeekViewMode={isWeekViewMode}
                      weekViewDesignerId={weekViewDesignerId}
                      weekDates={weekDates}
                      scheduleColumns={scheduleColumns}
                      allDesigners={allDesigners}
                      allShops={allShops}
                      selectedDesignerFilter={selectedDesignerFilter}
                      weekViewStartDate={weekViewStartDate}
                      openColumnKey={openDesignerDropdown}
                      onDesignerDropdownToggle={setOpenDesignerDropdown}
                      onOpenWeekView={handleOpenWeekView}
                      onCloseWeekView={handleCloseWeekView}
                      onOpenRestriction={handleOpenRestrictionModal}
                      onOpenHolidayModal={handleOpenHolidayModal}
                      onOpenAttendanceModal={handleOpenAttendanceModal}
                      canUseAttendanceManagement={canUseAttendanceManagement}
                      columnDesignerOffMap={columnDesignerOffMap}
                      weekViewAvailableDates={weekViewAvailableDates}
                    />

                    {/* Grid Body */}
                    <div
                      className="flex relative"
                      style={{
                        minHeight: `${(GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16}px`,
                        minWidth: '100%',
                        width: 'fit-content'
                      }}
                      onClick={() => {
                        setFocusedBookingId(null);
                        setBookingMenuOpen(null);
                      }}
                    >

                      {/* Current Time Line (Sydney time, only when viewing today) */}
                      <CurrentTimeLine currentSydneyTime={currentSydneyTime} />

                      {/* Time Column - 30 minute intervals with padding - sticky left */}
                      <TimeColumn isWeekViewMode={isWeekViewMode} />

                      {/* Appointment Columns - Week view or normal view */}
                      {isWeekViewMode && weekViewDesignerId ? (
                        <WeekViewGrid
                          weekViewDesignerId={weekViewDesignerId}
                          weekViewDesignerName={weekViewDesignerName}
                          weekViewStartDate={weekViewStartDate}
                          weekViewBookings={weekViewBookings}
                          bookingRestrictions={bookingRestrictions}
                          hoveredEmptySlot={hoveredEmptySlot}
                          emptySlotMenuOpen={emptySlotMenuOpen}
                          emptySlotMenuPosition={emptySlotMenuPosition}
                          isNewBookingOpen={isBookingFormModalOpen}
                          hoveredBooking={hoveredBooking}
                          hoverCardPosition={hoverCardPosition}
                          hoverCardOriginalPositionRef={hoverCardOriginalPositionRef}
                          setHoverCardPosition={setHoverCardPosition}
                          bookingMenuOpen={bookingMenuOpen}
                          bookingMenuPosition={bookingMenuPosition}
                          bookingMenuOriginalPositionRef={bookingMenuOriginalPositionRef}
                          menuCloseTimeoutRef={menuCloseTimeoutRef}
                          menuOriginalPositionRef={menuOriginalPositionRef}
                          onOpenNewBooking={(data) => {
                            setEditingBooking(null);
                            setNewBookingDate(data.date);
                            if (data.customer?.id) {
                              const prefill = {
                                id: Number(data.customer.id),
                                name: String(data.customer.name || ''),
                                phone: data.customer.phone ?? null,
                              };
                              setRegisteredCustomer(prefill);
                              setNewBookingSelectedCustomerId(prefill.id);
                            } else {
                              setRegisteredCustomer(null);
                              setNewBookingSelectedCustomerId(null);
                            }
                            if (data.shopId != null) {
                              setNewBookingShopId(Number(data.shopId));
                            }
                            setNewBookingTimeSlots([{
                              designerId: data.designerId ?? null,
                              time: data.time,
                              duration: 30,
                              serviceTab: 'service',
                              serviceId: null,
                              selectedItems: [],
                            }]);
                            setIsNewBookingOpen(true);
                          }}
                          setBookingRestrictions={setBookingRestrictions}
                          setRestrictionDesignerId={setRestrictionDesignerId}
                          setRestrictionDesignerName={setRestrictionDesignerName}
                          setRestrictionDate={setRestrictionDate}
                          setRestrictionType={setRestrictionType}
                          setIsRestrictionModalOpen={setIsRestrictionModalOpen}
                          setHoveredEmptySlot={setHoveredEmptySlot}
                          setEmptySlotMenuOpen={setEmptySlotMenuOpen}
                          setEmptySlotMenuPosition={setEmptySlotMenuPosition}
                          setHoveredBooking={setHoveredBooking}
                          setBookingMenuOpen={setBookingMenuOpen}
                          setBookingMenuPosition={setBookingMenuPosition}
                          setEditingBooking={(booking) => {
                            setIsNewBookingOpen(false);
                            setRegisteredCustomer(null);
                            setEditingBooking(booking);
                          }}
                          setViewingBookingDetail={(booking) => setViewingBookingDetail(booking)}
                          weekViewAvailableDates={weekViewAvailableDates}
                          onBookingStatusChange={async (booking, newStatus) => {
                            if (!booking.id) {
                              alert('예약 ID가 없습니다.');
                              return;
                            }
                            try {
                              const response = await fetch(`/api/appointment/${booking.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: newStatus }),
                              });
                              if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.error || '상태 변경에 실패했습니다.');
                              }
                              // Refresh bookings
                              const weekStart = getWeekStart(selectedDate);
                              const weekEnd = getWeekEnd(selectedDate);
                              const res = await fetch(
                                `/api/appointment?start_date=${encodeURIComponent(weekStart)}&end_date=${encodeURIComponent(weekEnd)}&limit=1000`
                              );
                              const data = await res.json();
                              if (res.ok && data.bookings) {
                                setBookings(data.bookings);
                                setFilteredBookings(data.bookings);
                              }
                              // Refresh week view bookings if in week view mode
                              if (isWeekViewMode && weekViewDesignerId && weekViewStartDate) {
                                const startDate = new Date(weekViewStartDate);
                                const endDate = new Date(startDate);
                                endDate.setDate(endDate.getDate() + 6);
                                const startDateStr = startDate.toISOString().split('T')[0];
                                const endDateStr = endDate.toISOString().split('T')[0];
                                const weekRes = await fetch(
                                  `/api/appointment?designer_id=${weekViewDesignerId}&start_date=${encodeURIComponent(startDateStr)}&end_date=${encodeURIComponent(endDateStr)}&limit=1000`
                                );
                                const weekData = await weekRes.json();
                                if (weekRes.ok && weekData.bookings) {
                                  setWeekViewBookings(weekData.bookings);
                                }
                              }
                            } catch (error: any) {
                              alert(error.message || '상태 변경에 실패했습니다.');
                              throw error;
                            }
                          }}
                          onCancelBooking={(booking) => {
                            setBookingToCancel(booking);
                            setIsCancelBookingModalOpen(true);
                          }}
                          onRegisterSale={(booking) => {
                            const customerId = (booking as any).customer?.id || (booking as any).customer_id;
                            const customerName = (booking as any).customer?.name || (booking as any).customer_name || '고객';
                            const customerPhone = (booking as any).customer?.phone || (booking as any).customer_phone;
                            setBookingMenuOpen(null);
                            setBookingMenuPosition(null);
                            if (bookingMenuOriginalPositionRef.current) {
                              bookingMenuOriginalPositionRef.current = null;
                            }
                            if (!customerId) {
                              alert('이 예약에 연결된 고객이 없습니다. 판매를 등록하려면 먼저 고객을 등록해주세요.');
                              return;
                            }
                            if (booking.id) setSalesLinkedBookingId(booking.id);
                            setSalesRegistrationShopId(Number((booking as any).shop_id) || null);
                            setSalesDefaultManager((booking as any).designer?.name || null);
                            setSalesLinkedDepositPaid(
                              Math.max(
                                0,
                                Number((booking as any).deposit_paid ?? (booking as any).depositPaid ?? 0) || 0,
                              ),
                            );
                            if (customerId) {
                              setCloseSalesFlowOnPickerClose(true);
                              setViewingCustomerId(customerId);
                              loadCustomerInfo(customerId);
                              setSalesRegistrationCustomer({
                                id: customerId,
                                name: customerName,
                                phone: customerPhone,
                              });
                              setIsSalesRegistrationModalOpen(true);
                              setSalesItemPickerTab('service');
                              setIsSalesItemPickerModalOpen(true);
                            } else {
                              alert('고객 정보가 없어 판매 등록을 할 수 없습니다.\n예약 수정에서 고객을 연결해 주세요.');
                            }
                            setBookingMenuOpen(null);
                            setBookingMenuPosition(null);
                            if (bookingMenuOriginalPositionRef.current) {
                              bookingMenuOriginalPositionRef.current = null;
                            }
                          }}
                          movingBooking={movingBooking}
                          onSelectMoveTarget={(target) => {
                            if (!movingBooking) return;
                            setMoveTargetSlot(target);
                            setIsMoveConfirmOpen(true);
                          }}
                        />
                      ) : (
                        // Comment: Normal view - week dates with designer columns
                        <div className="flex flex-1 bg-white relative">
                          {/* Hour guidelines - 30 minute intervals with padding, full width */}
                          <div className="absolute inset-0 pointer-events-none flex flex-col z-0 pt-2 pb-2" style={{ width: '100%' }}>
                            {Array.from({ length: (GRID_END_HOUR - GRID_START_HOUR) * 2 }).map((_, i) => (
                              <div
                                key={i}
                                className="h-[40px] border-b border-[#f1f5f9] border-dashed w-full"
                              />
                            ))}
              </div>

                          {/* Show week dates with designers */}
                          {weekDates.map((dateStr, dateIndex) => {
                            return (
                              <div key={dateStr} className="border-r border-[#e2e8f0] flex-1 relative" style={{ minWidth: `${scheduleColumns.length * 150}px`, minHeight: `${(GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16}px` }}>
                                <div className="grid relative" style={{ gridTemplateColumns: `repeat(${scheduleColumns.length}, minmax(120px, 1fr))` }}>
                                {scheduleColumns.map((col, designerIndex) => {
                          const designer = allDesigners.find((d) => d.id === col.designerId);
                          const designerId = designer?.id;
                          const nextCol = scheduleColumns[designerIndex + 1];
                          const isShopBoundary = !!nextCol && nextCol.columnShopId !== col.columnShopId;
                          const bookingLookupKey = columnKeyForBookingsLookup(col, designer);
                                  const designerBookings = bookingsByDateAndDesigner[dateStr]?.[bookingLookupKey] || [];
                          const color = designerColorMap[col.columnKey] ??
                                    DESIGNER_COLORS[designerIndex % DESIGNER_COLORS.length];
                          
                                  // Comment: Get restrictions for this designer on this date
                          const designerRestrictions = bookingRestrictions.filter(
                                    (r) => r.designer_id === designerId && r.restriction_date === dateStr
                          );

                          const isDesignerOff = designerId
                            ? (columnDesignerOffMap[col.columnKey] ?? false)
                            : false;

                          return (
                            <div
                                      key={`${dateStr}-${col.columnKey}`}
                                      className={`relative h-full overflow-hidden border-r ${isShopBoundary ? 'border-r-[3px] border-[#64748b]' : 'border-[#e2e8f0]'} last:border-r-0 ${isDesignerOff ? 'bg-gray-100/50' : ''}`}
                                      style={{
                                        minHeight: `${(GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16}px`,
                                      }}
                            >
                              {/* Comment: Render restriction blocks (greyout) */}
                              {designerRestrictions.map((restriction) => {
                                if (restriction.restriction_type === 'date') {
                                  // Comment: Full day restriction - 진한 그레이 컬러
                                  return (
                                    <div
                                      key={`restriction-${restriction.id}`}
                                      className="absolute inset-0 bg-gray-500/60 pointer-events-none z-5"
                                    />
                                  );
                                } else if (restriction.restriction_type === 'time' && restriction.start_time && restriction.end_time) {
                                  // Comment: Time range restriction - 진한 그레이 컬러
                                  const [startHour, startMin] = restriction.start_time.split(':').map(Number);
                                  const [endHour, endMin] = restriction.end_time.split(':').map(Number);
                                  const startMinutes = (startHour - GRID_START_HOUR) * 60 + startMin;
                                  const endMinutes = (endHour - GRID_START_HOUR) * 60 + endMin;
                                  if (startMinutes < 0 || endMinutes < 0) return null;
                                  
                                  const top = (startMinutes / 30) * GRID_30MIN_HEIGHT + 8;
                                  const height = ((endMinutes - startMinutes) / 30) * GRID_30MIN_HEIGHT;
                                  const slotTime = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
                                  
                                  return (
                                    <div
                                      key={`restriction-${restriction.id}`}
                                      className="absolute left-0 right-0 bg-gray-500/60 z-[40] cursor-pointer"
                                      style={{ top, height, pointerEvents: 'auto' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        // 예약금지 셀 클릭 시 드롭다운 메뉴 표시
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        if (!rect || rect.width === 0) {
                                          console.error('Invalid restriction cell rect');
                                          return;
                                        }
                                        
                                        const cellElement = e.currentTarget.closest('[class*="relative h-full"]') as HTMLElement;
                                        const cellRect = cellElement?.getBoundingClientRect();
                                        const menuWidth = cellRect ? cellRect.width : 180;
                                        // 메뉴를 셀의 왼쪽에 맞춤
                                        const menuLeft = cellRect ? cellRect.left : rect.left;
                                        
                                        // 스크롤 컨테이너의 스크롤 위치와 뷰포트 위치 가져오기
                                        const scrollContainer = document.getElementById('schedule-scroll-container');
                                        if (!scrollContainer) {
                                          console.error('Scroll container not found');
                                          return;
                                        }
                                        
                                        const scrollTop = scrollContainer.scrollTop;
                                        const scrollLeft = scrollContainer.scrollLeft;
                                        
                                        // 유효한 위치 값인지 확인
                                        if (isNaN(rect.bottom) || isNaN(menuLeft) || !isFinite(rect.bottom) || !isFinite(menuLeft)) {
                                          console.error('Invalid menu position values');
                                          return;
                                        }
                                        
                                        // 메뉴 위치는 뷰포트 기준으로 계산 (렌더링 시 상대 위치로 변환)
                                        setEmptySlotMenuPosition({
                                          top: rect.bottom,
                                          triggerTop: rect.top,
                                          left: menuLeft,
                                          width: menuWidth,
                                          scrollTop,
                                          scrollLeft
                                        });
                                        setEmptySlotMenuOpen({ 
                                          date: dateStr, 
                                          designerId: designerId || 0,
                                          columnShopId: col.columnShopId,
                                          time: slotTime,
                                        });
                                      }}
                                    />
                                  );
                                }
                                return null;
                              })}
                              
                              {/* Empty slots with hover UI */}
                              {Array.from({ length: (GRID_END_HOUR - GRID_START_HOUR) * 2 }).map((_, slotIndex) => {
                                const slotMinutes = slotIndex * 30;
                                const slotHour = Math.floor((GRID_START_HOUR * 60 + slotMinutes) / 60);
                                const slotMin = (GRID_START_HOUR * 60 + slotMinutes) % 60;
                                const slotTime = `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`;
                                const slotTop = (slotMinutes / 30) * GRID_30MIN_HEIGHT + 8;
                                const slotHeight = GRID_30MIN_HEIGHT;
                                
                                // Comment: Track which half of the slot is occupied so partially empty space
                                // remains clickable for overlapping bookings.
                                const activeSlotBookings = designerBookings.filter((b) => {
                                  if (!b.booking_time) return false;
                                  const [bHour, bMin] = b.booking_time.split(':').map(Number);
                                  const bStartMinutes = (bHour - GRID_START_HOUR) * 60 + bMin;
                                  const bDuration = getBookingDurationMinutes(b as any);
                                  const bEndMinutes = bStartMinutes + bDuration;
                                  return slotMinutes >= bStartMinutes && slotMinutes < bEndMinutes;
                                });
                                let occupiedLeft = false;
                                let occupiedRight = false;
                                let occupiedFull = false;
                                activeSlotBookings.forEach((booking) => {
                                  const [hourStr, minuteStr] = (booking.booking_time || '').split(':');
                                  const hour = Number(hourStr);
                                  const minutes = Number(minuteStr);
                                  if (Number.isNaN(hour) || Number.isNaN(minutes)) return;
                                  const startMinutes = (hour - GRID_START_HOUR) * 60 + minutes;
                                  const durationMinutes = getBookingDurationMinutes(booking as any);
                                  const endMinutes = startMinutes + durationMinutes;
                                  let hasOverlap = false;
                                  let placeOnRight = false;
                                  designerBookings.forEach((other: any) => {
                                    if (other === booking || !other.booking_time) return;
                                    const [ohStr, omStr] = other.booking_time.split(':').map(Number);
                                    if (Number.isNaN(ohStr) || Number.isNaN(omStr)) return;
                                    const otherStart = (ohStr - GRID_START_HOUR) * 60 + omStr;
                                    const otherDuration = getBookingDurationMinutes(other as any);
                                    const otherEnd = otherStart + otherDuration;
                                    const overlap =
                                      Math.max(startMinutes, otherStart) < Math.min(endMinutes, otherEnd);
                                    if (overlap) {
                                      hasOverlap = true;
                                      if ((other as any).id < (booking as any).id) {
                                        placeOnRight = true;
                                      }
                                    }
                                  });
                                  if (!hasOverlap) {
                                    occupiedFull = true;
                                    return;
                                  }
                                  if (placeOnRight) {
                                    occupiedRight = true;
                                  } else {
                                    occupiedLeft = true;
                                  }
                                });
                                const hasEmptyLane =
                                  !occupiedFull && !(occupiedLeft && occupiedRight);
                                const emptyLeftPercent = occupiedLeft && !occupiedRight ? 50 : 0;
                                const emptyWidthPercent =
                                  occupiedLeft || occupiedRight ? 50 : 100;
                                
                                // Check if this slot is restricted and get restriction info
                                const slotRestriction = designerRestrictions.find((r) => {
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
                                
                                if (!hasEmptyLane || !designerId || isDesignerOff) return null;
                                
                                const slotKey = `${dateStr}-${col.columnKey}-${slotTime}`;
                                const isHovered = hoveredEmptySlot?.date === dateStr && 
                                                  hoveredEmptySlot?.designerId === designerId && 
                                                  hoveredEmptySlot?.columnShopId === col.columnShopId &&
                                                  hoveredEmptySlot?.time === slotTime;
                                const isMenuOpen = emptySlotMenuOpen?.date === dateStr && 
                                                   emptySlotMenuOpen?.designerId === (designerId || 0) && 
                                                   emptySlotMenuOpen?.columnShopId === col.columnShopId &&
                                                   emptySlotMenuOpen?.time === slotTime;
                                
                                // Debug log
                                
                                const isMoveMode = !!movingBooking;

                                return (
                                  <div
                                    key={slotKey}
                                    className="absolute z-0 select-none"
                                    style={{ 
                                      top: slotTop, 
                                      height: slotHeight,
                                      left: `${emptyLeftPercent}%`,
                                      width: `${emptyWidthPercent}%`,
                                      pointerEvents: (emptySlotMenuOpen && !isMenuOpen) || (isRestricted && slotRestriction) ? 'none' : 'auto',
                                      cursor: !isRestricted && designerId ? 'pointer' : 'default',
                                      userSelect: 'none',
                                      WebkitUserSelect: 'none'
                                    }}
                                    onMouseDown={(e) => {
                                      // Comment: Ignore clicks coming from more button or its menu (day view)
                                      const target = e.target as HTMLElement;
                                      if (target.closest('button[type="button"]') || target.closest('[data-empty-slot-menu]') || target.closest('.empty-slot-more-button')) {
                                        return;
                                      }
                                      e.preventDefault();
                                      e.stopPropagation();
                                      // Comment: If move mode is active, select this slot as target; otherwise open "New Booking" modal
                                      if (!isRestricted && designerId) {
                                        if (movingBooking) {
                                          setMoveTargetSlot({
                                            date: dateStr,
                                            designerId,
                                            columnShopId: col.columnShopId,
                                            time: slotTime,
                                          });
                                          setIsMoveConfirmOpen(true);
                                          setHoveredEmptySlot(null);
                                        } else {
                                          setNewBookingDate(dateStr);
                                          if (col.columnShopId !== 0) {
                                            setNewBookingShopId(col.columnShopId);
                                          }
                                          const displayHour = slotHour % 12 === 0 ? 12 : slotHour % 12;
                                          const timeStr = `${displayHour}:${String(slotMin).padStart(2, '0')} ${slotHour >= 12 ? 'PM' : 'AM'}`;
                                          setNewBookingTimeSlots([{ designerId: designerId, time: timeStr, duration: 30, serviceTab: 'service', serviceId: null, selectedItems: [] }]);
                                          setEditingBooking(null);
                                          setIsNewBookingOpen(true);
                                          setHoveredEmptySlot(null);
                                        }
                                      }
                                    }}
                                    onMouseEnter={() => {
                                      // 메뉴가 열려있으면 다른 셀의 호버 무시
                                      if (emptySlotMenuOpen) {
                                        return;
                                      }
                                      // 예약 금지 셀은 호버하지 않음 (restriction 블록이 처리)
                                      if (!isRestricted) {
                                        setHoveredEmptySlot({
                                          date: dateStr,
                                          designerId: designerId || 0,
                                          columnShopId: col.columnShopId,
                                          time: slotTime,
                                        });
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      // 메뉴가 열려있으면 다른 셀로 이동해도 hoveredEmptySlot을 변경하지 않음
                                      if (isMenuOpen) {
                                        return;
                                      }
                                      // 메뉴가 열려있지 않을 때만 hoveredEmptySlot을 null로 설정
                                      setHoveredEmptySlot(null);
                                    }}
                                  >
                                    {isHovered && !isRestricted && (
                                      <div
                                        className={`h-full w-full relative group ${
                                          isMoveMode ? 'bg-blue-100/70' : ''
                                        }`}
                                        style={{ zIndex: isMenuOpen ? 10000 : undefined }}
                                      >
                                        {/* 빈 셀 more(≡) 버튼 - 예약 금지 셀, half 슬롯은 미노출 */}
                                        {!occupiedLeft && !occupiedRight && (
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
                                                designerId: designerId || 0,
                                                columnShopId: col.columnShopId,
                                                time: slotTime,
                                              };
                                              // 현재 메뉴가 이미 열려있으면 닫고, 아니면 열기
                                              if (isMenuOpen) {
                                                setEmptySlotMenuOpen(null);
                                                setEmptySlotMenuPosition(null);
                                              } else {
                                                // 버튼 위치 계산
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                if (!rect || rect.width === 0) {
                                                  console.error('Invalid button rect');
                                                  return;
                                                }
                                                
                                                // 버튼의 부모 셀 찾기
                                                const cellElement = e.currentTarget.closest('[data-empty-slot-cell]') as HTMLElement;
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
                                                const scrollContainer = document.getElementById('schedule-scroll-container');
                                                if (!scrollContainer) {
                                                  console.error('Scroll container not found');
                                                  return;
                                                }
                                                
                                                // 뷰포트 기준 위치를 그대로 저장 (렌더링 시 상대 위치로 변환)
                                                setEmptySlotMenuPosition({
                                                  top: rect.bottom,
                                                  triggerTop: rect.top,
                                                  left: menuLeft,
                                                  width: menuWidth,
                                                  scrollTop: scrollContainer.scrollTop,
                                                  scrollLeft: scrollContainer.scrollLeft
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
                                            <span className="material-symbols-outlined text-sm text-gray-600 pointer-events-none">more_vert</span>
                                          </button>
                                          
                                          {/* Empty slot context menu - Portal로 렌더링 (빈 셀 슬롯 루프 내부) */}
                                          {isMenuOpen && !isBookingFormModalOpen && emptySlotMenuPosition && emptySlotMenuOpen && typeof window !== 'undefined' && (() => {
                                            // emptySlotMenuOpen 상태를 기반으로 해당 슬롯의 restriction 정보 찾기
                                            const menuSlotTime = emptySlotMenuOpen.time;
                                            // emptySlotMenuOpen의 designerId와 date에 맞는 restrictions만 필터링
                                            const menuDesignerRestrictions = bookingRestrictions.filter(
                                              (r) => r.designer_id === emptySlotMenuOpen.designerId && r.restriction_date === emptySlotMenuOpen.date
                                            );
                                            const menuSlotRestriction = menuDesignerRestrictions.find((r) => {
                                              if (r.restriction_type === 'date') return true;
                                              if (r.restriction_type === 'time' && r.start_time && r.end_time) {
                                                const [rStartHour, rStartMin] = r.start_time.split(':').map(Number);
                                                const [rEndHour, rEndMin] = r.end_time.split(':').map(Number);
                                                const [slotHour, slotMin] = menuSlotTime.split(':').map(Number);
                                                const rStartMinutes = (rStartHour - GRID_START_HOUR) * 60 + rStartMin;
                                                const rEndMinutes = (rEndHour - GRID_START_HOUR) * 60 + rEndMin;
                                                const slotMinutes = (slotHour - GRID_START_HOUR) * 60 + slotMin;
                                                return slotMinutes >= rStartMinutes && slotMinutes < rEndMinutes;
                                              }
                                              return false;
                                            });
                                            const isSlotRestricted = !!menuSlotRestriction;
                                            
                                            const scrollContainer = document.getElementById('schedule-scroll-container');
                                            if (!scrollContainer) return null;
                                            
                                            // 스크롤 컨테이너 내부의 상대 위치 계산
                                            const containerRect = scrollContainer.getBoundingClientRect();
                                            if (!containerRect || containerRect.width === 0 || containerRect.height === 0) return null;
                                            
                                            const scrollTop = scrollContainer.scrollTop;
                                            const scrollLeft = scrollContainer.scrollLeft;
                                            
                                            // 셀의 절대 위치를 스크롤 컨테이너 기준 상대 위치로 변환
                                            const relativeTop = emptySlotMenuPosition.top - containerRect.top + scrollTop;
                                            const relativeLeft = emptySlotMenuPosition.left - containerRect.left + scrollLeft;
                                            
                                            // 유효한 위치 값인지 확인 (NaN이나 Infinity 체크)
                                            if (isNaN(relativeTop) || isNaN(relativeLeft) || !isFinite(relativeTop) || !isFinite(relativeLeft)) {
                                              return null;
                                            }
                                            
                                            // 원래 위치 저장 (한 번만)
                                            if (!menuOriginalPositionRef.current) {
                                              menuOriginalPositionRef.current = {
                                                top: relativeTop,
                                                left: relativeLeft,
                                                width: emptySlotMenuPosition.width
                                              };
                                            }
                                            
                                            const finalTop = menuOriginalPositionRef.current?.top ?? relativeTop;
                                            const finalLeft = menuOriginalPositionRef.current?.left ?? relativeLeft;
                                            
                                            // 최종 위치도 유효한지 확인
                                            if (isNaN(finalTop) || isNaN(finalLeft) || !isFinite(finalTop) || !isFinite(finalLeft)) {
                                              return null;
                                            }
                                            
                                            // Comment: Flip dropdown upward if not enough space below viewport.
                                            // When flipping, anchor by `bottom` so the menu's bottom hugs the
                                            // trigger's top — independent of the menu's actual height.
                                            const menuEstimatedHeight = isSlotRestricted ? 88 : 132;
                                            const spaceBelow = window.innerHeight - emptySlotMenuPosition.top;
                                            const flipUp = spaceBelow < menuEstimatedHeight;

                                            return createPortal(
                                            <div
                                              data-empty-slot-menu
                                                className="fixed bg-white rounded-lg shadow-lg z-[99999] flex flex-col"
                                                style={{
                                                  pointerEvents: 'auto',
                                                  border: 'none',
                                                  ...(flipUp
                                                    ? { bottom: `${window.innerHeight - emptySlotMenuPosition.triggerTop}px` }
                                                    : { top: `${emptySlotMenuPosition.top}px` }),
                                                  left: `${emptySlotMenuPosition.left}px`,
                                                  width: `${emptySlotMenuPosition.width}px`,
                                                  height: 'auto',
                                                  minHeight: 'fit-content',
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
                                                const relatedTarget = e.relatedTarget;
                                                // 버튼이나 메뉴 내부로 이동하는 경우는 무시
                                                if (relatedTarget && relatedTarget instanceof Element) {
                                                  if (relatedTarget.closest('.empty-slot-more-button') || 
                                                      relatedTarget.closest('[data-empty-slot-menu]')) {
                                                  return;
                                                  }
                                                }
                                                  // relatedTarget이 null이거나 없을 때도 버튼 위에 마우스가 있는지 확인
                                                  const buttonElement = document.querySelector('.empty-slot-more-button:hover');
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
                                                  const menuElement = document.querySelector('[data-empty-slot-menu]');
                                                  const buttonElement = document.querySelector('.empty-slot-more-button:hover');
                                                  if (!menuElement?.matches(':hover') && !buttonElement) {
                                                    setEmptySlotMenuOpen(null);
                                                      setEmptySlotMenuPosition(null);
                                                  }
                                                  menuCloseTimeoutRef.current = null;
                                                  }, 200);
                                                }}
                                              >
                                              {isSlotRestricted && menuSlotRestriction ? (
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
                                                      const res = await fetch(`/api/booking-restrictions?id=${menuSlotRestriction.id}`, {
                                                        method: 'DELETE',
                                                      });
                                                      if (res.ok) {
                                                        // 예약 금지 목록 새로고침
                                                        const restrictionsRes = await fetch(
                                                          `/api/booking-restrictions?date=${encodeURIComponent(emptySlotMenuOpen.date)}`
                                                        );
                                                        const restrictionsData = await restrictionsRes.json();
                                                        if (restrictionsRes.ok) {
                                                          setBookingRestrictions(restrictionsData.restrictions || []);
                                                        }
                                                        setEmptySlotMenuOpen(null);
                                                        setEmptySlotMenuPosition(null);
                                                        setHoveredEmptySlot(null);
                                                      } else {
                                                        const data = await res.json();
                                                        alert(data.error || '예약금지 취소에 실패했습니다.');
                                                      }
                                                    } catch (error) {
                                                      console.error('Error deleting restriction:', error);
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
                                                    const menuDesigner = allDesigners.find((d) => d.id === emptySlotMenuOpen.designerId);
                                                    setRestrictionDesignerId(emptySlotMenuOpen.designerId);
                                                    setRestrictionDesignerName(menuDesigner?.name || '');
                                                    setRestrictionDate(emptySlotMenuOpen.date);
                                                    setRestrictionType(menuSlotRestriction.restriction_type || 'time');
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
                                                const [menuSlotHour1, menuSlotMin1] = menuSlotTime.split(':').map(Number);
                                                const displayHour1 = menuSlotHour1 % 12 === 0 ? 12 : menuSlotHour1 % 12;
                                                const timeStr1 = `${displayHour1}:${String(menuSlotMin1).padStart(2, '0')} ${menuSlotHour1 >= 12 ? 'PM' : 'AM'}`;
                                                setNewBookingDate(emptySlotMenuOpen.date);
                                                if (emptySlotMenuOpen.columnShopId !== 0) {
                                                  setNewBookingShopId(emptySlotMenuOpen.columnShopId);
                                                }
                                                setNewBookingTimeSlots([{ designerId: emptySlotMenuOpen.designerId, time: timeStr1, duration: 30, serviceTab: 'service', serviceId: null, selectedItems: [] }]);
                                                setEditingBooking(null);
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
                                                  onClick={async (e) => {
                                                e.stopPropagation();
                                                    // 예약 금지 바로 적용
                                                const endTime = new Date(`2000-01-01T${menuSlotTime}`);
                                                endTime.setMinutes(endTime.getMinutes() + 30);
                                                    const endTimeStr = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
                                                    
                                                    try {
                                                      const res = await fetch('/api/booking-restrictions', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                          designer_id: emptySlotMenuOpen.designerId,
                                                          restriction_type: 'time',
                                                          restriction_date: emptySlotMenuOpen.date,
                                                          start_time: menuSlotTime,
                                                          end_time: endTimeStr,
                                                        }),
                                                      });
                                                      if (res.ok) {
                                                        // 예약 금지 목록 새로고침
                                                        const restrictionsRes = await fetch(
                                                          `/api/booking-restrictions?date=${encodeURIComponent(emptySlotMenuOpen.date)}`
                                                        );
                                                        const restrictionsData = await restrictionsRes.json();
                                                        if (restrictionsRes.ok) {
                                                          setBookingRestrictions(restrictionsData.restrictions || []);
                                                        }
                                                setEmptySlotMenuOpen(null);
                                                        setEmptySlotMenuPosition(null);
                                                setHoveredEmptySlot(null);
                                                      } else {
                                                        const data = await res.json();
                                                        alert(data.error || '예약금지 등록에 실패했습니다.');
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
                                              </div>
                                            , document.body);
                                          })()}
                                        </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              
                              {/* Empty slot context menu - Portal로 렌더링 (빈 셀 슬롯 루프 외부, 예약금지 셀 클릭 시) */}
                              {!isBookingFormModalOpen && emptySlotMenuPosition && emptySlotMenuOpen && emptySlotMenuOpen.date === dateStr && emptySlotMenuOpen.designerId === (designerId || 0) && emptySlotMenuOpen.columnShopId === col.columnShopId && typeof window !== 'undefined' && (() => {
                                // emptySlotMenuOpen 상태를 기반으로 해당 슬롯의 restriction 정보 찾기
                                const menuSlotTime = emptySlotMenuOpen.time;
                                // emptySlotMenuOpen의 designerId와 date에 맞는 restrictions만 필터링
                                const menuDesignerRestrictions = bookingRestrictions.filter(
                                  (r) => r.designer_id === emptySlotMenuOpen.designerId && r.restriction_date === emptySlotMenuOpen.date
                                );
                                const menuSlotRestriction = menuDesignerRestrictions.find((r) => {
                                  if (r.restriction_type === 'date') return true;
                                  if (r.restriction_type === 'time' && r.start_time && r.end_time) {
                                    const [rStartHour, rStartMin] = r.start_time.split(':').map(Number);
                                    const [rEndHour, rEndMin] = r.end_time.split(':').map(Number);
                                    const [slotHour, slotMin] = menuSlotTime.split(':').map(Number);
                                    const rStartMinutes = (rStartHour - GRID_START_HOUR) * 60 + rStartMin;
                                    const rEndMinutes = (rEndHour - GRID_START_HOUR) * 60 + rEndMin;
                                    const slotMinutes = (slotHour - GRID_START_HOUR) * 60 + slotMin;
                                    return slotMinutes >= rStartMinutes && slotMinutes < rEndMinutes;
                                  }
                                  return false;
                                });
                                const isSlotRestricted = !!menuSlotRestriction;
                                const scrollContainer = document.getElementById('schedule-scroll-container');
                                if (!scrollContainer) return null;
                                
                                const containerRect = scrollContainer.getBoundingClientRect();
                                if (!containerRect || containerRect.width === 0 || containerRect.height === 0) return null;
                                
                                const scrollTop = scrollContainer.scrollTop;
                                const scrollLeft = scrollContainer.scrollLeft;
                                
                                // 셀의 절대 위치를 스크롤 컨테이너 기준 상대 위치로 변환
                                const relativeTop = emptySlotMenuPosition.top - containerRect.top + scrollTop;
                                const relativeLeft = emptySlotMenuPosition.left - containerRect.left + scrollLeft;
                                
                                // 유효한 위치 값인지 확인 (NaN이나 Infinity 체크)
                                if (isNaN(relativeTop) || isNaN(relativeLeft) || !isFinite(relativeTop) || !isFinite(relativeLeft)) {
                                  return null;
                                }
                                
                                return createPortal(
                                  <div 
                                    data-empty-slot-menu 
                                    className="fixed bg-white rounded-lg shadow-lg z-[99999] flex flex-col"
                                    style={{
                                      pointerEvents: 'auto',
                                      border: 'none',
                                      top: `${emptySlotMenuPosition.top}px`,
                                      left: `${emptySlotMenuPosition.left}px`,
                                      width: `${emptySlotMenuPosition.width}px`,
                                      height: 'auto',
                                      minHeight: 'fit-content',
                                    }}
                                    onMouseEnter={() => {
                                      if (menuCloseTimeoutRef.current) {
                                        clearTimeout(menuCloseTimeoutRef.current);
                                        menuCloseTimeoutRef.current = null;
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      const relatedTarget = e.relatedTarget;
                                      if (relatedTarget && relatedTarget instanceof Element) {
                                        if (relatedTarget.closest('.empty-slot-more-button') || 
                                            relatedTarget.closest('[data-empty-slot-menu]')) {
                                        return;
                                        }
                                      }
                                      const buttonElement = document.querySelector('.empty-slot-more-button:hover');
                                      if (buttonElement) {
                                        return;
                                      }
                                      if (menuCloseTimeoutRef.current) {
                                        clearTimeout(menuCloseTimeoutRef.current);
                                      }
                                      menuCloseTimeoutRef.current = setTimeout(() => {
                                        const menuElement = document.querySelector('[data-empty-slot-menu]');
                                        const buttonElement = document.querySelector('.empty-slot-more-button:hover');
                                        if (!menuElement?.matches(':hover') && !buttonElement) {
                                          setEmptySlotMenuOpen(null);
                                          setEmptySlotMenuPosition(null);
                                        }
                                        menuCloseTimeoutRef.current = null;
                                      }, 200);
                                    }}
                                  >
                                    {isSlotRestricted && menuSlotRestriction ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!confirm('예약금지를 취소하시겠습니까?')) {
                                              return;
                                            }
                                            try {
                                              const res = await fetch(`/api/booking-restrictions?id=${menuSlotRestriction.id}`, {
                                                method: 'DELETE',
                                              });
                                              if (res.ok) {
                                                const restrictionsRes = await fetch(
                                                  `/api/booking-restrictions?date=${encodeURIComponent(emptySlotMenuOpen.date)}`
                                                );
                                                const restrictionsData = await restrictionsRes.json();
                                                if (restrictionsRes.ok) {
                                                  setBookingRestrictions(restrictionsData.restrictions || []);
                                                }
                                                setEmptySlotMenuOpen(null);
                                                setEmptySlotMenuPosition(null);
                                                setHoveredEmptySlot(null);
                                              } else {
                                                const data = await res.json();
                                                alert(data.error || '예약금지 취소에 실패했습니다.');
                                              }
                                            } catch (error) {
                                              console.error('Error deleting restriction:', error);
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
                                            const menuDesigner = allDesigners.find((d) => d.id === emptySlotMenuOpen.designerId);
                                            setRestrictionDesignerId(emptySlotMenuOpen.designerId);
                                            setRestrictionDesignerName(menuDesigner?.name || '');
                                            setRestrictionDate(emptySlotMenuOpen.date);
                                            setRestrictionType(menuSlotRestriction.restriction_type || 'time');
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
                                    ) : null}
                                  </div>
                                , document.body);
                              })()}
                              
                              {designerBookings
                                .filter((b) => {
                                  const status = String((b as any).status || (b as any).booking_status || '').toLowerCase();
                                  return !CANCELLED_STATUSES.has(status);
                                })
                                .map((b) => {
                                if (!b.booking_time) return null;
                                const [hourStr, minuteStr] = b.booking_time.split(':');
                                const hour = Number(hourStr);
                                const minutes = Number(minuteStr);
                                if (Number.isNaN(hour) || Number.isNaN(minutes)) return null;

                                const startMinutes = (hour - GRID_START_HOUR) * 60 + minutes;
                                if (startMinutes < 0) return null;
                                const durationMinutes = getBookingDurationMinutes(b as any);
                                const endMinutes = startMinutes + durationMinutes;

                                // Comment: Check overlap with other bookings for this designer (same date)
                                let hasOverlap = false;
                                let placeOnRight = false;
                                designerBookings.forEach((other: any) => {
                                  if (other === b || !other.booking_time) return;
                                  const [ohStr, omStr] = other.booking_time.split(':');
                                  const oh = Number(ohStr);
                                  const om = Number(omStr);
                                  if (Number.isNaN(oh) || Number.isNaN(om)) return;
                                  const otherStart = (oh - GRID_START_HOUR) * 60 + om;
                                  const otherDuration = getBookingDurationMinutes(other as any);
                                  const otherEnd = otherStart + otherDuration;
                                  const overlap =
                                    Math.max(startMinutes, otherStart) < Math.min(endMinutes, otherEnd);
                                  if (overlap) {
                                    hasOverlap = true;
                                    // Comment: Later-created booking goes to the right side
                                    if ((other as any).id < (b as any).id) {
                                      placeOnRight = true;
                                    }
                                  }
                                });

                                // Comment: Calculate position based on 30-minute intervals (40px each) with padding
                                const top = (startMinutes / 30) * GRID_30MIN_HEIGHT + 8; // Add padding offset
                                const height = Math.max((durationMinutes / 30) * GRID_30MIN_HEIGHT, 40);

                                // Comment: Horizontal layout - split width when overlapped
                                const widthPercent = hasOverlap ? 50 : 100;
                                const leftPercent = hasOverlap && placeOnRight ? 50 : 0;

                                return (
                                  <ScheduleDayViewBookingCard
                                    key={b.id}
                                    booking={b}
                                    top={top}
                                    height={height}
                                    widthPercent={widthPercent}
                                    leftPercent={leftPercent}
                                    emptySlotMenuOpen={emptySlotMenuOpen}
                                    isMenuOpen={bookingMenuOpen === b.id}
                                    isHovered={hoveredBooking === b.id}
                                    isNewBookingOpen={isBookingFormModalOpen}
                                    hoverCardPosition={hoverCardPosition}
                                    bookingMenuPosition={bookingMenuPosition}
                                    onCardClick={handleDayViewCardClick}
                                    onMouseEnter={handleDayViewMouseEnter}
                                    onMouseLeave={handleDayViewMouseLeave}
                                    menuHandlers={scheduleDayViewMenuHandlers}
                                    onMenuMouseEnter={handleDayViewMenuMouseEnter}
                                    onMenuMouseLeave={handleDayViewMenuMouseLeave}
                                    menuCloseTimeoutRef={menuCloseTimeoutRef}
                                    bookingMenuOriginalPositionRef={bookingMenuOriginalPositionRef}
                                  />
                                );
                              })}
                                    </div>
                                  );
                                })}
                              </div>
                          </div>
                        );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>
      {/* New Booking Modal */}
      <NewBookingModal
        isOpen={isBookingFormModalOpen}
        editingBooking={editingBooking}
        onClose={() => {
          setIsNewBookingOpen(false);
          setEditingBooking(null);
          setRegisteredCustomer(null);
        }}
        selectedDate={selectedDate}
        newBookingCustomerSearch={newBookingCustomerSearch}
        newBookingDate={newBookingDate}
        newBookingTimeSlots={newBookingTimeSlots}
        newBookingDesigners={newBookingDesigners}
        newBookingServices={newBookingServices}
        newBookingMemo={newBookingMemo}
        newBookingSubmitting={newBookingSubmitting}
        newBookingLoadingOptions={newBookingLoadingOptions}
        newBookingShopId={newBookingShopId}
        setNewBookingCustomerSearch={setNewBookingCustomerSearch}
        setNewBookingDate={setNewBookingDate}
        setNewBookingTimeSlots={setNewBookingTimeSlots}
        setNewBookingMemo={setNewBookingMemo}
        setNewBookingShopId={setNewBookingShopId}
        setNewBookingSubmitting={setNewBookingSubmitting}
        setIsCustomerRegistrationModalOpen={setIsCustomerRegistrationModalOpen}
        setBookingSuccessMessage={setBookingSuccessMessage}
        setBookings={setBookings}
        setFilteredBookings={setFilteredBookings}
        newBookingSelectedCustomerId={newBookingSelectedCustomerId}
        newBookingCustomerSearchResults={newBookingCustomerSearchResults}
        newBookingIsCustomerSearching={newBookingIsCustomerSearching}
        setNewBookingSelectedCustomerId={setNewBookingSelectedCustomerId}
        setNewBookingCustomerSearchResults={setNewBookingCustomerSearchResults}
        setNewBookingIsCustomerSearching={setNewBookingIsCustomerSearching}
        registeredCustomer={registeredCustomer}
        onBookingsRefresh={() => {
          if (isReservationHistoryOpen) {
            setReservationHistoryRefreshTrigger((prev) => prev + 1);
          }
        }}
      />

      {/* Appointment Detail Modal */}
      {(() => {
        const relatedBookingsForDetail = (() => {
          if (!viewingBookingDetail) return [];

          const source = isWeekViewMode ? weekViewBookings : bookings;
          const { booking_date, booking_time, customer_id, shop_id } = viewingBookingDetail;
          if (!booking_date || !booking_time || customer_id == null) return [];

          return (source || []).filter((b) => {
            if (!b?.id) return false;
            if (b.id === viewingBookingDetail.id) return false;
            return (
              b.booking_date === booking_date &&
              b.booking_time === booking_time &&
              b.customer_id === customer_id &&
              (shop_id != null ? b.shop_id === shop_id : true)
            );
          });
        })();

        return (
          <AppointmentDetailModal
            booking={viewingBookingDetail}
            relatedBookings={relatedBookingsForDetail}
            onClose={() => setViewingBookingDetail(null)}
            onEdit={(booking: BookingWithRelations) => {
              setIsNewBookingOpen(false);
              setRegisteredCustomer(null);
              setEditingBooking(booking);
              setViewingBookingDetail(null);
            }}
            bookingTimeToLabel={bookingTimeToLabel}
          />
        );
      })()}


      {/* Delete Booking Confirm Modal */}
      {bookingToDelete && (
        <DeleteBookingModal
          booking={bookingToDelete}
          cancellingId={cancellingId}
          onClose={() => setBookingToDelete(null)}
          onConfirm={async () => {
            if (!bookingToDelete?.id) return;
            setCancellingId(bookingToDelete.id);
            try {
              const resDelete = await fetch(`/api/appointment/${bookingToDelete.id}`, {
                method: 'DELETE',
              });
              if (!resDelete.ok) {
                console.error('Failed to delete booking', await resDelete.text());
              }

              const weekStart = getWeekStart(selectedDate);
              const weekEnd = getWeekEnd(selectedDate);
              const res = await fetch(
                `/api/appointment?start_date=${encodeURIComponent(weekStart)}&end_date=${encodeURIComponent(weekEnd)}&limit=1000`
              );
              const data = await res.json();
              if (res.ok) {
                setBookings(data.bookings || []);
                setFilteredBookings(data.bookings || []);
              }
              setBookingToDelete(null);
            } catch (err) {
              console.error('Error deleting booking:', err);
            } finally {
              setCancellingId(null);
            }
          }}
        />
      )}

      {/* Move Booking Confirm Modal */}
      {isMoveConfirmOpen && movingBooking && moveTargetSlot && (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              type="button"
              onClick={() => {
                setIsMoveConfirmOpen(false);
                setMoveTargetSlot(null);
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-black"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
            <h2 className="text-lg font-bold text-black mb-3">예약 이동</h2>
            <p className="text-sm text-gray-700 mb-4">
              선택하신 예약을 아래 시간과 디자이너로 이동하시겠습니까?
            </p>
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-800 mb-4 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">예약 번호</span>
                <span className="font-semibold">#{movingBooking.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">날짜</span>
                <span className="font-medium">{moveTargetSlot.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">시간</span>
                <span className="font-medium">{moveTargetSlot.time}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsMoveConfirmOpen(false);
                  setMoveTargetSlot(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!movingBooking?.id || !moveTargetSlot) return;
                  try {
                    const dbTime = `${moveTargetSlot.time}:00`; // Comment: Convert "HH:MM" to "HH:MM:00" for DB
                    const targetShopId =
                      moveTargetSlot.columnShopId !== 0
                        ? moveTargetSlot.columnShopId
                        : movingBooking.shop_id ?? null;
                    const res = await fetch(`/api/appointment/${movingBooking.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        booking_date: moveTargetSlot.date,
                        booking_time: dbTime,
                        designer_id: moveTargetSlot.designerId,
                        ...(targetShopId != null ? { shop_id: targetShopId } : {}),
                      }),
                    });
                    if (!res.ok) {
                      const data = await res.json();
                      alert(data.error || '예약 이동에 실패했습니다.');
                      return;
                    }

                    // Refresh day view bookings for selectedDate
                    const weekStart = getWeekStart(selectedDate);
                    const weekEnd = getWeekEnd(selectedDate);
                    const weekResForDayView = await fetch(
                      `/api/appointment?start_date=${encodeURIComponent(weekStart)}&end_date=${encodeURIComponent(weekEnd)}&limit=1000`
                    );
                    const weekDataForDayView = await weekResForDayView.json();
                    if (weekResForDayView.ok && weekDataForDayView.bookings) {
                      setBookings(weekDataForDayView.bookings);
                      setFilteredBookings(weekDataForDayView.bookings);
                    }

                    // Refresh week view bookings if in week view mode
                    if (isWeekViewMode && weekViewDesignerId && weekViewStartDate) {
                      const startDate = new Date(weekViewStartDate);
                      const endDate = new Date(startDate);
                      endDate.setDate(endDate.getDate() + 6);
                      const startDateStr = startDate.toISOString().split('T')[0];
                      const endDateStr = endDate.toISOString().split('T')[0];
                      const weekRes = await fetch(
                        `/api/appointment?designer_id=${weekViewDesignerId}&start_date=${encodeURIComponent(
                          startDateStr
                        )}&end_date=${encodeURIComponent(endDateStr)}&limit=1000`
                      );
                      const weekData = await weekRes.json();
                      if (weekRes.ok && weekData.bookings) {
                        setWeekViewBookings(weekData.bookings);
                      }
                    }

                    setIsMoveConfirmOpen(false);
                    setMoveTargetSlot(null);
                    setMovingBooking(null);
                  } catch (error: any) {
                    alert(error.message || '예약 이동에 실패했습니다.');
                  }
                }}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-black hover:bg-gray-800"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reservation History Modal */}
      <ReservationHistoryModal
        isOpen={isReservationHistoryOpen}
        onClose={() => setIsReservationHistoryOpen(false)}
        defaultStartDate={selectedDate}
        defaultEndDate={selectedDate}
        refreshTrigger={reservationHistoryRefreshTrigger}
        onCustomerClick={async (customerId, phone) => {
          try {
            // Case 1: 고객 ID가 있는 경우 - 정상 경로
            if (customerId) {
              setViewingCustomerId(customerId);
              await loadCustomerInfo(customerId);
              return;
            }

            // Case 2: 고객 ID는 없지만 전화번호가 있는 경우 - 전화번호로 고객 조회
            const phoneTrimmed = (phone || '').trim();
            if (!phoneTrimmed) {
              alert('고객 정보가 없습니다.');
              return;
            }

            // Comment: Try to find existing customer by phone using lookup API
            const lookupRes = await fetch('/api/customers/lookup', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ phone: phoneTrimmed }),
            });

            if (!lookupRes.ok) {
              alert('고객 정보를 불러오는 중 오류가 발생했습니다.');
              return;
            }

            const lookupJson = await lookupRes.json();
            if (lookupJson.exists && lookupJson.customer?.id) {
              const resolvedId = lookupJson.customer.id as number;
              setViewingCustomerId(resolvedId);
              await loadCustomerInfo(resolvedId);
            } else {
              alert('해당 전화번호로 등록된 고객을 찾을 수 없습니다.');
            }
          } catch (err) {
            console.error('Error resolving customer from reservation history:', err);
            alert('고객 정보를 불러오는 중 오류가 발생했습니다.');
          }
        }}
        onEditBooking={(booking) => {
          setIsNewBookingOpen(false);
          setRegisteredCustomer(null);
          setEditingBooking(booking);
        }}
        onCancelBooking={(booking) => {
          setBookingToCancel(booking);
          setIsCancelBookingModalOpen(true);
        }}
        onViewBooking={(booking) => {
          if (booking.booking_date) {
            setSelectedDate(booking.booking_date);
            setIsReservationHistoryOpen(false);
            // Scroll to the booking cell after a short delay to allow date change
            setTimeout(() => {
              const scrollContainer = document.getElementById('schedule-scroll-container');
              if (scrollContainer && booking.booking_time && booking.designer?.id) {
                const [hour, minute] = booking.booking_time.split(':');
                const hourNum = Number(hour);
                const minutes = Number(minute);
                const GRID_START_HOUR = 8;
                const GRID_30MIN_HEIGHT = 60;
                const startMinutes = (hourNum - GRID_START_HOUR) * 60 + minutes;
                const top = (startMinutes / 30) * GRID_30MIN_HEIGHT + 8;
                
                const bookingKey = bookingColumnKeyForGrid(booking as BookingWithRelations, allDesigners);
                const designerIndex = scheduleColumns.findIndex((col) => {
                  const d = allDesigners.find((x) => x.id === col.designerId);
                  return columnKeyForBookingsLookup(col, d) === bookingKey;
                });

                if (designerIndex >= 0) {
                  const columnWidth = scrollContainer.scrollWidth / scheduleColumns.length;
                  const scrollLeft = columnWidth * designerIndex;
                  
                  scrollContainer.scrollTo({
                    top: Math.max(0, top - 200),
                    left: scrollLeft,
                    behavior: 'smooth',
                  });
                } else {
                  scrollContainer.scrollTo({
                    top: Math.max(0, top - 200),
                    behavior: 'smooth',
                  });
                }
              }
            }, 300);
          }
        }}
      />

      {/* Designer Time Off Management Modal */}
      <TimeOffModal
        isOpen={isTimeOffModalOpen}
        onClose={() => setIsTimeOffModalOpen(false)}
        initialDesigners={allDesigners}
      />



      {/* Booking Restriction Modal */}
      <RestrictionModal
        isOpen={isRestrictionModalOpen}
        designerId={restrictionDesignerId}
        designerName={restrictionDesignerName}
        initialDate={restrictionDate}
        initialType={restrictionType}
        onClose={() => {
          setIsRestrictionModalOpen(false);
          setRestrictionDesignerId(null);
          setRestrictionDesignerName('');
          setRestrictionDate('');
        }}
        onRestrictionsChanged={(restrictions) => setBookingRestrictions(restrictions)}
      />

      {/* Holiday and Special Work Day Modal */}
      <HolidaySettingModal
        isOpen={isHolidayModalOpen}
        initialDesignerId={holidayDesignerId}
        initialDesignerName={holidayDesignerName}
        allDesigners={allDesigners}
        shops={allShops}
        defaultTargetShopId={holidayModalDefaultShopId}
        selectedDate={selectedDate}
        onClose={() => {
          setIsHolidayModalOpen(false);
          setHolidayDesignerId(null);
          setHolidayDesignerName('전체');
          setHolidayModalShopId(null);
          setHolidayCalendarRefreshKey((k) => k + 1);
        }}
        onAvailableDesignerIdsChange={() => {
          // Comment: Re-fetch ALL shops' availability after any holiday/special-day change
          setAvailabilityRefreshKey((k) => k + 1);
        }}
      />

      {/* Attendance (clock-in/out) Modal - only for manager/director */}
      {canUseAttendanceManagement && isAttendanceModalOpen && attendanceModalDesignerId !== null && (
        <AttendanceModal
          designerId={attendanceModalDesignerId}
          designerName={attendanceModalDesignerName}
          workDate={selectedDate}
          onClose={() => {
            setIsAttendanceModalOpen(false);
            setAttendanceModalDesignerId(null);
            setAttendanceModalDesignerName('');
          }}
        />
      )}

      {/* Holiday Calendar Modal */}
      <HolidayCalendarModal
        isOpen={isHolidayCalendarModalOpen}
        onClose={() => setIsHolidayCalendarModalOpen(false)}
        allDesigners={allDesigners}
        allShops={allShops}
        refreshKey={holidayCalendarRefreshKey}
        onOpenHolidayModal={(designerId, designerName, shopId) => {
          setHolidayModalShopId(shopId ?? null);
          if (designerId === null) {
            setHolidayDesignerId(null);
            setHolidayDesignerName('전체');
          } else {
            setHolidayDesignerId(designerId);
            setHolidayDesignerName(designerName);
          }
          setIsHolidayModalOpen(true);
        }}
      />

      {/* Customer Info Drawer */}
      <CustomerInfoDrawer
        customerId={viewingCustomerId}
        customer={viewingCustomer}
        loading={customerInfoLoading}
        tab={customerInfoTab}
        onClose={() => {
          setViewingCustomerId(null);
          setViewingCustomer(null);
        }}
        onTabChange={setCustomerInfoTab}
        onRegisterSale={() => {
          // 고객 정보 모달에서 판매 등록 모달 열기
          if (viewingCustomer) {
            setSalesLinkedBookingId(null);
            setSalesLinkedDepositPaid(0);
            setSalesDefaultDate(selectedDate);
            setSalesDefaultTime(null);
            setSalesDefaultManager(null);
            setSalesRegistrationCustomer({
              id: viewingCustomer.id,
              name: viewingCustomer.name || '',
              phone: viewingCustomer.phone || null,
              points: viewingCustomer.points,
              prepaid_balance: viewingCustomer.prepaid_balance,
            });
            setSalesRegistrationShopId(selectedShopFilter !== '전체' ? Number(selectedShopFilter) : null);
            setIsSalesRegistrationModalOpen(true);
          }
        }}
        onRegisterRefund={() => {
          // 고객 정보 모달에서 환불 등록 모달 열기
          if (viewingCustomer) {
            setRefundRegistrationCustomer({
              id: viewingCustomer.id,
              name: viewingCustomer.name || '',
              phone: viewingCustomer.phone || null,
              points: viewingCustomer.points,
              prepaid_balance: viewingCustomer.prepaid_balance,
            });
            setSalesRegistrationShopId(selectedShopFilter !== '전체' ? Number(selectedShopFilter) : null);
            setIsRefundRegistrationModalOpen(true);
            setRefundItemPickerTab('service');
            setIsRefundItemPickerModalOpen(true);
          }
        }}
        onViewSalesDetail={(item) => {
          const salesDetail = {
            id: item.id,
            customer_id: item.customer_id ?? viewingCustomerId ?? 0,
            shop_id: item.shop_id ?? null,
            customer_name: viewingCustomer?.name || '',
            sales_date: item.sales_date,
            sales_time: item.sales_time || '',
            sales_amount: item.sales_amount || 0,
            discount_amount: item.discount_amount || 0,
            total_amount: item.total_amount || 0,
            cash_amount: item.cash_amount || 0,
            card_amount: item.card_amount || 0,
            bank_transfer_amount: item.bank_transfer_amount || 0,
            payment_method: item.payment_method || null,
            point_accumulation: item.point_accumulation || 0,
            memo: item.memo || null,
            items: (item.sales_items || []).map((i: any) => ({
              item_type: i.item_type || 'service',
              item_name: i.item_name || '-',
              unit_price: Number(i.unit_price) || 0,
              quantity: Number(i.quantity) || 1,
              discount: Number(i.discount) || 0,
              discount_type: i.discount_type || null,
              discount_value: i.discount_value ?? null,
              amount: Number(i.amount) || 0,
              manager: i.manager || null,
              sales_classification: i.sales_classification || null,
              prepaid_deduction: Number(i.prepaid_deduction) || 0,
            })),
            created_by: item.created_by,
            created_at: item.created_at,
            edit_history: item.edit_history || [],
          };
          setSalesDetailData(salesDetail);
          setIsSalesDetailModalOpen(true);
        }}
      />

      {/* Sales Registration Modal */}
      <SalesRegistrationModal
        isOpen={isSalesRegistrationModalOpen}
        customer={salesRegistrationCustomer}
        shopId={salesRegistrationShopId}
        onClose={() => {
          setIsSalesRegistrationModalOpen(false);
          setSalesRegistrationCustomer(null);
          setSalesRegistrationShopId(null);
          setEditingSaleData(null);
          setEditingSaleId(null);
          setSalesLinkedBookingId(null);
          setSalesLinkedDepositPaid(0);
          setSalesDefaultDate(null);
          setSalesDefaultTime(null);
          setSalesDefaultManager(null);
          setCloseSalesFlowOnPickerClose(false);
        }}
        onOpenItemPicker={(tab) => {
          setCloseSalesFlowOnPickerClose(false);
          setSalesItemPickerTab(tab);
          setIsSalesItemPickerModalOpen(true);
        }}
        onComplete={async () => {
          if (viewingCustomerId) {
            await loadCustomerInfo(viewingCustomerId);
          }
          setEditingSaleData(null);
          setEditingSaleId(null);
          await refreshBookings();
          if (isWeekViewMode && weekViewDesignerId && weekViewStartDate) {
            const startDate = new Date(weekViewStartDate);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            const weekRes = await fetch(
              `/api/appointment?designer_id=${weekViewDesignerId}&start_date=${encodeURIComponent(startDateStr)}&end_date=${encodeURIComponent(endDateStr)}&limit=1000`
            );
            const weekData = await weekRes.json();
            if (weekRes.ok && weekData.bookings) {
              setWeekViewBookings(weekData.bookings);
            }
          }
        }}
        onEditComplete={async (saleId) => {
          try {
            const res = await fetch(`/api/sales/${saleId}`);
            const data = await res.json();
            if (!res.ok || !data.sale) {
              throw new Error(data.error || '판매를 불러오지 못했습니다.');
            }
            const nameFallback = viewingCustomer?.name || '';
            setSalesDetailData(mapSaleRecordToDetailData(data.sale, nameFallback));
            setIsSalesDetailModalOpen(true);
            if (viewingCustomerId) {
              await loadCustomerInfo(viewingCustomerId);
            }
            await refreshBookings();
          } catch (e: any) {
            console.error(e);
            alert(e?.message || '수정된 판매를 표시하지 못했습니다.');
          }
        }}
        initialData={editingSaleData}
        editSaleId={editingSaleId}
        bookingId={salesLinkedBookingId ?? undefined}
        defaultSalesDate={salesDefaultDate}
        defaultSalesTime={salesDefaultTime}
        bookingDepositPaid={salesLinkedDepositPaid}
      />

      {/* Edit Prepaid Member Modal */}
      {viewingCustomer && (
        <EditPrepaidMemberModal
          isOpen={isEditPrepaidMemberModalOpen}
          customerId={viewingCustomer.id}
          customerName={viewingCustomer.name || ''}
          customerPhone={viewingCustomer.phone || null}
          customerEmail={viewingCustomer.email || null}
          currentPoints={Number(viewingCustomer.prepaid_balance ?? viewingCustomer.points ?? 0)}
          onClose={() => {
            setIsEditPrepaidMemberModalOpen(false);
          }}
          onSuccess={async () => {
            // 포인트 수정 완료 시 고객 정보 새로고침
            if (viewingCustomerId) {
              await loadCustomerInfo(viewingCustomerId);
            }
            setIsEditPrepaidMemberModalOpen(false);
          }}
        />
      )}

      {/* Sales Item Picker Modal */}
      <SalesItemPickerModal
        isOpen={isSalesItemPickerModalOpen}
        activeTab={salesItemPickerTab}
        defaultManager={salesDefaultManager}
        onClose={() => {
          setIsSalesItemPickerModalOpen(false);
          if (closeSalesFlowOnPickerClose) {
            setCloseSalesFlowOnPickerClose(false);
            setIsSalesRegistrationModalOpen(false);
            setSalesRegistrationCustomer(null);
            setSalesRegistrationShopId(null);
            setEditingSaleData(null);
            setEditingSaleId(null);
            setSalesLinkedBookingId(null);
            setSalesLinkedDepositPaid(0);
            setSalesDefaultManager(null);
            setViewingCustomerId(null);
            setViewingCustomer(null);
          }
        }}
        onSelect={(itemOrItems) => {
          setCloseSalesFlowOnPickerClose(false);
          // 판매 등록 모달에 항목 추가
          if (typeof window !== 'undefined' && (window as any).addSalesItemToModal) {
            // 배열인 경우 (서비스/제품 탭에서 여러 개 선택)
            if (Array.isArray(itemOrItems)) {
              itemOrItems.forEach((item) => {
                (window as any).addSalesItemToModal(item);
              });
            } else {
              // 단일 항목인 경우 (정액권 등)
              (window as any).addSalesItemToModal(itemOrItems);
            }
          }
          setIsSalesItemPickerModalOpen(false);
        }}
      />

      {/* Refund Registration Modal */}
      <RefundRegistrationModal
        isOpen={isRefundRegistrationModalOpen}
        customer={refundRegistrationCustomer}
        shopId={salesRegistrationShopId}
        onClose={() => {
          setIsRefundRegistrationModalOpen(false);
          setRefundRegistrationCustomer(null);
          setSalesRegistrationShopId(null);
        }}
        onOpenItemPicker={(tab) => {
          setRefundItemPickerTab(tab);
          setIsRefundItemPickerModalOpen(true);
        }}
        onComplete={async () => {
          if (viewingCustomerId) {
            await loadCustomerInfo(viewingCustomerId);
          }
        }}
      />

      {/* Refund Item Picker Modal */}
      <SalesItemPickerModal
        isOpen={isRefundItemPickerModalOpen}
        activeTab={refundItemPickerTab}
        title="환불 항목 추가"
        onClose={() => {
          setIsRefundItemPickerModalOpen(false);
        }}
        onSelect={(itemOrItems) => {
          if (typeof window !== 'undefined' && (window as any).addRefundItemToModal) {
            if (Array.isArray(itemOrItems)) {
              itemOrItems.forEach((item) => {
                (window as any).addRefundItemToModal(item);
              });
            } else {
              (window as any).addRefundItemToModal(itemOrItems);
            }
          }
          setIsRefundItemPickerModalOpen(false);
        }}
      />

      {/* Cancel Booking Modal */}
      <CancelBookingModal
        isOpen={isCancelBookingModalOpen}
        booking={bookingToCancel}
        onClose={() => {
          setIsCancelBookingModalOpen(false);
          setBookingToCancel(null);
        }}
        onSuccess={() => {
          setIsCancelBookingModalOpen(false);
          setBookingToCancel(null);
          refreshBookings();
          setReservationHistoryRefreshTrigger((prev) => prev + 1);
        }}
      />

      {/* Customer Registration Modal */}
      <AddCustomerModal
        isOpen={isCustomerRegistrationModalOpen}
        onClose={() => setIsCustomerRegistrationModalOpen(false)}
        onSuccess={(customer) => {
          setIsCustomerRegistrationModalOpen(false);
          if (customer) setRegisteredCustomer(customer);
        }}
      />

      {/* Sales Detail Modal */}
      <SalesDetailModal
        isOpen={isSalesDetailModalOpen}
        salesData={salesDetailData}
        onClose={() => {
          setIsSalesDetailModalOpen(false);
          setSalesDetailData(null);
        }}
        onEdit={() => {
          if (!salesDetailData) return;
          const currentData = salesDetailData;
          setIsSalesDetailModalOpen(false);
          setSalesDetailData(null);
          setSalesRegistrationCustomer({
            id: currentData.customer_id,
            name: currentData.customer_name,
            phone: null,
          });
          setSalesDefaultManager(null);
          setEditingSaleData(currentData);
          setEditingSaleId(currentData.id);
          setSalesRegistrationShopId(currentData.shop_id || null);
          setIsSalesRegistrationModalOpen(true);
        }}
        onDelete={() => {
          if (!salesDetailData) return;
          setDeletingSaleId(salesDetailData.id);
          setIsDeleteSaleAlertOpen(true);
        }}
      />

      {/* Sales Delete Alert Modal */}
      <AlertModal
        isOpen={isDeleteSaleAlertOpen}
        title="판매 삭제"
        message="이 판매 내역을 삭제하시겠습니까? 삭제된 내역은 복구할 수 없습니다."
        highlightText="복구할 수 없습니다"
        variant="confirm"
        zIndex={Z.MODAL_ALERT_TOP}
        onConfirm={async () => {
          if (!deletingSaleId) return;
          try {
            const response = await fetch(`/api/sales/${deletingSaleId}`, {
              method: 'DELETE',
            });
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || '판매 삭제에 실패했습니다.');
            }
            setIsDeleteSaleAlertOpen(false);
            setDeletingSaleId(null);
            setIsSalesDetailModalOpen(false);
            setSalesDetailData(null);
            if (viewingCustomerId) {
              await loadCustomerInfo(viewingCustomerId);
            }
          } catch (error: any) {
            console.error('판매 삭제 오류:', error);
            alert(error.message || '판매 삭제 중 오류가 발생했습니다.');
            setIsDeleteSaleAlertOpen(false);
          }
        }}
        onClose={() => {
          setIsDeleteSaleAlertOpen(false);
          setDeletingSaleId(null);
        }}
      />
    </div>
  );
}
