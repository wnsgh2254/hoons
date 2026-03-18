'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type React from 'react';
import type { Booking, BookingWithRelations, NewBookingTimeSlot } from '@/lib/types';
import { DEFAULT_NEW_BOOKING_TIME_SLOT } from '@/lib/types';
import AdminTopNav from '@/components/AdminTopNav';
import { useServices } from '@/hooks/useServices';
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
import EditBookingModal from '@/components/admin/appointments/EditBookingModal';
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
import {
  GRID_START_HOUR,
  GRID_END_HOUR,
  GRID_HOUR_HEIGHT,
  GRID_30MIN_HEIGHT,
  DESIGNER_COLORS,
  getBookingStatusColor,
  getSydneyToday,
  getWeekStart,
  getWeekEnd,
  formatDateRange,
  buildDateFromDay,
  bookingTimeToLabel,
  labelToDbTime,
} from '@/lib/utils/appointment-utils';

const CANCELLED_STATUSES = new Set(['cancelled', 'canceled']);

export default function AppointmentsManagementPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getSydneyToday());
  const [dayCounts, setDayCounts] = useState<Record<number, number>>({});
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
  const [newBookingDirectVisit, setNewBookingDirectVisit] = useState(false);
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
  const [availableDesignerIds, setAvailableDesignerIds] = useState<number[]>([]);
  const [loadingDesignerAvailability, setLoadingDesignerAvailability] = useState(false);

  // Comment: Editing existing booking from Upcoming list
  const [editingBooking, setEditingBooking] = useState<BookingWithRelations | null>(null);
  const [editDate, setEditDate] = useState<string>(selectedDate);
  const [editTime, setEditTime] = useState<string>('10:00 AM');
  const [editServiceId, setEditServiceId] = useState<number | null>(null);
  const { services: editServices } = useServices({ excludePattern: /\(cash\)/i });
  const [isServicePickerOpen, setIsServicePickerOpen] = useState(false);
  const [servicePickerCategory, setServicePickerCategory] = useState<string | null>(null);
  const [editMemo, setEditMemo] = useState<string>('');
  const [editSubmitting, setEditSubmitting] = useState(false);
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
  const [openDesignerDropdown, setOpenDesignerDropdown] = useState<number | null>(null);
  const [allDesigners, setAllDesigners] = useState<any[]>([]);
  const [allShops, setAllShops] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedShopFilter, setSelectedShopFilter] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { memo, setMemo, memoLoading, memoSaving, setMemoSaving, memoSuccessMessage, setMemoSuccessMessage, saveMemo } = useAdminMemo();

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
  const [holidayCalendarRefreshKey, setHolidayCalendarRefreshKey] = useState(0);

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

  // Comment: REQ_SCH_001_01 - Left panel toggle state
  const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(true);

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

  // Comment: Designer IDs filtered by shop (for booking filtering)
  const shopFilteredDesignerIds = useMemo(() => {
    if (selectedShopFilter === '전체') return [];
    const shopId = Number(selectedShopFilter);
    return allDesigners.filter((d) => d.shop_id === shopId).map((d) => d.id);
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
  const [tempSaleBookingIds, setTempSaleBookingIds] = useState<Set<number>>(new Set());
  const [currentTempSaleBookingId, setCurrentTempSaleBookingId] = useState<number | null>(null);
  const [currentTempSaleData, setCurrentTempSaleData] = useState<any | null>(null);

  // Shop ID for sales/refund modals
  const [salesRegistrationShopId, setSalesRegistrationShopId] = useState<number | null>(null);

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
    time: string;
  } | null>(null);
  const [emptySlotMenuOpen, setEmptySlotMenuOpen] = useState<{
    date: string;
    designerId: number;
    time: string;
  } | null>(null);
  const [emptySlotMenuPosition, setEmptySlotMenuPosition] = useState<{
    top: number;
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
    left: number;
    width: number;
    scrollTop: number;
    scrollLeft: number;
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

  // Comment: Fetch user session for role (attendance management: manager/director only)
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated && data.user?.role) {
          setUserRole(data.user.role);
        }
      } catch (err) {
        console.error('Error fetching session:', err);
      }
    };
    fetchSession();
  }, []);

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
          const [bookingsRes, prepaidRes] = await Promise.all([
            fetch(`/api/appointment?customer_id=${customerId}&limit=500`),
            fetch(`/api/prepaid?customer_id=${customerId}`).catch(() => null),
          ]);

          const bookingsData = await bookingsRes.json();
          const prepaidData = prepaidRes ? await prepaidRes.json() : null;

          const bookings = bookingsData.bookings || [];

          // Comment: 총 판매액
          const totalSales = bookings.reduce((sum: number, b: any) => {
            return sum + Number(b.total_amount || 0);
          }, 0);

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
            (b: any) => b.status === 'CANCELLED',
          ).length;

          // Comment: 다음 예약
          const upcomingBookings = bookings
            .filter((b: any) => {
              const bookingDate = new Date(
                `${b.booking_date}T${b.booking_time || '00:00:00'}`,
              );
              return (
                bookingDate > new Date() &&
                (b.status === 'BOOKED' ||
                  b.status === 'CONFIRMED' ||
                  !b.status)
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
          const totalPrepaidBalance = prepaidTickets.reduce(
            (sum: number, ticket: any) =>
              sum + (Number(ticket.balance) || 0),
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

  // 임시저장 목록 갱신
  const refreshTempSaleBookingIds = async () => {
    try {
      const bookingIds = bookings.map((b: any) => b.id).filter(Boolean);
      if (bookingIds.length === 0) {
        setTempSaleBookingIds(new Set());
        return;
      }
      const response = await fetch(`/api/temp-sales?booking_ids=${bookingIds.join(',')}`);
      if (response.ok) {
        const data = await response.json();
        setTempSaleBookingIds(new Set(data.booking_ids || []));
      }
    } catch {
      // 실패해도 무시
    }
  };

  // 예약 데이터 로드 시 임시저장 목록도 조회
  useEffect(() => {
    if (bookings.length > 0) {
      refreshTempSaleBookingIds();
    }
  }, [bookings]);

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
  }, [selectedDate, isWeekViewMode, weekViewStartDate, weekViewDesignerId]);


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

  // Comment: Load monthly bookings to power calendar dots (all shops)
  useEffect(() => {
    let isMounted = true;
    const fetchMonth = async () => {
      try {
        const [year, month] = monthKey.split('-').map((v) => Number(v));
        if (!year || !month) return;
        const daysInMonth = new Date(year, month, 0).getDate();
        const start = `${monthKey}-01`;
        const end = `${monthKey}-${String(daysInMonth).padStart(2, '0')}`;

        const res = await fetch(
          `/api/appointment?start_date=${encodeURIComponent(
            start
          )}&end_date=${encodeURIComponent(end)}`
        );
        const data = await res.json();
        if (!isMounted) return;
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load monthly bookings');
        }

        const counts: Record<number, number> = {};
        (data.bookings || []).forEach((b: BookingWithRelations) => {
          if (b.status === 'cancelled') return;
          const d = new Date(b.booking_date);
          if (Number.isNaN(d.getTime())) return;
          const day = d.getDate();
          counts[day] = (counts[day] || 0) + 1;
        });
        if (isMounted) {
          setDayCounts(counts);
        }
      } catch (err) {
        // Silent fail – calendar dots are non-critical
        if (isMounted) {
          console.error(err);
          setDayCounts({});
        }
      }
    };

    fetchMonth();
    return () => {
      isMounted = false;
    };
  }, [monthKey]);

  // Comment: Sync edit modal fields when opening edit (from detail or Upcoming)
  useEffect(() => {
    if (editingBooking) {
      setEditDate(editingBooking.booking_date);
      setEditTime(bookingTimeToLabel(editingBooking.booking_time));
      setEditServiceId(editingBooking.service_id ?? editingBooking.service?.id ?? null);
      setEditMemo(editingBooking.memo ?? '');
    }
  }, [editingBooking?.id]);


  // Comment: Load designer availability for the selected date (per weekday)
  // This includes designers with regular schedule OR special work day (특별 근무일)
  useEffect(() => {
    let isMounted = true;
    const fetchAvailability = async () => {
      setLoadingDesignerAvailability(true);
      try {
        const res = await fetch(
          `/api/designer-schedules?date=${encodeURIComponent(selectedDate)}`
        );
        const data = await res.json();
        if (isMounted) {
          if (!res.ok) {
            console.error('Failed to load designer availability:', data.error);
            setAvailableDesignerIds([]);
          } else {
            // Comment: Special work days have priority - designers with special work day are included
            // even if they don't have regular schedule for that weekday
            setAvailableDesignerIds(data.designerIds || []);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading designer availability:', err);
          setAvailableDesignerIds([]);
        }
      } finally {
        if (isMounted) {
          setLoadingDesignerAvailability(false);
        }
      }
    };

    fetchAvailability();
    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

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

  // Comment: Load options for New Booking modal when it opens
  useEffect(() => {
    if (!isNewBookingOpen) return;

    setNewBookingLoadingOptions(true);

    const targetDate = newBookingDate || selectedDate;

    const loadShops = async () => {
      const res = await fetch('/api/shops');
      const json = await res.json();
      if (res.ok) {
        const shops = json.shops || [];
        setNewBookingShops(shops);
        if (shops.length > 0) {
          setNewBookingShopId((prev) => prev ?? shops[0].id);
        }
      } else {
        console.error('Failed to load shops for new booking:', json.error);
      }
    };

    const loadDesigners = async () => {
      const res = await fetch(
        `/api/working-designers?date=${encodeURIComponent(targetDate)}`
      );
      const json = await res.json();
      if (res.ok) {
        setNewBookingDesigners(json.designers || []);
      } else {
        console.error('Failed to load designers for new booking:', json.error);
      }
    };

    const loadServices = async () => {
      const res = await fetch('/api/services');
      const json = await res.json();
      if (res.ok) {
        setNewBookingServices(json.services || []);
      } else {
        console.error('Failed to load services for new booking:', json.error);
      }
    };

    Promise.all([loadShops(), loadDesigners(), loadServices()]).finally(() => {
      setNewBookingLoadingOptions(false);
    });
  }, [isNewBookingOpen, newBookingDate, selectedDate]);

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

  // Comment: Load all designers for the schedule grid - always load on mount
  useEffect(() => {
    let isMounted = true;
    const loadAllDesigners = async () => {
      try {
        const res = await fetch('/api/designers');
        const data = await res.json();
        
        if (isMounted) {
          if (res.ok) {
            // Comment: API returns { designers: [...] } format with id and name
            const designers = data.designers || [];
            if (designers.length > 0) {
              setAllDesigners(designers);
            } else {
              console.warn('No designers found in API response');
            }
          } else {
            console.error('Failed to load designers:', data.error || data);
          }
        }
      } catch (err) {
        console.error('Error loading designers:', err);
      }
    };
    loadAllDesigners();
    // Comment: Reload designers periodically to ensure they're always up to date (every 5 minutes instead of 1 minute)
    const interval = setInterval(loadAllDesigners, 300000); // Every 5 minutes
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Comment: Load all shops for the shop filter dropdown
  useEffect(() => {
    const loadShops = async () => {
      try {
        const res = await fetch('/api/shops');
        const data = await res.json();
        if (res.ok && data.shops) {
          setAllShops(data.shops);
        }
      } catch (err) {
        console.error('Error loading shops:', err);
      }
    };
    loadShops();
  }, []);

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
      const name = b.designer?.name || 'Unassigned';
      if (!map[dateStr][name]) map[dateStr][name] = [];
      map[dateStr][name].push(b);
    }
    return map;
  }, [filteredBookings, weekDates]);

  // Comment: Designers visible in the grid - filtered by selectedDesignerFilter
  // Cells without bookings will be shown in gray
  const visibleDesigners = useMemo(() => {
    if (allDesigners.length > 0) {
      const roleOrder: Record<string, number> = {
        'Director': 1,
        'Senior Designer': 2,
        'Designer': 3,
      };
      
      // Comment: Filter designers based on selectedShopFilter first
      let filtered = [...allDesigners];

      if (selectedShopFilter !== '전체') {
        const shopId = Number(selectedShopFilter);
        filtered = filtered.filter((d) => d.shop_id === shopId);
      }

      // Comment: Then filter by selectedDesignerFilter
      if (selectedDesignerFilter === '전체') {
        // Show all designers (already filtered by shop)
      } else if (selectedDesignerFilter === '전체(휴무 제외)') {
        // Comment: Show only designers who are working on selectedDate (based on /designer-schedules)
        filtered = filtered.filter((d) => availableDesignerIds.includes(d.id));
      } else {
        // Show only selected designer
        filtered = filtered.filter((d) => d.name === selectedDesignerFilter);
      }
      
      // Comment: Sort by shop_id first, then role, then name
      const sorted = filtered.sort((a, b) => {
        const shopA = a.shop_id || 0;
        const shopB = b.shop_id || 0;
        if (shopA !== shopB) return shopA - shopB;

        const roleA = (a.role || '').trim();
        const roleB = (b.role || '').trim();
        const orderA = roleOrder[roleA] || 999;
        const orderB = roleOrder[roleB] || 999;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        // Comment: If same role, sort by name
        return (a.name || '').localeCompare(b.name || '');
      });
      
      return sorted.map((d) => d.name).filter(Boolean);
    }
    
    // Fallback: if designers not loaded yet, return empty array (will show once loaded)
    return [];
  }, [allDesigners, selectedShopFilter, selectedDesignerFilter, availableDesignerIds]);

  // Comment: Designers filtered by shop for the designer select dropdown
  const shopFilteredDesigners = useMemo(() => {
    if (selectedShopFilter === '전체') return allDesigners;
    const shopId = Number(selectedShopFilter);
    return allDesigners.filter((d) => d.shop_id === shopId);
  }, [allDesigners, selectedShopFilter]);

  // Comment: Stable color assignment per designer
  const designerColorMap = useMemo(() => {
    const entries = visibleDesigners.map((name, index) => {
      const color = DESIGNER_COLORS[index % DESIGNER_COLORS.length];
      return [name, color] as const;
    });
    return Object.fromEntries(entries) as Record<
      string,
      { bg: string; text: string; border: string }
    >;
  }, [visibleDesigners]);

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
    const base = sortedBookings.filter((b) => b.status !== 'cancelled');

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

  const handleOpenHolidayModal = useCallback((designerId: number, name: string) => {
    setHolidayDesignerId(designerId);
    setHolidayDesignerName(name);
    setIsHolidayModalOpen(true);
  }, [selectedDate]);

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
        setNewBookingDate(booking.booking_date || selectedDate);
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
            `/api/appointment?start_date=${encodeURIComponent(weekStart)}&end_date=${encodeURIComponent(weekEnd)}`
          );
          const data = await res.json();
          if (data.bookings) {
            setBookings(data.bookings);
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
        if (customerId) {
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
        }
        setBookingMenuOpen(null);
        setBookingMenuPosition(null);
        bookingMenuOriginalPositionRef.current = null;
      },
      onViewSaleDetail: (booking) => {
        setBookingMenuOpen(null);
        setBookingMenuPosition(null);
        bookingMenuOriginalPositionRef.current = null;
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
              {/* Left: Large Calendar */}
              {isLeftPanelVisible && (
              <div className="lg:col-span-3 flex flex-col gap-6 min-h-0">
                <AppointmentCalendar
                  selectedDate={selectedDate}
                  dayCounts={dayCounts}
                  showBookingCount={showBookingCount}
                  onDateSelect={setSelectedDate}
                />

                {/* Memo below calendar */}
                <AdminMemo
                  memo={memo}
                  memoLoading={memoLoading}
                  memoSaving={memoSaving}
                  onMemoChange={setMemo}
                  onSave={handleMemoSave}
                />
              </div>
              )}

              {/* Center: Full Schedule */}
              <div className={`${isLeftPanelVisible ? 'lg:col-span-9' : 'lg:col-span-12'} flex flex-col gap-4 min-h-0`}>
                <div
                  ref={scheduleRef}
                  className="flex-1 overflow-hidden bg-[#f8f9fc] relative rounded-2xl border border-gray-200 shadow-sm min-h-0"
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
                  <div className="h-full overflow-auto relative" id="schedule-scroll-container">
                    {/* Vertical column dividers for entire scrollable area - positioned outside grid to extend full height */}
                    {/* Note: These dividers are rendered here (lines 921-939) to ensure they extend the full scrollable height.
                         They are positioned absolutely relative to the scroll container, not the grid, so they remain visible
                         even when scrolling horizontally. This fixes the issue where dividers were cut off after certain columns. */}
                    {!isWeekViewMode && visibleDesigners.length > 0 && (
                      <div 
                        className="absolute pointer-events-none z-0" 
                        style={{ 
                          left: '80px', // Time column width
                          right: 0,
                          top: 0,
                          height: `${(GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16}px`,
                        }}
                      >
                        {visibleDesigners.map((_, colIndex) => {
                          const columnWidth = 100 / visibleDesigners.length;
                          return (
                            <div
                              key={`full-divider-${colIndex}`}
                              className="absolute border-r border-[#e2e8f0]"
                              style={{
                                left: `${(colIndex + 1) * columnWidth}%`,
                                width: '1px',
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
                      visibleDesigners={visibleDesigners}
                      allDesigners={allDesigners}
                      allShops={allShops}
                      selectedDesignerFilter={selectedDesignerFilter}
                      weekViewStartDate={weekViewStartDate}
                      openDesignerDropdown={openDesignerDropdown}
                      onDesignerDropdownToggle={setOpenDesignerDropdown}
                      onOpenWeekView={handleOpenWeekView}
                      onCloseWeekView={handleCloseWeekView}
                      onOpenRestriction={handleOpenRestrictionModal}
                      onOpenHolidayModal={handleOpenHolidayModal}
                      onOpenAttendanceModal={handleOpenAttendanceModal}
                      canUseAttendanceManagement={canUseAttendanceManagement}
                      availableDesignerIds={availableDesignerIds}
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
                          isNewBookingOpen={isNewBookingOpen}
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
                            setNewBookingDate(data.date);
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
                          setEditingBooking={(booking) => setEditingBooking(booking)}
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
                                `/api/appointment?start_date=${encodeURIComponent(weekStart)}&end_date=${encodeURIComponent(weekEnd)}`
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
                              <div key={dateStr} className="border-r border-[#e2e8f0] flex-1 relative" style={{ minWidth: `${visibleDesigners.length * 150}px`, minHeight: `${(GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16}px` }}>
                                <div className="grid relative" style={{ gridTemplateColumns: `repeat(${visibleDesigners.length}, minmax(150px, 1fr))` }}>
                                {visibleDesigners.map((designerName, designerIndex) => {
                          const designer = allDesigners.find((d) => d.name === designerName);
                          const designerId = designer?.id;
                                  const designerBookings = bookingsByDateAndDesigner[dateStr]?.[designerName] || [];
                          const color = designerColorMap[designerName] ??
                                    DESIGNER_COLORS[designerIndex % DESIGNER_COLORS.length];
                          
                                  // Comment: Get restrictions for this designer on this date
                          const designerRestrictions = bookingRestrictions.filter(
                                    (r) => r.designer_id === designerId && r.restriction_date === dateStr
                          );

                          // Check if this designer is on holiday (not in availableDesignerIds)
                          const isDesignerOff = designerId ? !availableDesignerIds.includes(designerId) : false;

                          return (
                            <div
                                      key={`${dateStr}-${designerName}`}
                                      className={`relative h-full overflow-hidden border-r border-[#e2e8f0] last:border-r-0 ${isDesignerOff ? 'bg-gray-100/50' : ''}`}
                                      style={{
                                        minHeight: `${(GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16}px`,
                                        ...(isDesignerOff ? { pointerEvents: 'none' as const } : {}),
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
                                          left: menuLeft,
                                          width: menuWidth,
                                          scrollTop,
                                          scrollLeft
                                        });
                                        setEmptySlotMenuOpen({ 
                                          date: dateStr, 
                                          designerId: designerId || 0, 
                                          time: slotTime 
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
                                
                                // Check if this slot has a booking
                                const hasBooking = designerBookings.some((b) => {
                                  if (!b.booking_time) return false;
                                  const [bHour, bMin] = b.booking_time.split(':').map(Number);
                                  const bStartMinutes = (bHour - GRID_START_HOUR) * 60 + bMin;
                                  const bDuration = b.service?.duration_minutes || 60;
                                  const bEndMinutes = bStartMinutes + bDuration;
                                  return slotMinutes >= bStartMinutes && slotMinutes < bEndMinutes;
                                });
                                
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
                                
                                if (hasBooking || !designerId || isDesignerOff) return null;
                                
                                const slotKey = `${dateStr}-${designerId}-${slotTime}`;
                                const isHovered = hoveredEmptySlot?.date === dateStr && 
                                                  hoveredEmptySlot?.designerId === designerId && 
                                                  hoveredEmptySlot?.time === slotTime;
                                const isMenuOpen = emptySlotMenuOpen?.date === dateStr && 
                                                   emptySlotMenuOpen?.designerId === (designerId || 0) && 
                                                   emptySlotMenuOpen?.time === slotTime;
                                
                                // Debug log
                                
                                const isMoveMode = !!movingBooking;

                                return (
                                  <div
                                    key={slotKey}
                                    className="absolute left-0 right-0 z-0 select-none"
                                    style={{ 
                                      top: slotTop, 
                                      height: slotHeight,
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
                                            time: slotTime,
                                          });
                                          setIsMoveConfirmOpen(true);
                                          setHoveredEmptySlot(null);
                                        } else {
                                          setNewBookingDate(dateStr);
                                          const timeStr = `${slotHour >= 12 ? slotHour - 12 : slotHour}:${String(slotMin).padStart(2, '0')} ${slotHour >= 12 ? 'PM' : 'AM'}`;
                                          setNewBookingTimeSlots([{ designerId: designerId, time: timeStr, duration: 30, serviceTab: 'service', serviceId: null, selectedItems: [] }]);
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
                                        setHoveredEmptySlot({ date: dateStr, designerId: designerId || 0, time: slotTime });
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
                                        {/* 빈 셀 more(≡) 버튼 - 예약 금지 셀은 미노출 */}
                                        <div 
                                          className="absolute right-1 top-1/2 -translate-y-1/2 z-[9999] empty-slot-more-button"
                                          style={{ pointerEvents: 'auto' }}
                                        >
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              const menuData = { date: dateStr, designerId: designerId || 0, time: slotTime };
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
                                                const cellElement = e.currentTarget.closest('[class*="absolute left-0 right-0"]') as HTMLElement;
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
                                          {isMenuOpen && !isNewBookingOpen && emptySlotMenuPosition && emptySlotMenuOpen && typeof window !== 'undefined' && (() => {
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
                                                const timeStr1 = `${menuSlotHour1 >= 12 ? menuSlotHour1 - 12 : menuSlotHour1}:${String(menuSlotMin1).padStart(2, '0')} ${menuSlotHour1 >= 12 ? 'PM' : 'AM'}`;
                                                setNewBookingDate(emptySlotMenuOpen.date);
                                                setNewBookingTimeSlots([{ designerId: emptySlotMenuOpen.designerId, time: timeStr1, duration: 30, serviceTab: 'service', serviceId: null, selectedItems: [] }]);
                                                setNewBookingDirectVisit(false);
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
                                                const [menuSlotHour2, menuSlotMin2] = menuSlotTime.split(':').map(Number);
                                                const timeStr2 = `${menuSlotHour2 >= 12 ? menuSlotHour2 - 12 : menuSlotHour2}:${String(menuSlotMin2).padStart(2, '0')} ${menuSlotHour2 >= 12 ? 'PM' : 'AM'}`;
                                                setNewBookingDate(emptySlotMenuOpen.date);
                                                setNewBookingTimeSlots([{ designerId: emptySlotMenuOpen.designerId, time: timeStr2, duration: 30, serviceTab: 'service', serviceId: null, selectedItems: [] }]);
                                                setNewBookingDirectVisit(true);
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
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              
                              {/* Empty slot context menu - Portal로 렌더링 (빈 셀 슬롯 루프 외부, 예약금지 셀 클릭 시) */}
                              {!isNewBookingOpen && emptySlotMenuPosition && emptySlotMenuOpen && emptySlotMenuOpen.date === dateStr && emptySlotMenuOpen.designerId === (designerId || 0) && typeof window !== 'undefined' && (() => {
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
                                const durationMinutes =
                                  b.service?.duration_minutes && b.service.duration_minutes > 0
                                    ? b.service.duration_minutes
                                    : 60;
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
                                  const otherDuration =
                                    other.service?.duration_minutes && other.service.duration_minutes > 0
                                      ? other.service.duration_minutes
                                      : 60;
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
                                    isNewBookingOpen={isNewBookingOpen}
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
        isOpen={isNewBookingOpen}
        onClose={() => { setIsNewBookingOpen(false); setRegisteredCustomer(null); }}
        selectedDate={selectedDate}
        newBookingCustomerSearch={newBookingCustomerSearch}
        newBookingDate={newBookingDate}
        newBookingDirectVisit={newBookingDirectVisit}
        newBookingTimeSlots={newBookingTimeSlots}
        newBookingDesigners={newBookingDesigners}
        newBookingServices={newBookingServices}
        newBookingMemo={newBookingMemo}
        newBookingSubmitting={newBookingSubmitting}
        newBookingLoadingOptions={newBookingLoadingOptions}
        newBookingShopId={newBookingShopId}
        setNewBookingCustomerSearch={setNewBookingCustomerSearch}
        setNewBookingDate={setNewBookingDate}
        setNewBookingDirectVisit={setNewBookingDirectVisit}
        setNewBookingTimeSlots={setNewBookingTimeSlots}
        setNewBookingMemo={setNewBookingMemo}
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
      />

      {/* Appointment Detail Modal */}
      <AppointmentDetailModal
        booking={viewingBookingDetail}
        onClose={() => setViewingBookingDetail(null)}
        onEdit={(booking: BookingWithRelations) => {
          setEditingBooking(booking);
          setViewingBookingDetail(null);
        }}
        bookingTimeToLabel={bookingTimeToLabel}
      />

      {/* Edit Booking Modal */}
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          selectedDate={selectedDate}
          onClose={() => setEditingBooking(null)}
          onSave={async (bookingId, updates) => {
            await fetch(`/api/appointment/${bookingId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
            });
            const res = await fetch(
              `/api/appointment?date=${encodeURIComponent(selectedDate)}`
            );
            const data = await res.json();
            if (res.ok) {
              setBookings(data.bookings || []);
            }
            // 예약 내역 모달이 열려있으면 데이터 새로고침
            if (isReservationHistoryOpen) {
              setReservationHistoryRefreshTrigger((prev) => prev + 1);
            }
          }}
        />
      )}

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

              const res = await fetch(
                `/api/appointment?date=${encodeURIComponent(selectedDate)}`
              );
              const data = await res.json();
              if (res.ok) {
                setBookings(data.bookings || []);
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
                    const res = await fetch(`/api/appointment/${movingBooking.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        booking_date: moveTargetSlot.date,
                        booking_time: dbTime,
                        designer_id: moveTargetSlot.designerId,
                      }),
                    });
                    if (!res.ok) {
                      const data = await res.json();
                      alert(data.error || '예약 이동에 실패했습니다.');
                      return;
                    }

                    // Refresh day view bookings for selectedDate
                    const dayRes = await fetch(
                      `/api/appointment?date=${encodeURIComponent(selectedDate)}`
                    );
                    const dayData = await dayRes.json();
                    if (dayRes.ok && dayData.bookings) {
                      setBookings(dayData.bookings);
                      setFilteredBookings(dayData.bookings);
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
          // 예약 내역 모달은 닫지 않고 그대로 유지
          setEditingBooking(booking);
          setEditDate(booking.booking_date || selectedDate);
          if (booking.booking_time) {
            const [hour, minute] = booking.booking_time.split(':');
            const hourNum = Number(hour);
            const ampm = hourNum >= 12 ? 'PM' : 'AM';
            const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
            setEditTime(`${displayHour}:${minute} ${ampm}`);
          }
        }}
        onCancelBooking={async (booking) => {
          if (!confirm('예약을 취소하시겠습니까?')) {
            return;
          }
          try {
            const res = await fetch(`/api/appointment/${booking.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'CANCELLED' }),
            });
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || '예약 취소에 실패했습니다.');
            }
            alert('예약이 취소되었습니다.');
            // 예약 내역 모달은 닫지 않고 데이터만 새로고침
            setReservationHistoryRefreshTrigger((prev) => prev + 1);
            // Refresh bookings
            const weekStart = getWeekStart(selectedDate);
            const weekEnd = getWeekEnd(selectedDate);
            const refreshRes = await fetch(
              `/api/appointment?start_date=${encodeURIComponent(weekStart)}&end_date=${encodeURIComponent(weekEnd)}`
            );
            const refreshData = await refreshRes.json();
            if (refreshRes.ok) {
              setBookings(refreshData.bookings || []);
              setFilteredBookings(refreshData.bookings || []);
            }
          } catch (error: any) {
            alert(error.message || '예약 취소에 실패했습니다.');
          }
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
                
                // Find the designer in visibleDesigners (which is an array of names)
                const designer = allDesigners.find((d) => d.id === booking.designer?.id);
                const designerIndex = designer 
                  ? visibleDesigners.findIndex((name) => name === designer.name)
                  : -1;
                
                if (designerIndex >= 0) {
                  const columnWidth = scrollContainer.scrollWidth / visibleDesigners.length;
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
        selectedDate={selectedDate}
        onClose={() => {
          setIsHolidayModalOpen(false);
          setHolidayDesignerId(null);
          setHolidayDesignerName('전체');
          setHolidayCalendarRefreshKey((k) => k + 1);
        }}
        onAvailableDesignerIdsChange={(ids) => setAvailableDesignerIds(ids)}
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
        refreshKey={holidayCalendarRefreshKey}
        onOpenHolidayModal={(designerId, designerName) => {
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
          // 판매 상세 모달 열기
          console.log('onViewSalesDetail called with item:', item);
          // SalesHistoryTable의 데이터를 SalesDetailModal 형식으로 변환
          const salesDetail = {
            id: item.id,
            customer_id: viewingCustomerId || 0,
            customer_name: viewingCustomer?.name || '',
            sales_date: item.booking_date,
            sales_time: item.booking_time || '',
            sales_amount: item.total_amount || 0,
            discount_amount: item.discount || 0,
            total_amount: item.total_amount || 0,
            cash_amount: item.payments?.find((p: any) => p.method === 'cash')?.amount || 0,
            card_amount: item.payments?.find((p: any) => p.method === 'card')?.amount || 0,
            bank_transfer_amount: item.payments?.find((p: any) => p.method === 'bank_transfer')?.amount || 0,
            point_accumulation: 0, // TODO: Get from sales data
            memo: item.memo || null,
            items: item.items?.map((i: any) => ({
              item_type: 'service' as const,
              item_name: i.service_name || '-',
              unit_price: i.total_amount || 0,
              quantity: 1,
              discount: 0,
              amount: i.total_amount || 0,
              manager: i.designer_name || null,
              sales_classification: null,
              point_deduction: 0,
              prepaid_deduction: 0,
            })) || [],
          };
          console.log('Setting sales detail data:', salesDetail);
          setSalesDetailData(salesDetail);
          setIsSalesDetailModalOpen(true);
          console.log('isSalesDetailModalOpen set to true');
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
          setCurrentTempSaleBookingId(null);
          setCurrentTempSaleData(null);
        }}
        onOpenItemPicker={(tab) => {
          setSalesItemPickerTab(tab);
          setIsSalesItemPickerModalOpen(true);
        }}
        onComplete={async () => {
          if (viewingCustomerId) {
            await loadCustomerInfo(viewingCustomerId);
          }
          setEditingSaleData(null);
          setEditingSaleId(null);
        }}
        initialData={editingSaleData}
        editSaleId={editingSaleId}
        bookingId={currentTempSaleBookingId}
        tempSaveData={currentTempSaleData}
        onTemporarySave={() => {
          refreshTempSaleBookingIds();
          setCurrentTempSaleBookingId(null);
          setCurrentTempSaleData(null);
        }}
        onDeleteTempSave={() => {
          refreshTempSaleBookingIds();
          setCurrentTempSaleBookingId(null);
          setCurrentTempSaleData(null);
        }}
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
        onClose={() => {
          setIsSalesItemPickerModalOpen(false);
        }}
        onSelect={(itemOrItems) => {
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
        onSendStatement={() => {
          // TODO: 판매내역서 발송 기능 구현
          console.log('Send statement:', salesDetailData);
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