'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [newBookingDesignerId, setNewBookingDesignerId] = useState<number | null>(null);
  const [newBookingServiceId, setNewBookingServiceId] = useState<number | null>(null);
  const [newBookingDate, setNewBookingDate] = useState<string>(selectedDate);
  const [newBookingTime, setNewBookingTime] = useState<string>('10:00 AM');
  const [newBookingSubmitting, setNewBookingSubmitting] = useState(false);
  const [newBookingLoadingShops, setNewBookingLoadingShops] = useState(false);
  const [newBookingLoadingOptions, setNewBookingLoadingOptions] = useState(false);
  const [availableDesignerIds, setAvailableDesignerIds] = useState<number[]>([]);
  const [loadingDesignerAvailability, setLoadingDesignerAvailability] = useState(false);

  // Comment: Editing existing booking from Upcoming list
  const [editingBooking, setEditingBooking] = useState<BookingWithRelations | null>(null);
  const [editDate, setEditDate] = useState<string>(selectedDate);
  const [editTime, setEditTime] = useState<string>('10:00 AM');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Comment: Confirm delete from Upcoming
  const [bookingToDelete, setBookingToDelete] = useState<BookingWithRelations | null>(null);

  // Comment: Global success message for creating bookings
  const [bookingSuccessMessage, setBookingSuccessMessage] = useState<string | null>(null);

  // Comment: Track booking focused from Schedule to highlight in Upcoming
  const [focusedBookingId, setFocusedBookingId] = useState<number | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const dateButtonWrapperRef = useRef<HTMLDivElement | null>(null);

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
  const [restrictionSubmitting, setRestrictionSubmitting] = useState(false);
  const [existingRestriction, setExistingRestriction] = useState<any | null>(null);
  const [loadingExistingRestriction, setLoadingExistingRestriction] = useState(false);

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

  // Comment: Load bookings for selected date (all shops)
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/appointment?date=${encodeURIComponent(selectedDate)}`
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load bookings');
        }
        setBookings(data.bookings || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [selectedDate]);

  // Comment: Load booking restrictions for selected date or week range
  useEffect(() => {
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
          if (res.ok) {
            setBookingRestrictions(data.restrictions || []);
          }
        } else {
          const res = await fetch(
            `/api/booking-restrictions?date=${encodeURIComponent(selectedDate)}`
          );
          const data = await res.json();
          if (res.ok) {
            setBookingRestrictions(data.restrictions || []);
          }
        }
      } catch (err) {
        console.error('Error fetching restrictions:', err);
      }
    };

    fetchRestrictions();
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
        if (res.ok) {
          setWeekViewBookings(data.bookings || []);
        }
      } catch (error) {
        console.error('Error fetching week bookings:', error);
      }
    };

    fetchWeekBookings();
  }, [isWeekViewMode, weekViewDesignerId, weekViewStartDate]);

  // Comment: Load monthly bookings to power calendar dots (all shops)
  useEffect(() => {
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
        setDayCounts(counts);
      } catch (err) {
        // Silent fail – calendar dots are non-critical
        console.error(err);
        setDayCounts({});
      }
    };

    fetchMonth();
  }, [monthKey]);

  // Comment: Load admin memo on mount
  useEffect(() => {
    const fetchMemo = async () => {
      setMemoLoading(true);
      try {
        const res = await fetch('/api/admin-memo');
        const data = await res.json();
        if (res.ok) {
          setMemo(data.content || '');
        } else {
          console.error('Failed to load admin memo:', data.error);
        }
      } catch (err) {
        console.error('Error loading admin memo:', err);
      } finally {
        setMemoLoading(false);
      }
    };

    fetchMemo();
  }, []);

  // Comment: Load designer availability for the selected date (per weekday)
  // This includes designers with regular schedule OR special work day (특별 근무일)
  useEffect(() => {
    const fetchAvailability = async () => {
      setLoadingDesignerAvailability(true);
      try {
        const res = await fetch(
          `/api/designer-schedules?date=${encodeURIComponent(selectedDate)}`
        );
        const data = await res.json();
        if (!res.ok) {
          console.error('Failed to load designer availability:', data.error);
          setAvailableDesignerIds([]);
          return;
        }
        // Comment: Special work days have priority - designers with special work day are included
        // even if they don't have regular schedule for that weekday
        setAvailableDesignerIds(data.designerIds || []);
        console.log(`[appointments] Available designers for ${selectedDate}:`, data.designerIds);
      } catch (err) {
        console.error('Error loading designer availability:', err);
        setAvailableDesignerIds([]);
      } finally {
        setLoadingDesignerAvailability(false);
      }
    };

    fetchAvailability();
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

    loadShops();
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
    const loadAllDesigners = async () => {
      try {
        const res = await fetch('/api/designers');
        const data = await res.json();
        
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
      } catch (err) {
        console.error('Error loading designers:', err);
      }
    };
    loadAllDesigners();
    // Comment: Reload designers periodically to ensure they're always up to date
    const interval = setInterval(loadAllDesigners, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // Comment: Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDesignerDropdown !== null) {
        setOpenDesignerDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDesignerDropdown]);


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

  // Comment: Group bookings by designer name for the daily schedule grid
  const bookingsByDesigner = useMemo(() => {
    const map: Record<string, BookingWithRelations[]> = {};
    bookings.forEach((b) => {
      const name = b.designer?.name || 'Unassigned';
      if (!map[name]) map[name] = [];
      map[name].push(b);
    });
    return map;
  }, [bookings]);

  // Comment: Designers visible in the grid - filter by availability for selected date
  const visibleDesigners = useMemo(() => {
    // Filter designers based on availability for the selected date
    if (allDesigners.length > 0) {
      const roleOrder: Record<string, number> = {
        'Director': 1,
        'Manager': 2,
        'Designer': 3,
      };
      
      // Comment: Filter designers that are available on the selected date
      // If availableDesignerIds is empty (still loading), show all designers
      // Otherwise, only show designers whose IDs are in availableDesignerIds
      const filtered = availableDesignerIds.length > 0
        ? allDesigners.filter((d) => availableDesignerIds.includes(d.id))
        : allDesigners;
      
      const sorted = [...filtered].sort((a, b) => {
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
  }, [allDesigners, availableDesignerIds]);

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
      [...bookings].sort((a, b) =>
        (a.booking_time || '').localeCompare(b.booking_time || '')
      ),
    [bookings]
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
        <header className="h-16 flex items-center justify-between px-6 md:px-10 py-4 bg-gray-100 text-gray-900 z-10">
          <div className="flex items-center gap-4 flex-1">
            {/* Shop Filter Dropdown */}
            <select
              value={selectedShopFilter}
              onChange={(e) => setSelectedShopFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-gray-100 text-gray-900"
            >
              <option value="전체">전체</option>
            </select>
            {/* Today Button */}
            <button
              type="button"
              onClick={() => setSelectedDate(getSydneyToday())}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-200 text-gray-900"
            >
              오늘
            </button>
          </div>
          <div className="flex items-center justify-center flex-1">
            {/* Date Navigation - Centered */}
            <div className="flex items-center gap-2">
              {dateRangeStart && dateRangeEnd ? (
                <span className="text-sm text-gray-900">
                  {dateRangeStart} ~ {dateRangeEnd}
              </span>
              ) : (
                <span className="text-sm text-gray-900">{selectedDate}</span>
              )}
            </div>
          </div>
          <div className="flex-1" />
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-gray-50/50">
          <div className="max-w-full mx-auto flex flex-col gap-6 h-full">


            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
              {/* Left: Large Calendar */}
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
                              <span className="mt-1 h-1 w-4 rounded-full bg-emerald-500" />
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

              {/* Center: Full Schedule */}
              <div className="lg:col-span-9 flex flex-col gap-4 min-h-0">
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
                    {/* Sticky Header: show time and designers/days */}
                    <div className="sticky top-0 z-10 flex border-b border-[#e2e8f0] bg-[#f8f9fc] shadow-sm">
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
                      ) : (
                        // Comment: Normal view header - designers
                        <div className="grid flex-1 relative" style={{ gridTemplateColumns: `repeat(${visibleDesigners.length}, minmax(150px, 1fr))` }}>
                          {/* Vertical column dividers for header - full height, positioned correctly */}
                          {visibleDesigners.map((_, colIndex) => {
                            // Comment: Calculate position based on grid column width
                            const columnWidth = 100 / visibleDesigners.length;
                            return (
                              <div
                                key={`header-divider-${colIndex}`}
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
                          {visibleDesigners.map((name, index) => {
                            const designer = allDesigners.find((d) => d.name === name);
                            const designerId = designer?.id;
                          const color = designerColorMap[name];
                          const initials = name
                            .split(' ')
                              .map((part: string) => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase();
                          return (
                            <div
                              key={name}
                                className="relative px-2 py-2 bg-white/50 backdrop-blur-sm z-10"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDesignerDropdown(openDesignerDropdown === designerId ? null : designerId || null);
                                  }}
                                  className="flex items-center gap-2 w-full text-left hover:bg-gray-100 rounded-lg p-1 -m-1 transition-colors"
                            >
                              <div
                                    className={`size-6 rounded-full flex items-center justify-center font-bold text-[10px] ${color?.bg ?? DESIGNER_COLORS[index % DESIGNER_COLORS.length].bg} ${color?.text ?? DESIGNER_COLORS[index % DESIGNER_COLORS.length].text}`}
                              >
                                {initials}
                              </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-[#0d121b] truncate">{name}</p>
                                    <p className="text-[10px] text-[#64748b]">
                                      {(() => {
                                        const date = new Date(selectedDate);
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const day = String(date.getDate()).padStart(2, '0');
                                        return `${month}-${day}`;
                                      })()}
                                    </p>
                              </div>
                                </button>
                                {/* Dropdown Menu */}
                                {openDesignerDropdown === designerId && (
                                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (designerId && name) {
                                          // Comment: Calculate Monday of the week containing selectedDate
                                          const date = new Date(selectedDate);
                                          const day = date.getDay();
                                          const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
                                          const monday = new Date(date.setDate(diff));
                                          const mondayStr = monday.toISOString().split('T')[0];
                                          
                                          setWeekViewDesignerId(designerId);
                                          setWeekViewDesignerName(name);
                                          setWeekViewStartDate(mondayStr);
                                          setIsWeekViewMode(true);
                                        }
                                        setOpenDesignerDropdown(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                                    >
                                      일주일 보기
                                    </button>
                                    {isWeekViewMode && weekViewDesignerId === designerId && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsWeekViewMode(false);
                                          setWeekViewDesignerId(null);
                                          setWeekViewDesignerName('');
                                          setWeekViewBookings([]);
                                          setOpenDesignerDropdown(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                      >
                                        일주일 보기 종료
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (designerId && name) {
                                          setRestrictionDesignerId(designerId);
                                          setRestrictionDesignerName(name);
                                          setRestrictionDate(selectedDate);
                                          setIsRestrictionModalOpen(true);
                                        }
                                        setOpenDesignerDropdown(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      예약금지 등록
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (designerId && name) {
                                          setHolidayDesignerId(designerId);
                                          setHolidayDesignerName(name);
                                          setHolidayCurrentMonth(new Date(selectedDate));
                                          setHolidaySelectedDates([]);
                                          setIsHolidayModalOpen(true);
                                        }
                                        setOpenDesignerDropdown(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                                    >
                                      임의 휴일 및 특근 설정
                                    </button>
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                      )}
                    </div>

                    {/* Grid Body */}
                    <div
                      className="flex relative"
                      style={{ minHeight: `${(GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16}px` }}
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

                      {/* Time Column - 30 minute intervals with padding */}
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
                                    // Comment: Full day restriction
                                    return (
                                      <div
                                        key={`restriction-${restriction.id}`}
                                        className="absolute inset-0 bg-gray-300/40 pointer-events-none z-5"
                                      />
                                    );
                                  } else if (restriction.restriction_type === 'time' && restriction.start_time && restriction.end_time) {
                                    // Comment: Time range restriction
                                    const [startHour, startMin] = restriction.start_time.split(':').map(Number);
                                    const [endHour, endMin] = restriction.end_time.split(':').map(Number);
                                    const startMinutes = (startHour - GRID_START_HOUR) * 60 + startMin;
                                    const endMinutes = (endHour - GRID_START_HOUR) * 60 + endMin;
                                    if (startMinutes < 0 || endMinutes < 0) return null;
                                    
                                    const top = (startMinutes / 30) * GRID_30MIN_HEIGHT + 8;
                                    const height = ((endMinutes - startMinutes) / 30) * GRID_30MIN_HEIGHT;
                                    
                                    return (
                                      <div
                                        key={`restriction-${restriction.id}`}
                                        className="absolute left-0 right-0 bg-gray-300/40 pointer-events-none z-5"
                                        style={{ top, height }}
                                      />
                                    );
                                  }
                                  return null;
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

                                return (
                                  <div
                                    key={b.id}
                                    className="absolute left-1 right-1 z-10"
                                    style={{ top, height }}
                                  >
                                    <div
                                      className={`h-full w-full bg-white border-l-4 ${color.border} rounded shadow-sm hover:shadow-md transition-all cursor-pointer p-2 flex flex-col justify-between overflow-hidden`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (b.id) {
                                          setFocusedBookingId(b.id);
                                        }
                                      }}
                                    >
                                      <div>
                                        <p className="text-xs font-bold text-[#0d121b] mb-0.5">
                                          {serviceName}
                                        </p>
                                          <p className="text-[11px] text-[#64748b]">{weekViewDesignerName}</p>
                                      </div>
                                      <div className="flex items-center justify-between mt-1">
                                        <span className="text-[10px] font-mono text-[#94a3b8]">
                                          {timeLabel}
                                        </span>
                                        <span className="text-[10px] font-bold text-[#0d121b] bg-gray-100 px-1.5 py-0.5 rounded">
                                          {amount}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                      ) : (
                        // Comment: Normal view - designer columns
                        <div className="grid flex-1 bg-white relative" style={{ gridTemplateColumns: `repeat(${visibleDesigners.length}, minmax(150px, 1fr))` }}>
                          {/* Note: Column dividers are now rendered outside the grid container (at lines 923-940) 
                              to ensure they extend the full scrollable height, even when scrolling horizontally.
                              This fixes the issue where dividers were cut off after certain columns like "윈터". */}
                          
                          {/* Hour guidelines - 30 minute intervals with padding, full width */}
                          <div className="absolute inset-0 pointer-events-none flex flex-col z-0 pt-2 pb-2" style={{ width: '100%' }}>
                            {Array.from({ length: (GRID_END_HOUR - GRID_START_HOUR) * 2 }).map((_, i) => (
                              <div
                                key={i}
                                className="h-[40px] border-b border-[#f1f5f9] border-dashed w-full"
                              />
                            ))}
              </div>

                          {/* Show all designers */}
                          {visibleDesigners.map((designerName, colIndex) => {
                          const designer = allDesigners.find((d) => d.name === designerName);
                          const designerId = designer?.id;
                          const designerBookings = bookingsByDesigner[designerName] || [];
                          const color = designerColorMap[designerName] ??
                            DESIGNER_COLORS[colIndex % DESIGNER_COLORS.length];
                          
                          // Comment: Get restrictions for this designer on selected date
                          const designerRestrictions = bookingRestrictions.filter(
                            (r) => r.designer_id === designerId && r.restriction_date === selectedDate
                          );

                          return (
                            <div
                              key={designerName}
                              className="relative h-full"
                            >
                              {/* Comment: Render restriction blocks (greyout) */}
                              {designerRestrictions.map((restriction) => {
                                if (restriction.restriction_type === 'date') {
                                  // Comment: Full day restriction
                                  return (
                                    <div
                                      key={`restriction-${restriction.id}`}
                                      className="absolute inset-0 bg-gray-300/40 pointer-events-none z-5"
                                    />
                                  );
                                } else if (restriction.restriction_type === 'time' && restriction.start_time && restriction.end_time) {
                                  // Comment: Time range restriction
                                  const [startHour, startMin] = restriction.start_time.split(':').map(Number);
                                  const [endHour, endMin] = restriction.end_time.split(':').map(Number);
                                  const startMinutes = (startHour - GRID_START_HOUR) * 60 + startMin;
                                  const endMinutes = (endHour - GRID_START_HOUR) * 60 + endMin;
                                  if (startMinutes < 0 || endMinutes < 0) return null;
                                  
                                  const top = (startMinutes / 30) * GRID_30MIN_HEIGHT + 8;
                                  const height = ((endMinutes - startMinutes) / 30) * GRID_30MIN_HEIGHT;
                                  
                                  return (
                                    <div
                                      key={`restriction-${restriction.id}`}
                                      className="absolute left-0 right-0 bg-gray-300/40 pointer-events-none z-5"
                                      style={{ top, height }}
                                    />
                                  );
                                }
                                return null;
                              })}
                              
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

                        return (
                          <div
                            key={b.id}
                                    className="absolute left-1 right-1 z-10"
                                    style={{ top, height }}
                                  >
                                    <div
                                      className={`h-full w-full bg-white border-l-4 ${color.border} rounded shadow-sm hover:shadow-md transition-all cursor-pointer p-2 flex flex-col justify-between overflow-hidden`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                        if (b.id) {
                                          setFocusedBookingId(b.id);
                                        }
                                      }}
                                    >
                                  <div>
                                        <p className="text-xs font-bold text-[#0d121b] mb-0.5">
                                      {serviceName}
                                    </p>
                                        <p className="text-[11px] text-[#64748b]">{designerName}</p>
                                  </div>
                                      <div className="flex items-center justify-between mt-1">
                                        <span className="text-[10px] font-mono text-[#94a3b8]">
                                          {timeLabel}
                                    </span>
                                        <span className="text-[10px] font-bold text-[#0d121b] bg-gray-100 px-1.5 py-0.5 rounded">
                                        {amount}
                                      </span>
                                  </div>
                                </div>
                              </div>
                                );
                              })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 md:p-8 relative">
            <button
              type="button"
              onClick={() => setIsNewBookingOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-black"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
            <h2 className="text-lg font-bold text-black mb-2">New Booking</h2>
            <p className="text-xs text-gray-500 mb-4">
              직원이 손님 대신 예약을 빠르게 넣을 수 있도록, 위치 · 서비스 · 디자이너 · 날짜/시간을 한 번에 선택합니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: form sections */}
              <div className="space-y-4">
                {/* Shop */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">1. Shop</p>
                  <p className="text-xs text-gray-500">예약이 들어갈 매장을 선택하세요.</p>
                  {newBookingLoadingShops ? (
                    <p className="text-xs text-gray-500">Loading shops...</p>
                  ) : newBookingShops.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No shops found. Please configure shops in admin first.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {newBookingShops.map((shop) => (
                        <button
                          key={shop.id}
                          type="button"
                          onClick={async () => {
                            setNewBookingShopId(shop.id);
                            setNewBookingDesignerId(null);
                            setNewBookingServiceId(null);
                            setNewBookingLoadingOptions(true);
                            try {
                              const [dRes, sRes] = await Promise.all([
                                fetch(`/api/designers?shopId=${shop.id}`),
                                fetch(`/api/services?shopId=${shop.id}`),
                              ]);
                              const dJson = await dRes.json();
                              const sJson = await sRes.json();
                              if (dRes.ok) setNewBookingDesigners(dJson.designers || []);
                              if (sRes.ok) setNewBookingServices(sJson.services || []);
                            } finally {
                              setNewBookingLoadingOptions(false);
                            }
                          }}
                          className={`w-full text-left border rounded-xl px-3 py-2 text-sm flex justify-between items-center ${
                            newBookingShopId === shop.id
                              ? 'border-black bg-black/5'
                              : 'border-gray-200 hover:border-black'
                          }`}
                        >
                          <span>{shop.name}</span>
                          {newBookingShopId === shop.id && (
                            <span className="material-symbols-outlined text-sm">check</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Service */}
                <div className="space-y-3 pt-1 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-700">2. Service</p>
                  <p className="text-xs text-gray-500">
                    선택한 매장에서 제공하는 시술을 고르세요.
                  </p>
                  {!newBookingShopId ? (
                    <p className="text-xs text-gray-400">먼저 Shop 을 선택해 주세요.</p>
                  ) : newBookingLoadingOptions ? (
                    <p className="text-xs text-gray-500">Loading services...</p>
                  ) : newBookingServices.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No services for this shop. Please configure services first.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {newBookingServices.map((s: any) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setNewBookingServiceId(s.id)}
                          className={`w-full text-left border rounded-xl px-3 py-2 text-sm flex justify-between items-center ${
                            newBookingServiceId === s.id
                              ? 'border-black bg-black/5'
                              : 'border-gray-200 hover:border-black'
                          }`}
                        >
                          <span>{s.name}</span>
                          <span className="text-xs text-gray-500">
                            {s.duration_minutes ? `${s.duration_minutes} mins` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Designer */}
                <div className="space-y-3 pt-1 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-700">3. Designer</p>
                  <p className="text-xs text-gray-500">시술을 담당할 디자이너를 선택하세요.</p>
                  {!newBookingShopId ? (
                    <p className="text-xs text-gray-400">먼저 Shop 을 선택해 주세요.</p>
                  ) : newBookingLoadingOptions ? (
                    <p className="text-xs text-gray-500">Loading designers...</p>
                  ) : newBookingDesigners.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No designers for this shop. Please link designers in admin.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {newBookingDesigners.map((d: any) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setNewBookingDesignerId(d.id)}
                          className={`w-full text-left border rounded-xl px-3 py-2 text-sm flex justify-between items-center ${
                            newBookingDesignerId === d.id
                              ? 'border-black bg-black/5'
                              : 'border-gray-200 hover:border-black'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span>{d.name}</span>
                            {d.role && (
                              <span className="text-[11px] text-gray-500">{d.role}</span>
                            )}
                          </div>
                          {newBookingDesignerId === d.id && (
                            <span className="material-symbols-outlined text-sm">check</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date & Time */}
                <div className="space-y-4 pt-1 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-700">4. Date &amp; Time</p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Date (Sydney)
                    </label>
                    <input
                      type="date"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      value={newBookingDate}
                      onChange={(e) => setNewBookingDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Time
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        '9:00 AM',
                        '9:30 AM',
                        '10:00 AM',
                        '10:30 AM',
                        '11:00 AM',
                        '11:30 AM',
                        '12:00 PM',
                        '1:00 PM',
                        '2:00 PM',
                        '3:00 PM',
                        '4:00 PM',
                        '5:00 PM',
                        '6:00 PM',
                        '7:00 PM',
                        '8:00 PM',
                        '9:00 PM',
                      ].map((t) => {
                        const isSelected = newBookingTime === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setNewBookingTime(t)}
                            className={`border rounded-lg px-2 py-1.5 ${
                              isSelected
                                ? 'bg-black text-white border-black'
                                : 'border-gray-200 text-gray-800 hover:border-black'
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              {/* Right: summary */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 text-sm">
                <p className="font-semibold text-gray-800">Summary</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Shop</span>
                    <span className="font-medium text-gray-900">
                      {
                        newBookingShops.find((s) => s.id === newBookingShopId)
                          ?.name
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Service</span>
                    <span className="font-medium text-gray-900">
                      {
                        newBookingServices.find((s: any) => s.id === newBookingServiceId)
                          ?.name
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Designer</span>
                    <span className="font-medium text-gray-900">
                      {
                        newBookingDesigners.find((d: any) => d.id === newBookingDesignerId)
                          ?.name
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium text-gray-900">{newBookingDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Time</span>
                    <span className="font-medium text-gray-900">{newBookingTime}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsNewBookingOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                disabled={
                  !newBookingShopId ||
                  !newBookingServiceId ||
                  !newBookingDesignerId ||
                  !newBookingDate ||
                  !newBookingTime ||
                  newBookingSubmitting
                }
                onClick={async () => {
                  if (
                    !newBookingShopId ||
                    !newBookingServiceId ||
                    !newBookingDesignerId ||
                    !newBookingDate ||
                    !newBookingTime
                  )
                    return;
                  setNewBookingSubmitting(true);
                  try {
                    const resCreate = await fetch('/api/appointment', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        shopId: newBookingShopId,
                        designerId: newBookingDesignerId,
                        serviceId: newBookingServiceId,
                        day: Number(newBookingDate.split('-')[2]),
                        timeLabel: newBookingTime,
                        totalAmount: null,
                        depositAmount: null,
                        fullDate: newBookingDate,
                      }),
                    });
                    if (!resCreate.ok) {
                      console.error('Failed to create booking', await resCreate.text());
                    } else {
                      setBookingSuccessMessage('New booking has been created successfully.');
                      setTimeout(() => {
                        setBookingSuccessMessage(null);
                      }, 3000);
                    }
                    setIsNewBookingOpen(false);
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
                className={`px-5 py-2 rounded-lg text-xs md:text-sm font-semibold text-white flex items-center gap-2 ${
                  newBookingSubmitting
                    ? 'bg-gray-400 cursor-wait'
                    : 'bg-black hover:bg-gray-800'
                }`}
              >
                {newBookingSubmitting ? 'Saving...' : 'Create Booking'}
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
            <h2 className="text-lg font-bold text-black mb-2">Edit Booking</h2>
            <p className="text-xs text-gray-500 mb-4">
              날짜와 시간을 수정할 수 있습니다. 디자이너/서비스를 변경해야 한다면, 취소 후 새로 예약을 만들어 주세요.
            </p>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Booking ID</span>
                <span className="font-semibold text-gray-800">#{editingBooking.id}</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Date (Sydney)
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Time</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                >
                  {[
                    '9:00 AM',
                    '9:30 AM',
                    '10:00 AM',
                    '10:30 AM',
                    '11:00 AM',
                    '11:30 AM',
                    '12:00 PM',
                    '1:00 PM',
                    '2:00 PM',
                    '3:00 PM',
                    '4:00 PM',
                    '5:00 PM',
                    '6:00 PM',
                    '7:00 PM',
                    '8:00 PM',
                    '9:00 PM',
                  ].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
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
                {editSubmitting ? 'Saving...' : 'Save Changes'}
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">예약금지 등록</h2>
              <button
                onClick={() => {
                  setIsRestrictionModalOpen(false);
                  setRestrictionDesignerId(null);
                  setRestrictionDesignerName('');
                  setRestrictionDate('');
                  setRestrictionStartTime('');
                  setRestrictionEndTime('');
                  setExistingRestriction(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
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
                  제한 유형
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="date"
                      checked={restrictionType === 'date'}
                      onChange={(e) => setRestrictionType(e.target.value as 'date' | 'time')}
                    />
                    <span className="text-sm">전체 날짜</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="time"
                      checked={restrictionType === 'time'}
                      onChange={(e) => setRestrictionType(e.target.value as 'date' | 'time')}
                    />
                    <span className="text-sm">특정 시간</span>
                  </label>
                </div>
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
                          }
                        } else {
                          setExistingRestriction(null);
                          setRestrictionStartTime('');
                          setRestrictionEndTime('');
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
              {existingRestriction && !loadingExistingRestriction && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-yellow-600 text-lg">info</span>
                    <span className="text-sm font-medium text-yellow-900">이미 예약금지가 설정되어 있습니다.</span>
                  </div>
                  <div className="text-xs text-yellow-800 space-y-1">
                    <div>
                      <span className="font-medium">유형:</span>{' '}
                      {existingRestriction.restriction_type === 'date' ? '전체 날짜' : '특정 시간'}
                    </div>
                    {existingRestriction.restriction_type === 'time' && (
                      <div>
                        <span className="font-medium">시간:</span>{' '}
                        {existingRestriction.start_time?.substring(0, 5)} - {existingRestriction.end_time?.substring(0, 5)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm('예약금지를 취소하시겠습니까?')) {
                        return;
                      }
                      setRestrictionSubmitting(true);
                      try {
                        const res = await fetch(`/api/booking-restrictions?id=${existingRestriction.id}`, {
                          method: 'DELETE',
                        });
                        if (res.ok) {
                          alert('예약금지가 취소되었습니다.');
                          setExistingRestriction(null);
                          // Comment: Reload restrictions
                          const restrictionsRes = await fetch(
                            `/api/booking-restrictions?date=${encodeURIComponent(restrictionDate)}`
                          );
                          const restrictionsData = await restrictionsRes.json();
                          if (restrictionsRes.ok) {
                            setBookingRestrictions(restrictionsData.restrictions || []);
                          }
                        } else {
                          const data = await res.json();
                          alert(data.error || '예약금지 취소에 실패했습니다.');
                        }
                      } catch (error) {
                        console.error('Error deleting restriction:', error);
                        alert('예약금지 취소에 실패했습니다.');
                      } finally {
                        setRestrictionSubmitting(false);
                      }
                    }}
                    disabled={restrictionSubmitting}
                    className="w-full px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition-colors"
                  >
                    {restrictionSubmitting ? '취소 중...' : '예약금지 취소'}
                  </button>
                </div>
              )}
              
              {restrictionType === 'time' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      시작 시간
                    </label>
                    <input
                      type="time"
                      value={restrictionStartTime}
                      onChange={(e) => setRestrictionStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      종료 시간
                    </label>
                    <input
                      type="time"
                      value={restrictionEndTime}
                      onChange={(e) => setRestrictionEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    />
                  </div>
                </>
              )}
              {!existingRestriction && (
                <button
                  onClick={async () => {
                    if (!restrictionDate || (restrictionType === 'time' && (!restrictionStartTime || !restrictionEndTime))) {
                      alert('모든 필드를 입력해주세요.');
                      return;
                    }
                    setRestrictionSubmitting(true);
                    try {
                      const res = await fetch('/api/booking-restrictions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          designer_id: restrictionDesignerId,
                          restriction_type: restrictionType,
                          restriction_date: restrictionDate,
                          start_time: restrictionType === 'time' ? restrictionStartTime : null,
                          end_time: restrictionType === 'time' ? restrictionEndTime : null,
                        }),
                      });
                      if (res.ok) {
                        alert('예약금지가 등록되었습니다.');
                        // Comment: Reload restrictions
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
                        alert(data.error || '예약금지 등록에 실패했습니다.');
                      }
                    } catch (error) {
                      console.error('Error creating restriction:', error);
                      alert('예약금지 등록에 실패했습니다.');
                    } finally {
                      setRestrictionSubmitting(false);
                    }
                  }}
                  disabled={restrictionSubmitting}
                  className="w-full px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-60 transition-colors"
                >
                  {restrictionSubmitting ? '등록 중...' : '등록'}
                </button>
              )}
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
    </div>
  );
}


