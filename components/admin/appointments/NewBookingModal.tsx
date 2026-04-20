'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  EDIT_TIME_OPTIONS,
  getWeekStart,
  getWeekEnd,
  COLOR_LABEL_OPTIONS,
  labelToDbTime,
  bookingTimeToLabel,
  getBookingDurationMinutes,
} from '@/lib/utils/appointment-utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import FormAlert from '@/components/ui/FormAlert';
import { Z } from '@/lib/constants';
import type { BookingWithRelations, NewBookingTimeSlot } from '@/lib/types';
import { DEFAULT_NEW_BOOKING_TIME_SLOT } from '@/lib/types';

function resolveEditModalServiceIds(
  booking: BookingWithRelations,
  categoryServices: { id: number; name: string }[],
): number[] {
  const normalize = (n: string) =>
    n.replace(/\s*\(card\)\s*/gi, '').replace(/\s*\(cash\)\s*/gi, '').trim().toLowerCase();
  const ids: number[] = [];
  const seen = new Set<number>();
  const tryAdd = (serviceId: number | null | undefined) => {
    if (serviceId == null || !Number.isFinite(Number(serviceId))) return;
    const n = Number(serviceId);
    if (seen.has(n) || !categoryServices.some((s) => s.id === n)) return;
    seen.add(n);
    ids.push(n);
  };
  tryAdd(booking.service?.id ?? (booking as { service_id?: number | null }).service_id);
  const raw = String((booking as { custom_service_name?: string | null }).custom_service_name || '').trim();
  if (raw) {
    const parts = raw.split(/\s*(?:\/|,)\s*/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const pLow = part.toLowerCase();
      const found = categoryServices.find(
        (s) =>
          normalize(s.name) === pLow ||
          normalize(s.name).includes(pLow) ||
          pLow.includes(normalize(s.name)),
      );
      if (found) tryAdd(found.id);
    }
  }
  return ids;
}

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  /** When set, modal saves via PATCH and pre-fills from this booking */
  editingBooking?: BookingWithRelations | null;
  // State values (all optional — modal self-loads data when not provided)
  newBookingCustomerSearch?: string;
  newBookingDate?: string;
  newBookingTimeSlots?: NewBookingTimeSlot[];
  newBookingDesigners?: any[];
  newBookingServices?: { id: number; name: string }[];
  newBookingMemo?: string;
  newBookingSubmitting?: boolean;
  newBookingLoadingOptions?: boolean;
  newBookingShopId?: number | null;
  newBookingSelectedCustomerId?: number | null;
  newBookingCustomerSearchResults?: any[];
  newBookingIsCustomerSearching?: boolean;
  // State setters (all optional — default to no-op when parent doesn't need sync)
  setNewBookingCustomerSearch?: (value: string) => void;
  setNewBookingDate?: (value: string) => void;
  setNewBookingTimeSlots?: React.Dispatch<React.SetStateAction<NewBookingTimeSlot[]>>;
  setNewBookingMemo?: (value: string) => void;
  setNewBookingSubmitting?: (value: boolean) => void;
  setIsCustomerRegistrationModalOpen?: (value: boolean) => void;
  setBookingSuccessMessage?: (value: string | null) => void;
  setBookings?: (value: any[]) => void;
  setFilteredBookings?: (value: any[]) => void;
  setNewBookingSelectedCustomerId?: (value: number | null) => void;
  setNewBookingCustomerSearchResults?: (value: any[]) => void;
  setNewBookingIsCustomerSearching?: (value: boolean) => void;
  onViewCustomer?: (customerId: number) => void;
  onOpenCustomerRegistration?: () => void;
  /** Called when booking is created successfully (e.g. from customers page) */
  onSuccess?: (message: string) => void;
  /** Pre-fill customer when opening from customer list */
  registeredCustomer?: { id: number; name: string; phone: string } | null;
  /** e.g. refresh reservation history panel after create/edit */
  onBookingsRefresh?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

