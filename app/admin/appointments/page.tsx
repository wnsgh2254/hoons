'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type React from 'react';
import type { Booking } from '@/lib/types';
import AdminTopNav from '@/components/AdminTopNav';

type BookingWithRelations = Booking & {
  designer?: { id: number; name: string } | null;
  service?: { id: number; name: string; duration_minutes?: number | null } | null;
};

// Comment: Grid configuration for full schedule view
const GRID_START_HOUR = 8; // 08:00
const GRID_END_HOUR = 21; // 21:00 (exclusive upper bound, last label 20:00)
const GRID_HOUR_HEIGHT = 80; // px per hour (increased for better spacing and to fill container)
const GRID_30MIN_HEIGHT = 40; // px per 30 minutes (increased for better spacing and to fill container)

// Comment: Simple color palette for designers
const DESIGNER_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500' },
  { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-500' },
  { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-500' },
];

// Comment: Booking status enum (고정)
type BookingStatus = 'BOOKED' | 'ARRIVED' | 'PAID' | 'NOSHOW' | 'BLOCKED' | 'UNKNOWN';

// Comment: Booking status color mapping (프론트 고정)
function getBookingStatusColor(status: string | null | undefined): {
  bg: string;
  border: string;
  text: string;
  headerBg: string;
  headerText: string;
  label: string;
  statusEnum: BookingStatus;
} {
  const statusUpper = (status || '').toUpperCase().trim();
  
  // Status enum 매핑
  if (statusUpper === 'NOSHOW' || statusUpper === 'NO_SHOW') {
    return {
      bg: 'bg-red-50',
      border: 'border-red-500',
      text: 'text-red-900',
      headerBg: 'bg-red-500',
      headerText: 'text-white',
      label: '노쇼',
      statusEnum: 'NOSHOW'
    };
  } else if (statusUpper === 'ARRIVED' || statusUpper === 'CUSTOMER_ENTERED' || statusUpper === 'CUSTOMER_ENTRANCE' || statusUpper === 'ENTERED') {
    return {
      bg: 'bg-purple-50',
      border: 'border-purple-500',
      text: 'text-purple-900',
      headerBg: 'bg-purple-500',
      headerText: 'text-white',
      label: '고객입장',
      statusEnum: 'ARRIVED'
    };
  } else if (statusUpper === 'PAID' || statusUpper === 'PAYMENT_COMPLETED' || statusUpper === 'PAYMENT_COMPLETE' || statusUpper === 'COMPLETED') {
    return {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      text: 'text-blue-900',
      headerBg: 'bg-blue-500',
      headerText: 'text-white',
      label: '계산완료',
      statusEnum: 'PAID'
    };
  } else if (statusUpper === 'BOOKED' || statusUpper === 'RESERVED' || statusUpper === 'CONFIRMED' || statusUpper === 'PENDING' || statusUpper === '') {
    // Default: 예약완료 (green) - confirmed, pending도 예약완료로 처리
    return {
      bg: 'bg-green-50',
      border: 'border-green-500',
      text: 'text-green-900',
      headerBg: 'bg-green-500',
      headerText: 'text-white',
      label: '예약완료',
      statusEnum: 'BOOKED'
    };
  } else if (statusUpper === 'BLOCKED' || statusUpper === 'RESTRICTED') {
    return {
      bg: 'bg-gray-200',
      border: 'border-gray-400',
      text: 'text-gray-700',
      headerBg: 'bg-gray-400',
      headerText: 'text-white',
      label: '예약금지',
      statusEnum: 'BLOCKED'
    };
  } else if (statusUpper === 'CANCELLED' || statusUpper === 'CANCELED') {
    // 취소된 예약은 회색으로 표시
    return {
      bg: 'bg-gray-100',
      border: 'border-gray-300',
      text: 'text-gray-600',
      headerBg: 'bg-gray-300',
      headerText: 'text-gray-800',
      label: '취소됨',
      statusEnum: 'BLOCKED'
    };
  } else {
    // Unknown status 처리: 임의 색상 매핑 금지, "미정 상태" 스타일
    console.warn('Unknown booking status:', status);
    return {
      bg: 'bg-gray-50',
      border: 'border-gray-300 border-dashed',
      text: 'text-gray-600',
      headerBg: 'bg-gray-300',
      headerText: 'text-gray-800',
      label: '미정 상태',
      statusEnum: 'UNKNOWN'
    };
  }
}

// Comment: Get today's date string in Sydney timezone (YYYY-MM-DD)
function getSydneyToday(): string {
  const sydney = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
  );
  const year = sydney.getFullYear();
  const month = String(sydney.getMonth() + 1).padStart(2, '0');
  const day = String(sydney.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Comment: Get week start date (Monday) for a given date
function getWeekStart(date: string): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// Comment: Get week end date (Sunday) for a given date
function getWeekEnd(date: string): string {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end.toISOString().split('T')[0];
}

// Comment: Format date range for display (YYYY-MM-DD ~ MM-DD)
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startYear = start.getFullYear();
  const startMonth = String(start.getMonth() + 1).padStart(2, '0');
  const startDay = String(start.getDate()).padStart(2, '0');
  const endMonth = String(end.getMonth() + 1).padStart(2, '0');
  const endDay = String(end.getDate()).padStart(2, '0');
  return `${startYear}-${startMonth}-${startDay} ~ ${endMonth}-${endDay}`;
}

// Comment: Build date string using current year/month and given day
function buildDateFromDay(baseDate: string, day: number): string {
  const [year, month] = baseDate.split('-');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}

// Comment: Convert DB time 'HH:MM:SS' to 12h label like '3:00 PM'
function bookingTimeToLabel(dbTime: string): string {
  const [hhStr, mmStr] = dbTime.split(':');
  const hh = Number(hhStr);
  if (Number.isNaN(hh)) return dbTime;
  const isPM = hh >= 12;
  const displayHour = hh % 12 === 0 ? 12 : hh % 12;
  return `${displayHour}:${mmStr.padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
}

// Comment: Convert label like '3:00 PM' to DB time '15:00:00'
function labelToDbTime(label: string): string | null {
  const match = label.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return null;
  let [, hh, mm, ap] = match;
  let hour = parseInt(hh, 10);
  const isPM = ap.toUpperCase() === 'PM';
  if (isPM && hour < 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;
  const hStr = hour.toString().padStart(2, '0');
  return `${hStr}:${mm}:${'00'}`;
}

// Comment: Time options for From/To (30-min steps, 8:00 AM - 9:00 PM)
const EDIT_TIME_OPTIONS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM', '9:00 PM',
];

// Comment: Group service name into category (for service picker modal, same logic as services page)
function getServiceCategoryForPicker(name: string): string {
  const cleanName = name.replace(/\s*\(card\)\s*/gi, '').replace(/\s*\(cash\)\s*/gi, '').trim();
  const lowerName = cleanName.toLowerCase();
  if (lowerName.includes('- perm') && !lowerName.includes('hot perm') && !lowerName.includes('magic')) return 'Perm';
  if (lowerName.includes('- magic')) return 'Magic';
  if (lowerName.includes('- hot perm')) return 'Hot Perm';
  if (lowerName.includes('- color')) return 'Color';
  if (lowerName.includes('- clinic')) return 'Clinic';
  if (lowerName.includes('- package')) return 'Package';
  if (lowerName.includes('package') || (lowerName.includes('design addition') && !lowerName.includes('-'))) return 'Package';
  if (lowerName.includes('mucota') || lowerName.includes('ahyunchae') || lowerName.includes('keratin') || lowerName.includes('scalp') || lowerName.includes('sleek') || lowerName.includes('clinic')) return 'Clinic';
  if (lowerName.includes('color') || lowerName.includes('bleach') || lowerName.includes('toning')) return 'Color';
  if (lowerName.includes('special perm') || lowerName.includes('setting perm') || lowerName.includes('design setting perm')) return 'Hot Perm';
  if (lowerName.includes('magic') || lowerName.includes('iron perm') || lowerName.includes('iron root')) return 'Magic';
  if (lowerName.includes('perm') && !lowerName.includes('magic') && !lowerName.includes('special') && !lowerName.includes('setting')) return 'Perm';
  if (lowerName.includes('styling') || lowerName.includes('shampoo') || lowerName.includes('dry')) return 'Dry';
  if (lowerName.includes('cut') || lowerName.includes('length addition') || lowerName.includes('hair extension') || lowerName.includes('director level') || lowerName.includes('manager level') || lowerName.includes('kids cut') || lowerName.includes('bangs cut')) return 'Cut';
  return 'Others';
}

const SERVICE_PICKER_CATEGORY_ORDER = ['Cut', 'Dry', 'Perm', 'Magic', 'Hot Perm', 'Color', 'Clinic', 'Package', 'Others'];

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
  const [newBookingTimeSlots, setNewBookingTimeSlots] = useState<Array<{ designerId: number | null; time: string; duration: number; serviceTab: 'service' | 'appointment'; serviceId: number | null }>>([
    { designerId: null, time: '10:00 AM', duration: 30, serviceTab: 'service', serviceId: null }
  ]);
  const [newBookingSubmitting, setNewBookingSubmitting] = useState(false);
  const [newBookingLoadingShops, setNewBookingLoadingShops] = useState(false);
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
  const [newBookingShowMemberIcon, setNewBookingShowMemberIcon] = useState(false);
  const [newBookingShowImportantIcon, setNewBookingShowImportantIcon] = useState(false);
  const [newBookingShowConfirmedIcon, setNewBookingShowConfirmedIcon] = useState(false);
  const [newBookingIconColor, setNewBookingIconColor] = useState<string>('');
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

  // Comment: Holiday and special work day modal state
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayDesignerId, setHolidayDesignerId] = useState<number | null>(null);
  const [holidayDesignerName, setHolidayDesignerName] = useState<string>('');
  const [holidayType, setHolidayType] = useState<'holiday' | 'special'>('holiday');
  const [holidaySelectedDates, setHolidaySelectedDates] = useState<string[]>([]);
  const [holidayCurrentMonth, setHolidayCurrentMonth] = useState<Date>(new Date());
  const [holidaySubmitting, setHolidaySubmitting] = useState(false);
  const [holidayRegularSchedule, setHolidayRegularSchedule] = useState<any[]>([]);
  const [holidayScheduleLoading, setHolidayScheduleLoading] = useState(false);
  const [holidayExistingTimeOffs, setHolidayExistingTimeOffs] = useState<any[]>([]);

  // Comment: Booking restrictions state
  const [bookingRestrictions, setBookingRestrictions] = useState<any[]>([]);

  // Comment: Calendar view mode - always show booking count instead of green dot
  const [showBookingCount] = useState(true);

  // Comment: REQ_SCH_001_01 - Left panel toggle state
  const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(true);

  // Comment: REQ_SCH_001_02 - Designer filter state
  const [selectedDesignerFilter, setSelectedDesignerFilter] = useState<string>('전체');
  const [isDesignerFilterOpen, setIsDesignerFilterOpen] = useState(false);
  const [designerFilterPosition, setDesignerFilterPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const designerFilterButtonRef = useRef<HTMLButtonElement>(null);

  // Comment: REQ_SCH_001_03~06 - Date navigation state
  const [isCalendarPopupOpen, setIsCalendarPopupOpen] = useState(false);
  const [calendarPopupMonth, setCalendarPopupMonth] = useState<Date>(new Date());

  // Comment: REQ_SCH_001_07~08 - Search state
  const [searchInput, setSearchInput] = useState<string>('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [searchDropdownPosition, setSearchDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const [customerInfoTab, setCustomerInfoTab] = useState<'appointments' | 'prepaid' | 'tickets'>('prepaid');

  // Comment: REQ_SCH_001_09 - Menu dropdown state
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState(false);
  const [menuDropdownPosition, setMenuDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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
      if (!menuOriginalPositionRef.current) return;
      
      // 메뉴 요소를 직접 찾아서 위치 업데이트
      const menuElement = scrollContainer.querySelector('[data-empty-slot-menu]') as HTMLElement;
      if (menuElement) {
        const scrollTop = scrollContainer.scrollTop;
        const scrollLeft = scrollContainer.scrollLeft;
        
        // 스크롤 컨테이너 내부의 상대 위치로 설정
        menuElement.style.top = `${menuOriginalPositionRef.current.top}px`;
        menuElement.style.left = `${menuOriginalPositionRef.current.left}px`;
      }
    };
    
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [emptySlotMenuOpen, emptySlotMenuPosition]);
  
  // Comment: Booking hover card state
  const [hoveredBooking, setHoveredBooking] = useState<number | null>(null);
  
  // Comment: Booking context menu state
  const [bookingMenuOpen, setBookingMenuOpen] = useState<number | null>(null);

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
      const [customerRes, bookingsRes, prepaidRes] = await Promise.all([
        fetch(`/api/customers/${customerId}`),
        fetch(`/api/appointment?customer_id=${customerId}&limit=1000`),
        fetch(`/api/prepaid?customer_id=${customerId}`).catch(() => null)
      ]);
      
      const customerData = await customerRes.json();
      const bookingsData = await bookingsRes.json();
      const prepaidData = prepaidRes ? await prepaidRes.json() : null;
      
      if (customerRes.ok && customerData.customer) {
        const customer = customerData.customer;
        
        // Calculate last visit date and days since
        const bookings = bookingsData.bookings || [];
        const completedBookings = bookings.filter((b: any) => b.status === 'PAID' || b.status === 'COMPLETED');
        const lastBooking = completedBookings.sort((a: any, b: any) => {
          const dateA = new Date(`${a.booking_date}T${a.booking_time || '00:00:00'}`);
          const dateB = new Date(`${b.booking_date}T${b.booking_time || '00:00:00'}`);
          return dateB.getTime() - dateA.getTime();
        })[0];
        
        const lastVisitDate = lastBooking ? lastBooking.booking_date : null;
        let daysSinceLastVisit = null;
        if (lastVisitDate) {
          const lastVisit = new Date(lastVisitDate);
          const today = new Date();
          const diffTime = today.getTime() - lastVisit.getTime();
          daysSinceLastVisit = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
        
        // Calculate appointments in last year
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const recentBookings = bookings.filter((b: any) => {
          const bookingDate = new Date(b.booking_date);
          return bookingDate >= oneYearAgo;
        });
        const appointmentsCount = recentBookings.length;
        const cancelledCount = recentBookings.filter((b: any) => b.status === 'CANCELLED' || b.status === 'CANCELLED').length;
        
        // Get next appointment
        const upcomingBookings = bookings
          .filter((b: any) => {
            const bookingDate = new Date(`${b.booking_date}T${b.booking_time || '00:00:00'}`);
            return bookingDate > new Date() && (b.status === 'BOOKED' || b.status === 'CONFIRMED' || !b.status);
          })
          .sort((a: any, b: any) => {
            const dateA = new Date(`${a.booking_date}T${a.booking_time || '00:00:00'}`);
            const dateB = new Date(`${b.booking_date}T${b.booking_time || '00:00:00'}`);
            return dateA.getTime() - dateB.getTime();
          });
        const nextAppointment = upcomingBookings[0] ? {
          date: upcomingBookings[0].booking_date,
          time: upcomingBookings[0].booking_time || ''
        } : null;
        
        // Get prepaid tickets
        const prepaidTickets = prepaidData?.prepaid || [];
        const totalPrepaidBalance = prepaidTickets.reduce((sum: number, ticket: any) => sum + (Number(ticket.balance) || 0), 0);
        
        setViewingCustomer({
          ...customer,
          last_visit_date: lastVisitDate,
          days_since_last_visit: daysSinceLastVisit,
          appointments_count: appointmentsCount,
          cancelled_count: cancelledCount,
          next_appointment: nextAppointment,
          prepaid_tickets: prepaidTickets,
          prepaid_balance: totalPrepaidBalance
        });
      } else {
        alert('고객 정보를 불러올 수 없습니다.');
        setViewingCustomerId(null);
      }
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

  // Comment: Apply designer filter and search
  useEffect(() => {
    let filtered = bookings;

    // Apply designer filter
    if (selectedDesignerFilter === '전체') {
      // No filter
    } else if (selectedDesignerFilter === '전체(휴무 제외)') {
      // Filter out designers with time off
      // TODO: Implement time off filtering - for now, show all
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
  }, [selectedDesignerFilter, bookings, searchInput]);

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
    if (isHolidayModalOpen && holidayDesignerId) {
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

    const loadShops = async () => {
      try {
        setNewBookingLoadingShops(true);
        const res = await fetch('/api/shops');
        const json = await res.json();
        if (res.ok) {
          setNewBookingShops(json.shops || []);
        } else {
          console.error('Failed to load shops for new booking:', json.error);
        }
      } catch (err) {
        console.error('Unexpected error loading shops for new booking:', err);
      } finally {
        setNewBookingLoadingShops(false);
      }
    };

    const loadDesigners = async () => {
      try {
        const res = await fetch('/api/staff?role=designer');
        const json = await res.json();
        if (res.ok) {
          setNewBookingDesigners(json.staff || []);
        } else {
          console.error('Failed to load designers for new booking:', json.error);
        }
      } catch (err) {
        console.error('Unexpected error loading designers for new booking:', err);
      }
    };

    const loadServices = async () => {
      try {
        const res = await fetch('/api/services');
        const json = await res.json();
        if (res.ok) {
          setNewBookingServices(json.services || []);
        } else {
          console.error('Failed to load services for new booking:', json.error);
        }
      } catch (err) {
        console.error('Unexpected error loading services for new booking:', err);
      }
    };

    loadShops();
    loadDesigners();
    loadServices();
  }, [isNewBookingOpen]);

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
      setNewBookingShowMemberIcon(false);
      setNewBookingShowImportantIcon(false);
      setNewBookingShowConfirmedIcon(false);
      setNewBookingIconColor('');
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
        // TODO: Filter out designers with time off - for now, show all
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
  }, [allDesigners, selectedDesignerFilter]);

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
        <div className="bg-white border-b border-gray-200 shrink-0 relative z-[100]">
          <div className="max-w-full mx-auto px-6 md:px-10 md:py-2">
            <div className={`grid grid-cols-1 ${isLeftPanelVisible ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-6`}>
              {/* Left: Toggle panel button - matches left panel width (col-span-3) */}
              {isLeftPanelVisible ? (
                <div className="lg:col-span-3 flex items-center">
                  {/* REQ_SCH_001_01 - Left panel toggle buttons */}
                  <button
                    type="button"
                    onClick={() => setIsLeftPanelVisible(false)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                    title="좌측 패널 숨기기"
                  >
                    <span className="material-symbols-outlined text-lg">
                      chevron_left
                    </span>
                  </button>
                </div>
              ) : null}

              {/* Center + Right: Designer filter, Date navigation, Search and Menu */}
              <div className={`${isLeftPanelVisible ? 'lg:col-span-9' : 'lg:col-span-12'} flex items-center gap-4`}>
                {/* Left: Toggle button when panel is hidden */}
                {!isLeftPanelVisible && (
                  <button
                    type="button"
                    onClick={() => setIsLeftPanelVisible(true)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors shrink-0"
                    title="좌측 패널 보이기"
                  >
                    <span className="material-symbols-outlined text-lg">
                      chevron_right
                    </span>
                  </button>
                )}

                {/* Left-center: Designer filter dropdown */}
                <div className="flex items-center gap-4">
                  {/* REQ_SCH_001_02 - Designer filter dropdown */}
                  <div className="relative" data-designer-filter-dropdown>
              <button
                ref={designerFilterButtonRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (designerFilterButtonRef.current) {
                    const rect = designerFilterButtonRef.current.getBoundingClientRect();
                    setDesignerFilterPosition({
                      top: rect.bottom + 4,
                      left: rect.left,
                      width: rect.width
                    });
                  }
                  setIsDesignerFilterOpen(!isDesignerFilterOpen);
                }}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 min-w-[120px] justify-between transition-colors"
                data-designer-filter-button
              >
                <span>{selectedDesignerFilter}</span>
                <span className="material-symbols-outlined text-lg">
                  {isDesignerFilterOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {isDesignerFilterOpen && designerFilterPosition && typeof window !== 'undefined' && createPortal(
                <div 
                  className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[200] min-w-[200px] max-h-[300px] overflow-y-auto"
                  style={{
                    top: `${designerFilterPosition.top}px`,
                    left: `${designerFilterPosition.left}px`,
                    width: `${designerFilterPosition.width}px`
                  }}
                  onClick={(e) => e.stopPropagation()}
                  data-designer-filter-menu
                >
                  {/* 전체 (default) */}
                    <button
                    key="전체"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                      setSelectedDesignerFilter('전체');
                        setIsDesignerFilterOpen(false);
                        setDesignerFilterPosition(null);
                      }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg transition-colors ${
                      selectedDesignerFilter === '전체' ? 'bg-gray-100 font-medium' : ''
                    }`}
                  >
                    전체
                  </button>
                  
                  {/* 전체(휴무 제외) */}
                  <button
                    key="전체(휴무 제외)"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDesignerFilter('전체(휴무 제외)');
                      setIsDesignerFilterOpen(false);
                      setDesignerFilterPosition(null);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      selectedDesignerFilter === '전체(휴무 제외)' ? 'bg-gray-100 font-medium' : ''
                    }`}
                  >
                    전체(휴무 제외)
                  </button>
                  
                  {/* 디자이너 리스트 */}
                  {allDesigners.length > 0 && (
                    <>
                      {allDesigners.map((designer) => (
                        <button
                          key={designer.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDesignerFilter(designer.name);
                            setIsDesignerFilterOpen(false);
                            setDesignerFilterPosition(null);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 last:rounded-b-lg transition-colors ${
                            selectedDesignerFilter === designer.name ? 'bg-gray-100 font-medium' : ''
                          }`}
                        >
                          {designer.name}
                    </button>
                  ))}
                    </>
                  )}
                </div>,
                document.body
              )}
                  </div>
                </div>

                {/* Center: Date navigation */}
                <div className="flex items-center gap-2 flex-1 justify-center">
              {/* Previous week button */}
              <button
                type="button"
                onClick={() => {
                  const prevWeek = new Date(selectedDate);
                  prevWeek.setDate(prevWeek.getDate() - 7);
                  setSelectedDate(prevWeek.toISOString().split('T')[0]);
                }}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                title="이전 주"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>

              {/* Date range display with calendar popup */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCalendarPopupOpen(!isCalendarPopupOpen);
                    setCalendarPopupMonth(new Date(selectedDate));
                  }}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  {(() => {
                    const start = new Date(selectedDate);
                    const end = new Date(selectedDate);
                    end.setDate(end.getDate() + 6);
                    return formatDateRange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
                  })()}
                </button>
                {isCalendarPopupOpen && (
                  <div 
                    className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-[200] p-4 min-w-[280px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          const prev = new Date(calendarPopupMonth);
                          prev.setMonth(prev.getMonth() - 1);
                          setCalendarPopupMonth(prev);
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                      </button>
                      <span className="text-sm font-semibold text-gray-900">
                        {calendarPopupMonth.getFullYear()}년 {calendarPopupMonth.getMonth() + 1}월
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Date(calendarPopupMonth);
                          next.setMonth(next.getMonth() + 1);
                          setCalendarPopupMonth(next);
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                        <div key={day} className="text-center text-xs font-medium text-gray-600 py-1">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const year = calendarPopupMonth.getFullYear();
                        const month = calendarPopupMonth.getMonth();
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
                        return days.map((date, idx) => {
                          const dateStr = date.toISOString().split('T')[0];
                          const isCurrentMonth = date.getMonth() === month;
                          const isSelected = dateStr === selectedDate;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(dateStr);
                                setIsCalendarPopupOpen(false);
                              }}
                              disabled={!isCurrentMonth}
                              className={`aspect-square text-xs rounded-lg transition-colors ${
                                !isCurrentMonth ? 'text-gray-300' : 'text-gray-900 hover:bg-gray-100'
                              } ${isSelected ? 'bg-black text-white' : ''}`}
                            >
                              {date.getDate()}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Next week button */}
              <button
                type="button"
                onClick={() => {
                  const nextWeek = new Date(selectedDate);
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  setSelectedDate(nextWeek.toISOString().split('T')[0]);
                }}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                title="다음 주"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>

              {/* Today button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(getSydneyToday());
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                오늘
              </button>
                </div>

                {/* Right: Search and Menu */}
                <div className="flex items-center gap-4">
            {/* REQ_SCH_001_07~08 - Search */}
            <div className="relative" data-search-dropdown>
              <div className="relative flex items-center">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-lg pointer-events-none">
                  search
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (!e.target.value.trim()) {
                      // Reset filter when search is cleared
                      setFilteredBookings(bookings);
                    }
                  }}
                  onFocus={() => {
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
                  placeholder="고객명 또는 휴대폰"
                  className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent min-w-[200px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors z-10 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-lg leading-none">
                    {isSearchDropdownOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
              </div>
              {isSearchDropdownOpen && searchDropdownPosition && typeof window !== 'undefined' && createPortal(
                <div 
                  className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[200] max-h-[400px] overflow-y-auto"
                  style={{
                    top: `${searchDropdownPosition.top}px`,
                    left: `${searchDropdownPosition.left}px`,
                    width: `${searchDropdownPosition.width}px`
                  }}
                  onClick={(e) => e.stopPropagation()}
                  data-search-dropdown-menu
                >
                  {/* Autocomplete results */}
                  {searchInput.trim().length > 0 && (
                  <div className="p-3 border-b border-gray-100">
                      {isSearchAutocompleteLoading ? (
                        <div className="text-xs text-gray-500 text-center py-2">검색 중...</div>
                      ) : searchAutocompleteResults.length > 0 ? (
                        <div className="space-y-1">
                          {searchAutocompleteResults.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCustomerSelect(customer);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              <div className="font-medium text-gray-900">{customer.name}</div>
                              {customer.phone && (
                                <div className="text-xs text-gray-500">{customer.phone}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 text-center py-2">검색 결과가 없습니다.</div>
                      )}
                    </div>
                  )}
                  
                  {/* Recent searches */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-700">최근 조회 고객</p>
                      {recentSearches.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecentSearches([]);
                            try {
                              localStorage.setItem('recentSearches', JSON.stringify([]));
                            } catch (err) {
                              console.error('Error clearing recent searches:', err);
                            }
                          }}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          전체 삭제
                        </button>
                      )}
                    </div>
                    {recentSearches.length === 0 ? (
                      <p className="text-xs text-gray-500">내역이 없습니다.</p>
                    ) : (
                      <div className="space-y-1">
                        {recentSearches.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 group"
                          >
                            <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                                if (item.id) {
                                  setViewingCustomerId(item.id);
                                  loadCustomerInfo(item.id);
                                } else {
                              setSearchInput(item.name);
                                  handleSearch();
                                }
                              setIsSearchDropdownOpen(false);
                                setSearchDropdownPosition(null);
                            }}
                              className="flex-1 text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <div className="font-medium text-gray-900">{item.name}</div>
                            {item.phone && (
                              <div className="text-xs text-gray-500">{item.phone}</div>
                            )}
                          </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteRecentSearch(idx, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity"
                              title="삭제"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </div>

            {/* REQ_SCH_001_09 - Menu dropdown */}
            <div className="relative" data-menu-dropdown>
              <button
                ref={menuButtonRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
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
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
                data-menu-button
              >
                MENU
                <span className="material-symbols-outlined text-lg">
                  {isMenuDropdownOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {isMenuDropdownOpen && menuDropdownPosition && typeof window !== 'undefined' && createPortal(
                <div 
                  className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[200] min-w-[200px]"
                  style={{
                    top: `${menuDropdownPosition.top}px`,
                    right: `${window.innerWidth - menuDropdownPosition.left}px`,
                    width: `${menuDropdownPosition.width}px`
                  }}
                  onClick={(e) => e.stopPropagation()}
                  data-menu-dropdown-menu
                >
                  <Link
                    href="/admin/appointments"
                    className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                    onClick={() => {
                      setIsMenuDropdownOpen(false);
                      setMenuDropdownPosition(null);
                    }}
                  >
                    예약내역
                  </Link>
                  <Link
                    href="/admin/appointments"
                    className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setIsMenuDropdownOpen(false);
                      setMenuDropdownPosition(null);
                    }}
                  >
                    대기 등록
                  </Link>
                  <Link
                    href="/admin/appointments"
                    className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setIsMenuDropdownOpen(false);
                      setMenuDropdownPosition(null);
                    }}
                  >
                    예약대기내역
                  </Link>
                  <Link
                    href="/admin/appointments"
                    className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setIsMenuDropdownOpen(false);
                      setMenuDropdownPosition(null);
                    }}
                  >
                    예약금 내역
                  </Link>
                  <Link
                    href="/admin/appointments"
                    className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setIsMenuDropdownOpen(false);
                      setMenuDropdownPosition(null);
                    }}
                  >
                    휴일 및 특근 현황
                  </Link>
                  <Link
                    href="/admin/settings"
                    className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 last:rounded-b-lg transition-colors"
                    onClick={() => {
                      setIsMenuDropdownOpen(false);
                      setMenuDropdownPosition(null);
                    }}
                  >
                    설정
                  </Link>
                </div>,
                document.body
              )}
            </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-gray-50/50">
          <div className="max-w-full mx-auto flex flex-col gap-6 h-full">


            <div className={`grid grid-cols-1 ${isLeftPanelVisible ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-6 flex-1 min-h-0`}>
              {/* Left: Large Calendar */}
              {isLeftPanelVisible && (
              <div className="lg:col-span-3 flex flex-col gap-6 min-h-0">
                <div className="bg-white border border-gray-200 rounded-xl p-6 shrink-0">
                  <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => {
                        const date = new Date(selectedDate);
                        date.setMonth(date.getMonth() - 1);
                        setSelectedDate(date.toISOString().split('T')[0]);
                  }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                      <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                    <span className="text-lg font-semibold text-gray-800">{monthLabel}</span>
                      <button
                        type="button"
                      onClick={() => {
                        const date = new Date(selectedDate);
                        date.setMonth(date.getMonth() + 1);
                        setSelectedDate(date.toISOString().split('T')[0]);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                      </button>
                          </div>
                  {/* Comment: Always show booking count - toggle removed */}
                  <div className="grid grid-cols-7 gap-2 text-sm text-gray-500 mb-2 font-medium">
                    {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                              <span key={d} className="text-center">
                                {d}
                              </span>
                            ))}
                          </div>
                  <div className="grid grid-cols-7 gap-2">
                            {(() => {
                              const [year, month] = monthKey.split('-').map((v) => Number(v));
                              const daysInMonth = new Date(year, month, 0).getDate();
                              const firstDay = new Date(`${monthKey}-01`).getDay();
                              const cells: (number | null)[] = [
                                ...Array(firstDay).fill(null),
                                ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
                              ];
                              return cells.map((day, idx) => {
                                if (!day) {
                          return <div key={idx} className="h-12" />;
                                }
                                const isSelected = day === selectedDayNumber;
                                const hasBookings = !!dayCounts[day];
                                const bookingCount = dayCounts[day] || 0;
                        const cellDate = buildDateFromDay(selectedDate, day);
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                              setSelectedDate(cellDate);
                                    }}
                            className={`h-12 w-full rounded-lg flex flex-col items-center justify-center text-sm transition-all font-medium
                                      ${
                                        isSelected
                                          ? 'bg-black text-white shadow-md'
                                          : 'bg-white text-gray-800 hover:bg-gray-100 border border-transparent hover:border-gray-200'
                                      }`}
                                  >
                                    <span>{day}</span>
                                    {hasBookings && (
                                      showBookingCount ? (
                                        <span className={`mt-0.5 text-[10px] font-bold ${isSelected ? 'text-white' : 'text-emerald-600'}`}>
                                          {bookingCount}
                                        </span>
                                      ) : (
                                        <span className="mt-1 h-1 w-4 rounded-full bg-emerald-500" />
                                      )
                                    )}
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>

                {/* Memo below calendar */}
                <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden min-h-0">
                  <div className="p-5 border-b border-gray-100 shrink-0 flex items-center justify-between">
                    <h3 className="font-bold text-black">전달사항 (Memo)</h3>
                    <button
                      type="button"
                      onClick={async () => {
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
                      disabled={memoSaving || memoLoading}
                      className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {memoSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>저장 중...</span>
                        </>
                      ) : (
                        '저장하기'
                      )}
                    </button>
                  </div>
                  <div className="flex-1 p-5 min-h-0 flex flex-col">
                    {memoLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <textarea
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="전달사항을 입력하세요..."
                        className="w-full h-full p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-300 text-sm"
                      />
                    )}
                  </div>
                </div>
              </div>
              )}

              {/* Center: Full Schedule */}
              <div className={`${isLeftPanelVisible ? 'lg:col-span-9' : 'lg:col-span-12'} flex flex-col gap-4 min-h-0`}>
                {/* Week view designer name banner */}
                {isWeekViewMode && weekViewDesignerId && weekViewDesignerName && (
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between shadow-sm">
                    <span className="text-sm font-bold text-gray-900">{weekViewDesignerName}</span>
                    <button
                      onClick={() => {
                        setIsWeekViewMode(false);
                        setWeekViewDesignerId(null);
                        setWeekViewDesignerName('');
                        setWeekViewBookings([]);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      일반 보기
                    </button>
                  </div>
                )}
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
                    {!isWeekViewMode ? (
                      <div 
                        className="sticky top-0 bg-[#f8f9fc] shadow-sm" 
                                style={{
                          position: 'sticky', 
                                  top: 0,
                          zIndex: 100,
                          width: 'max-content',
                          minWidth: '100%'
                        }}
                      >
                        {/* First row: Time header + Date headers */}
                        <div className="flex border-b border-[#e2e8f0]">
                          {/* Time column header - sticky left */}
                          <div 
                            className="w-20 shrink-0 border-r border-[#e2e8f0] bg-[#f8f9fc] flex flex-col items-center justify-center p-2"
                            style={{ 
                              position: 'sticky', 
                              left: 0,
                              zIndex: 50,
                              backgroundColor: '#f8f9fc',
                              boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            <span className="text-xs font-medium text-gray-600">시간</span>
                          </div>
                          {/* Week date headers */}
                          {weekDates.map((dateStr, dateIndex) => {
                            const date = new Date(dateStr);
                            const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const designerColumnWidth = visibleDesigners.length * 150; // Each designer column is min 150px
                            return (
                              <div key={dateStr} className="border-r border-[#e2e8f0] bg-[#f8f9fc] shrink-0" style={{ width: `${designerColumnWidth}px` }}>
                                <div className="px-2 py-2 text-center border-b border-[#e2e8f0] flex items-center justify-center" style={{ minHeight: '40px' }}>
                                  <p className="text-xs font-bold text-[#0d121b]">{month}-{day} ({dayName})</p>
                                </div>
                                {/* Designer headers for this date - hide when filtering by specific designer */}
                                {selectedDesignerFilter === '전체' && (
                                <div className="grid" style={{ gridTemplateColumns: `repeat(${visibleDesigners.length}, 150px)` }}>
                                  {visibleDesigners.map((name, designerIndex) => {
                            const designer = allDesigners.find((d) => d.name === name);
                            const designerId = designer?.id;
                          return (
                            <div
                                        key={`${dateStr}-${name}`}
                                        className="relative px-2 py-2 bg-white/50 backdrop-blur-sm border-r border-[#e2e8f0] last:border-r-0 flex items-center justify-center"
                                        style={{ minHeight: '40px' }}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDesignerDropdown(openDesignerDropdown === designerId ? null : designerId || null);
                                  }}
                                  className="w-full text-center hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                  <p className="text-xs font-bold text-[#0d121b] truncate">{name}</p>
                                </button>
                              </div>
                                    );
                                  })}
                                </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                    <div 
                      className="sticky top-0 flex border-b border-[#e2e8f0] bg-[#f8f9fc] shadow-sm"
                      style={{ position: 'sticky', top: 0, zIndex: 100 }}
                    >
                      {/* Time column header */}
                      <div className="w-20 shrink-0 border-r border-[#e2e8f0] bg-[#f8f9fc] flex flex-col items-center justify-center p-2">
                        <span className="text-xs font-medium text-gray-600">시간</span>
                      </div>
                      {isWeekViewMode && weekViewDesignerId ? (
                        // Comment: Week view header - 7 days
                        <div className="grid flex-1 relative" style={{ gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))' }}>
                          {/* Vertical column dividers for week view header */}
                          {Array.from({ length: 7 }).map((_, colIndex) => {
                            const columnWidth = 100 / 7;
                            return (
                              <div
                                key={`week-header-divider-${colIndex}`}
                                className="absolute border-r border-[#e2e8f0] pointer-events-none z-0"
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
                          {Array.from({ length: 7 }).map((_, dayIndex) => {
                            const currentDate = new Date(weekViewStartDate);
                            currentDate.setDate(currentDate.getDate() + dayIndex);
                            const dateStr = currentDate.toISOString().split('T')[0];
                            const dayName = ['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()];
                            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                            const day = String(currentDate.getDate()).padStart(2, '0');
                            return (
                              <div
                                key={dayIndex}
                                className="relative px-2 py-2 bg-white/50 backdrop-blur-sm z-10"
                              >
                                <div className="text-center">
                                  <p className="text-xs font-bold text-[#0d121b]">{dayName}</p>
                                  <p className="text-[10px] text-[#64748b]">{month}-{day}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                              </div>
                    )}

                    {/* Grid Body */}
                    <div
                      className="flex relative"
                      style={{ 
                        minHeight: `${(GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16}px`,
                        width: 'max-content',
                        minWidth: '100%'
                      }}
                      onClick={() => setFocusedBookingId(null)}
                    >

                      {/* Current Time Line (Sydney time, only when viewing today) */}
                      {currentSydneyTime && (
                        <div
                          className="absolute w-full border-t-2 border-[#135bec] z-10 pointer-events-none flex items-center"
                          style={{ top: currentSydneyTime.top + 8 }} // Add padding offset
                        >
                          <div className="absolute left-0 -translate-y-1/2 bg-[#135bec] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-r-md">
                            {currentSydneyTime.label}
                          </div>
                          <div className="size-2 rounded-full bg-[#135bec] -ml-1" />
                        </div>
                      )}

                      {/* Time Column - 30 minute intervals with padding - sticky left */}
                      {!isWeekViewMode ? (
                        <div 
                          className="w-20 shrink-0 border-r border-[#e2e8f0] bg-white text-xs font-medium text-[#94a3b8] flex flex-col" 
                          style={{ 
                            position: 'sticky', 
                            left: 0,
                            zIndex: 50,
                            backgroundColor: 'white',
                            boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                            minHeight: `${(GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16}px` 
                          }}
                        >
                          <div className="pt-2 pb-2">
                            {Array.from({ length: (GRID_END_HOUR - GRID_START_HOUR) * 2 }).map((_, i) => {
                              const totalMinutes = GRID_START_HOUR * 60 + i * 30;
                              const hour = Math.floor(totalMinutes / 60);
                              const minutes = totalMinutes % 60;
                              const isFullHour = minutes === 0;
                              const label = isFullHour
                                ? `${hour.toString().padStart(2, '0')}:00 ${hour >= 12 ? '오후' : '오전'}`
                                : '';
                            return (
                              <div
                                  key={i}
                                  className="h-[40px] border-b border-[#f1f5f9] p-1 text-right relative"
                              >
                                  {isFullHour && (
                                    <span className="absolute -top-1 right-1 bg-white px-0.5 text-[10px]">{label}</span>
                                  )}
                                  {!isFullHour && (
                                    <span className="absolute top-1/2 -translate-y-1/2 right-1 text-[8px] text-gray-400">30</span>
                                  )}
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      ) : (
                      <div className="w-20 shrink-0 border-r border-[#e2e8f0] bg-white text-xs font-medium text-[#94a3b8] flex flex-col" style={{ minHeight: `${(GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16}px` }}>
                        <div className="pt-2 pb-2">
                          {Array.from({ length: (GRID_END_HOUR - GRID_START_HOUR) * 2 }).map((_, i) => {
                            const totalMinutes = GRID_START_HOUR * 60 + i * 30;
                            const hour = Math.floor(totalMinutes / 60);
                            const minutes = totalMinutes % 60;
                            const isFullHour = minutes === 0;
                            const label = isFullHour
                              ? `${hour.toString().padStart(2, '0')}:00 ${hour >= 12 ? '오후' : '오전'}`
                              : '';
                          return (
                            <div
                                key={i}
                                className="h-[40px] border-b border-[#f1f5f9] p-1 text-right relative"
                            >
                                {isFullHour && (
                                  <span className="absolute -top-1 right-1 bg-white px-0.5 text-[10px]">{label}</span>
                                )}
                                {!isFullHour && (
                                  <span className="absolute top-1/2 -translate-y-1/2 right-1 text-[8px] text-gray-400">30</span>
                                )}
                            </div>
                          );
                        })}
                        </div>
                      </div>
                      )}

                      {/* Appointment Columns - Week view or normal view */}
                      {isWeekViewMode && weekViewDesignerId ? (
                        // Comment: Week view - 7 days columns
                        <div className="grid flex-1 bg-white relative" style={{ gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))' }}>
                          {/* Vertical column dividers for week view - positioned to extend full scrollable height */}
                          {/* Note: These dividers are rendered at lines 1166-1179. They use absolute positioning with calculated height. */}
                          {Array.from({ length: 7 }).map((_, colIndex) => {
                            const columnWidth = 100 / 7;
                            // Comment: Calculate total height based on time slots to match grid body height
                            // This ensures dividers extend to the full height of the scrollable content
                            const totalHeight = (GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16; // Add padding
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
                            const dayBookings = weekViewBookings.filter(
                              (b) => b.booking_date === dateStr
                            );
                            
                            // Comment: Get restrictions for this designer on this date
                            const dayRestrictions = bookingRestrictions.filter(
                              (r) => r.designer_id === weekViewDesignerId && r.restriction_date === dateStr
                            );
                            
                            const color = DESIGNER_COLORS[0]; // Use first color for week view

                          return (
                            <div
                                key={dayIndex}
                                className="relative h-full"
                              >
                                {/* Comment: Render restriction blocks (greyout) */}
                                {dayRestrictions.map((restriction) => {
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
                                          console.log('Restriction cell clicked (week view):', { dateStr, weekViewDesignerId, slotTime, restriction });
                                          // 예약금지 셀 클릭 시 드롭다운 메뉴 표시
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const cellElement = e.currentTarget.closest('[class*="relative h-full"]') as HTMLElement;
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
                                            scrollLeft
                                          });
                                          setEmptySlotMenuOpen({ 
                                            date: dateStr, 
                                            designerId: weekViewDesignerId, 
                                            time: slotTime 
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
                                  const slotTime = `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`;
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
                                  const slotRestriction = dayRestrictions.find((r) => {
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
                                  const isHovered = hoveredEmptySlot?.date === dateStr && 
                                                    hoveredEmptySlot?.designerId === weekViewDesignerId && 
                                                    hoveredEmptySlot?.time === slotTime;
                                  const isMenuOpen = emptySlotMenuOpen?.date === dateStr && 
                                                     emptySlotMenuOpen?.designerId === weekViewDesignerId && 
                                                     emptySlotMenuOpen?.time === slotTime;
                                  
                                  // Debug log
                                  if (isMenuOpen) {
                                    console.log('Menu should be open (week view):', { dateStr, weekViewDesignerId, slotTime, emptySlotMenuOpen });
                                  }
                                  
                                  return (
                                    <div
                                      key={slotKey}
                                      className="absolute left-0 right-0 z-0"
                                      style={{ 
                                        top: slotTop, 
                                        height: slotHeight,
                                        pointerEvents: (emptySlotMenuOpen && !isMenuOpen) || (isRestricted && slotRestriction) ? 'none' : undefined
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
                                      onMouseLeave={(e) => {
                                      // 메뉴가 열려있으면 다른 셀로 이동해도 hoveredEmptySlot을 변경하지 않음
                                      if (isMenuOpen) {
                                          return;
                                        }
                                      // 메뉴가 열려있지 않을 때만 hoveredEmptySlot을 null로 설정
                                          setHoveredEmptySlot(null);
                                      }}
                                    >
                                      {isHovered && (
                                        <div className="h-full w-full relative group" style={{ zIndex: isMenuOpen ? 10000 : undefined }}>
                                          <div 
                                            className={`h-full w-full ${isRestricted ? 'bg-gray-500/30' : 'bg-blue-50/30'} border ${isRestricted ? 'border-gray-400' : 'border-blue-200'} border-dashed rounded cursor-pointer transition-colors flex items-center justify-between px-2`}
                                            onClick={(e) => {
                                              // more 버튼 클릭은 무시
                                              const target = e.target as HTMLElement;
                                              if (target.closest('button[type="button"]') || target.closest('[data-empty-slot-menu]') || target.closest('.empty-slot-more-button')) {
                                                return;
                                              }
                                              e.stopPropagation();
                                              // 빈 셀 클릭: 즉시 예약 등록 모달 오픈 (예약 금지 셀이 아닐 때만)
                                              if (!isRestricted && weekViewDesignerId) {
                                                setNewBookingDate(dateStr);
                                                const timeStr = `${slotHour >= 12 ? slotHour - 12 : slotHour}:${String(slotMin).padStart(2, '0')} ${slotHour >= 12 ? 'PM' : 'AM'}`;
                                                setNewBookingTimeSlots([{ designerId: weekViewDesignerId, time: timeStr, duration: 30, serviceTab: 'service', serviceId: null }]);
                                                setIsNewBookingOpen(true);
                                              }
                                            }}
                                          >
                                            <span className="text-xs font-medium text-gray-900">
                                              {slotTime} {slotHour >= 12 ? '오후' : '오전'}
                                            </span>
                                            <span className="material-symbols-outlined text-sm text-gray-600">drag_handle</span>
                                          </div>
                                          <div 
                                            className="absolute right-1 top-1/2 -translate-y-1/2 z-[9999] empty-slot-more-button"
                                            style={{ pointerEvents: 'auto' }}
                                          >
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                const menuData = { date: dateStr, designerId: weekViewDesignerId, time: slotTime };
                                                console.log('Setting emptySlotMenuOpen (week view):', menuData);
                                                // 현재 메뉴가 이미 열려있으면 닫고, 아니면 열기
                                                if (isMenuOpen) {
                                                  setEmptySlotMenuOpen(null);
                                                  setEmptySlotMenuPosition(null);
                                                } else {
                                                  // 버튼 위치 계산
                                                  const rect = e.currentTarget.getBoundingClientRect();
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
                                                  const scrollTop = scrollContainer?.scrollTop || 0;
                                                  const scrollLeft = scrollContainer?.scrollLeft || 0;
                                                  
                                                  // 뷰포트 기준 위치 저장 (메뉴 렌더링 시 상대 위치로 변환됨)
                                                  setEmptySlotMenuPosition({
                                                    top: rect.bottom,
                                                    left: menuLeft,
                                                    width: menuWidth,
                                                    scrollTop,
                                                    scrollLeft
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
                                            
                                            {/* Empty slot context menu - Portal로 렌더링 */}
                                            {isMenuOpen && !isNewBookingOpen && emptySlotMenuPosition && typeof window !== 'undefined' && (() => {
                                              const scrollContainer = document.getElementById('schedule-scroll-container');
                                              if (!scrollContainer) return null;
                                              
                                              // 스크롤 컨테이너 내부의 상대 위치 계산
                                              const containerRect = scrollContainer.getBoundingClientRect();
                                              const scrollTop = scrollContainer.scrollTop;
                                              const scrollLeft = scrollContainer.scrollLeft;
                                              
                                              // 셀의 절대 위치를 스크롤 컨테이너 기준 상대 위치로 변환
                                              const relativeTop = emptySlotMenuPosition.top - containerRect.top + scrollTop;
                                              const relativeLeft = emptySlotMenuPosition.left - containerRect.left + scrollLeft;
                                              
                                              // 원래 위치 저장 (한 번만)
                                              if (!menuOriginalPositionRef.current) {
                                                menuOriginalPositionRef.current = {
                                                  top: relativeTop,
                                                  left: relativeLeft,
                                                  width: emptySlotMenuPosition.width
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
                                                    width: `${emptySlotMenuPosition.width}px`
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
                                                  const relatedTarget = e.relatedTarget as HTMLElement;
                                                  // 버튼이나 메뉴 내부로 이동하는 경우는 무시
                                                  if (relatedTarget?.closest('.empty-slot-more-button') || 
                                                      relatedTarget?.closest('[data-empty-slot-menu]')) {
                                                    return;
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
                                                        const res = await fetch(`/api/booking-restrictions?id=${slotRestriction.id}`, {
                                                          method: 'DELETE',
                                                        });
                                                        if (res.ok) {
                                                          // 예약 금지 목록 새로고침
                                                          const startDate = new Date(weekViewStartDate);
                                                          const endDate = new Date(startDate);
                                                          endDate.setDate(endDate.getDate() + 6);
                                                          const startDateStr = startDate.toISOString().split('T')[0];
                                                          const endDateStr = endDate.toISOString().split('T')[0];
                                                          
                                                          const restrictionsRes = await fetch(
                                                            `/api/booking-restrictions?designer_id=${weekViewDesignerId}&start_date=${startDateStr}&end_date=${endDateStr}`
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
                                                      setRestrictionDesignerId(weekViewDesignerId);
                                                      setRestrictionDesignerName(weekViewDesignerName);
                                                      setRestrictionDate(dateStr);
                                                      setRestrictionType(slotRestriction.restriction_type || 'time');
                                                      if (slotRestriction.restriction_type === 'time') {
                                                        setRestrictionStartTime(slotRestriction.start_time?.substring(0, 5) || slotTime);
                                                        setRestrictionEndTime(slotRestriction.end_time?.substring(0, 5) || '');
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
                                                  const timeStr = `${slotHour >= 12 ? slotHour - 12 : slotHour}:${String(slotMin).padStart(2, '0')} ${slotHour >= 12 ? 'PM' : 'AM'}`;
                                                  setNewBookingTimeSlots([{ designerId: weekViewDesignerId, time: timeStr, duration: 30, serviceTab: 'service', serviceId: null }]);
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
                                                  const timeStr = `${slotHour >= 12 ? slotHour - 12 : slotHour}:${String(slotMin).padStart(2, '0')} ${slotHour >= 12 ? 'PM' : 'AM'}`;
                                                  setNewBookingTimeSlots([{ designerId: weekViewDesignerId, time: timeStr, duration: 30, serviceTab: 'service', serviceId: null }]);
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
                                                      const endTimeStr = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
                                                      
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
                                                          const startDateStr = startDate.toISOString().split('T')[0];
                                                          const endDateStr = endDate.toISOString().split('T')[0];
                                                          
                                                          const restrictionsRes = await fetch(
                                                            `/api/booking-restrictions?designer_id=${weekViewDesignerId}&start_date=${startDateStr}&end_date=${endDateStr}`
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
                                              </div>,
                                              (() => {
                                                const scrollContainer = document.getElementById('schedule-scroll-container');
                                                return scrollContainer || document.body;
                                              })()
                                              )
                                            })()}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                
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
                                const amount =
                                  (b.total_amount ?? 0) > 0
                                    ? `AU$${Number(b.total_amount).toFixed(0)}`
                                    : 'Free';
                                
                                // Comment: Get booking status color
                                const statusColor = getBookingStatusColor((b as any).status || (b as any).booking_status);
                                const customerName = (b as any).customer?.name || (b as any).customer_name || '고객';
                                const customerId = (b as any).customer?.id || (b as any).customer_id || b.id;
                                const customerPhone = (b as any).customer?.phone || (b as any).customer_phone || '';
                                const bookingMemo = (b as any).memo || (b as any).note || '';

                                return (
                                  <div
                                    key={b.id}
                                    className="absolute left-1 right-1"
                                    style={{ top, height, zIndex: 1 }}
                                    onMouseEnter={() => setHoveredBooking(b.id || null)}
                                    onMouseLeave={() => setHoveredBooking(null)}
                                  >
                                    <div
                                      className={`h-full w-full ${statusColor.bg} border-l-4 ${statusColor.border} rounded transition-all cursor-pointer p-2 flex flex-col justify-between overflow-hidden relative`}
                                      style={{ zIndex: 1 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (b.id) {
                                          setBookingMenuOpen(bookingMenuOpen === b.id ? null : b.id);
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
                                        <span className={`text-[10px] font-bold ${statusColor.text} bg-white/50 px-1.5 py-0.5 rounded`}>
                                          {customerId}
                                        </span>
                                      </div>
                                      
                                      {/* Hover Card - 상태별 스펙에 맞게 표시 */}
                                      {hoveredBooking === b.id && !isNewBookingOpen && (
                                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[280px] p-3">
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
                                            {/* phone - PAID, BOOKED만 표시 */}
                                            {(statusColor.statusEnum === 'PAID' || statusColor.statusEnum === 'BOOKED') && customerPhone && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-gray-500 w-16 shrink-0">전화번호</span>
                                                <span className="text-gray-900">{customerPhone}</span>
                                              </div>
                                            )}
                                            {/* serviceName - ARRIVED, PAID, BOOKED만 표시 */}
                                            {(statusColor.statusEnum === 'ARRIVED' || statusColor.statusEnum === 'PAID' || statusColor.statusEnum === 'BOOKED') && serviceName && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-gray-500 w-16 shrink-0">시술명</span>
                                                <span className="text-gray-900">{serviceName}</span>
                                              </div>
                                            )}
                                            {/* memo - ARRIVED, BOOKED, NOSHOW만 표시 (optional) */}
                                            {(statusColor.statusEnum === 'ARRIVED' || statusColor.statusEnum === 'BOOKED' || statusColor.statusEnum === 'NOSHOW') && bookingMemo && (
                                              <>
                                                <div className="border-t border-gray-200 my-1.5"></div>
                                                <div className="text-gray-700">{bookingMemo}</div>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Context Menu - 상태별 스펙에 맞게 표시 */}
                                      {bookingMenuOpen === b.id && !isNewBookingOpen && (
                                        <div data-booking-menu className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                                          {statusColor.statusEnum === 'ARRIVED' && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setBookingMenuOpen(null);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                                              >
                                                판매 등록
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setIsNewBookingOpen(true);
                                                  setBookingMenuOpen(null);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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
                                                  setBookingMenuOpen(null);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                              >
                                                예약 이동
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setViewingBookingDetail(b);
                                                  setBookingMenuOpen(null);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                              >
                                                고객 정보
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setBookingMenuOpen(null);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg flex items-center gap-2"
                                              >
                                                <span className="material-symbols-outlined text-sm">check</span>
                                                고객 입장
                                              </button>
                                            </>
                                          )}
                                          {statusColor.statusEnum === 'PAID' && (
                                            <>
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
                                            </>
                                          )}
                                          {statusColor.statusEnum === 'BOOKED' && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setBookingMenuOpen(null);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                                              >
                                                판매 등록
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setIsNewBookingOpen(true);
                                                  setBookingMenuOpen(null);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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
                                                  setBookingMenuOpen(null);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                              >
                                                예약 이동
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setBookingMenuOpen(null);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                              >
                                                예약 취소
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setViewingBookingDetail(b);
                                                  setBookingMenuOpen(null);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                              >
                                                고객 정보
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setBookingMenuOpen(null);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                              >
                                                고객 입장
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setBookingMenuOpen(null);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                                              >
                                                노쇼
                                              </button>
                                            </>
                                          )}
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
                                      className={`relative h-full border-r border-[#e2e8f0] last:border-r-0 ${!hasBookingsOnDate ? 'bg-gray-100/50' : ''}`}
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
                                        const cellElement = e.currentTarget.closest('[class*="relative h-full"]') as HTMLElement;
                                        const cellRect = cellElement?.getBoundingClientRect();
                                        const menuWidth = cellRect ? cellRect.width : 180;
                                        // 메뉴를 셀의 왼쪽에 맞춤
                                        const menuLeft = cellRect ? cellRect.left : rect.left;
                                        
                                        // 스크롤 컨테이너의 스크롤 위치와 뷰포트 위치 가져오기
                                        const scrollContainer = document.getElementById('schedule-scroll-container');
                                        const scrollTop = scrollContainer?.scrollTop || 0;
                                        const scrollLeft = scrollContainer?.scrollLeft || 0;
                                        const containerRect = scrollContainer?.getBoundingClientRect();
                                        
                                        // 메뉴 위치는 뷰포트 기준으로 계산 (fixed positioning)
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
                                
                                return (
                                  <div
                                    key={slotKey}
                                    className="absolute left-0 right-0 z-0"
                                    style={{ 
                                      top: slotTop, 
                                      height: slotHeight,
                                      pointerEvents: (emptySlotMenuOpen && !isMenuOpen) || (isRestricted && slotRestriction) ? 'none' : undefined
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
                                      <div className="h-full w-full relative group" style={{ zIndex: isMenuOpen ? 10000 : undefined }}>
                                        <div 
                                          className="h-full w-full bg-blue-50/30 border border-blue-200 border-dashed rounded cursor-pointer transition-colors flex items-center justify-between px-2"
                                          onClick={(e) => {
                                            // more 버튼 클릭은 무시
                                            const target = e.target as HTMLElement;
                                            if (target.closest('button[type="button"]') || target.closest('[data-empty-slot-menu]') || target.closest('.empty-slot-more-button')) {
                                              return;
                                            }
                                            e.stopPropagation();
                                            // 빈 셀 클릭: 즉시 예약 등록 모달 오픈
                                            if (!isRestricted && designerId) {
                                              setNewBookingDate(dateStr);
                                              const timeStr = `${slotHour >= 12 ? slotHour - 12 : slotHour}:${String(slotMin).padStart(2, '0')} ${slotHour >= 12 ? 'PM' : 'AM'}`;
                                              setNewBookingTimeSlots([{ designerId: designerId, time: timeStr, duration: 30, serviceTab: 'service', serviceId: null }]);
                                              setIsNewBookingOpen(true);
                                            }
                                          }}
                                        >
                                          <span className="text-xs font-medium text-gray-900">
                                            {slotTime} {slotHour >= 12 ? '오후' : '오전'}
                                          </span>
                                          <span className="material-symbols-outlined text-sm text-gray-600">drag_handle</span>
                                        </div>
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
                                                const scrollTop = scrollContainer?.scrollTop || 0;
                                                const scrollLeft = scrollContainer?.scrollLeft || 0;
                                                
                                                setEmptySlotMenuPosition({
                                                  top: rect.bottom + scrollTop,
                                                  left: menuLeft + scrollLeft,
                                                  width: menuWidth,
                                                  scrollTop,
                                                  scrollLeft
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
                                            const scrollTop = scrollContainer.scrollTop;
                                            const scrollLeft = scrollContainer.scrollLeft;
                                            
                                            // 셀의 절대 위치를 스크롤 컨테이너 기준 상대 위치로 변환
                                            const relativeTop = emptySlotMenuPosition.top - containerRect.top + scrollTop;
                                            const relativeLeft = emptySlotMenuPosition.left - containerRect.left + scrollLeft;
                                            
                                            // 원래 위치 저장 (한 번만)
                                            if (!menuOriginalPositionRef.current) {
                                              menuOriginalPositionRef.current = {
                                                top: relativeTop,
                                                left: relativeLeft,
                                                width: emptySlotMenuPosition.width
                                              };
                                            }
                                            
                                            return createPortal(
                                            <div 
                                              data-empty-slot-menu 
                                                className="absolute bg-white border border-gray-200 rounded-lg shadow-lg z-[99999]"
                                                style={{ 
                                                  pointerEvents: 'auto',
                                                  top: `${menuOriginalPositionRef.current?.top || relativeTop}px`,
                                                  left: `${menuOriginalPositionRef.current?.left || relativeLeft}px`,
                                                  width: `${emptySlotMenuPosition.width}px`
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
                                                const relatedTarget = e.relatedTarget as HTMLElement;
                                                // 버튼이나 메뉴 내부로 이동하는 경우는 무시
                                                if (relatedTarget?.closest('.empty-slot-more-button') || 
                                                    relatedTarget?.closest('[data-empty-slot-menu]')) {
                                                  return;
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
                                            , (() => {
                                              const scrollContainer = document.getElementById('schedule-scroll-container');
                                              return scrollContainer || document.body;
                                            })());
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
                                const scrollTop = scrollContainer.scrollTop;
                                const scrollLeft = scrollContainer.scrollLeft;
                                
                                // 셀의 절대 위치를 스크롤 컨테이너 기준 상대 위치로 변환
                                const relativeTop = emptySlotMenuPosition.top - containerRect.top + scrollTop;
                                const relativeLeft = emptySlotMenuPosition.left - containerRect.left + scrollLeft;
                                
                                return createPortal(
                                  <div 
                                    data-empty-slot-menu 
                                    className="absolute bg-white border border-gray-200 rounded-lg shadow-lg z-[99999]"
                                    style={{ 
                                      pointerEvents: 'auto',
                                      top: `${relativeTop}px`,
                                      left: `${relativeLeft}px`,
                                      width: `${emptySlotMenuPosition.width}px`
                                    }}
                                    onMouseEnter={() => {
                                      if (menuCloseTimeoutRef.current) {
                                        clearTimeout(menuCloseTimeoutRef.current);
                                        menuCloseTimeoutRef.current = null;
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      const relatedTarget = e.relatedTarget as HTMLElement;
                                      if (relatedTarget?.closest('.empty-slot-more-button') || 
                                          relatedTarget?.closest('[data-empty-slot-menu]')) {
                                        return;
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
                              
                              {designerBookings.map((b) => {
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
                                // Comment: Calculate position based on 30-minute intervals (40px each) with padding
                                const top = (startMinutes / 30) * GRID_30MIN_HEIGHT + 8; // Add padding offset
                                const height = Math.max((durationMinutes / 30) * GRID_30MIN_HEIGHT, 40);

                        const serviceName = b.service?.name || 'Service';
                                const timeLabel = `${hourStr.padStart(2, '0')}:${minuteStr}`;
                        const amount =
                          (b.total_amount ?? 0) > 0
                            ? `AU$${Number(b.total_amount).toFixed(0)}`
                            : 'Free';
                        
                        // Comment: Get booking status color
                        const statusColor = getBookingStatusColor((b as any).status || (b as any).booking_status);
                        const customerName = (b as any).customer?.name || (b as any).customer_name || '고객';
                        const customerId = (b as any).customer?.id || (b as any).customer_id || b.id;
                        const customerPhone = (b as any).customer?.phone || (b as any).customer_phone || '';
                        const bookingMemo = (b as any).memo || (b as any).note || '';

                        return (
                          <div
                            key={b.id}
                                    className="absolute left-1 right-1"
                                    style={{ top, height, zIndex: emptySlotMenuOpen ? 0 : 1 }}
                                    onMouseEnter={() => setHoveredBooking(b.id || null)}
                                    onMouseLeave={() => setHoveredBooking(null)}
                                  >
                                    <div
                                      className={`h-full w-full ${statusColor.bg} border-l-4 ${statusColor.border} rounded transition-all cursor-pointer p-2 flex flex-col justify-between overflow-hidden relative`}
                                      style={{ zIndex: emptySlotMenuOpen ? 0 : 1 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (b.id) {
                                          setBookingMenuOpen(bookingMenuOpen === b.id ? null : b.id);
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
                                        <span className={`text-[10px] font-bold ${statusColor.text} bg-white/50 px-1.5 py-0.5 rounded`}>
                                        {customerId}
                                      </span>
                                  </div>
                                  
                                  {/* Hover Card - 상태별 스펙에 맞게 표시 */}
                                  {hoveredBooking === b.id && !isNewBookingOpen && (
                                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[280px] p-3">
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
                                        {/* phone - PAID, BOOKED만 표시 */}
                                        {(statusColor.statusEnum === 'PAID' || statusColor.statusEnum === 'BOOKED') && customerPhone && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-500 w-16 shrink-0">전화번호</span>
                                            <span className="text-gray-900">{customerPhone}</span>
                                          </div>
                                        )}
                                        {/* serviceName - ARRIVED, PAID, BOOKED만 표시 */}
                                        {(statusColor.statusEnum === 'ARRIVED' || statusColor.statusEnum === 'PAID' || statusColor.statusEnum === 'BOOKED') && serviceName && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-500 w-16 shrink-0">시술명</span>
                                            <span className="text-gray-900">{serviceName}</span>
                                          </div>
                                        )}
                                        {/* memo - ARRIVED, BOOKED, NOSHOW만 표시 (optional) */}
                                        {(statusColor.statusEnum === 'ARRIVED' || statusColor.statusEnum === 'BOOKED' || statusColor.statusEnum === 'NOSHOW') && bookingMemo && (
                                          <>
                                            <div className="border-t border-gray-200 my-1.5"></div>
                                            <div className="text-gray-700">{bookingMemo}</div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Context Menu - 상태별 스펙에 맞게 표시 */}
                                  {bookingMenuOpen === b.id && !isNewBookingOpen && (
                                    <div data-booking-menu className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                                      {statusColor.statusEnum === 'ARRIVED' && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // TODO: 판매 등록
                                              setBookingMenuOpen(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                                          >
                                            판매 등록
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setIsNewBookingOpen(true);
                                              setBookingMenuOpen(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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
                                              // TODO: 예약 이동
                                              setBookingMenuOpen(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                          >
                                            예약 이동
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setViewingBookingDetail(b);
                                              setBookingMenuOpen(null);
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
                                              setBookingMenuOpen(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg flex items-center gap-2"
                                          >
                                            <span className="material-symbols-outlined text-sm">check</span>
                                            고객 입장
                                          </button>
                                        </>
                                      )}
                                      {statusColor.label === '계산완료' && (
                                        <>
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
                                              // TODO: 판매 상세
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
                                        </>
                                      )}
                                      {statusColor.statusEnum === 'BOOKED' && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // TODO: 판매 등록
                                              setBookingMenuOpen(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                                          >
                                            판매 등록
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setIsNewBookingOpen(true);
                                              setBookingMenuOpen(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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
                                              // TODO: 예약 이동
                                              setBookingMenuOpen(null);
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
                                              setBookingMenuOpen(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                          >
                                            예약 취소
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setViewingBookingDetail(b);
                                              setBookingMenuOpen(null);
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
                                              setBookingMenuOpen(null);
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
                                              setBookingMenuOpen(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                                          >
                                            노쇼
                                          </button>
                                        </>
                                          )}
                                          {statusColor.statusEnum === 'NOSHOW' && (
                                            <>
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
                                                  setViewingBookingDetail(b);
                                                  setBookingMenuOpen(null);
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
                                                  setBookingMenuOpen(null);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg flex items-center gap-2"
                                              >
                                                <span className="material-symbols-outlined text-sm">check</span>
                                                노쇼
                                              </button>
                                            </>
                                          )}
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
      {isNewBookingOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">예약 등록</h2>
            <button
              type="button"
              onClick={() => setIsNewBookingOpen(false)}
                className="text-gray-400 hover:text-black transition-colors"
            >
                <span className="material-symbols-outlined">close</span>
            </button>
            </div>
            <div className="p-6">
            
            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column: Customer Information */}
              <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="고객명 또는 휴대폰"
                    value={newBookingCustomerSearch}
                    onChange={(e) => setNewBookingCustomerSearch(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                    search
                  </span>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={newBookingIncludeOtherShops}
                    onChange={(e) => setNewBookingIncludeOtherShops(e.target.checked)}
                    className="w-4 h-4"
                  />
                  타 지점 포함
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomerRegistrationModalOpen(true)}
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-900 whitespace-nowrap"
                >
                  고객등록
                </button>
              </div>
              
              <div className="space-y-1 text-xs text-gray-600">
                <p>신규 고객은 먼저 고객을 등록하세요.</p>
                <p>고객을 등록하지 않고 예약 등록을 하시려면 '미등록 고객 예약'을 체크하세요.</p>
              </div>
              
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newBookingUnregisteredCustomer}
                  onChange={(e) => setNewBookingUnregisteredCustomer(e.target.checked)}
                  className="w-4 h-4"
                />
                미등록 고객 예약
              </label>
            </div>

              {/* Right Column: Appointment Details */}
              <div className="space-y-4">
              {/* Date */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">날짜</label>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={newBookingDate.replace(/-/g, '.')}
                    readOnly
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                        <button
                          type="button"
                    onClick={() => setNewBookingDate(selectedDate)}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                        </button>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={newBookingDirectVisit}
                    onChange={(e) => setNewBookingDirectVisit(e.target.checked)}
                    className="w-4 h-4"
                  />
                  바로 방문
                  <span className="material-symbols-outlined text-sm text-gray-400">help</span>
                </label>
              </div>
              
              {/* Designer, Start Time, Duration Groups */}
              <div className="space-y-4">
                {newBookingTimeSlots.map((slot, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-3 gap-4">
                      {/* Designer */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">디자이너</label>
                        <div className="flex items-center gap-2">
                  <select
                            value={slot.designerId || ''}
                            onChange={(e) => {
                              const updated = [...newBookingTimeSlots];
                              updated[index].designerId = e.target.value ? Number(e.target.value) : null;
                              setNewBookingTimeSlots(updated);
                            }}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="">선택하세요</option>
                    {newBookingDesigners.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                          {index === newBookingTimeSlots.length - 1 && (
                  <button
                    type="button"
                              onClick={() => {
                                setNewBookingTimeSlots([...newBookingTimeSlots, { designerId: null, time: '10:00 AM', duration: 30, serviceTab: 'service', serviceId: null }]);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-black text-white rounded-lg hover:bg-gray-900"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                          )}
                          {newBookingTimeSlots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = newBookingTimeSlots.filter((_, i) => i !== index);
                                setNewBookingTimeSlots(updated);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-gray-300 text-white rounded-lg hover:bg-gray-400"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          )}
                    </div>
                </div>

              {/* Start Time */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">시작시간</label>
                <select
                          value={slot.time}
                          onChange={(e) => {
                            const updated = [...newBookingTimeSlots];
                            updated[index].time = e.target.value;
                            setNewBookingTimeSlots(updated);
                          }}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  {Array.from({ length: 24 }).map((_, i) => {
                    const hour = i;
                    const ampm = hour >= 12 ? '오후' : '오전';
                    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                    return (
                      <option key={i} value={`${String(hour).padStart(2, '0')}:00 ${ampm}`}>
                        {String(displayHour).padStart(2, '0')}:00 {ampm}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              {/* Duration */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">소요시간</label>
                <select
                          value={slot.duration}
                          onChange={(e) => {
                            const updated = [...newBookingTimeSlots];
                            updated[index].duration = Number(e.target.value);
                            setNewBookingTimeSlots(updated);
                          }}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  {[15, 30, 45, 60, 90, 120, 150, 180].map((min) => (
                    <option key={min} value={min}>{min} 분</option>
                  ))}
                </select>
                      </div>
              </div>
              
                    {/* Service Selection */}
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-4">
                        <label className="text-sm font-bold text-black whitespace-nowrap">항목 선택</label>
                        <div className="flex gap-2">
                        <button
                          type="button"
                            onClick={() => {
                              const updated = [...newBookingTimeSlots];
                              updated[index].serviceTab = 'service';
                              updated[index].serviceId = null;
                              setNewBookingTimeSlots(updated);
                            }}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                              slot.serviceTab === 'service'
                                ? 'bg-black text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    서비스
                  </button>
                  <button
                    type="button"
                            onClick={() => {
                              const updated = [...newBookingTimeSlots];
                              updated[index].serviceTab = 'appointment';
                              updated[index].serviceId = null;
                              setNewBookingTimeSlots(updated);
                            }}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                              slot.serviceTab === 'appointment'
                                ? 'bg-black text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    예약 항목
                  </button>
                </div>
                    </div>
                </div>
                  </div>
                ))}
                </div>

              {/* Icon Display Options */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">아이콘 표시:</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={newBookingShowMemberIcon}
                      onChange={(e) => setNewBookingShowMemberIcon(e.target.checked)}
                      className="w-4 h-4"
                    />
                    회원 (●)
                    </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={newBookingShowImportantIcon}
                      onChange={(e) => setNewBookingShowImportantIcon(e.target.checked)}
                      className="w-4 h-4"
                    />
                    중요고객 (★)
                    </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={newBookingShowConfirmedIcon}
                      onChange={(e) => setNewBookingShowConfirmedIcon(e.target.checked)}
                      className="w-4 h-4"
                    />
                    확인 (㉿)
                  </label>
                  <select
                    value={newBookingIconColor}
                    onChange={(e) => setNewBookingIconColor(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="">색상</option>
                    <option value="red">빨강</option>
                    <option value="blue">파랑</option>
                    <option value="green">초록</option>
                    <option value="yellow">노랑</option>
                  </select>
                    </div>
                  </div>
              
              {/* SMS Options */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">예약 문자:</label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={newBookingExcludeSms}
                    onChange={(e) => setNewBookingExcludeSms(e.target.checked)}
                    className="w-4 h-4"
                  />
                  문자 발송 제외
                </label>
                </div>
              
              {/* Deposit Registration */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">예약금 등록:</label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={newBookingRegisterDeposit}
                    onChange={(e) => setNewBookingRegisterDeposit(e.target.checked)}
                    className="w-4 h-4"
                  />
                  예약금 등록
                </label>
              </div>
              
              {/* Appointment Memo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">예약 메모</label>
                <textarea
                  value={newBookingMemo}
                  onChange={(e) => setNewBookingMemo(e.target.value)}
                  placeholder="메모를 입력하세요"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
            </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
              <button
                type="button"
                  onClick={() => {
                    setIsNewBookingOpen(false);
                    setNewBookingTimeSlots([{ designerId: null, time: '10:00 AM', duration: 30, serviceTab: 'service', serviceId: null }]);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-black"
              >
                취소
              </button>
              <button
                type="button"
                disabled={
                    !newBookingTimeSlots[0]?.designerId ||
                    !newBookingTimeSlots[0]?.serviceId ||
                  !newBookingDate ||
                    !newBookingTimeSlots[0]?.time ||
                  newBookingSubmitting
                }
                onClick={async () => {
                    const firstSlot = newBookingTimeSlots[0];
                  if (
                      !firstSlot?.designerId ||
                      !firstSlot?.serviceId ||
                    !newBookingDate ||
                      !firstSlot?.time
                  )
                    return;
                  setNewBookingSubmitting(true);
                  try {
                    const resCreate = await fetch('/api/appointment', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        shopId: newBookingShopId,
                          designerId: firstSlot.designerId,
                          serviceId: firstSlot.serviceId,
                        day: Number(newBookingDate.split('-')[2]),
                          timeLabel: firstSlot.time,
                        totalAmount: null,
                        depositAmount: null,
                        fullDate: newBookingDate,
                        memo: newBookingMemo,
                      }),
                    });
                    if (!resCreate.ok) {
                      console.error('Failed to create booking', await resCreate.text());
                    } else {
                      setBookingSuccessMessage('예약이 성공적으로 등록되었습니다.');
                      setTimeout(() => {
                        setBookingSuccessMessage(null);
                      }, 3000);
                    }
                    setIsNewBookingOpen(false);
                      setNewBookingTimeSlots([{ designerId: null, time: '10:00 AM', duration: 30, serviceTab: 'service', serviceId: null }]);
                    const res = await fetch(
                      `/api/appointment?date=${encodeURIComponent(selectedDate)}`
                    );
                    const data = await res.json();
                    if (res.ok) {
                      setBookings(data.bookings || []);
                    }
                  } finally {
                    setNewBookingSubmitting(false);
                  }
                }}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-black text-white hover:bg-gray-900 disabled:opacity-60 transition-colors"
              >
                {newBookingSubmitting ? '저장 중...' : '저장'}
              </button>
              </div>
            </div>
          </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Detail Modal (from schedule grid card click) */}
      {viewingBookingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              type="button"
              onClick={() => setViewingBookingDetail(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-black"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
            <h2 className="text-lg font-bold text-black mb-4">예약 상세</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">예약 번호</span>
                <span className="font-semibold text-gray-800">#{viewingBookingDetail.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">시술</span>
                <span className="font-medium text-gray-900">
                  {viewingBookingDetail.service?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">디자이너</span>
                <span className="font-medium text-gray-900">
                  {viewingBookingDetail.designer?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">날짜</span>
                <span className="font-medium text-gray-900">{viewingBookingDetail.booking_date}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">시간</span>
                <span className="font-medium text-gray-900">
                  {viewingBookingDetail.booking_time
                    ? bookingTimeToLabel(viewingBookingDetail.booking_time)
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">금액</span>
                <span className="font-medium text-gray-900">
                  {(viewingBookingDetail.total_amount ?? 0) > 0
                    ? `AU$${Number(viewingBookingDetail.total_amount).toFixed(0)}`
                    : 'Free'}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">메모</span>
                <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">
                  {viewingBookingDetail.memo != null && viewingBookingDetail.memo !== ''
                    ? viewingBookingDetail.memo
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setViewingBookingDetail(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => {
                  if (viewingBookingDetail.booking_date && viewingBookingDetail.booking_time) {
                    setEditingBooking(viewingBookingDetail);
                    setViewingBookingDetail(null);
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800"
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              type="button"
              onClick={() => setEditingBooking(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-black"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
            <h2 className="text-lg font-bold text-black mb-2">예약 수정</h2>
            <p className="text-xs text-gray-500 mb-4">
              기존 예약의 날짜·시작 시간·시술·메모를 한 번에 수정합니다. 시술을 바꾸면 캘린더에서 예약 높이가 해당 시술 시간에 맞게 바뀝니다.
            </p>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between text-xs text-gray-500">
                <span>예약 번호</span>
                <span className="font-semibold text-gray-800">#{editingBooking.id}</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">날짜</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">시작 시간</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                >
                  {EDIT_TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">시술</label>
                <button
                  type="button"
                  onClick={() => {
                    setServicePickerCategory(null);
                    setIsServicePickerOpen(true);
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between bg-white hover:bg-gray-50"
                >
                  <span className="text-gray-800">
                    {editServiceId != null
                      ? (() => {
                          const s = editServices.find((x) => x.id === editServiceId);
                          if (!s) return '시술 선택';
                          const name = s.name.replace(/\s*\(card\)\s*/gi, '').trim();
                          const dur = s.duration_minutes != null ? `${s.duration_minutes}분` : '';
                          return dur ? `${name} · ${dur}` : name;
                        })()
                      : '시술 선택'}
                  </span>
                  <span className="material-symbols-outlined text-gray-400 text-lg">expand_more</span>
                </button>
              </div>
              {/* Service picker modal: category blocks → then service list (card only, duration only display) */}
              {isServicePickerOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-base font-bold text-black">
                        {servicePickerCategory == null ? '카테고리 선택' : servicePickerCategory}
                      </h3>
                      {servicePickerCategory != null ? (
                        <button
                          type="button"
                          onClick={() => setServicePickerCategory(null)}
                          className="text-sm text-gray-600 hover:text-black"
                        >
                          뒤로
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsServicePickerOpen(false)}
                          className="text-gray-400 hover:text-black"
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      )}
                    </div>
                    <div className="p-4 overflow-y-auto flex-1">
                      {servicePickerCategory == null ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {SERVICE_PICKER_CATEGORY_ORDER.map((cat) => {
                            const list = editServices.filter(
                              (s) => getServiceCategoryForPicker(s.name) === cat
                            );
                            if (list.length === 0) return null;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setServicePickerCategory(cat)}
                                className="border-2 border-gray-200 rounded-xl p-4 text-center hover:border-black hover:bg-gray-50 transition-colors"
                              >
                                <span className="font-semibold text-gray-900">{cat}</span>
                                <p className="text-xs text-gray-500 mt-1">{list.length}개</p>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {editServices
                            .filter((s) => getServiceCategoryForPicker(s.name) === servicePickerCategory)
                            .map((s) => {
                              const name = s.name.replace(/\s*\(card\)\s*/gi, '').trim();
                              const dur = s.duration_minutes != null ? `${s.duration_minutes}분` : '';
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    setEditServiceId(s.id);
                                    setIsServicePickerOpen(false);
                                    setServicePickerCategory(null);
                                  }}
                                  className={`w-full text-left border rounded-xl px-4 py-3 text-sm transition-colors ${
                                    editServiceId === s.id
                                      ? 'border-black bg-black text-white'
                                      : 'border-gray-200 hover:border-black hover:bg-gray-50'
                                  }`}
                                >
                                  {dur ? `${name} · ${dur}` : name}
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">메모</label>
                <textarea
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  placeholder="예약 메모"
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={!editDate || !editTime || editSubmitting || !editingBooking.id}
                onClick={async () => {
                  if (!editDate || !editTime || !editingBooking?.id) return;
                  const dbTime = labelToDbTime(editTime);
                  if (!dbTime) return;
                  setEditSubmitting(true);
                  try {
                    await fetch(`/api/appointment/${editingBooking.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        booking_date: editDate,
                        booking_time: dbTime,
                        ...(editServiceId != null && { service_id: editServiceId }),
                        memo: editMemo,
                      }),
                    });
                    setEditingBooking(null);
                    const res = await fetch(
                      `/api/appointment?date=${encodeURIComponent(selectedDate)}`
                    );
                    const data = await res.json();
                    if (res.ok) {
                      setBookings(data.bookings || []);
                    }
                  } finally {
                    setEditSubmitting(false);
                  }
                }}
                className={`px-5 py-2 rounded-lg text-xs md:text-sm font-semibold text-white flex items-center gap-2 ${
                  editSubmitting ? 'bg-gray-400 cursor-wait' : 'bg-black hover:bg-gray-800'
                }`}
              >
                {editSubmitting ? '저장 중...' : '변경 저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Booking Confirm Modal */}
      {bookingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button
              type="button"
              onClick={() => setBookingToDelete(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-black"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
            <h2 className="text-base font-bold text-black mb-2">Delete Booking</h2>
            <p className="text-xs text-gray-500 mb-4">
              이 예약을 정말 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.
            </p>
            <div className="text-xs text-gray-600 mb-4 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Booking</span>
                <span className="font-semibold text-gray-900">
                  #{bookingToDelete.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Service</span>
                <span className="font-medium text-gray-900">
                  {bookingToDelete.service?.name || 'Service'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Designer</span>
                <span className="font-medium text-gray-900">
                  {bookingToDelete.designer?.name || 'Designer'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-gray-900">
                  {bookingToDelete.booking_date}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time</span>
                <span className="font-medium text-gray-900">
                  {bookingTimeToLabel(bookingToDelete.booking_time)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setBookingToDelete(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={cancellingId === bookingToDelete.id}
                onClick={async () => {
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
                className={`px-5 py-2 rounded-lg text-xs md:text-sm font-semibold text-white flex items-center gap-2 ${
                  cancellingId === bookingToDelete.id
                    ? 'bg-gray-400 cursor-wait'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
      {isHolidayModalOpen && holidayDesignerId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">임의 휴일 및 특근 설정</h2>
              <button
                onClick={() => {
                  setIsHolidayModalOpen(false);
                  setHolidayDesignerId(null);
                  setHolidayDesignerName('');
                  setHolidaySelectedDates([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  디자이너
                </label>
                <select
                  value={holidayDesignerName}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                >
                  <option>{holidayDesignerName}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  유형
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="holiday"
                      checked={holidayType === 'holiday'}
                      onChange={(e) => setHolidayType(e.target.value as 'holiday' | 'special')}
                    />
                    <span className="text-sm">임의 휴일</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="special"
                      checked={holidayType === 'special'}
                      onChange={(e) => setHolidayType(e.target.value as 'holiday' | 'special')}
                    />
                    <span className="text-sm">특별 근무일</span>
                  </label>
                </div>
              </div>
              {/* Calendar component */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => {
                      const prevMonth = new Date(holidayCurrentMonth);
                      prevMonth.setMonth(prevMonth.getMonth() - 1);
                      setHolidayCurrentMonth(prevMonth);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {holidayCurrentMonth.getFullYear()}년 {holidayCurrentMonth.getMonth() + 1}월
                  </h3>
                  <button
                    onClick={() => {
                      const nextMonth = new Date(holidayCurrentMonth);
                      nextMonth.setMonth(nextMonth.getMonth() + 1);
                      setHolidayCurrentMonth(nextMonth);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-gray-600 py-1">
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
                      const weekday = date.getDay(); // 0 = Sunday, 6 = Saturday
                      const hasRegularSchedule = holidayRegularSchedule.some(
                        (s: any) => s.weekday === weekday && !s.effective_to
                      );
                      const isRegularHoliday = isCurrentMonth && !hasRegularSchedule;
                      
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
                    <span>정기 휴일</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-red-500"></div>
                    <span>임의 휴일</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>특별 근무일</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  *날짜를 선택하면 등록/수정이 가능합니다.
                </p>
              </div>
              <button
                onClick={async () => {
                  if (holidaySelectedDates.length === 0) {
                    alert('날짜를 선택해주세요.');
                    return;
                  }
                  setHolidaySubmitting(true);
                  try {
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
                    setHolidayDesignerName('');
                    setHolidaySelectedDates([]);
                  } catch (error) {
                    console.error('Error setting holidays:', error);
                    alert('설정에 실패했습니다.');
                  } finally {
                    setHolidaySubmitting(false);
                  }
                }}
                disabled={holidaySubmitting || holidaySelectedDates.length === 0}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {holidaySubmitting ? '설정 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Info Modal - Right Sidebar */}
      {viewingCustomerId && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={() => {
            setViewingCustomerId(null);
            setViewingCustomer(null);
          }} />
          <div className="absolute right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl pointer-events-auto flex flex-col">
            {customerInfoLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-600">고객 정보를 불러오는 중...</p>
                </div>
              </div>
            ) : viewingCustomer ? (
              <>
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between shrink-0">
                  <h2 className="text-xl font-bold text-black">고객 정보</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setViewingCustomerId(null);
                      setViewingCustomer(null);
                    }}
                    className="text-gray-400 hover:text-black transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-gray-200 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-lg pointer-events-none">
                        search
                      </span>
                      <input
                        type="text"
                        placeholder="고객명 또는 휴대폰"
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
                    >
                      고객등록
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 whitespace-nowrap"
                    >
                      예약 등록
                    </button>
                  </div>
                </div>

                {/* Customer Info Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Customer Image and Basic Info */}
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-4xl text-gray-400">person</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-black">{viewingCustomer.name || '-'}</h3>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                          {viewingCustomer.customer_type === 'prepaid' ? '정액권' : '일반'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {viewingCustomer.phone ? viewingCustomer.phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3') : '-'}
                      </p>
                      <button
                        type="button"
                        className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                      >
                        상세정보
                      </button>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">고객 번호</p>
                      <p className="text-sm font-medium text-black">{viewingCustomer.customer_number || viewingCustomer.id || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">담당자</p>
                      <p className="text-sm font-medium text-black">{viewingCustomer.manager_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">정액권 잔액</p>
                      <p className="text-sm font-medium text-black">
                        {viewingCustomer.prepaid_balance ? `${Number(viewingCustomer.prepaid_balance).toLocaleString()}` : '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">최근 방문일</p>
                      <p className="text-sm font-medium text-black">
                        {viewingCustomer.last_visit_date ? (() => {
                          const date = new Date(viewingCustomer.last_visit_date);
                          const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                          return `${formattedDate} (${viewingCustomer.days_since_last_visit || 0}일전)`;
                        })() : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">최근 1년 예약 수</p>
                      <p className="text-sm font-medium text-black">
                        {viewingCustomer.appointments_count || 0} {viewingCustomer.cancelled_count ? `(취소 ${viewingCustomer.cancelled_count})` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">예정된 예약</p>
                      {viewingCustomer.next_appointment ? (
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-black">
                            {(() => {
                              const date = new Date(viewingCustomer.next_appointment.date);
                              const formattedDate = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                              const time = viewingCustomer.next_appointment.time || '';
                              const [hour, minute] = time.split(':');
                              const hourNum = Number(hour);
                              const ampm = hourNum >= 12 ? 'PM' : 'AM';
                              const displayHour = hourNum > 12 ? hourNum - 12 : (hourNum === 0 ? 12 : hourNum);
                              const formattedTime = minute ? `${displayHour}:${minute} ${ampm}` : '';
                              return `${formattedDate} ${formattedTime}`;
                            })()}
                          </p>
                          <span className="material-symbols-outlined text-sm text-gray-400">chevron_right</span>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-black">-</p>
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-gray-200 mb-4">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setCustomerInfoTab('appointments')}
                        className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                          customerInfoTab === 'appointments'
                            ? 'border-purple-600 text-black'
                            : 'border-transparent hover:border-gray-300 text-gray-600 hover:text-black'
                        }`}
                      >
                        예약내역
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomerInfoTab('prepaid')}
                        className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                          customerInfoTab === 'prepaid'
                            ? 'border-purple-600 text-black'
                            : 'border-transparent hover:border-gray-300 text-gray-600 hover:text-black'
                        }`}
                      >
                        정액권
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomerInfoTab('tickets')}
                        className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                          customerInfoTab === 'tickets'
                            ? 'border-purple-600 text-black'
                            : 'border-transparent hover:border-gray-300 text-gray-600 hover:text-black'
                        }`}
                      >
                        티켓
                      </button>
                    </div>
                  </div>

                  {/* Tab Content */}
                  {customerInfoTab === 'prepaid' && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-black mb-3">정액권</div>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">정액권명</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">잔액</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">만료일</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewingCustomer.prepaid_tickets && viewingCustomer.prepaid_tickets.length > 0 ? (
                              viewingCustomer.prepaid_tickets.map((ticket: any, idx: number) => (
                                <tr key={idx} className="border-t border-gray-200">
                                  <td className="px-4 py-2 text-gray-900">{ticket.name || '-'}</td>
                                  <td className="px-4 py-2 text-gray-900">{Number(ticket.balance || 0).toLocaleString()}</td>
                                  <td className="px-4 py-2 text-gray-900">{ticket.expiry_date || '무제한'}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} className="px-4 py-4 text-center text-sm text-gray-500">
                                  정액권 내역이 없습니다.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {customerInfoTab === 'appointments' && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-black mb-3">예약내역</div>
                      <div className="text-sm text-gray-500 text-center py-4">
                        예약내역 기능은 추후 구현 예정입니다.
                      </div>
                    </div>
                  )}
                  
                  {customerInfoTab === 'tickets' && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-black mb-3">티켓</div>
                      <div className="text-sm text-gray-500 text-center py-4">
                        티켓 기능은 추후 구현 예정입니다.
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-gray-600">고객 정보를 불러올 수 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


