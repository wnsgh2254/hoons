'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import type { Booking } from '@/lib/types';

type BookingWithRelations = Booking & {
  designer?: { id: number; name: string } | null;
  service?: { id: number; name: string; duration_minutes?: number | null } | null;
};

// Comment: Grid configuration for full schedule view
const GRID_START_HOUR = 9; // 09:00
const GRID_END_HOUR = 24; // 24:00 (exclusive upper bound, last label 23:00)
const GRID_HOUR_HEIGHT = 120; // px per hour

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

  // Comment: Load designer availability for the selected date (per weekday)
  useEffect(() => {
    const fetchAvailability = async () => {
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
        setAvailableDesignerIds(data.designerIds || []);
      } catch (err) {
        console.error('Error loading designer availability:', err);
        setAvailableDesignerIds([]);
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

  // Comment: Designers visible in the grid for the selected day
  const visibleDesigners = useMemo(() => {
    const entries = Object.entries(bookingsByDesigner);

    // If no availability is configured yet, show all designers that have bookings
    if (!availableDesignerIds.length) {
      return entries.map(([name]) => name);
    }

    return entries
      .filter(([, list]) => {
        const any = list[0];
        const id = (any as any)?.designer_id ?? (any as any)?.designer?.id;
        if (!id) return false;
        return availableDesignerIds.includes(Number(id));
      })
      .map(([name]) => name);
  }, [bookingsByDesigner, availableDesignerIds]);

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
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col justify-between bg-white border-r border-gray-200 h-full overflow-y-auto hidden md:flex">
        <div className="flex flex-col gap-8 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-black flex items-center justify-center rounded-full size-10 text-white">
              <span className="material-symbols-outlined">content_cut</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-wider text-black">HAEYOOM</h1>
              <p className="text-xs text-gray-500 font-medium tracking-widest">SEOUL • SYDNEY</p>
            </div>
          </div>
          <nav className="flex flex-col gap-2">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
            <Link
              href="/admin/sales"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">monitoring</span>
              <span className="text-sm font-medium">Sales Overview</span>
            </Link>
            <Link
              href="/admin/appointments"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black text-white shadow-lg shadow-black/20"
            >
              <span className="material-symbols-outlined">calendar_month</span>
              <span className="text-sm font-medium">Appointments</span>
            </Link>
            <Link
              href="/admin/staff"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">groups</span>
              <span className="text-sm font-medium">Staff</span>
            </Link>
            <Link
              href="/admin/inventory"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">inventory_2</span>
              <span className="text-sm font-medium">Inventory</span>
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">settings</span>
              <span className="text-sm font-medium">Settings</span>
            </Link>
          </nav>
        </div>
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="size-10 rounded-full bg-cover bg-center grayscale"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAjhD0WmE9CSsv_JWqCz325cTf4HM2m39YT5VSu09Lc2YQqci2GEmubVTLNi3mhaSzXeI1aOETFfv9VpKUOwV_LoiTkw5FBCVBNCznsSmppHNQiAWcQrAE7cw73i0kzJkDOrZHBn-rVhTR-sBvQ9yPTejyv271gCTallJe0gM8N5_cOiuGK0ZhmDcFdRyL97zFu_5tj-DgObrIlkZqquHTlK8OeBJB297gGVKfjJWl_e8t3cnmO4nqHfGDOJjhwTSHFyyB9M083o3dh')",
              }}
            />
            <div className="flex flex-col">
              <p className="text-sm font-medium text-black">Sarah Kim</p>
              <p className="text-xs text-gray-500">Manager</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        {/* Success toast for new bookings */}
        {bookingSuccessMessage && (
          <div className="pointer-events-none fixed right-4 top-4 z-50">
            <div className="pointer-events-auto rounded-xl bg-black text-white shadow-lg px-4 py-3 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>{bookingSuccessMessage}</span>
            </div>
          </div>
        )}
        <header className="h-16 flex items-center justify-between px-6 md:px-10 py-4 bg-white border-b border-gray-100 z-10">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Dashboard</span>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-black">Appointments Management</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">
                search
              </span>
              <input
                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-full text-sm focus:ring-1 focus:ring-black w-64 placeholder-gray-400"
                placeholder="Search bookings..."
                type="text"
              />
            </div>
            <button className="flex items-center justify-center size-8 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
            <button className="flex items-center justify-center size-8 rounded-full hover:bg-gray-100 text-gray-500 md:hidden transition-colors">
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-gray-50/50">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-black">Appointments</h2>
                <p className="text-gray-500 text-sm">Manage schedule, bookings and stylist availability.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewBookingOpen(true);
                    setNewBookingShopId(null);
                    setNewBookingDesignerId(null);
                    setNewBookingServiceId(null);
                    setNewBookingDate(selectedDate);
                    setNewBookingTime('10:00 AM');
                  }}
                  className="flex items-center gap-2 bg-linear-to-r from-black to-gray-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg hover:brightness-110"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  New Booking
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
              {/* Full Schedule replaces calendar */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-semibold">Schedule</span>
                    <span className="text-xs text-gray-400">({selectedDayLabel})</span>
                  </div>
                  <div className="flex items-center gap-2" ref={dateButtonWrapperRef}>
                    {/* Hidden native input keeps value in sync but UI uses custom popover */}
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={selectedDate}
                      onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                      className="hidden"
                    />
                    <div className="relative">
                      <button
                        type="button"
                        onClick={handleOpenDatePicker}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">calendar_month</span>
                        <span className="hidden sm:inline">Change date</span>
                      </button>

                      {isDatePopoverOpen && (
                        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg z-20 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-700">{monthLabel}</span>
                          </div>
                          <div className="grid grid-cols-7 gap-1 text-[11px] text-gray-400 mb-1">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                              <span key={d} className="text-center">
                                {d}
                              </span>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1 text-xs">
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
                                  return <div key={idx} className="h-7" />;
                                }
                                const isSelected = day === selectedDayNumber;
                                const hasBookings = !!dayCounts[day];
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      const newDate = buildDateFromDay(selectedDate, day);
                                      setSelectedDate(newDate);
                                      setIsDatePopoverOpen(false);
                                    }}
                                    className={`h-7 w-7 mx-auto rounded-full flex flex-col items-center justify-center text-[11px] transition-all
                                      ${
                                        isSelected
                                          ? 'bg-black text-white shadow-md'
                                          : 'bg-white text-gray-800 hover:bg-gray-100 border border-transparent hover:border-gray-200'
                                      }`}
                                  >
                                    <span>{day}</span>
                                    {hasBookings && (
                                      <span className="mt-0.5 h-0.5 w-3 rounded-full bg-emerald-500" />
                                    )}
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  ref={scheduleRef}
                  className="flex-1 overflow-auto schedule-scroll bg-[#f8f9fc] relative rounded-2xl border border-gray-200 shadow-sm cursor-grab"
                  onMouseDown={handleScheduleMouseDown}
                  onMouseMove={handleScheduleMouseMove}
                  onMouseLeave={endScheduleDrag}
                  onMouseUp={endScheduleDrag}
                >
                  <div className="min-w-[1024px] pb-10">
                    {/* Sticky Header: show designers that have bookings on this day */}
                    <div className="sticky top-0 z-10 flex border-b border-[#e2e8f0] bg-[#f8f9fc] shadow-sm">
                      <div className="w-20 shrink-0 border-r border-[#e2e8f0] bg-[#f8f9fc]" />
                      <div className="grid grid-cols-4 flex-1">
                        {visibleDesigners.slice(0, 4).map((name, index) => {
                          const color = designerColorMap[name];
                          const initials = name
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase();
                          return (
                            <div
                              key={name}
                              className="flex items-center gap-3 border-r border-[#e2e8f0] px-4 py-3 bg-white/50 backdrop-blur-sm last:border-r-transparent"
                            >
                              <div
                                className={`size-8 rounded-full flex items-center justify-center font-bold text-xs ${color?.bg ?? DESIGNER_COLORS[index % DESIGNER_COLORS.length].bg} ${color?.text ?? DESIGNER_COLORS[index % DESIGNER_COLORS.length].text}`}
                              >
                                {initials}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-[#0d121b]">{name}</p>
                                <p className="text-xs text-[#64748b]">Stylist</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Grid Body (still using design demo blocks for now) */}
                    <div
                      className="flex relative"
                      onClick={() => setFocusedBookingId(null)}
                    >
                      {/* Current Time Line (Sydney time, only when viewing today) */}
                      {currentSydneyTime && (
                        <div
                          className="absolute w-full border-t-2 border-[#135bec] z-10 pointer-events-none flex items-center"
                          style={{ top: currentSydneyTime.top }}
                        >
                          <div className="absolute left-0 -translate-y-1/2 bg-[#135bec] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-r-md">
                            {currentSydneyTime.label}
                          </div>
                          <div className="size-2 rounded-full bg-[#135bec] -ml-1" />
                        </div>
                      )}

                      {/* Time Column */}
                      <div className="w-20 shrink-0 border-r border-[#e2e8f0] bg-white text-xs font-medium text-[#94a3b8] flex flex-col">
                        {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }).map((_, i) => {
                          const hour = GRID_START_HOUR + i;
                          const label = `${hour.toString().padStart(2, '0')}:00`;
                          return (
                            <div
                              key={label}
                              className="h-[120px] border-b border-[#f1f5f9] p-2 text-right relative"
                            >
                              <span className="absolute -top-2.5 right-2 bg-white px-1">{label}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Appointment Columns (dynamic grid per designer) */}
                      <div className="grid grid-cols-4 flex-1 bg-white relative">
                        {/* Hour guidelines */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col z-0">
                          {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }).map((_, i) => (
                            <div
                              key={i}
                              className="h-[120px] border-b border-[#f1f5f9] border-dashed"
                            />
                          ))}
                        </div>

                        {/* Show up to four designers with real bookings */}
                        {visibleDesigners.slice(0, 4).map((designerName, colIndex) => {
                          const designerBookings = bookingsByDesigner[designerName] || [];
                          const color = designerColorMap[designerName] ??
                            DESIGNER_COLORS[colIndex % DESIGNER_COLORS.length];
                          return (
                            <div
                              key={designerName}
                              className="border-r border-[#e2e8f0] relative h-full"
                            >
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
                                const top = (startMinutes / 60) * GRID_HOUR_HEIGHT;
                                const height =
                                  Math.max((durationMinutes / 60) * GRID_HOUR_HEIGHT, 60);

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
                    </div>

                    <div className="h-10 bg-transparent" />
                  </div>
                </div>
              </div>

              {/* Right column: upcoming list */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-black">Upcoming ({selectedDayLabel})</h3>
                    <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">
                      {nonCancelledCount}
                    </span>
                  </div>
                  <div className="overflow-y-auto p-4 flex flex-col gap-3 h-[500px] lg:h-auto">
                    {loading ? (
                      <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                        Loading bookings...
                      </div>
                    ) : upcomingBookings.length === 0 ? (
                      <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                        No upcoming bookings for this day.
                      </div>
                    ) : (
                      upcomingBookings.map((b) => {
                        const [hourStr, minuteStr] = b.booking_time.split(':');
                        const hour = Number(hourStr);
                        const minutes = Number(minuteStr);
                        const isPM = hour >= 12;
                        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
                        const timeLabel = `${displayHour.toString().padStart(2, '0')}:${minuteStr}`;
                        const serviceName = b.service?.name || 'Service';
                        const designerName = b.designer?.name || 'Designer';
                        const amount =
                          (b.total_amount ?? 0) > 0
                            ? `AU$${Number(b.total_amount).toFixed(0)}`
                            : b.status === 'cancelled'
                            ? ''
                            : 'Free';

                        const isCancelled = b.status === 'cancelled';

                        return (
                          <div
                            key={b.id}
                            id={b.id ? `upcoming-${b.id}` : undefined}
                            className={`group rounded-xl border p-4 relative transition-all cursor-pointer ${
                              isCancelled
                                ? 'bg-gray-50 border-gray-100 opacity-70'
                                : b.id && b.id === focusedBookingId
                                ? 'bg-amber-50 border-amber-300 shadow-md'
                                : 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-gray-300'
                            }`}
                          >
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingBooking(b);
                                  setEditDate(b.booking_date);
                                  setEditTime(bookingTimeToLabel(b.booking_time));
                                }}
                                className="text-gray-400 hover:text-black"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              {!isCancelled && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBookingToDelete(b);
                                  }}
                                  className={`text-gray-400 hover:text-red-500 ${
                                    cancellingId === b.id ? 'opacity-60 cursor-wait' : ''
                                  }`}
                                  disabled={cancellingId === b.id}
                                >
                                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                                </button>
                              )}
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center min-w-[3rem]">
                                <span className="text-lg font-bold text-black">{timeLabel}</span>
                                <span className="text-xs text-gray-400 uppercase">
                                  {isPM ? 'PM' : 'AM'}
                                </span>
                              </div>
                              <div className="w-px h-10 bg-gray-100" />
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="text-sm font-bold text-black">
                                      {b.id ? `Booking #${b.id}` : 'Booking'}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {serviceName}
                                    </p>
                                  </div>
                                  {isCancelled && (
                                    <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                                      Cancelled
                                    </span>
                                  )}
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="size-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                      <span className="material-symbols-outlined text-[14px]">
                                        person
                                      </span>
                                    </div>
                                    <span className="text-xs text-gray-600">
                                      {designerName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {amount && (
                                      <span className="text-xs font-bold text-black">
                                        {amount}
                                      </span>
                                    )}
                                    {!isCancelled && (
                                      <span
                                        className={`size-2 rounded-full ${
                                          b.status === 'confirmed'
                                            ? 'bg-green-500'
                                            : b.status === 'pending'
                                            ? 'bg-yellow-500'
                                            : 'bg-gray-300'
                                        }`}
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {/* Full schedule is now always visible on the page, so this footer button is no longer needed */}
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
    </div>
  );
}