export default function NewBookingModal({
  isOpen,
  onClose,
  selectedDate,
  newBookingCustomerSearch = '',
  newBookingDate = '',
  newBookingTimeSlots = [{ ...DEFAULT_NEW_BOOKING_TIME_SLOT }],
  newBookingDesigners = [],
  newBookingServices = [],
  newBookingMemo = '',
  newBookingSubmitting = false,
  newBookingLoadingOptions = false,
  newBookingShopId = null,
  newBookingSelectedCustomerId = null,
  newBookingCustomerSearchResults = [],
  newBookingIsCustomerSearching = false,
  setNewBookingCustomerSearch = noop,
  setNewBookingDate = noop,
  setNewBookingTimeSlots = noop,
  setNewBookingMemo = noop,
  setNewBookingSubmitting = noop,
  setIsCustomerRegistrationModalOpen = noop,
  setBookingSuccessMessage = noop,
  setBookings = noop,
  setFilteredBookings = noop,
  setNewBookingSelectedCustomerId = noop,
  setNewBookingCustomerSearchResults = noop,
  setNewBookingIsCustomerSearching = noop,
  onViewCustomer,
  onOpenCustomerRegistration,
  onSuccess,
  registeredCustomer,
  editingBooking = null,
  onBookingsRefresh,
}: NewBookingModalProps) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  // Comment: Persist selected customer snapshot so past records section never disappears when search results change
  const [selectedCustomerSnapshot, setSelectedCustomerSnapshot] = useState<any | null>(null);
  const [isCustomerSearching, setIsCustomerSearching] = useState(false);
  const [bookingDate, setBookingDate] = useState(selectedDate);
  const [memo, setMemo] = useState('');
  const [colorLabel, setColorLabel] = useState<string | null>(null);
  // Unregistered customer booking state
  const [isUnregisteredBooking, setIsUnregisteredBooking] = useState(false);
  const [unregisteredName, setUnregisteredName] = useState('');
  const [unregisteredPhone, setUnregisteredPhone] = useState('');
  /** Comment: Shown inside this modal when 미등록 POST /api/customers fails (e.g. 409 duplicate) */
  const [unregisteredCustomerError, setUnregisteredCustomerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Comment: Service selections are managed per slot index (multi-select checklist).
  const [slotServiceSelections, setSlotServiceSelections] = useState<number[][]>([[]]);

  const [shops, setShops] = useState<any[]>([]);
  const [shopId, setShopId] = useState<number | null>(null);
  const shopManuallySet = useRef(false);

  // Self-load designers/services/shops when parent doesn't provide them
  const [selfLoadedDesigners, setSelfLoadedDesigners] = useState<any[]>([]);
  const [selfLoadedServices, setSelfLoadedServices] = useState<any[]>([]);
  const [selfLoadingOptions, setSelfLoadingOptions] = useState(false);
  const selfLoadTriggered = useRef(false);

  useEffect(() => {
    if (!isOpen || newBookingDesigners.length > 0 || selfLoadTriggered.current) return;
    selfLoadTriggered.current = true;
    setSelfLoadingOptions(true);
    const targetDate = bookingDate || selectedDate || new Date().toISOString().split('T')[0];
    Promise.all([
      fetch('/api/shops').then((r) => r.json()),
      fetch(`/api/working-designers?date=${encodeURIComponent(targetDate)}`).then((r) => r.json()),
      fetch('/api/services').then((r) => r.json()),
    ])
      .then(([shopsData, designersData, servicesData]) => {
        const shopList = shopsData.shops || [];
        if (shopList.length > 0) {
          setShops(shopList);
          if (!shopManuallySet.current) setShopId((prev) => prev ?? shopList[0].id);
        }
        setSelfLoadedDesigners(designersData.designers || []);
        setSelfLoadedServices(servicesData.services || []);
      })
      .catch(console.error)
      .finally(() => setSelfLoadingOptions(false));
  }, [isOpen, newBookingDesigners.length, bookingDate, selectedDate]);

  useEffect(() => {
    if (!isOpen) selfLoadTriggered.current = false;
  }, [isOpen]);

  const effectiveDesigners = newBookingDesigners.length > 0 ? newBookingDesigners : selfLoadedDesigners;
  const effectiveServices = newBookingServices.length > 0 ? newBookingServices : selfLoadedServices;
  const effectiveLoadingOptions = newBookingLoadingOptions || selfLoadingOptions;
  const editPrefillDoneForIdRef = useRef<number | null>(null);
  // Services are provided via the newBookingServices prop (loaded by initial-data on the parent page)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Latest booking for edit — avoids stale closures while keeping dependency lists small
  const editingBookingRef = useRef(editingBooking);
  editingBookingRef.current = editingBooking;

  // Sync from parent when modal opens with pre-filled customer (e.g. from customers page)
  useEffect(() => {
    if (!isOpen) return;
    // Do not override customer when editing an existing booking (edit mode has its own pre-fill)
    if (editingBooking?.id) return;
    if (registeredCustomer) {
      setSelectedCustomerId(registeredCustomer.id);
      setNewBookingSelectedCustomerId(registeredCustomer.id);
      setCustomerSearch(registeredCustomer.name || '');
      setCustomerSearchResults([registeredCustomer]);
      setSelectedCustomerSnapshot(registeredCustomer);
    }
  }, [isOpen, registeredCustomer?.id, editingBooking?.id]);

  // Comment: Pre-fill form when opening in edit mode (same layout as new booking)
  useEffect(() => {
    if (!isOpen) {
      editPrefillDoneForIdRef.current = null;
      return;
    }
    if (!editingBooking?.id) {
      editPrefillDoneForIdRef.current = null;
      return;
    }
    if (editPrefillDoneForIdRef.current === editingBooking.id) return;
    editPrefillDoneForIdRef.current = editingBooking.id;

    const b = editingBooking;
    const cid = b.customer_id ?? b.customer?.id ?? null;

    let cancelled = false;

    const applyCustomerSnapshot = (snap: { id: number; name: string; phone: string | null }) => {
      setSelectedCustomerId(snap.id);
      setNewBookingSelectedCustomerId(snap.id);
      setSelectedCustomerSnapshot(snap);
      setCustomerSearch(
        `${snap.name || ''}${snap.phone ? ` (${snap.phone})` : ''}`.trim(),
      );
      setCustomerSearchResults([{ ...snap, customer_number: (snap as any).customer_number }]);
      setIsCustomerDropdownOpen(false);
    };

    (async () => {
      if (cid) {
        const fromJoin = b.customer;
        let snap: { id: number; name: string; phone: string | null } = {
          id: cid,
          name: String(fromJoin?.name ?? (b as { customer_name?: string | null }).customer_name ?? ''),
          phone: (fromJoin?.phone ?? (b as { customer_phone?: string | null }).customer_phone) ?? null,
        };
        if (!snap.name.trim() && !snap.phone) {
          try {
            const res = await fetch(`/api/customers/${cid}`);
            const data = await res.json();
            if (cancelled) return;
            if (res.ok && data.customer) {
              snap = {
                id: cid,
                name: String(data.customer.name || ''),
                phone: data.customer.phone ?? null,
              };
            }
          } catch {
            /* keep snap from booking row */
          }
        }
        if (!cancelled) applyCustomerSnapshot(snap);
      } else {
        setSelectedCustomerId(null);
        setNewBookingSelectedCustomerId(null);
        setSelectedCustomerSnapshot(null);
        setCustomerSearch('');
        setCustomerSearchResults([]);
      }
    })();

    setIsUnregisteredBooking(false);

    const bd = b.booking_date || selectedDate;
    setBookingDate(bd);
    setNewBookingDate(bd);
    if (b.shop_id != null) {
      setShopId(b.shop_id);
    }

    const timeLabel =
      b.booking_time != null && String(b.booking_time).length > 0
        ? bookingTimeToLabel(b.booking_time)
        : '10:00 AM';
    const dur = getBookingDurationMinutes(b as any);
    const designerId = (b as { designer_id?: number | null }).designer_id ?? b.designer?.id ?? null;
    setNewBookingTimeSlots([
      {
        ...DEFAULT_NEW_BOOKING_TIME_SLOT,
        designerId,
        time: timeLabel,
        duration: dur,
        serviceTab: 'service',
        serviceId: null,
        selectedItems: [],
      },
    ]);
    // Comment: Clear service checkboxes until newBookingServices effect resolves IDs from custom_service_name / service_id
    setSlotServiceSelections([[]]);

    const note = (b as { memo?: string | null; note?: string | null }).memo ?? (b as { note?: string | null }).note ?? '';
    setMemo(note || '');
    setNewBookingMemo(note || '');
    setColorLabel(((b as { color_label?: string | null }).color_label as string | null) ?? null);

    return () => {
      cancelled = true;
      editPrefillDoneForIdRef.current = null;
    };
  }, [isOpen, editingBooking?.id, editingBooking, selectedDate, setNewBookingDate, setNewBookingMemo, setNewBookingSelectedCustomerId, setNewBookingTimeSlots]);

  // Comment: Resolve service checkboxes when booking_modal_services (effectiveServices) loads after open
  useEffect(() => {
    if (!isOpen || !editingBooking?.id) return;
    const services = Array.isArray(effectiveServices) ? effectiveServices : [];
    if (services.length === 0) return;
    const b = editingBookingRef.current;
    if (!b?.id) return;
    const svcIds = resolveEditModalServiceIds(b, services);
    setSlotServiceSelections((prev) => {
      if ((prev[0] || []).length > 0) return prev;
      return svcIds.length > 0 ? [svcIds] : prev;
    });
  }, [isOpen, editingBooking?.id, effectiveServices]);

  // Comment: Sync booking date from parent when modal opens — respects the slot-click date
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;
    if (!justOpened) return;
    if (editingBooking?.id) return;

    // Comment: Use the pre-filled date from the clicked slot (newBookingDate), fall back to selectedDate
    const dateToUse = newBookingDate || selectedDate;
    setBookingDate(dateToUse);
    const d = new Date(dateToUse);
    if (!Number.isNaN(d.getTime())) {
      setDatePickerMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }

    if (newBookingShopId != null) setShopId(newBookingShopId);
  }, [isOpen, newBookingDate, selectedDate, newBookingShopId, editingBooking?.id]);

  useEffect(() => {
    if (!isOpen) return;
    if (editingBooking?.id) return;
    setSlotServiceSelections((prev) => {
      const next = newBookingTimeSlots.map((_, idx) => prev[idx] || []);
      return next.length > 0 ? next : [[]];
    });
  }, [isOpen, newBookingTimeSlots.length, editingBooking?.id]);

  // Debounced customer search - call API when user types
  // Comment: Skip search when customer is selected to avoid overwriting results and losing selectedCustomerDetail
  useEffect(() => {
    if (!isOpen) return;
    if (selectedCustomerId) return;
    const q = customerSearch.trim();
    if (!q) {
      setCustomerSearchResults([]);
      return;
    }
    const timeoutId = setTimeout(async () => {
      setIsCustomerSearching(true);
      try {
        const res = await fetch(`/api/customers/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.customers)) {
          setCustomerSearchResults(data.customers);
          setIsCustomerDropdownOpen(true);
        } else {
          setCustomerSearchResults([]);
        }
      } catch (err) {
        console.error('Customer search error:', err);
        setCustomerSearchResults([]);
      } finally {
        setIsCustomerSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [isOpen, customerSearch, selectedCustomerId]);

  const selectedCustomerDetail =
    selectedCustomerSnapshot ??
    customerSearchResults.find((r: any) => r.id === selectedCustomerId) ??
    null;

  type CustomerStats = { lastVisitDate?: string; daysSinceLastVisit?: number; appointmentsCount?: number; cancelledCount?: number };
  const [customerDetail, setCustomerDetail] = useState<any | null>(null);
  const [customerStats, setCustomerStats] = useState<CustomerStats>({});
  const [customerDetailLoading, setCustomerDetailLoading] = useState(false);

  // Fetch customer detail + stats when customer is selected
  useEffect(() => {
    if (!isOpen || !selectedCustomerId) {
      setCustomerDetail(null);
      setCustomerStats({});
      return;
    }
    let cancelled = false;
    setCustomerDetailLoading(true);
    (async () => {
      try {
        const [customerRes, bookingsRes] = await Promise.all([
          fetch(`/api/customers/${selectedCustomerId}`),
          fetch(`/api/appointment?customer_id=${selectedCustomerId}&limit=500`),
        ]);
        if (cancelled) return;
        const customerData = await customerRes.json();
        const bookingsData = await bookingsRes.json();
        if (!customerRes.ok || !customerData.customer) {
          setCustomerDetail(null);
          setCustomerStats({});
          return;
        }
        setCustomerDetail(customerData.customer);
        const bookings = bookingsData.bookings || [];
        const completedStatuses = ['confirmed', 'PAID', 'COMPLETED'];
        const completedBookings = bookings.filter((b: any) =>
          completedStatuses.includes(String(b.status || '').toUpperCase())
        );
        const lastBooking = [...completedBookings].sort((a: any, b: any) => {
          const dateA = new Date(`${a.booking_date}T${a.booking_time || '00:00:00'}`);
          const dateB = new Date(`${b.booking_date}T${b.booking_time || '00:00:00'}`);
          return dateB.getTime() - dateA.getTime();
        })[0];
        const lastVisitDate = lastBooking?.booking_date ?? null;
        let daysSinceLastVisit: number | null = null;
        if (lastVisitDate) {
          const diff = new Date().getTime() - new Date(lastVisitDate).getTime();
          daysSinceLastVisit = Math.floor(diff / (1000 * 60 * 60 * 24));
        }
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const recentBookings = bookings.filter((b: any) => new Date(b.booking_date) >= oneYearAgo);
        const cancelledStatuses = ['cancelled', 'CANCELLED', 'canceled', 'CANCELED'];
        const cancelledCount = recentBookings.filter((b: any) =>
          cancelledStatuses.includes(String(b.status || ''))
        ).length;
        if (!cancelled) {
          setCustomerStats({
            lastVisitDate: lastVisitDate ?? undefined,
            daysSinceLastVisit: daysSinceLastVisit ?? undefined,
            appointmentsCount: recentBookings.length,
            cancelledCount,
          });
        }
      } catch (err) {
        console.error('Error loading customer detail:', err);
        if (!cancelled) {
          setCustomerDetail(null);
          setCustomerStats({});
        }
      } finally {
        if (!cancelled) setCustomerDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, selectedCustomerId]);

  // Comment: Duration options — 15-minute steps up to 8h; always include current slot values for edit/long bookings.
  const ADMIN_BOOKING_DURATION_CHOICES = React.useMemo(
    () => Array.from({ length: 31 }, (_, i) => 30 + i * 15),
    [],
  );
  const durationOptions = React.useMemo(() => {
    const fromSlots = newBookingTimeSlots
      .map((s) => s.duration)
      .filter((d): d is number => d != null && Number(d) > 0);
    const merged = new Set([...ADMIN_BOOKING_DURATION_CHOICES, ...fromSlots]);
    return Array.from(merged).sort((a, b) => a - b);
  }, [newBookingTimeSlots, ADMIN_BOOKING_DURATION_CHOICES]);

  const formatDurationLabel = (min: number) => `${min}분`;

  const getServiceNameSummary = (serviceIds: number[]): string =>
    serviceIds
      .map((serviceId) => categoryServices.find((s) => s.id === serviceId)?.name)
      .filter((name): name is string => Boolean(name))
      .join(' / ');

  // Comment: Service list for admin booking modal comes from booking_modal_services table.
  const categoryServices = Array.isArray(effectiveServices) ? effectiveServices : [];

  const handleCancel = () => {
    onClose();
    setNewBookingTimeSlots([{ ...DEFAULT_NEW_BOOKING_TIME_SLOT }]);
    setNewBookingSelectedCustomerId(null);
    setNewBookingCustomerSearchResults([]);
    setCustomerSearch('');
    setSelectedCustomerId(null);
    setSelectedCustomerSnapshot(null);
    setCustomerSearchResults([]);
    setIsCustomerDropdownOpen(false);
    setCustomerDetail(null);
    setCustomerStats({});
    setMemo('');
    setColorLabel(null);
    setIsUnregisteredBooking(false);
    setUnregisteredName('');
    setUnregisteredPhone('');
    setUnregisteredCustomerError(null);
    setSlotServiceSelections([[]]);
  };

  const handleSubmit = async () => {
    // Handle unregistered customer: create customer first
    let finalCustomerId = selectedCustomerId;
    if (isUnregisteredBooking) {
      setUnregisteredCustomerError(null);
      if (!unregisteredName.trim()) {
        setUnregisteredCustomerError('고객명을 입력해주세요.');
        return;
      }
      if (!unregisteredPhone.trim()) {
        setUnregisteredCustomerError('휴대폰 번호를 입력해주세요.');
        return;
      }
      try {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: unregisteredName.trim(),
            phone: unregisteredPhone.trim(),
          }),
        });
        const raw = await res.text();
        let data: { error?: string; existingCustomerName?: string; customer?: { id: number } } = {};
        if (raw.trim()) {
          try {
            data = JSON.parse(raw) as typeof data;
          } catch {
            setUnregisteredCustomerError('서버 응답을 해석할 수 없습니다.');
            return;
          }
        }
        if (!res.ok) {
          if (res.status === 409) {
            let msg = data.error || '이미 등록된 전화번호입니다.';
            const regName = data.existingCustomerName != null ? String(data.existingCustomerName).trim() : '';
            if (regName) {
              msg = `${msg} (등록명: ${regName})`;
            }
            setUnregisteredCustomerError(`${msg} 고객 검색에서 해당 고객을 선택해 주세요.`);
            return;
          }
          setUnregisteredCustomerError(data.error || '고객 등록에 실패했습니다.');
          return;
        }
        finalCustomerId = data.customer?.id ?? null;
        if (finalCustomerId == null) {
          setUnregisteredCustomerError('고객 등록 응답이 올바르지 않습니다.');
          return;
        }
      } catch {
        setUnregisteredCustomerError('고객 등록에 실패했습니다.');
        return;
      }
    }

    if (!finalCustomerId) {
      alert('고객이 선택되지 않았습니다.');
      return;
    }

    if (!shopId) {
      alert('지점을 선택해주세요.');
      return;
    }

    const slots = newBookingTimeSlots;
    if (!bookingDate || slots.length === 0 || slots.some((s) => !s.designerId || !s.time)) {
      alert('디자이너, 날짜, 시작 시간을 모두 선택해주세요.');
      return;
    }
    if (slots.some((_, idx) => (slotServiceSelections[idx] || []).length === 0)) {
      alert('각 예약 행에서 최소 1개의 서비스를 선택해주세요.');
      return;
    }

    const isEditMode = Boolean(editingBooking?.id);

    try {
      // Comment: Overlap check needs minutes; check each slot before creating.
      for (const slot of slots) {
        const dbTime = labelToDbTime(slot.time);
        if (!dbTime) {
          alert('시간 형식 오류가 발생했습니다.');
          return;
        }

        const [hh, mm] = dbTime.split(':');
        const startHour = Number(hh);
        const startMinute = Number(mm);
        if (Number.isNaN(startHour) || Number.isNaN(startMinute)) {
          alert('시간 형식 오류가 발생했습니다.');
          return;
        }

        const newStartMinutes = startHour * 60 + startMinute;
        const newEndMinutes = newStartMinutes + (slot.duration || 60);

        const resExisting = await fetch(
          `/api/appointment?date=${encodeURIComponent(bookingDate)}&designer_id=${encodeURIComponent(
            String(slot.designerId),
          )}`,
        );
        const dataExisting = await resExisting.json();

        if (resExisting.ok && Array.isArray(dataExisting.bookings)) {
          let maxOverlap = 0;
          for (const b of dataExisting.bookings) {
            if (!b.booking_time) continue;
            if (isEditMode && editingBooking && (b as { id?: number }).id === editingBooking.id) continue;
            const [bh, bm] = String(b.booking_time).split(':');
            const existStart = Number(bh) * 60 + Number(bm);
            const existDuration = getBookingDurationMinutes(b as any);
            const existEnd = existStart + existDuration;
            const overlap = Math.max(newStartMinutes, existStart) < Math.min(newEndMinutes, existEnd);
            if (overlap) maxOverlap += 1;
          }

          if (maxOverlap >= 2) {
            alert('같은 시간대에 이미 2개의 예약이 있어 더 이상 등록할 수 없습니다.');
            return;
          }
        }
      }
    } catch (e) {
      console.error('Error checking overlapping bookings', e);
    }

    const selectedCustomer = selectedCustomerDetail || null;

    setSubmitting(true);
    try {
      if (isEditMode && editingBooking) {
        const slot = slots[0];
        const selectedServiceIds = slotServiceSelections[0] || [];
        const serviceSummary = getServiceNameSummary(selectedServiceIds);
        const dbTime = labelToDbTime(slot.time);
        if (!dbTime) {
          alert('시간 형식 오류가 발생했습니다.');
          return;
        }
        const resPatch = await fetch(`/api/appointment/${editingBooking.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_date: bookingDate,
            booking_time: dbTime,
            designer_id: slot.designerId,
            shop_id: shopId,
            service_id: null,
            custom_service_name: serviceSummary || null,
            custom_service_duration: slot.duration || null,
            memo,
            color_label: colorLabel,
          }),
        });
        if (!resPatch.ok) {
          const errorText = await resPatch.text();
          try {
            const parsed = JSON.parse(errorText);
            alert(parsed.error || '예약 수정에 실패했습니다.');
          } catch {
            alert('예약 수정에 실패했습니다.');
          }
          return;
        }
        const editSuccessMessage = '예약이 수정되었습니다.';
        setBookingSuccessMessage(editSuccessMessage);
        onSuccess?.(editSuccessMessage);
        onClose();
        setNewBookingTimeSlots([{ ...DEFAULT_NEW_BOOKING_TIME_SLOT }]);
        setSlotServiceSelections([[]]);
        const weekStart = getWeekStart(selectedDate);
        const weekEnd = getWeekEnd(selectedDate);
        const res = await fetch(
          `/api/appointment?start_date=${encodeURIComponent(weekStart)}&end_date=${encodeURIComponent(weekEnd)}&limit=1000`,
        );
        const data = await res.json();
        if (res.ok) {
          const bookings = Array.isArray(data.bookings) ? data.bookings : [];
          setBookings(bookings);
          setFilteredBookings(bookings);
        }
        onBookingsRefresh?.();
        return;
      }

      // Comment: Create one booking per slot.
      for (const [slotIndex, slot] of slots.entries()) {
        const selectedServiceIds = slotServiceSelections[slotIndex] || [];
        const serviceSummary = getServiceNameSummary(selectedServiceIds);
        const resCreate = await fetch('/api/appointment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopId,
            designerId: slot.designerId,
            serviceId: null,
            day: Number(bookingDate.split('-')[2]),
            timeLabel: slot.time,
            totalAmount: null,
            depositAmount: null,
            fullDate: bookingDate,
            serviceCategory: serviceSummary || null,
            customServiceDuration: slot.duration || null,
            memo,
            colorLabel,
            customerName: isUnregisteredBooking ? unregisteredName.trim() : (selectedCustomer?.name ?? null),
            customerPhone: isUnregisteredBooking ? unregisteredPhone.trim() : (selectedCustomer?.phone ?? (customerSearch || null)),
            existingCustomerId: isUnregisteredBooking ? finalCustomerId : (selectedCustomer?.id ?? finalCustomerId ?? null),
            status: 'BOOKED',
          }),
        });

        if (!resCreate.ok) {
          const errorText = await resCreate.text();
          console.error('Failed to create booking', errorText);
          try {
            const parsed = JSON.parse(errorText);
            alert(parsed.error || '예약 생성에 실패했습니다.');
          } catch {
            alert('예약 생성에 실패했습니다.');
          }
          return;
        }
      }

      const successMessage = '예약이 성공적으로 등록되었습니다.';
      setBookingSuccessMessage(successMessage);
      onSuccess?.(successMessage);

      onClose();
      setNewBookingTimeSlots([{ ...DEFAULT_NEW_BOOKING_TIME_SLOT }]);
      setSlotServiceSelections([[]]);

      // Comment: Refetch full week range (same as main schedule) so UI shows correct data
      const weekStart = getWeekStart(selectedDate);
      const weekEnd = getWeekEnd(selectedDate);
      const res = await fetch(
        `/api/appointment?start_date=${encodeURIComponent(weekStart)}&end_date=${encodeURIComponent(weekEnd)}&limit=1000`
      );
      const data = await res.json();
      if (res.ok) {
        const bookings = Array.isArray(data.bookings) ? data.bookings : [];
        let updatedBookings = bookings;

        setBookings(updatedBookings);
        setFilteredBookings(updatedBookings);
      }
      onBookingsRefresh?.();
    } finally {
      setSubmitting(false);
    }
  };

  // Close date picker on outside click
  useEffect(() => {
    if (!isDatePickerOpen) return;
    const handleClickOutside = () => setIsDatePickerOpen(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isDatePickerOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isDatePickerOpen) {
          setIsDatePickerOpen(false);
          return;
        }
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDatePickerOpen]);

  const shopOptions = shops.map((s: any) => ({ value: s.id, label: s.name }));
  const designerOptions = effectiveDesigners.map((d: any) => ({ value: d.id, label: d.name }));
  const timeOptions = EDIT_TIME_OPTIONS.map((label) => ({
    value: label,
    label: label.replace('AM', '오전').replace('PM', '오후'),
  }));
  const durationSelectOptions = durationOptions.map((min) => ({ value: min, label: formatDurationLabel(min) }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={editingBooking ? '예약 수정' : '예약 등록'}
      zIndex={Z.MODAL_PRIMARY}
      maxWidth="max-w-6xl"
      scrollable
      footer={
        <>
          <Button variant="ghost" onClick={handleCancel}>취소</Button>
          <Button
            loading={submitting}
            disabled={
              (!selectedCustomerId && !isUnregisteredBooking) ||
              (isUnregisteredBooking && (!unregisteredName.trim() || !unregisteredPhone.trim())) ||
              !shopId ||
              !bookingDate ||
              newBookingTimeSlots.length === 0 ||
              newBookingTimeSlots.some((s) => !s.designerId || !s.time) ||
              newBookingTimeSlots.some((_, idx) => (slotServiceSelections[idx] || []).length === 0)
            }
            onClick={handleSubmit}
          >
            {submitting ? '저장중...' : editingBooking ? '변경 저장' : '저장'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Customer Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="고객명 또는 휴대폰"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  if (selectedCustomerId) {
                    setSelectedCustomerId(null);
                    setNewBookingSelectedCustomerId(null);
                    setSelectedCustomerSnapshot(null);
                  }
                  setIsCustomerDropdownOpen(true);
                }}
                onFocus={() => {
                  if ((customerSearch.trim() || customerSearchResults.length > 0) && !selectedCustomerId) {
                    setIsCustomerDropdownOpen(true);
                  }
                }}
                className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />

              {/* Autocomplete dropdown */}
              {isCustomerDropdownOpen && !selectedCustomerId && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {isCustomerSearching && (
                    <div className="px-3 py-2 text-xs text-gray-500">검색 중...</div>
                  )}
                  {!isCustomerSearching && customerSearchResults.length === 0 && customerSearch.trim() && (
                    <div className="px-3 py-2 text-xs text-gray-500">검색 결과가 없습니다.</div>
                  )}
                  {!isCustomerSearching && customerSearchResults.length > 0 && (
                    <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg">
                      {customerSearchResults.map((customer: any) => (
                        <li
                          key={customer.id}
                          className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                          onClick={() => {
                            setSelectedCustomerId(customer.id);
                            setNewBookingSelectedCustomerId(customer.id);
                            setSelectedCustomerSnapshot(customer);
                            setCustomerSearch(
                              `${customer.name || ''}${customer.phone ? ` (${customer.phone})` : ''}`.trim(),
                            );
                            setIsCustomerDropdownOpen(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{customer.name || '이름 없음'} ({customer.customer_number || customer.id})</span>
                            {customer.phone && (
                              <span className="text-[11px] text-gray-500">{customer.phone}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {!isUnregisteredBooking && selectedCustomerId && (selectedCustomerDetail || customerDetail) ? (
            <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
              {/* Customer header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {(customerDetail || selectedCustomerDetail).name} ({(customerDetail || selectedCustomerDetail).customer_number || (customerDetail || selectedCustomerDetail).id})
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(customerDetail || selectedCustomerDetail).phone || '-'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onViewCustomer && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onViewCustomer(selectedCustomerId)}
                    >
                      상세정보
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(null);
                      setNewBookingSelectedCustomerId(null);
                      setSelectedCustomerSnapshot(null);
                      setCustomerSearch('');
                      setCustomerSearchResults([]);
                      setCustomerDetail(null);
                      setCustomerStats({});
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              </div>
              {/* Customer details */}
              <div className="px-4 py-3 space-y-3">
                {customerDetailLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    과거 기록 불러오는 중...
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-gray-500 w-20 flex-shrink-0">담당자</p>
                      <p className="text-sm font-medium text-black">{customerDetail?.assigned_designer?.name || '-'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-gray-500 w-20 flex-shrink-0">최근 방문일</p>
                      <p className="text-sm font-medium text-black">
                        {customerStats?.lastVisitDate
                          ? `${customerStats.daysSinceLastVisit}일전`
                          : '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-gray-500 w-20 flex-shrink-0">최근 1년 예약</p>
                      <p className="text-sm font-medium text-black">
                        {customerStats.appointmentsCount != null
                          ? `${customerStats.appointmentsCount}건${(customerStats.cancelledCount ?? 0) > 0 ? ` (취소 ${customerStats.cancelledCount ?? 0}건)` : ''}`
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <textarea
                        value={customerDetail?.memo || ''}
                        readOnly
                        placeholder="메모 없음"
                        className="w-full min-h-[80px] border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none bg-gray-50 text-gray-700"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : !selectedCustomerId ? (
            <div className="space-y-3">
              <div className="text-xs text-gray-500">
                <p>신규 고객은 먼저 고객을 등록하세요.</p>
                <p className="mt-1">고객을 등록하지 않고 예약 등록을 하시려면 &apos;미등록 고객 예약&apos;을 체크하세요.</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUnregisteredBooking}
                  onChange={(e) => {
                    setIsUnregisteredBooking(e.target.checked);
                    if (!e.target.checked) {
                      setUnregisteredName('');
                      setUnregisteredPhone('');
                      setUnregisteredCustomerError(null);
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black accent-black"
                />
                <span className="text-sm font-medium text-gray-700">미등록 고객 예약</span>
              </label>
              {isUnregisteredBooking && (
                <div className="border border-gray-200 rounded-xl bg-white p-4 space-y-3">
                  {unregisteredCustomerError ? (
                    <div role="alert" aria-live="assertive">
                      <FormAlert message={unregisteredCustomerError} variant="error" />
                    </div>
                  ) : null}
                  <div className="flex items-center gap-3">
                    <label className="w-20 text-sm font-medium text-gray-700 shrink-0">고객명</label>
                    <input
                      type="text"
                      value={unregisteredName}
                      onChange={(e) => {
                        setUnregisteredName(e.target.value);
                        setUnregisteredCustomerError(null);
                      }}
                      placeholder="이름을 입력하세요"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="w-20 text-sm font-medium text-gray-700 shrink-0">휴대폰 번호</label>
                    <input
                      type="tel"
                      value={unregisteredPhone}
                      onChange={(e) => {
                        setUnregisteredPhone(e.target.value.replace(/\D/g, ''));
                        setUnregisteredCustomerError(null);
                      }}
                      placeholder="숫자만 입력해 주세요(- 제외)"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Right Column: Appointment Details */}
        <div className="space-y-4">
          {/* Date */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">날짜</label>
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDatePickerOpen((prev) => !prev);
                    setDatePickerMonth(new Date(bookingDate));
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                >
                  {bookingDate.replace(/-/g, '.')}
                </button>

                {/* Calendar Popup */}
                {isDatePickerOpen && (
                  <div
                    className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10 p-4 min-w-[280px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          const prev = new Date(datePickerMonth);
                          prev.setMonth(prev.getMonth() - 1);
                          setDatePickerMonth(prev);
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                      </button>
                      <span className="text-sm font-semibold text-gray-900">
                        {datePickerMonth.getFullYear()}년 {datePickerMonth.getMonth() + 1}월
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Date(datePickerMonth);
                          next.setMonth(next.getMonth() + 1);
                          setDatePickerMonth(next);
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                      </button>
                    </div>

                    {/* Weekday Header */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                        <div key={day} className="text-center text-xs font-medium text-gray-600 py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Day Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const year = datePickerMonth.getFullYear();
                        const month = datePickerMonth.getMonth();
                        const firstDay = new Date(year, month, 1);
                        const startDate = new Date(firstDay);
                        startDate.setDate(startDate.getDate() - firstDay.getDay());
                        const days: Date[] = [];
                        for (let i = 0; i < 42; i++) {
                          const date = new Date(startDate);
                          date.setDate(startDate.getDate() + i);
                          days.push(date);
                        }
                        return days.map((date, idx) => {
                          const pad = (n: number) => String(n).padStart(2, '0');
                          const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                          const isCurrentMonth = date.getMonth() === month;
                          const isSelected = dateStr === bookingDate;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBookingDate(dateStr);
                                setIsDatePickerOpen(false);
                              }}
                              disabled={!isCurrentMonth}
                              className={`aspect-square text-xs rounded-lg transition-colors ${
                                !isCurrentMonth ? 'text-gray-300' : 'text-gray-900 hover:bg-gray-100'
                              } ${isSelected ? 'bg-black !text-white' : ''}`}
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
            </div>
          </div>

          {/* Shop Select */}
          {shops.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">지점</label>
              <div className="flex-1 max-w-[200px]">
                <Select
                  options={shopOptions}
                  value={shopId ?? ''}
                  onChange={(e) => {
                    setShopId(Number(e.target.value));
                    shopManuallySet.current = true;
                  }}
                />
              </div>
            </div>
          )}

          {/* Single block 내부에 service/designer 선택 행만 추가 */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
            {/* Top row: 디자이너 + 시작시간 + 소요시간 + 추가 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="min-w-0 md:col-span-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">디자이너</label>
                <div className="flex items-end gap-2">
                  <select
                    disabled={effectiveLoadingOptions}
                    value={newBookingTimeSlots[0]?.designerId ?? ''}
                    onChange={(e) => {
                      const newDesignerId = e.target.value ? Number(e.target.value) : null;
                      setNewBookingTimeSlots((prev) =>
                        prev.map((s, i) => (i === 0 ? { ...s, designerId: newDesignerId } : s)),
                      );
                      if (newDesignerId && !shopManuallySet.current) {
                        const designer = effectiveDesigners.find((d: any) => d.id === newDesignerId);
                        if (designer?.shop_id) setShopId(designer.shop_id);
                      }
                    }}
                    className="flex-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                  >
                    <option value="">
                      {effectiveLoadingOptions ? '로딩 중...' : '선택하세요'}
                    </option>
                    {!effectiveLoadingOptions &&
                      effectiveDesigners.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                  {!editingBooking ? (
                    <button
                      type="button"
                      onClick={() => {
                        // Comment: + button adds one booking row with same time/duration as first row.
                        const base = newBookingTimeSlots[0] ?? { ...DEFAULT_NEW_BOOKING_TIME_SLOT };
                        const nextSlot: NewBookingTimeSlot = {
                          ...DEFAULT_NEW_BOOKING_TIME_SLOT,
                          time: base.time,
                          duration: base.duration,
                          selectedItems: [],
                          serviceId: null,
                          designerId: null,
                        };
                        const next = [...newBookingTimeSlots, nextSlot];
                        setNewBookingTimeSlots(next);
                        setSlotServiceSelections((prev) => [...prev, []]);
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                      title="추가"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="min-w-0 md:col-span-4">
                <Select
                  label="시작시간"
                  options={timeOptions}
                  value={newBookingTimeSlots[0]?.time ?? ''}
                  onChange={(e) => {
                    const nextTime = e.target.value;
                    setNewBookingTimeSlots((prev) =>
                      prev.map((s, i) => (i === 0 ? { ...s, time: nextTime } : { ...s, time: nextTime })),
                    );
                  }}
                  wrapperClassName="min-w-0"
                />
              </div>

              <div className="min-w-0 md:col-span-3">
                <Select
                  label="소요시간"
                  options={durationSelectOptions}
                  value={newBookingTimeSlots[0]?.duration ?? 30}
                  onChange={(e) => {
                    const nextDuration = Number(e.target.value);
                    setNewBookingTimeSlots((prev) =>
                      prev.map((s, i) => (i === 0 ? { ...s, duration: nextDuration } : s)),
                    );
                  }}
                  wrapperClassName="min-w-0"
                />
              </div>
            </div>

            {/* Rows: 서비스 only (designer/duration are managed in top row) */}
            {newBookingTimeSlots.map((slot, idx) => (
              <div
                key={idx}
                className={
                  idx === 0
                    ? 'space-y-4'
                    : 'space-y-4 pt-4 border-t border-gray-200'
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="min-w-0 md:col-span-10">
                    <label className="block text-sm font-medium text-gray-700 mb-1">서비스</label>
                    <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white max-h-36 overflow-y-auto space-y-2">
                      {effectiveLoadingOptions ? (
                        <p className="text-gray-500">로딩 중...</p>
                      ) : (
                        categoryServices.map((s) => {
                          const isChecked = (slotServiceSelections[idx] || []).includes(s.id);
                          return (
                            <label key={s.id} className="flex items-center gap-2 text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSlotServiceSelections((prev) => {
                                    const next = [...prev];
                                    const current = [...(next[idx] || [])];
                                    next[idx] = checked
                                      ? [...current, s.id]
                                      : current.filter((serviceId) => serviceId !== s.id);
                                    return next;
                                  });
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black accent-black"
                              />
                              <span>{s.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    {slotServiceSelections[idx]?.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {getServiceNameSummary(slotServiceSelections[idx])}
                      </p>
                    )}
                  </div>

                  <div className="min-w-0 md:col-span-2 flex justify-end">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewBookingTimeSlots((prev) => prev.filter((_, i) => i !== idx));
                          setSlotServiceSelections((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-300 transition-colors"
                        title="삭제"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Color Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">아이콘 표시</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setColorLabel(null)}
                className={`w-7 h-7 rounded border-2 flex items-center justify-center transition-all ${
                  colorLabel === null ? 'border-black' : 'border-gray-200 hover:border-gray-400'
                }`}
                title="없음"
              >
                <span className="material-symbols-outlined text-gray-400 text-sm">close</span>
              </button>
              {COLOR_LABEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColorLabel(opt.value)}
                  className={`w-7 h-7 rounded border-2 transition-all ${
                    colorLabel === opt.value ? 'border-black scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: opt.hex }}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          {/* Appointment Memo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">예약 메모</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모를 입력하세요"
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
        </div>
      </div>

    </Modal>
  );
}