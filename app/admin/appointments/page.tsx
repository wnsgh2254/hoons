'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type React from 'react';
import type { Booking } from '@/lib/types';
import AdminTopNav from '@/components/AdminTopNav';
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
import AttendanceModal from '../../../components/admin/appointments/AttendanceModal';
import BookingContextMenu from '@/components/admin/appointments/BookingContextMenu';
import CancelBookingModal from '@/components/admin/appointments/CancelBookingModal';
import EditPrepaidMemberModal from '@/components/admin/appointments/EditPrepaidMemberModal';
import SalesDetailModal from '@/components/admin/appointments/SalesDetailModal';
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

type BookingWithRelations = Booking & {
  designer?: { id: number; name: string } | null;
  service?: { id: number; name: string; duration_minutes?: number | null } | null;
};

export default function AppointmentsManagementPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getSydneyToday());
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dayCounts, setDayCounts] = useState<Record<number, number>>({});
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [currentSydneyTime, setCurrentSydneyTime] = useState<{
    label: string;
    top: number;
  } | null>(null);

  // Comment: Admin "New Booking" modal state
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [newBookingShops, setNewBookingShops] = useState<any[]>([]);
  const [newBookingDesigners, setNewBookingDesigners] = useState<any[]>([]);
  const [newBookingServices, setNewBookingServices] = useState<any[]>([]);
  const [newBookingShopId, setNewBookingShopId] = useState<number | null>(null);
  const [newBookingServiceId, setNewBookingServiceId] = useState<number | null>(null);
  const [newBookingDate, setNewBookingDate] = useState<string>(selectedDate);
  const [newBookingTimeSlots, setNewBookingTimeSlots] = useState<
    Array<{
      designerId: number | null;
      time: string;
      duration: number;
      serviceTab: 'service' | 'appointment';
      serviceId: number | null;
    }>
  >([
    { designerId: null, time: '10:00 AM', duration: 30, serviceTab: 'service', serviceId: null },
  ]);
  const [newBookingSubmitting, setNewBookingSubmitting] = useState(false);
  const [newBookingLoadingOptions, setNewBookingLoadingOptions] = useState(false);
  const [availableDesignerIds, setAvailableDesignerIds] = useState<number[]>([]);
  const [loadingDesignerAvailability, setLoadingDesignerAvailability] = useState(false);
  
  // Comment: New booking modal - customer search and selection
  const [newBookingCustomerSearch, setNewBookingCustomerSearch] = useState<string>('');
  const [newBookingIncludeOtherShops, setNewBookingIncludeOtherShops] = useState(false);
  const [newBookingUnregisteredCustomer, setNewBookingUnregisteredCustomer] = useState(false);
  const [newBookingSelectedCustomerId, setNewBookingSelectedCustomerId] = useState<number | null>(null);
  const [newBookingCustomerSearchResults, setNewBookingCustomerSearchResults] = useState<any[]>([]);
  const [newBookingIsCustomerSearching, setNewBookingIsCustomerSearching] = useState(false);
  const [isCustomerRegistrationModalOpen, setIsCustomerRegistrationModalOpen] = useState(false);
  
  // Comment: New booking modal - appointment details
  const [newBookingDirectVisit, setNewBookingDirectVisit] = useState(false);
  const [newBookingDuration, setNewBookingDuration] = useState<number>(30);
  const [newBookingServiceTab, setNewBookingServiceTab] = useState<'item' | 'service' | 'appointment'>('service');
  const [newBookingExcludeSms, setNewBookingExcludeSms] = useState(false);
  const [newBookingRegisterDeposit, setNewBookingRegisterDeposit] = useState(false);
  const [newBookingMemo, setNewBookingMemo] = useState<string>('');

  // Comment: Editing existing booking from Upcoming list
  const [editingBooking, setEditingBooking] = useState<BookingWithRelations | null>(null);
  const [editDate, setEditDate] = useState<string>(selectedDate);
  const [editTime, setEditTime] = useState<string>('10:00 AM');
  const [editServiceId, setEditServiceId] = useState<number | null>(null);
  const [editServices, setEditServices] = useState<{ id: number; name: string; duration_minutes?: number | null }[]>([]);
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
  const [timeOffDesignerId, setTimeOffDesignerId] = useState<number | null>(null);
  const [timeOffStartDate, setTimeOffStartDate] = useState<string>('');
  const [timeOffEndDate, setTimeOffEndDate] = useState<string>('');
  const [timeOffReason, setTimeOffReason] = useState<string>('');
  const [timeOffSubmitting, setTimeOffSubmitting] = useState(false);

  // Comment: Calendar date range filter
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');

  // Comment: Designer dropdown menu state
  const [openDesignerDropdown, setOpenDesignerDropdown] = useState<number | null>(null);
  const [allDesigners, setAllDesigners] = useState<any[]>([]);
  const [selectedShopFilter, setSelectedShopFilter] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoSuccessMessage, setMemoSuccessMessage] = useState<string | null>(null);

  // Comment: Week view state (replaces modal with main timetable view)
  const [isWeekViewMode, setIsWeekViewMode] = useState(false);
  const [weekViewDesignerId, setWeekViewDesignerId] = useState<number | null>(null);
  const [weekViewDesignerName, setWeekViewDesignerName] = useState<string>('');
  const [weekViewBookings, setWeekViewBookings] = useState<BookingWithRelations[]>([]);
  const [weekViewStartDate, setWeekViewStartDate] = useState<string>('');

  // Comment: Booking restriction modal state
  const [isRestrictionModalOpen, setIsRestrictionModalOpen] = useState(false);
  const [restrictionDesignerId, setRestrictionDesignerId] = useState<number | null>(null);
  const [restrictionDesignerName, setRestrictionDesignerName] = useState<string>('');
  const [restrictionType, setRestrictionType] = useState<'date' | 'time'>('date');
  const [restrictionDate, setRestrictionDate] = useState<string>('');
  const [restrictionStartTime, setRestrictionStartTime] = useState<string>('');
  const [restrictionEndTime, setRestrictionEndTime] = useState<string>('');
  const [restrictionMemo, setRestrictionMemo] = useState<string>('');
  const [restrictionSubmitting, setRestrictionSubmitting] = useState(false);
  const [existingRestriction, setExistingRestriction] = useState<any | null>(null);
  const [loadingExistingRestriction, setLoadingExistingRestriction] = useState(false);
  const [isStartTimeDropdownOpen, setIsStartTimeDropdownOpen] = useState(false);
  const [isEndTimeDropdownOpen, setIsEndTimeDropdownOpen] = useState(false);

  // Comment: Holiday and special work day modal state (for individual designer)
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  // Comment: Holiday calendar modal state (for overall view)
  const [isHolidayCalendarModalOpen, setIsHolidayCalendarModalOpen] = useState(false);
  const [holidayDesignerId, setHolidayDesignerId] = useState<number | null>(null);
  const [holidayDesignerName, setHolidayDesignerName] = useState<string>('전체');
  const [holidayType, setHolidayType] = useState<'holiday' | 'special'>('holiday');
  const [holidaySelectedDates, setHolidaySelectedDates] = useState<string[]>([]);
  const [holidayCurrentMonth, setHolidayCurrentMonth] = useState<Date>(new Date());
  const [holidaySubmitting, setHolidaySubmitting] = useState(false);
  const [holidayRegularSchedule, setHolidayRegularSchedule] = useState<any[]>([]);
  const [holidayScheduleLoading, setHolidayScheduleLoading] = useState(false);
  const [holidayExistingTimeOffs, setHolidayExistingTimeOffs] = useState<any[]>([]);

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
  const [isDesignerFilterOpen, setIsDesignerFilterOpen] = useState(false);
  const [designerFilterPosition, setDesignerFilterPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const designerFilterButtonRef = useRef<HTMLButtonElement | null>(null);

  // Comment: REQ_SCH_001_03~06 - Date navigation state
  const [isCalendarPopupOpen, setIsCalendarPopupOpen] = useState(false);
  const [calendarPopupMonth, setCalendarPopupMonth] = useState<Date>(new Date());

  // Comment: REQ_SCH_001_07~08 - Search state
  const [searchInput, setSearchInput] = useState<string>('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [searchDropdownPosition, setSearchDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [recentSearches, setRecentSearches] = useState<Array<{ name: string; phone?: string; id?: number }>>([]);
  const [searchCriteria, setSearchCriteria] = useState<'name' | 'phone'>('name');
  const [filteredBookings, setFilteredBookings] = useState<BookingWithRelations[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchAutocompleteResults, setSearchAutocompleteResults] = useState<Array<{ id: number; name: string; phone?: string }>>([]);
  const [isSearchAutocompleteLoading, setIsSearchAutocompleteLoading] = useState(false);
  
  // Comment: Customer info modal state
  const [viewingCustomerId, setViewingCustomerId] = useState<number | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<any | null>(null);
  const [customerInfoLoading, setCustomerInfoLoading] = useState(false);
  const [customerInfoTab, setCustomerInfoTab] = useState<'sales' | 'prepaid'>('sales');
  
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
    
    const handleScroll = () => {
      if (!menuOriginalPositionRef.current || !emptySlotMenuPosition) return;
      
      // 메뉴 요소를 직접 찾아서 위치 업데이트 (fixed 포지셔닝용)
      const menuElement = document.querySelector('[data-empty-slot-menu]') as HTMLElement;
      if (menuElement) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop;
        const scrollLeft = scrollContainer.scrollLeft;
        
        // 원래 셀의 뷰포트 기준 위치를 계산
        const viewportTop = containerRect.top + menuOriginalPositionRef.current.top - scrollTop;
        const viewportLeft = containerRect.left + menuOriginalPositionRef.current.left - scrollLeft;
        
        // fixed 포지셔닝에 맞게 뷰포트 기준 위치로 설정
        menuElement.style.top = `${viewportTop}px`;
        menuElement.style.left = `${viewportLeft}px`;
      }
    };
    
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
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

  // Comment: Load bookings for selected week (all shops)
  useEffect(() => {
    let isMounted = true;
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        const weekStart = getWeekStart(selectedDate);
        const weekEnd = getWeekEnd(selectedDate);
        const res = await fetch(
          `/api/appointment?start_date=${encodeURIComponent(weekStart)}&end_date=${encodeURIComponent(weekEnd)}`
        );
        const data = await res.json();
        if (isMounted) {
          if (!res.ok) {
            throw new Error(data.error || 'Failed to load bookings');
          }
          setBookings(data.bookings || []);
          setFilteredBookings(data.bookings || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load bookings');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBookings();
    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

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

  // Comment: Save recent search
  const saveRecentSearch = (name: string, phone?: string, id?: number) => {
    try {
      const newSearch = { name, phone, id };
      const updated = [newSearch, ...recentSearches.filter(s => s.id !== id && s.name !== name)].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving recent search:', err);
    }
  };

  // Comment: Handle customer autocomplete search
  useEffect(() => {
    const searchTerm = searchInput.trim();
    if (!searchTerm || searchTerm.length < 1) {
      setSearchAutocompleteResults([]);
      return;
    }

    let timeoutId: NodeJS.Timeout;
    setIsSearchAutocompleteLoading(true);

    const fetchAutocomplete = async () => {
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(searchTerm)}&limit=10`);
        const data = await res.json();
        if (res.ok && data.customers) {
          setSearchAutocompleteResults(data.customers);
        } else {
          setSearchAutocompleteResults([]);
        }
      } catch (err) {
        console.error('Error fetching autocomplete:', err);
        setSearchAutocompleteResults([]);
      } finally {
        setIsSearchAutocompleteLoading(false);
      }
    };

    // Debounce search
    timeoutId = setTimeout(fetchAutocomplete, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchInput]);

  // Comment: Load customer info for modal
  const loadCustomerInfo = async (customerId: number) => {
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
  };

  // Comment: Handle customer selection from autocomplete
  const handleCustomerSelect = async (customer: { id: number; name: string; phone?: string }) => {
    setSearchInput(customer.name);
    setIsSearchDropdownOpen(false);
    setSearchDropdownPosition(null);
    setViewingCustomerId(customer.id);
    await loadCustomerInfo(customer.id);
    saveRecentSearch(customer.name, customer.phone, customer.id);
  };

  // Comment: Handle search - open customer info modal
  const handleSearch = async () => {
    if (!searchInput.trim()) {
      alert('검색어를 입력하세요.');
      return;
    }

    setIsSearching(true);
    try {
      const searchTerm = searchInput.trim();
      
      // Search customers first
      const customerRes = await fetch(`/api/customers?search=${encodeURIComponent(searchTerm)}&limit=1`);
      const customerData = await customerRes.json();
      
        if (customerData.customers && customerData.customers.length > 0) {
          const firstCustomer = customerData.customers[0];
        // Open customer info modal
        setViewingCustomerId(firstCustomer.id);
        await loadCustomerInfo(firstCustomer.id);
        // Save to recent searches
          saveRecentSearch(firstCustomer.name, firstCustomer.phone, firstCustomer.id);
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
  };

  // Comment: Handle delete recent search
  const handleDeleteRecentSearch = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((_, idx) => idx !== index);
    setRecentSearches(updated);
    try {
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving recent searches:', err);
    }
  };

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

  // Comment: Apply designer filter and search
  useEffect(() => {
    let filtered = bookings;

    // Apply designer filter
    if (selectedDesignerFilter === '전체') {
      // No filter
    } else if (selectedDesignerFilter === '전체(휴무 제외)') {
      // Comment: Filter out designers who are not working (no schedule / no special work day) on selectedDate
      filtered = filtered.filter((b) => {
        const id = b.designer?.id;
        if (!id) return true;
        return availableDesignerIds.includes(id);
      });
    } else {
      // Filter by specific designer
      filtered = filtered.filter((b) => {
        return b.designer?.name === selectedDesignerFilter;
      });
    }

    // If search is active, it will override this via handleSearch
    // Otherwise, apply the designer filter
    if (!searchInput.trim()) {
      setFilteredBookings(filtered);
    }
  }, [selectedDesignerFilter, bookings, searchInput, availableDesignerIds]);

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

  // Comment: Check for existing restriction when modal opens
  useEffect(() => {
    if (isRestrictionModalOpen && restrictionDesignerId && restrictionDate) {
      const checkExistingRestriction = async () => {
        setLoadingExistingRestriction(true);
        try {
          const res = await fetch(
            `/api/booking-restrictions?designer_id=${restrictionDesignerId}&date=${encodeURIComponent(restrictionDate)}`
          );
          const data = await res.json();
          if (res.ok && data.restrictions && data.restrictions.length > 0) {
            // Comment: Find matching restriction based on current type
            const matching = data.restrictions.find((r: any) => {
              if (restrictionType === 'date') {
                return r.restriction_type === 'date';
              } else {
                return r.restriction_type === 'time';
              }
            });
            setExistingRestriction(matching || data.restrictions[0]);
            if (matching && matching.restriction_type === 'time') {
              setRestrictionStartTime(matching.start_time?.substring(0, 5) || '');
              setRestrictionEndTime(matching.end_time?.substring(0, 5) || '');
              setRestrictionType('time');
            } else if (matching) {
              setRestrictionType('date');
              setRestrictionStartTime('');
              setRestrictionEndTime('');
            }
          } else {
            setExistingRestriction(null);
          }
        } catch (error) {
          console.error('Error fetching existing restriction:', error);
          setExistingRestriction(null);
        } finally {
          setLoadingExistingRestriction(false);
        }
      };

      checkExistingRestriction();
    } else if (!isRestrictionModalOpen) {
      // Comment: Reset when modal closes
      setExistingRestriction(null);
    }
  }, [isRestrictionModalOpen, restrictionDesignerId, restrictionDate, restrictionType]);

  // Comment: Close time dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.time-dropdown-container')) {
        setIsStartTimeDropdownOpen(false);
        setIsEndTimeDropdownOpen(false);
      }
    };
    
    if (isStartTimeDropdownOpen || isEndTimeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isStartTimeDropdownOpen, isEndTimeDropdownOpen]);

  // Comment: Load regular schedule and existing time offs for holiday modal
  useEffect(() => {
    if (isHolidayModalOpen) {
      // Comment: Only fetch data if a specific designer is selected
      // For "전체" (holidayDesignerId === null), skip fetching (calendar will be empty but usable)
      if (holidayDesignerId !== null) {
        const fetchData = async () => {
          setHolidayScheduleLoading(true);
          try {
            // Comment: Fetch regular schedule
            const scheduleRes = await fetch(`/api/designer-schedules?designer_id=${holidayDesignerId}`);
            const scheduleData = await scheduleRes.json();
            if (scheduleRes.ok) {
              setHolidayRegularSchedule(scheduleData.schedules || []);
            }

            // Comment: Fetch existing time offs (임의 휴일, 특별 근무일)
            const timeOffRes = await fetch(`/api/designer-time-off?designer_id=${holidayDesignerId}`);
            const timeOffData = await timeOffRes.json();
            if (timeOffRes.ok) {
              const existingTimeOffs = (timeOffData.timeOffs || []).filter(
                (to: any) => to.reason === '임의 휴일' || to.reason === '특별 근무일'
              );
              setHolidayExistingTimeOffs(existingTimeOffs);
              
              // Comment: Extract dates from existing time offs and set to selected dates
              const dates: string[] = [];
              existingTimeOffs.forEach((to: any) => {
                const start = new Date(to.start_date);
                const end = new Date(to.end_date);
                const current = new Date(start);
                while (current <= end) {
                  dates.push(current.toISOString().split('T')[0]);
                  current.setDate(current.getDate() + 1);
                }
              });
              setHolidaySelectedDates(dates);
            }
          } catch (error) {
            console.error('Error fetching holiday data:', error);
            setHolidayRegularSchedule([]);
            setHolidayExistingTimeOffs([]);
          } finally {
            setHolidayScheduleLoading(false);
          }
        };

        fetchData();
      } else {
        // Comment: For "전체" selection, clear existing data but keep calendar active
        setHolidayRegularSchedule([]);
        setHolidayScheduleLoading(false);
        setHolidayExistingTimeOffs([]);
        setHolidaySelectedDates([]);
      }
    } else if (!isHolidayModalOpen) {
      setHolidayRegularSchedule([]);
      setHolidayScheduleLoading(false);
      setHolidayExistingTimeOffs([]);
      setHolidaySelectedDates([]);
    }
  }, [isHolidayModalOpen, holidayDesignerId]);

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

  // Comment: Load all services for edit modal service picker (card only)
  useEffect(() => {
    if (!editingBooking) {
      setEditServices([]);
      return;
    }
    let isMounted = true;
    fetch('/api/services')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted || !data.services) return;
        const cardOnly = (data.services as { id: number; name: string; duration_minutes?: number | null }[]).filter(
          (s) => !s.name.toLowerCase().includes('(cash)')
        );
        setEditServices(cardOnly);
      })
      .catch(() => {
        if (isMounted) setEditServices([]);
      });
    return () => {
      isMounted = false;
    };
  }, [editingBooking?.id]);

  // Comment: Load admin memo on mount
  useEffect(() => {
    let isMounted = true;
    const fetchMemo = async () => {
      setMemoLoading(true);
      try {
        const res = await fetch('/api/admin-memo');
        const data = await res.json();
        if (isMounted) {
          if (res.ok) {
            setMemo(data.content || '');
          } else {
            // Comment: Silently handle error - memo is optional
            setMemo('');
          }
        }
      } catch (err) {
        // Comment: Silently handle error - memo is optional
        if (isMounted) {
          setMemo('');
        }
      } finally {
        if (isMounted) {
          setMemoLoading(false);
        }
      }
    };

    fetchMemo();
    return () => {
      isMounted = false;
    };
  }, []);

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

  // Comment: Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // 디자이너 필터 드롭다운 버튼이나 메뉴를 클릭한 경우는 무시
      if (target.closest('[data-designer-filter-dropdown]') || 
          target.closest('[data-designer-filter-button]') ||
          target.closest('[data-designer-filter-menu]') ||
          target.closest('[data-search-dropdown]') ||
          target.closest('[data-search-dropdown-menu]') ||
          target.closest('[data-menu-dropdown]') ||
          target.closest('[data-menu-button]') ||
          target.closest('[data-menu-dropdown-menu]')) {
        return;
      }
      
      if (openDesignerDropdown !== null) {
        setOpenDesignerDropdown(null);
      }
      // Close other dropdowns
      setIsDesignerFilterOpen(false);
      setDesignerFilterPosition(null);
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
        setIsDesignerFilterOpen(false);
        setDesignerFilterPosition(null);
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

  // Comment: Reset new booking modal state when modal closes
  useEffect(() => {
    if (!isNewBookingOpen) {
      // Reset customer search states
      setNewBookingCustomerSearch('');
      setNewBookingIncludeOtherShops(false);
      setNewBookingUnregisteredCustomer(false);
      // Reset direct visit checkbox
      setNewBookingDirectVisit(false);
      // Reset other form states if needed
      setNewBookingMemo('');
      setNewBookingExcludeSms(false);
      setNewBookingRegisterDeposit(false);
    }
  }, [isNewBookingOpen]);


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
  const weekDates = useMemo(() => {
    const start = new Date(selectedDate);
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }, [selectedDate]);

  // Comment: Group bookings by date and designer name for the weekly schedule grid
  const bookingsByDateAndDesigner = useMemo(() => {
    const map: Record<string, Record<string, BookingWithRelations[]>> = {};
    weekDates.forEach((dateStr) => {
      map[dateStr] = {};
    });
    filteredBookings.forEach((b) => {
      // Comment: 취소된 예약은 타임테이블에서 제외
      const status = (b as any).status || (b as any).booking_status || '';
      const statusUpper = typeof status === 'string' ? status.toUpperCase() : '';
      const statusLower = typeof status === 'string' ? status.toLowerCase() : '';
      
      // 모든 가능한 취소 상태 체크
      if (
        statusUpper === 'CANCELLED' || 
        statusUpper === 'CANCELED' || 
        statusLower === 'cancelled' ||
        statusLower === 'canceled' ||
        status === 'cancelled' ||
        status === 'CANCELLED'
      ) {
        console.log('🚫 취소된 예약 필터링:', { id: b.id, status, statusUpper, statusLower });
        return;
      }
      
      const dateStr = b.booking_date;
      if (!dateStr || !weekDates.includes(dateStr)) return;
      const name = b.designer?.name || 'Unassigned';
      if (!map[dateStr][name]) map[dateStr][name] = [];
      map[dateStr][name].push(b);
    });
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
      
      // Comment: Filter designers based on selectedDesignerFilter
      let filtered = [...allDesigners];
      
      if (selectedDesignerFilter === '전체') {
        // Show all designers
      } else if (selectedDesignerFilter === '전체(휴무 제외)') {
        // Comment: Show only designers who are working on selectedDate (based on /designer-schedules)
        filtered = filtered.filter((d) => availableDesignerIds.includes(d.id));
      } else {
        // Show only selected designer
        filtered = filtered.filter((d) => d.name === selectedDesignerFilter);
      }
      
      // Comment: Sort by role and name
      const sorted = filtered.sort((a, b) => {
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
  }, [allDesigners, selectedDesignerFilter, availableDesignerIds]);

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

  const nonCancelledCount = useMemo(
    () => upcomingBookings.length,
    [upcomingBookings]
  );

  const selectedDayLabel = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [selectedDate]);

  const selectedDayNumber = useMemo(
    () => Number(selectedDate.split('-')[2] || '0'),
    [selectedDate]
  );

  // Comment: Toggle custom inline date popover near the button
  const handleOpenDatePicker = () => {
    setIsDatePopoverOpen((prev) => !prev);
  };

  // Comment: Mouse handlers for drag-to-scroll on the schedule grid (horizontal + vertical)
  const handleScheduleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scheduleRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragScrollLeftRef.current = el.scrollLeft;
    dragStartYRef.current = e.clientY;
    dragScrollTopRef.current = el.scrollTop;
    el.classList.add('cursor-grabbing');
  };

  const handleScheduleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const el = scheduleRef.current;
    if (!el) return;
    const dx = e.clientX - dragStartXRef.current;
    const dy = e.clientY - dragStartYRef.current;
    el.scrollLeft = dragScrollLeftRef.current - dx;
    el.scrollTop = dragScrollTopRef.current - dy;
  };

  const endScheduleDrag = () => {
    const el = scheduleRef.current;
    isDraggingRef.current = false;
    if (el) {
      el.classList.remove('cursor-grabbing');
    }
  };

  // Comment: Helper function to get Monday of the week for a given date
  const getMondayOfWeek = (date: Date): string => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday 기준
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  // Comment: Handlers for designer header dropdown menu (week view, restrictions, holidays)
  const handleOpenWeekView = (designerId: number, name: string) => {
    const mondayStr = getMondayOfWeek(new Date(selectedDate));

    setWeekViewDesignerId(designerId);
    setWeekViewDesignerName(name);
    setWeekViewStartDate(mondayStr);
    setIsWeekViewMode(true);
    setSelectedDesignerFilter(name);
  };

  const handleCloseWeekView = () => {
    setIsWeekViewMode(false);
    setWeekViewDesignerId(null);
    setWeekViewDesignerName('');
    setWeekViewBookings([]);
  };

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

  const handleOpenRestrictionModal = (designerId: number, name: string) => {
    setRestrictionDesignerId(designerId);
    setRestrictionDesignerName(name);
    setRestrictionDate(selectedDate);
    setIsRestrictionModalOpen(true);
  };

  const handleOpenHolidayModal = (designerId: number, name: string) => {
    setHolidayDesignerId(designerId);
    setHolidayDesignerName(name);
    setHolidayCurrentMonth(new Date(selectedDate));
    setHolidaySelectedDates([]);
    setIsHolidayModalOpen(true);
  };

  const handleOpenAttendanceModal = (designerId: number, name: string) => {
    setAttendanceModalDesignerId(designerId);
    setAttendanceModalDesignerName(name);
    setIsAttendanceModalOpen(true);
  };

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
          selectedDesignerFilter={selectedDesignerFilter}
          allDesigners={allDesigners}
          searchInput={searchInput}
          isSearchDropdownOpen={isSearchDropdownOpen}
          searchDropdownPosition={searchDropdownPosition}
          isDesignerFilterOpen={isDesignerFilterOpen}
          designerFilterPosition={designerFilterPosition}
          isCalendarPopupOpen={isCalendarPopupOpen}
          calendarPopupMonth={calendarPopupMonth}
          isMenuDropdownOpen={isMenuDropdownOpen}
          menuDropdownPosition={menuDropdownPosition}
          searchAutocompleteResults={searchAutocompleteResults}
          isSearchAutocompleteLoading={isSearchAutocompleteLoading}
          recentSearches={recentSearches}
          searchInputRef={searchInputRef}
          designerFilterButtonRef={designerFilterButtonRef}
          menuButtonRef={menuButtonRef}
          onToggleLeftPanel={() => setIsLeftPanelVisible(!isLeftPanelVisible)}
          onDateChange={setSelectedDate}
          onDesignerFilterChange={setSelectedDesignerFilter}
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
          onSetDesignerFilterPosition={setDesignerFilterPosition}
          onSetMenuDropdownPosition={setMenuDropdownPosition}
          onSetIsSearchDropdownOpen={setIsSearchDropdownOpen}
          onSetIsDesignerFilterOpen={setIsDesignerFilterOpen}
          onSetIsCalendarPopupOpen={setIsCalendarPopupOpen}
          onSetIsMenuDropdownOpen={setIsMenuDropdownOpen}
          onSetRecentSearches={setRecentSearches}
          onSetViewingCustomerId={setViewingCustomerId}
          onLoadCustomerInfo={loadCustomerInfo}
          onOpenReservationHistory={() => setIsReservationHistoryOpen(true)}
          onOpenHolidayCalendar={() => setIsHolidayCalendarModalOpen(true)}
        />

        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-gray-50/50">
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
                  onSave={async () => {
                    setMemoSaving(true);
                    try {
                      const res = await fetch('/api/admin-memo', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: memo }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        throw new Error(data.error || 'Failed to save memo');
                      }
                      // Success message
                      setMemoSuccessMessage('전달사항이 저장되었습니다.');
                      setTimeout(() => {
                        setMemoSuccessMessage(null);
                      }, 3000);
                    } catch (err) {
                      console.error('Error saving memo:', err);
                      alert('전달사항 저장에 실패했습니다.');
                    } finally {
                      setMemoSaving(false);
                    }
                  }}
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
                    />

                    {/* Grid Body */}
                    <div
                      className="flex relative"
                      style={{ 
                        minHeight: `${(GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16}px`,
                        width: 'max-content',
                        minWidth: '100%'
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
                          setNewBookingDate={setNewBookingDate}
                          setNewBookingTimeSlots={setNewBookingTimeSlots}
                          setIsNewBookingOpen={setIsNewBookingOpen}
                          setNewBookingDirectVisit={setNewBookingDirectVisit}
                          setBookingRestrictions={setBookingRestrictions}
                          setRestrictionDesignerId={setRestrictionDesignerId}
                          setRestrictionDesignerName={setRestrictionDesignerName}
                          setRestrictionDate={setRestrictionDate}
                          setRestrictionType={setRestrictionType}
                          setRestrictionStartTime={setRestrictionStartTime}
                          setRestrictionEndTime={setRestrictionEndTime}
                          setExistingRestriction={setExistingRestriction}
                          setIsRestrictionModalOpen={setIsRestrictionModalOpen}
                          setHoveredEmptySlot={setHoveredEmptySlot}
                          setEmptySlotMenuOpen={setEmptySlotMenuOpen}
                          setEmptySlotMenuPosition={setEmptySlotMenuPosition}
                          setHoveredBooking={setHoveredBooking}
                          setBookingMenuOpen={setBookingMenuOpen}
                          setBookingMenuPosition={setBookingMenuPosition}
                          setEditingBooking={setEditingBooking}
                          setViewingBookingDetail={setViewingBookingDetail}
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
                            const designerColumnWidth = visibleDesigners.length * 150; // Each designer column is min 150px
                            return (
                              <div key={dateStr} className="border-r border-[#e2e8f0] shrink-0 relative" style={{ width: `${designerColumnWidth}px`, minHeight: `${(GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16}px` }}>
                                <div className="grid relative" style={{ gridTemplateColumns: `repeat(${visibleDesigners.length}, 150px)` }}>
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

                          // Check if this designer has any bookings on this date
                          const hasBookingsOnDate = designerBookings.length > 0;

                          return (
                            <div
                                      key={`${dateStr}-${designerName}`}
                                      className={`relative h-full overflow-hidden border-r border-[#e2e8f0] last:border-r-0 ${!hasBookingsOnDate ? 'bg-gray-100/50' : ''}`}
                                      style={{ minHeight: `${(GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16}px` }}
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
                                        console.log('Restriction cell clicked (normal view):', { dateStr, designerId, slotTime, restriction });
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
                                
                                if (hasBooking || !designerId) return null;
                                
                                const slotKey = `${dateStr}-${designerId}-${slotTime}`;
                                const isHovered = hoveredEmptySlot?.date === dateStr && 
                                                  hoveredEmptySlot?.designerId === designerId && 
                                                  hoveredEmptySlot?.time === slotTime;
                                const isMenuOpen = emptySlotMenuOpen?.date === dateStr && 
                                                   emptySlotMenuOpen?.designerId === (designerId || 0) && 
                                                   emptySlotMenuOpen?.time === slotTime;
                                
                                // Debug log
                                if (isMenuOpen) {
                                  console.log('Menu should be open:', { dateStr, designerId, slotTime, emptySlotMenuOpen });
                                }
                                
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
                                          console.log('Empty slot clicked (day view - outer): opening new booking modal', {
                                            dateStr,
                                            designerId,
                                            slotTime,
                                          });
                                          setNewBookingDate(dateStr);
                                          const timeStr = `${slotHour >= 12 ? slotHour - 12 : slotHour}:${String(slotMin).padStart(2, '0')} ${slotHour >= 12 ? 'PM' : 'AM'}`;
                                          setNewBookingTimeSlots([{ designerId: designerId, time: timeStr, duration: 30, serviceTab: 'service', serviceId: null }]);
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
                                              console.log('Setting emptySlotMenuOpen:', menuData, 'isMenuOpen:', isMenuOpen);
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
                                            console.log('Menu render conditions:', { 
                                              isMenuOpen, 
                                              isNewBookingOpen, 
                                              emptySlotMenuPosition, 
                                              emptySlotMenuOpen,
                                              hasWindow: typeof window !== 'undefined'
                                            });
                                            // emptySlotMenuOpen 상태를 기반으로 해당 슬롯의 restriction 정보 찾기
                                            const menuSlotTime = emptySlotMenuOpen.time;
                                            // emptySlotMenuOpen의 designerId와 date에 맞는 restrictions만 필터링
                                            const menuDesignerRestrictions = bookingRestrictions.filter(
                                              (r) => r.designer_id === emptySlotMenuOpen.designerId && r.restriction_date === emptySlotMenuOpen.date
                                            );
                                            console.log('Rendering menu:', { isMenuOpen, emptySlotMenuPosition, emptySlotMenuOpen, menuSlotTime, menuDesignerRestrictions });
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
                                                    if (menuSlotRestriction.restriction_type === 'time') {
                                                      setRestrictionStartTime(menuSlotRestriction.start_time?.substring(0, 5) || menuSlotTime);
                                                      setRestrictionEndTime(menuSlotRestriction.end_time?.substring(0, 5) || '');
                                                    } else {
                                                      setRestrictionStartTime('');
                                                      setRestrictionEndTime('');
                                                    }
                                                    setRestrictionMemo(menuSlotRestriction.memo || '');
                                                    setExistingRestriction(menuSlotRestriction);
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
                                                setNewBookingDate(emptySlotMenuOpen.date);
                                                const [menuSlotHour1, menuSlotMin1] = menuSlotTime.split(':').map(Number);
                                                const timeStr1 = `${menuSlotHour1 >= 12 ? menuSlotHour1 - 12 : menuSlotHour1}:${String(menuSlotMin1).padStart(2, '0')} ${menuSlotHour1 >= 12 ? 'PM' : 'AM'}`;
                                                setNewBookingTimeSlots([{ designerId: emptySlotMenuOpen.designerId, time: timeStr1, duration: 30, serviceTab: 'service', serviceId: null }]);
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
                                                setNewBookingDate(emptySlotMenuOpen.date);
                                                const [menuSlotHour2, menuSlotMin2] = menuSlotTime.split(':').map(Number);
                                                const timeStr2 = `${menuSlotHour2 >= 12 ? menuSlotHour2 - 12 : menuSlotHour2}:${String(menuSlotMin2).padStart(2, '0')} ${menuSlotHour2 >= 12 ? 'PM' : 'AM'}`;
                                                setNewBookingTimeSlots([{ designerId: emptySlotMenuOpen.designerId, time: timeStr2, duration: 30, serviceTab: 'service', serviceId: null }]);
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
                                console.log('Rendering menu (outside loop):', { emptySlotMenuPosition, emptySlotMenuOpen, menuSlotTime, menuDesignerRestrictions });
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
                                console.log('Menu restriction check:', { isSlotRestricted, menuSlotRestriction });
                                
                                console.log('Creating portal with position:', { 
                                  top: emptySlotMenuPosition.top, 
                                  left: emptySlotMenuPosition.left, 
                                  width: emptySlotMenuPosition.width 
                                });
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
                                      top: `${emptySlotMenuPosition.top}px`,
                                      left: `${emptySlotMenuPosition.left}px`,
                                      width: `${emptySlotMenuPosition.width}px`,
                                      height: 'auto',
                                      minHeight: 'fit-content',
                                      border: 'none',
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
                                            if (menuSlotRestriction.restriction_type === 'time') {
                                              setRestrictionStartTime(menuSlotRestriction.start_time?.substring(0, 5) || menuSlotTime);
                                              setRestrictionEndTime(menuSlotRestriction.end_time?.substring(0, 5) || '');
                                            } else {
                                              setRestrictionStartTime('');
                                              setRestrictionEndTime('');
                                            }
                                            setRestrictionMemo(menuSlotRestriction.memo || '');
                                            setExistingRestriction(menuSlotRestriction);
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
                                  // Comment: 취소된 예약은 타임테이블에서 제외
                                  const status = (b as any).status || (b as any).booking_status || '';
                                  const statusUpper = typeof status === 'string' ? status.toUpperCase() : '';
                                  const statusLower = typeof status === 'string' ? status.toLowerCase() : '';
                                  const isCancelled = 
                                    statusUpper === 'CANCELLED' || 
                                    statusUpper === 'CANCELED' || 
                                    statusLower === 'cancelled' ||
                                    statusLower === 'canceled' ||
                                    status === 'cancelled' ||
                                    status === 'CANCELLED';
                                  if (isCancelled) {
                                    console.log('🚫 렌더링에서 취소된 예약 제외:', { id: b.id, status });
                                    return false;
                                  }
                                  return true;
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
                                designerBookings.forEach((other) => {
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

                                const serviceName = b.service?.name || 'Service';
                                const timeLabel = `${hourStr.padStart(2, '0')}:${minuteStr}`;
                                const amount =
                                  (b.total_amount ?? 0) > 0
                                    ? `AU$${Number(b.total_amount).toFixed(0)}`
                                    : 'Free';
                                
                                // Comment: Get booking status color
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
                                    data-booking-card={b.id}
                                    className="absolute"
                                    style={{
                                      top,
                                      height,
                                      zIndex: emptySlotMenuOpen ? 0 : 1,
                                      left: `${leftPercent}%`,
                                      width: `${widthPercent}%`,
                                      paddingLeft: 4,
                                      paddingRight: 4,
                                    }}
                                    onMouseEnter={() => {
                                      if (b.id) {
                                        // 호버 카드 위치 계산 및 저장
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
                                      setHoveredBooking(null);
                                      setHoverCardPosition(null);
                                      hoverCardOriginalPositionRef.current = null;
                                      // 드롭다운 메뉴가 열려있지 않을 때만 닫기
                                      if (bookingMenuOpen !== b.id) {
                                        setBookingMenuOpen(null);
                                      }
                                    }}
                                  >
                                    <div
                                      className={`h-full w-full ${statusColor.bg} border-l-4 ${statusColor.border} rounded transition-all cursor-pointer p-2 flex flex-col justify-between overflow-hidden relative`}
                                      style={{ zIndex: emptySlotMenuOpen ? 0 : 1 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (b.id) {
                                          setHoveredBooking(null); // 호버 popover 비활성화
                                          setHoverCardPosition(null);
                                          hoverCardOriginalPositionRef.current = null;
                                          
                                          // 메뉴가 이미 열려있으면 닫기
                                          if (bookingMenuOpen === b.id) {
                                            setBookingMenuOpen(null);
                                            setBookingMenuPosition(null);
                                            bookingMenuOriginalPositionRef.current = null;
                                          } else {
                                            // 메뉴 위치 계산 및 저장
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
                                        }
                                      }}
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
                                        {/* timeRange - 공통 */}
                                        <div className="flex items-center gap-2">
                                          <span className="text-gray-500 w-16 shrink-0">시간</span>
                                          <span className="text-gray-900">{timeLabel} ~ {(() => {
                                            const endTime = new Date(`2000-01-01T${hourStr}:${minuteStr}`);
                                            endTime.setMinutes(endTime.getMinutes() + durationMinutes);
                                            return `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
                                          })()}</span>
                                        </div>
                                        {/* customerName (reservationId) - 공통 */}
                                        <div className="flex items-center gap-2">
                                          <span className="text-gray-500 w-16 shrink-0">고객명</span>
                                          <span className="text-gray-900">{customerName} ({b.id || customerId})</span>
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
                                  
                                  {/* Context Menu - 상태별 메뉴 - Portal로 렌더링 */}
                                  {bookingMenuOpen === b.id && !isNewBookingOpen && bookingMenuPosition && typeof window !== 'undefined' && (() => {
                                    const scrollContainer = document.getElementById('schedule-scroll-container');
                                    if (!scrollContainer) return null;
                                    
                                    // 스크롤 컨테이너 내부의 상대 위치 계산
                                    const containerRect = scrollContainer.getBoundingClientRect();
                                    if (!containerRect || containerRect.width === 0 || containerRect.height === 0) return null;
                                    
                                    const scrollTop = scrollContainer.scrollTop;
                                    const scrollLeft = scrollContainer.scrollLeft;
                                    
                                    // 카드의 절대 위치를 스크롤 컨테이너 기준 상대 위치로 변환
                                    const relativeTop = bookingMenuPosition.top - containerRect.top + scrollTop;
                                    const relativeLeft = bookingMenuPosition.left - containerRect.left + scrollLeft;
                                    
                                    // 유효한 위치 값인지 확인 (NaN이나 Infinity 체크)
                                    if (isNaN(relativeTop) || isNaN(relativeLeft) || !isFinite(relativeTop) || !isFinite(relativeLeft)) {
                                      return null;
                                    }
                                    
                                    // 원래 위치 저장 (한 번만) - 렌더링 시에도 설정
                                    if (!bookingMenuOriginalPositionRef.current) {
                                      bookingMenuOriginalPositionRef.current = {
                                        top: relativeTop,
                                        left: relativeLeft,
                                        width: bookingMenuPosition.width
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
                                          // 메뉴로 다시 들어오면 타이머 취소
                                          if (menuCloseTimeoutRef.current) {
                                            clearTimeout(menuCloseTimeoutRef.current);
                                            menuCloseTimeoutRef.current = null;
                                          }
                                          setHoveredBooking(b.id || null);
                                        }}
                                        onMouseLeave={(e) => {
                                          // 메뉴를 벗어날 때 약간의 지연을 두고 닫기
                                          const relatedTarget = e.relatedTarget;
                                          // 카드나 메뉴 내부로 이동하는 경우는 무시
                                          if (relatedTarget && relatedTarget instanceof Element) {
                                            if (
                                              relatedTarget.closest('[data-booking-card]') ||
                                              relatedTarget.closest('[data-booking-menu]')
                                            ) {
                                              return;
                                            }
                                          }
                                          // relatedTarget이 null이거나 없을 때도 카드 위에 마우스가 있는지 확인
                                          const cardElement = document.querySelector(`[data-booking-card="${b.id}"]:hover`);
                                          if (cardElement) {
                                            return;
                                          }
                                          // 기존 타이머가 있으면 취소
                                          if (menuCloseTimeoutRef.current) {
                                            clearTimeout(menuCloseTimeoutRef.current);
                                          }
                                          // 약간의 지연을 두고 메뉴 닫기 (마우스가 다시 메뉴로 돌아올 수 있도록)
                                          menuCloseTimeoutRef.current = setTimeout(() => {
                                            // 메뉴나 카드 위에 마우스가 없을 때만 닫기
                                            const menuElement = document.querySelector('[data-booking-menu]');
                                            const cardElement = document.querySelector(`[data-booking-card="${b.id}"]:hover`);
                                            if (!menuElement?.matches(':hover') && !cardElement) {
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
                                          style={{
                                            width: '100%',
                                          }}
                                          onNewBooking={() => {
                                          // Comment: 예약 등록 - 선택한 예약의 디자이너/시간을 기본값으로 사용
                                          setNewBookingDate(b.booking_date || selectedDate);
                                          if (b.booking_time) {
                                            const [hourStr2, minuteStr2] = b.booking_time.split(':');
                                            const hourNum2 = Number(hourStr2);
                                            const ampm2 = hourNum2 >= 12 ? 'PM' : 'AM';
                                            const displayHour2 =
                                              hourNum2 > 12 ? hourNum2 - 12 : hourNum2 === 0 ? 12 : hourNum2;
                                            const timeLabel2 = `${displayHour2}:${minuteStr2} ${ampm2}`;
                                            setNewBookingTimeSlots([
                                              {
                                                designerId: b.designer?.id || null,
                                                time: timeLabel2,
                                                duration: 30,
                                                serviceTab: 'service',
                                                serviceId: null,
                                              },
                                            ]);
                                          } else {
                                            setNewBookingTimeSlots([
                                              {
                                                designerId: b.designer?.id || null,
                                                time: '10:00 AM',
                                                duration: 30,
                                                serviceTab: 'service',
                                                serviceId: null,
                                              },
                                            ]);
                                          }
                                          setIsNewBookingOpen(true);
                                          setBookingMenuOpen(null);
                                        }}
                                          onEditBooking={(booking) => {
                                            setEditingBooking(booking);
                                          setBookingMenuOpen(null);
                                        }}
                                          onViewDetail={async (booking) => {
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
                                          }}
                                          onViewCustomer={async (booking) => {
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
                                        }}
                                          onStatusChange={async (booking, newStatus) => {
                                            console.log('🔄 상태 변경 시작:', { bookingId: booking.id, newStatus });
                                            
                                            if (!booking.id) {
                                              console.error('❌ 예약 ID가 없습니다.');
                                              alert('예약 ID가 없습니다.');
                                              return;
                                            }
                                            
                                            try {
                                              console.log('📤 API 요청 전송:', {
                                                url: `/api/appointment/${booking.id}`,
                                                method: 'PATCH',
                                                body: { status: newStatus }
                                              });
                                              
                                              const response = await fetch(`/api/appointment/${booking.id}`, {
                                                method: 'PATCH',
                                                headers: {
                                                  'Content-Type': 'application/json',
                                                },
                                                body: JSON.stringify({
                                                  status: newStatus,
                                                }),
                                              });
                                              
                                              console.log('📥 API 응답:', {
                                                status: response.status,
                                                statusText: response.statusText,
                                                ok: response.ok
                                              });
                                              
                                              if (!response.ok) {
                                                const errorData = await response.json();
                                                console.error('❌ API 에러:', errorData);
                                                throw new Error(errorData.error || '상태 변경에 실패했습니다.');
                                              }
                                              
                                              const responseData = await response.json();
                                              console.log('✅ 상태 변경 성공:', responseData);
                                              
                                              // 상태 변경 성공 후 예약 목록 다시 불러오기
                                              console.log('🔄 예약 목록 다시 불러오기 시작...');
                                              
                                              // WeekView 모드인 경우 weekViewBookings 먼저 업데이트
                                              if (isWeekViewMode && weekViewDesignerId && weekViewStartDate) {
                                                console.log('🔄 WeekView 예약 목록 업데이트 중...');
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
                                                  console.log('✅ WeekView 예약 목록 업데이트 완료:', { count: weekData.bookings.length });
                                                } else {
                                                  console.warn('⚠️ WeekView 예약 목록 업데이트 실패:', weekData);
                                                }
                                              }
                                              
                                              // 일반 모드인 경우 bookings 업데이트
                                              const weekStart = getWeekStart(selectedDate);
                                              const weekEnd = getWeekEnd(selectedDate);
                                              const res = await fetch(
                                                `/api/appointment?start_date=${encodeURIComponent(weekStart)}&end_date=${encodeURIComponent(weekEnd)}`
                                              );
                                              const data = await res.json();
                                              console.log('📥 예약 목록 응답:', { count: data.bookings?.length, bookings: data.bookings });
                                              
                                              if (data.bookings) {
                                                setBookings(data.bookings);
                                                console.log('✅ 예약 목록 업데이트 완료');
                                              } else {
                                                console.warn('⚠️ 예약 목록이 응답에 없습니다:', data);
                                              }
                                              
                                          setBookingMenuOpen(null);
                                          setBookingMenuPosition(null);
                                          bookingMenuOriginalPositionRef.current = null;
                                            } catch (error: any) {
                                              console.error('❌ 상태 변경 에러:', error);
                                              console.error('에러 상세:', {
                                                message: error.message,
                                                stack: error.stack,
                                                name: error.name
                                              });
                                              alert(error.message || '상태 변경에 실패했습니다.');
                                              setBookingMenuOpen(null);
                                              setBookingMenuPosition(null);
                                              bookingMenuOriginalPositionRef.current = null;
                                            }
                                          }}
                                          onMoveBooking={(booking) => {
                                            // Comment: Enter move mode for the selected booking
                                            console.log('Move booking clicked:', booking.id);
                                            setMovingBooking(booking);
                                            setMoveTargetSlot(null);
                                            setIsMoveConfirmOpen(false);
                                            setBookingMenuOpen(null);
                                            setBookingMenuPosition(null);
                                            bookingMenuOriginalPositionRef.current = null;
                                          }}
                                          onCancelBooking={(booking) => {
                                            setBookingToCancel(booking);
                                            setIsCancelBookingModalOpen(true);
                                          setBookingMenuOpen(null);
                                            setBookingMenuPosition(null);
                                            bookingMenuOriginalPositionRef.current = null;
                                          }}
                                          onRegisterSale={(booking) => {
                                            // 고객 정보 모달 먼저 열기
                                            const customerId = (booking as any).customer?.id || (booking as any).customer_id;
                                            const customerName = (booking as any).customer?.name || (booking as any).customer_name || '고객';
                                            const customerPhone = (booking as any).customer?.phone || (booking as any).customer_phone;
                                            
                                            if (customerId) {
                                              setViewingCustomerId(customerId);
                                              // 고객 정보 로드
                                              loadCustomerInfo(customerId);
                                              // 판매 등록 모달 열기
                                              setSalesRegistrationCustomer({
                                                id: customerId,
                                                name: customerName,
                                                phone: customerPhone,
                                              });
                                              setIsSalesRegistrationModalOpen(true);
                                              // 판매 항목 선택 모달도 함께 열기
                                              setSalesItemPickerTab('service');
                                              setIsSalesItemPickerModalOpen(true);
                                            }
                                            
                                          setBookingMenuOpen(null);
                                            setBookingMenuPosition(null);
                                            bookingMenuOriginalPositionRef.current = null;
                                          }}
                                          onViewSaleDetail={(booking) => {
                                          // TODO: 판매 상세 구현
                                            console.log('View sale detail:', booking.id);
                                          setBookingMenuOpen(null);
                                          setBookingMenuPosition(null);
                                          bookingMenuOriginalPositionRef.current = null;
                                        }}
                                        />
                                      </div>,
                                      document.body
                                    );
                                  })()}
                                </div>
                              </div>
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
        onClose={() => setIsNewBookingOpen(false)}
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
      {isTimeOffModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">Manage Designer Time Off</h2>
              <button
                type="button"
                onClick={() => setIsTimeOffModalOpen(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Add Time Off Form */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-black">Add Time Off</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Designer <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={timeOffDesignerId || ''}
                      onChange={(e) => setTimeOffDesignerId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                    >
                      <option value="">Select designer</option>
                      {timeOffDesigners.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={timeOffStartDate}
                      onChange={(e) => setTimeOffStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={timeOffEndDate}
                      onChange={(e) => setTimeOffEndDate(e.target.value)}
                      min={timeOffStartDate}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <input
                      type="text"
                      value={timeOffReason}
                      onChange={(e) => setTimeOffReason(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!timeOffDesignerId || !timeOffStartDate || !timeOffEndDate) {
                      alert('Please fill in all required fields');
                      return;
                    }
                    setTimeOffSubmitting(true);
                    try {
                      const res = await fetch('/api/designer-time-off', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          designer_id: timeOffDesignerId,
                          start_date: timeOffStartDate,
                          end_date: timeOffEndDate,
                          reason: timeOffReason || null,
                        }),
                      });
                      if (res.ok) {
                        setTimeOffStartDate('');
                        setTimeOffEndDate('');
                        setTimeOffReason('');
                        setTimeOffDesignerId(null);
                        // Reload time off records
                        const recordsRes = await fetch('/api/designer-time-off');
                        const recordsData = await recordsRes.json();
                        if (recordsRes.ok) {
                          setTimeOffRecords(recordsData.timeOffs || []);
                        }
                      } else {
                        const data = await res.json();
                        alert(data.error || 'Failed to add time off');
                      }
                    } catch (error) {
                      console.error('Error adding time off:', error);
                      alert('Failed to add time off');
                    } finally {
                      setTimeOffSubmitting(false);
                    }
                  }}
                  disabled={timeOffSubmitting}
                  className="w-full px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-60 transition-colors"
                >
                  {timeOffSubmitting ? 'Adding...' : 'Add Time Off'}
                </button>
              </div>

              {/* Time Off Records List */}
              <div>
                <h3 className="font-semibold text-black mb-3">Existing Time Off Records</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {timeOffRecords.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No time off records</p>
                  ) : (
                    timeOffRecords.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm text-black">
                            {record.designer?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(record.start_date).toLocaleDateString()} -{' '}
                            {new Date(record.end_date).toLocaleDateString()}
                            {record.reason && ` • ${record.reason}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm('Delete this time off record?')) {
                              try {
                                const res = await fetch(`/api/designer-time-off/${record.id}`, {
                                  method: 'DELETE',
                                });
                                if (res.ok) {
                                  setTimeOffRecords(timeOffRecords.filter((r) => r.id !== record.id));
                                }
                              } catch (error) {
                                console.error('Error deleting time off:', error);
                              }
                            }
                          }}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Booking Restriction Modal */}
      {isRestrictionModalOpen && restrictionDesignerId && (
        <div className="fixed inset-0 bg-black/50 z-[100000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-visible flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">{existingRestriction ? '예약금지 수정' : '예약금지 등록'}</h2>
              <button
                type="button"
                onClick={() => {
                  setIsRestrictionModalOpen(false);
                  setRestrictionDesignerId(null);
                  setRestrictionDesignerName('');
                  setRestrictionDate('');
                  setRestrictionStartTime('');
                  setRestrictionEndTime('');
                  setRestrictionMemo('');
                  setExistingRestriction(null);
                }}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-visible">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  디자이너
                </label>
                <input
                  type="text"
                  value={restrictionDesignerName}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  날짜
                </label>
                <input
                  type="date"
                  value={restrictionDate}
                  onChange={async (e) => {
                    const newDate = e.target.value;
                    setRestrictionDate(newDate);
                    
                    // Comment: Check for existing restriction when date changes
                    if (newDate && restrictionDesignerId) {
                      setLoadingExistingRestriction(true);
                      try {
                        const res = await fetch(
                          `/api/booking-restrictions?designer_id=${restrictionDesignerId}&date=${encodeURIComponent(newDate)}`
                        );
                        const data = await res.json();
                        if (res.ok && data.restrictions && data.restrictions.length > 0) {
                          // Comment: Find matching restriction based on type
                          const matching = data.restrictions.find((r: any) => {
                            if (restrictionType === 'date') {
                              return r.restriction_type === 'date';
                            } else {
                              return r.restriction_type === 'time';
                            }
                          });
                          setExistingRestriction(matching || data.restrictions[0]);
                          if (matching && matching.restriction_type === 'time') {
                            setRestrictionStartTime(matching.start_time?.substring(0, 5) || '');
                            setRestrictionEndTime(matching.end_time?.substring(0, 5) || '');
                            setRestrictionType('time');
                          } else if (matching) {
                            setRestrictionType('date');
                            setRestrictionStartTime('');
                            setRestrictionEndTime('');
                            setRestrictionMemo(matching.memo || '');
                          }
                        } else {
                          setExistingRestriction(null);
                          setRestrictionStartTime('');
                          setRestrictionEndTime('');
                          setRestrictionMemo('');
                        }
                      } catch (error) {
                        console.error('Error fetching existing restriction:', error);
                        setExistingRestriction(null);
                      } finally {
                        setLoadingExistingRestriction(false);
                      }
                    } else {
                      setExistingRestriction(null);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
              </div>
              
              {/* Comment: Show existing restriction info */}
              {loadingExistingRestriction && (
                <div className="text-sm text-gray-500 text-center py-2">확인 중...</div>
              )}
              
              {(() => {
                // 30분 간격으로 시간 옵션 생성 (08:00 ~ 21:00)
                const allTimeOptions: string[] = [];
                for (let hour = GRID_START_HOUR; hour < GRID_END_HOUR; hour++) {
                  for (let minute = 0; minute < 60; minute += 30) {
                    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                    allTimeOptions.push(timeStr);
                  }
                }
                
                // 종료 시간 옵션: 시작 시간 이후만 표시
                const endTimeOptions = restrictionStartTime
                  ? allTimeOptions.filter((time) => {
                      const [startHour, startMin] = restrictionStartTime.split(':').map(Number);
                      const [timeHour, timeMin] = time.split(':').map(Number);
                      const startMinutes = startHour * 60 + startMin;
                      const timeMinutes = timeHour * 60 + timeMin;
                      return timeMinutes > startMinutes;
                    })
                  : allTimeOptions;
                
                const formatTimeForDisplay = (time: string) => {
                  const [hourStr, minuteStr] = time.split(':');
                  const hour = Number(hourStr);
                  const minute = Number(minuteStr);
                  const displayHour = hour >= 12 ? (hour === 12 ? 12 : hour - 12) : (hour === 0 ? 12 : hour);
                  const period = hour >= 12 ? '오후' : '오전';
                  return `${displayHour}:${minuteStr} ${period}`;
                };
                
                const getDisplayValue = (time: string) => {
                  return time ? formatTimeForDisplay(time) : '선택하세요';
                };
                
                return (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative time-dropdown-container">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        시작 시간
                      </label>
                      <div className="relative">
                      <input
                          type="text"
                          readOnly
                          value={getDisplayValue(restrictionStartTime)}
                          onClick={() => {
                            setIsStartTimeDropdownOpen(!isStartTimeDropdownOpen);
                            setIsEndTimeDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent cursor-pointer"
                          placeholder="선택하세요"
                        />
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                          {isStartTimeDropdownOpen ? 'expand_less' : 'expand_more'}
                        </span>
                        {isStartTimeDropdownOpen && (
                          <div className="absolute z-[100001] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {allTimeOptions.map((time) => (
                              <button
                                key={time}
                                type="button"
                                onClick={() => {
                                  setRestrictionStartTime(time);
                                  setIsStartTimeDropdownOpen(false);
                                  // 시작 시간이 변경되면 종료 시간 초기화 (새로 선택한 시작 시간보다 이전이면)
                                  if (restrictionEndTime) {
                                    const [startHour, startMin] = time.split(':').map(Number);
                                    const [endHour, endMin] = restrictionEndTime.split(':').map(Number);
                                    const startMinutes = startHour * 60 + startMin;
                                    const endMinutes = endHour * 60 + endMin;
                                    if (endMinutes <= startMinutes) {
                                      setRestrictionEndTime('');
                                    }
                                  }
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                                  restrictionStartTime === time ? 'bg-gray-100 font-medium' : ''
                                }`}
                              >
                                {formatTimeForDisplay(time)}
                  </button>
                            ))}
                </div>
              )}
                      </div>
                    </div>
                    <div className="relative time-dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        종료 시간
                    </label>
                      <div className="relative">
                    <input
                          type="text"
                          readOnly
                          value={getDisplayValue(restrictionEndTime)}
                          onClick={() => {
                            if (!restrictionStartTime) {
                              alert('시작 시간을 먼저 선택해주세요.');
                              return;
                            }
                            setIsEndTimeDropdownOpen(!isEndTimeDropdownOpen);
                            setIsStartTimeDropdownOpen(false);
                          }}
                          disabled={!restrictionStartTime}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent ${
                            !restrictionStartTime ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                          placeholder="선택하세요"
                        />
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                          {isEndTimeDropdownOpen ? 'expand_less' : 'expand_more'}
                        </span>
                        {isEndTimeDropdownOpen && restrictionStartTime && (
                          <div className="absolute z-[100001] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {endTimeOptions.length > 0 ? (
                              endTimeOptions.map((time) => (
                                <button
                                  key={time}
                                  type="button"
                                  onClick={() => {
                                    setRestrictionEndTime(time);
                                    setIsEndTimeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                                    restrictionEndTime === time ? 'bg-gray-100 font-medium' : ''
                                  }`}
                                >
                                  {formatTimeForDisplay(time)}
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-gray-500">선택 가능한 시간이 없습니다</div>
                            )}
                    </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      내용
                    </label>
                    <textarea
                      value={restrictionMemo}
                      onChange={(e) => setRestrictionMemo(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent resize-none"
                      placeholder="내용을 입력하세요"
                    />
                  </div>
                </>
                );
              })()}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsRestrictionModalOpen(false);
                    setRestrictionDesignerId(null);
                    setRestrictionDesignerName('');
                    setRestrictionDate('');
                    setRestrictionStartTime('');
                    setRestrictionEndTime('');
                    setRestrictionMemo('');
                    setExistingRestriction(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-black"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!restrictionDate || !restrictionStartTime || !restrictionEndTime) {
                      alert('모든 필드를 입력해주세요.');
                      return;
                    }
                    setRestrictionSubmitting(true);
                    try {
                      if (existingRestriction) {
                        // 수정
                        const res = await fetch(`/api/booking-restrictions?id=${existingRestriction.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            designer_id: restrictionDesignerId,
                            restriction_type: 'time',
                            restriction_date: restrictionDate,
                            start_time: restrictionStartTime,
                            end_time: restrictionEndTime,
                            memo: restrictionMemo || null,
                          }),
                        });
                        if (res.ok) {
                          alert('예약금지가 수정되었습니다.');
                          const restrictionsRes = await fetch(
                            `/api/booking-restrictions?date=${encodeURIComponent(restrictionDate)}`
                          );
                          const restrictionsData = await restrictionsRes.json();
                          if (restrictionsRes.ok) {
                            setBookingRestrictions(restrictionsData.restrictions || []);
                          }
                          setIsRestrictionModalOpen(false);
                          setRestrictionDesignerId(null);
                          setRestrictionDesignerName('');
                          setRestrictionDate('');
                          setRestrictionStartTime('');
                          setRestrictionEndTime('');
                          setExistingRestriction(null);
                        } else {
                          const data = await res.json();
                          alert(data.error || '예약금지 수정에 실패했습니다.');
                        }
                      } else {
                        // 등록
                      const res = await fetch('/api/booking-restrictions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          designer_id: restrictionDesignerId,
                          restriction_type: 'time',
                          restriction_date: restrictionDate,
                          start_time: restrictionStartTime,
                          end_time: restrictionEndTime,
                          memo: restrictionMemo || null,
                        }),
                      });
                      if (res.ok) {
                        alert('예약금지가 등록되었습니다.');
                        const restrictionsRes = await fetch(
                          `/api/booking-restrictions?date=${encodeURIComponent(restrictionDate)}`
                        );
                        const restrictionsData = await restrictionsRes.json();
                        if (restrictionsRes.ok) {
                          setBookingRestrictions(restrictionsData.restrictions || []);
                        }
                        setIsRestrictionModalOpen(false);
                        setRestrictionDesignerId(null);
                        setRestrictionDesignerName('');
                        setRestrictionDate('');
                        setRestrictionStartTime('');
                        setRestrictionEndTime('');
                        setRestrictionMemo('');
                        setExistingRestriction(null);
                      } else {
                        const data = await res.json();
                        alert(data.error || '예약금지 등록에 실패했습니다.');
                        }
                      }
                    } catch (error) {
                      console.error('Error saving restriction:', error);
                      alert(existingRestriction ? '예약금지 수정에 실패했습니다.' : '예약금지 등록에 실패했습니다.');
                    } finally {
                      setRestrictionSubmitting(false);
                    }
                  }}
                  disabled={restrictionSubmitting}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-black text-white hover:bg-gray-900 disabled:opacity-60 transition-colors"
                >
                  {restrictionSubmitting ? (existingRestriction ? '수정 중...' : '등록 중...') : (existingRestriction ? '수정' : '등록')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holiday and Special Work Day Modal */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100001] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">임의 휴일 및 특근 설정</h2>
              <button
                onClick={() => {
                  setIsHolidayModalOpen(false);
                  setHolidayDesignerId(null);
                  setHolidayDesignerName('전체');
                  setHolidaySelectedDates([]);
                }}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  디자이너
                </label>
                <select
                  value={holidayDesignerId || 'all'}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'all') {
                      setHolidayDesignerId(null);
                      setHolidayDesignerName('전체');
                      // Reset to holiday type when "전체" is selected (special work day not allowed for "전체")
                      if (holidayType === 'special') {
                        setHolidayType('holiday');
                      }
                    } else {
                      const designerId = Number(value);
                      const designer = allDesigners.find(d => d.id === designerId);
                      if (designer) {
                        setHolidayDesignerId(designerId);
                        setHolidayDesignerName(designer.name);
                      }
                    }
                    // Reset selected dates when designer changes
                    setHolidaySelectedDates([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="all">전체</option>
                  {allDesigners.map((designer) => (
                    <option key={designer.id} value={designer.id}>
                      {designer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  유형
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="holiday"
                      checked={holidayType === 'holiday'}
                      onChange={(e) => setHolidayType(e.target.value as 'holiday' | 'special')}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-sm text-gray-700">임의 휴일</span>
                  </label>
                  <label className={`flex items-center gap-2 ${!holidayDesignerId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="radio"
                      value="special"
                      checked={holidayType === 'special'}
                      onChange={(e) => setHolidayType(e.target.value as 'holiday' | 'special')}
                      disabled={!holidayDesignerId}
                      className={`w-3.5 h-3.5 ${!holidayDesignerId ? 'cursor-not-allowed' : ''}`}
                    />
                    <span className="text-sm text-gray-700">특별 근무일</span>
                  </label>
                </div>
              </div>
              {/* Calendar component */}
              <div className="border border-gray-200 rounded-lg p-4">
                {!holidayDesignerId && holidayType === 'special' ? (
                  <div className="text-center py-8 text-sm text-gray-500">
                    특별 근무일은 전체 디자이너에 대해 설정할 수 없습니다. 디자이너를 선택해주세요.
                  </div>
                ) : (
                  <>
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => {
                      const prevMonth = new Date(holidayCurrentMonth);
                      prevMonth.setMonth(prevMonth.getMonth() - 1);
                      setHolidayCurrentMonth(prevMonth);
                    }}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                  </button>
                  <h3 className="text-sm font-medium text-black">
                    {holidayCurrentMonth.getFullYear()}년 {holidayCurrentMonth.getMonth() + 1}월
                  </h3>
                  <button
                    onClick={() => {
                      const nextMonth = new Date(holidayCurrentMonth);
                      nextMonth.setMonth(nextMonth.getMonth() + 1);
                      setHolidayCurrentMonth(nextMonth);
                    }}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                    <div key={day} className="text-center text-xs font-semibold text-gray-700 uppercase tracking-wider py-1">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const year = holidayCurrentMonth.getFullYear();
                    const month = holidayCurrentMonth.getMonth();
                    const firstDay = new Date(year, month, 1);
                    const lastDay = new Date(year, month + 1, 0);
                    const startDate = new Date(firstDay);
                    startDate.setDate(startDate.getDate() - firstDay.getDay());
                    const days: Date[] = [];
                    for (let i = 0; i < 42; i++) {
                      const date = new Date(startDate);
                      date.setDate(startDate.getDate() + i);
                      days.push(date);
                    }
                    return days.map((date, index) => {
                      const dateStr = date.toISOString().split('T')[0];
                      const isCurrentMonth = date.getMonth() === month;
                      const isSelected = holidaySelectedDates.includes(dateStr);
                      const isToday = dateStr === new Date().toISOString().split('T')[0];
                      
                      // Comment: During loading, show all dates as normal (white background)
                      if (holidayScheduleLoading) {
                        return (
                          <button
                            key={index}
                            onClick={() => {
                              if (!isCurrentMonth) return;
                              setHolidaySelectedDates((prev) =>
                                prev.includes(dateStr)
                                  ? prev.filter((d) => d !== dateStr)
                                  : [...prev, dateStr]
                              );
                            }}
                            disabled={!isCurrentMonth}
                            className={`
                              aspect-square text-xs rounded-lg transition-colors
                              ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                              ${isSelected 
                                ? holidayType === 'holiday' 
                                  ? 'border-2 border-red-500 bg-white text-gray-900' 
                                  : 'bg-blue-500 text-white'
                                : 'hover:bg-gray-100'}
                              ${isToday && !isSelected ? 'border-2 border-blue-500' : ''}
                            `}
                          >
                            {date.getDate()}
                          </button>
                        );
                      }
                      
                      // Comment: Check if this date is a regular holiday (no schedule for this weekday)
                      // Only show regular holiday if a specific designer is selected (not "전체")
                      const weekday = date.getDay(); // 0 = Sunday, 6 = Saturday
                      const hasRegularSchedule = holidayDesignerId !== null 
                        ? holidayRegularSchedule.some(
                            (s: any) => s.weekday === weekday && !s.effective_to
                          )
                        : false; // For "전체", don't show regular holidays
                      const isRegularHoliday = isCurrentMonth && !hasRegularSchedule && holidayDesignerId !== null;
                      
                      // Comment: Check if this date has existing time off (임의 휴일 or 특별 근무일)
                      const existingTimeOff = holidayExistingTimeOffs.find((to: any) => {
                        const start = new Date(to.start_date);
                        const end = new Date(to.end_date);
                        const current = new Date(dateStr);
                        return current >= start && current <= end;
                      });
                      const isExistingHoliday = existingTimeOff?.reason === '임의 휴일';
                      const isExistingSpecial = existingTimeOff?.reason === '특별 근무일';
                      
                      // Comment: Check if this date is newly selected
                      const isNewlySelectedHoliday = isSelected && holidayType === 'holiday';
                      const isNewlySelectedSpecial = isSelected && holidayType === 'special';
                      
                      // Comment: Determine display style - priority: special work day > holiday > regular holiday
                      let displayClass = '';
                      if (isExistingSpecial || isNewlySelectedSpecial) {
                        // Comment: Special work day (blue) - even if it's a regular holiday
                        displayClass = 'bg-blue-500 text-white';
                      } else if (isExistingHoliday || isNewlySelectedHoliday) {
                        // Comment: 임의 휴일 (red border) - even if it's a regular holiday
                        displayClass = 'border-2 border-red-500 bg-white text-gray-900';
                      } else if (isRegularHoliday) {
                        // Comment: Regular holiday only (red fill)
                        displayClass = 'bg-red-500 text-white';
                      } else {
                        // Comment: Normal day
                        displayClass = 'hover:bg-gray-100';
                      }
                      
                      // Comment: Today indicator (only if not special/holiday/regular holiday)
                      const showTodayBorder = isToday && !isSelected && !isRegularHoliday && !isExistingHoliday && !isExistingSpecial;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            if (!isCurrentMonth) return;
                            setHolidaySelectedDates((prev) =>
                              prev.includes(dateStr)
                                ? prev.filter((d) => d !== dateStr)
                                : [...prev, dateStr]
                            );
                          }}
                          disabled={!isCurrentMonth}
                          className={`
                            aspect-square text-xs rounded-lg transition-colors
                            ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                            ${displayClass}
                            ${showTodayBorder ? 'border-2 border-blue-500' : ''}
                          `}
                        >
                          {date.getDate()}
                        </button>
                      );
                    });
                  })()}
                </div>
                <div className="mt-4 flex flex-col gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-700">정기 휴일</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-red-500"></div>
                    <span className="text-gray-700">임의 휴일</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-700">특별 근무일</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  *날짜를 선택하면 등록/수정이 가능합니다.
                </p>
                  </>
                )}
              </div>
              <button
                onClick={async () => {
                  if (!holidayDesignerId && holidayType === 'special') {
                    alert('특별 근무일은 전체 디자이너에 대해 설정할 수 없습니다. 디자이너를 선택해주세요.');
                    return;
                  }
                  if (holidaySelectedDates.length === 0) {
                    alert('날짜를 선택해주세요.');
                    return;
                  }
                  setHolidaySubmitting(true);
                  try {
                    // Comment: If "전체" is selected for holiday type, apply to all designers
                    if (!holidayDesignerId && holidayType === 'holiday') {
                      // Apply to all designers
                      const promises = holidaySelectedDates.flatMap((date) =>
                        allDesigners.map((designer) => {
                          const designerShopId = designer?.shop_id;
                          return fetch('/api/designer-time-off', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              designer_id: designer.id,
                              shop_id: designerShopId || null,
                              start_date: date,
                              end_date: date,
                              reason: '임의 휴일',
                            }),
                          });
                        })
                      );
                      await Promise.all(promises);
                    } else if (holidayDesignerId) {
                      // Comment: Get designer's shop_id
                      const designer = allDesigners.find((d) => d.id === holidayDesignerId);
                      const designerShopId = designer?.shop_id;
                      
                      // Comment: Create time off records for selected dates
                      const promises = holidaySelectedDates.map((date) =>
                        fetch('/api/designer-time-off', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            designer_id: holidayDesignerId,
                            shop_id: designerShopId || null,
                            start_date: date,
                            end_date: date,
                            reason: holidayType === 'holiday' ? '임의 휴일' : '특별 근무일',
                          }),
                        })
                      );
                      await Promise.all(promises);
                    }
                    alert('설정이 완료되었습니다.');
                    
                    // Comment: Reload available designers if the selected date is in the current view
                    if (selectedDate && holidaySelectedDates.includes(selectedDate)) {
                      const res = await fetch(
                        `/api/designer-schedules?date=${encodeURIComponent(selectedDate)}`
                      );
                      const data = await res.json();
                      if (res.ok) {
                        setAvailableDesignerIds(data.designerIds || []);
                      }
                    }
                    
                    setIsHolidayModalOpen(false);
                    setHolidayDesignerId(null);
                    setHolidayDesignerName('전체');
                    setHolidaySelectedDates([]);
                  } catch (error) {
                    console.error('Error setting holidays:', error);
                    alert('설정에 실패했습니다.');
                  } finally {
                    setHolidaySubmitting(false);
                  }
                }}
                disabled={holidaySubmitting || holidaySelectedDates.length === 0 || (!holidayDesignerId && holidayType === 'special')}
                className="w-full px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {holidaySubmitting ? '설정 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        onOpenHolidayModal={(designerId, designerName) => {
          if (designerId === null) {
            // If "전체" is selected, set to null and show dropdown
            setHolidayDesignerId(null);
            setHolidayDesignerName('전체');
          } else {
            setHolidayDesignerId(designerId);
            setHolidayDesignerName(designerName);
          }
          setHolidayCurrentMonth(new Date());
          setHolidaySelectedDates([]);
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
            setIsSalesRegistrationModalOpen(true);
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
        onClose={() => {
          setIsSalesRegistrationModalOpen(false);
          setSalesRegistrationCustomer(null);
        }}
        onOpenItemPicker={(tab) => {
          setSalesItemPickerTab(tab);
          setIsSalesItemPickerModalOpen(true);
        }}
        onComplete={async () => {
          // 판매 등록 완료 시 고객 정보 새로고침
          if (viewingCustomerId) {
            await loadCustomerInfo(viewingCustomerId);
          }
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

      {/* Cancel Booking Modal */}
      <CancelBookingModal
        isOpen={isCancelBookingModalOpen}
        booking={bookingToCancel}
        onClose={() => {
          setIsCancelBookingModalOpen(false);
          setBookingToCancel(null);
        }}
        onConfirm={async (booking, cancellationReason) => {
          try {
            console.log('🔵 예약 취소 요청:', { 
              bookingId: booking.id, 
              status: 'CANCELLED',
              cancellationReason 
            });
            
            const res = await fetch(`/api/appointment/${booking.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                status: 'CANCELLED',
                cancellation_reason: cancellationReason || null,
              }),
            });
            
            console.log('📥 예약 취소 API 응답:', { 
              status: res.status, 
              ok: res.ok 
            });
            
            if (!res.ok) {
              const data = await res.json();
              console.error('❌ 예약 취소 API 에러:', data);
              throw new Error(data.error || '예약 취소에 실패했습니다.');
            }
            
            const responseData = await res.json();
            console.log('✅ 예약 취소 성공:', responseData);
            console.log('📋 취소된 예약 상태:', responseData.booking?.status);
            
            // 즉시 해당 예약을 상태에서 제거 (UI 즉시 반영)
            setBookings((prev) => {
              const filtered = prev.filter((b) => b.id !== booking.id);
              console.log('🗑️ 즉시 제거: 예약 ID', booking.id, '제거됨. 남은 예약:', filtered.length, '개');
              return filtered;
            });
            setFilteredBookings((prev) => {
              const filtered = prev.filter((b) => b.id !== booking.id);
              console.log('🗑️ 즉시 제거 (filtered): 예약 ID', booking.id, '제거됨. 남은 예약:', filtered.length, '개');
              return filtered;
            });
            
            // 주간 뷰 모드인 경우 weekViewBookings에서도 제거
            if (isWeekViewMode) {
              setWeekViewBookings((prev) => {
                const filtered = prev.filter((b) => b.id !== booking.id);
                console.log('🗑️ 즉시 제거 (weekView): 예약 ID', booking.id, '제거됨. 남은 예약:', filtered.length, '개');
                return filtered;
              });
            }
            
            // 예약 취소가 실제로 반영되었는지 확인
            if (responseData.booking?.status !== 'CANCELLED' && responseData.booking?.status !== 'cancelled') {
              console.error('⚠️ 경고: 예약 취소 후 상태가 CANCELLED가 아닙니다!', {
                expected: 'CANCELLED',
                actual: responseData.booking?.status
              });
            }
            
            // Refresh bookings (백그라운드에서 최신 상태 동기화)
            const weekStart = getWeekStart(selectedDate);
            const weekEnd = getWeekEnd(selectedDate);
            const refreshRes = await fetch(
              `/api/appointment?start_date=${encodeURIComponent(weekStart)}&end_date=${encodeURIComponent(weekEnd)}`
            );
            const refreshData = await refreshRes.json();
            if (refreshRes.ok) {
              console.log('🔄 새로고침된 예약 목록:', refreshData.bookings?.length, '개');
              
              // 취소된 예약 필터링
              const nonCancelledBookings = (refreshData.bookings || []).filter((b: any) => {
                const status = b.status || b.booking_status || '';
                const statusUpper = typeof status === 'string' ? status.toUpperCase() : '';
                const statusLower = typeof status === 'string' ? status.toLowerCase() : '';
                const isCancelled = 
                  statusUpper === 'CANCELLED' || 
                  statusUpper === 'CANCELED' || 
                  statusLower === 'cancelled' ||
                  statusLower === 'canceled' ||
                  status === 'cancelled' ||
                  status === 'CANCELLED';
                return !isCancelled;
              });
              console.log('✅ 필터링된 예약 목록:', nonCancelledBookings.length, '개');
              setBookings(nonCancelledBookings);
              setFilteredBookings(nonCancelledBookings);
            } else {
              console.error('❌ 예약 목록 새로고침 실패:', refreshData);
            }
            
            // Refresh week view bookings if in week view mode
            if (isWeekViewMode && weekViewDesignerId && weekViewStartDate) {
              const weekStartDate = new Date(weekViewStartDate);
              const weekEndDate = new Date(weekStartDate);
              weekEndDate.setDate(weekEndDate.getDate() + 6);
              const weekStartStr = weekStartDate.toISOString().split('T')[0];
              const weekEndStr = weekEndDate.toISOString().split('T')[0];
              
              const weekRes = await fetch(
                `/api/appointment?designer_id=${weekViewDesignerId}&start_date=${encodeURIComponent(weekStartStr)}&end_date=${encodeURIComponent(weekEndStr)}`
              );
              const weekData = await weekRes.json();
              if (weekRes.ok) {
                // 취소된 예약 필터링
                const nonCancelledWeekBookings = (weekData.bookings || []).filter((b: any) => {
                  const status = b.status || b.booking_status || '';
                  const statusUpper = typeof status === 'string' ? status.toUpperCase() : '';
                  const statusLower = typeof status === 'string' ? status.toLowerCase() : '';
                  return !(
                    statusUpper === 'CANCELLED' || 
                    statusUpper === 'CANCELED' || 
                    statusLower === 'cancelled' ||
                    statusLower === 'canceled' ||
                    status === 'cancelled' ||
                    status === 'CANCELLED'
                  );
                });
                setWeekViewBookings(nonCancelledWeekBookings);
              }
            }
            
            alert('예약이 취소되었습니다.');
          } catch (error: any) {
            console.error('Error cancelling booking:', error);
            throw error;
          }
        }}
      />

      {/* Customer Registration Modal */}
      <AddCustomerModal
        isOpen={isCustomerRegistrationModalOpen}
        onClose={() => {
          setIsCustomerRegistrationModalOpen(false);
        }}
        onSuccess={async () => {
          // 고객 등록 성공 시 예약 등록 모달의 고객 검색 결과 업데이트
          if (newBookingCustomerSearch.trim()) {
            // 현재 검색어로 다시 검색하여 새로 등록된 고객 포함
            try {
              const res = await fetch(`/api/customers/search?q=${encodeURIComponent(newBookingCustomerSearch.trim())}`);
              const data = await res.json();
              if (res.ok) {
                setNewBookingCustomerSearchResults(data.customers || []);
              }
            } catch (error) {
              console.error('Error refreshing customer search:', error);
            }
          }
          setIsCustomerRegistrationModalOpen(false);
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
          // TODO: 판매 수정 기능 구현
          console.log('Edit sales:', salesDetailData);
        }}
        onDelete={() => {
          // TODO: 판매 삭제 기능 구현
          console.log('Delete sales:', salesDetailData);
        }}
        onSendStatement={() => {
          // TODO: 판매내역서 발송 기능 구현
          console.log('Send statement:', salesDetailData);
        }}
      />
    </div>
  );
}