'use client';

import { useAppointmentRequest } from '@/lib/appointment-request';
import React, { useState, useEffect, useMemo } from 'react';
import HolidayCalendarHeader from './HolidayCalendarHeader';
import HolidayCalendarControls from './HolidayCalendarControls';
import HolidayCalendarGrid from './HolidayCalendarGrid';
import HolidayCalendarLegend from './HolidayCalendarLegend';
import Modal from '@/components/ui/Modal';
import { Z } from '@/lib/constants';
import type { HolidayType, DayEntry } from '@/lib/types';

function isDirectorRole(role: string | null | undefined): boolean {
  return String(role || '').toLowerCase().includes('director');
}

interface HolidayCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  allDesigners: Array<{ id: number; name: string; shop_id?: number | null; role?: string | null }>;
  allShops: Array<{ id: number; name: string }>;
  onOpenHolidayModal?: (designerId: number | null, designerName: string, shopId?: number | null) => void;
  refreshKey?: number;
}

export default function HolidayCalendarModal({
  isOpen,
  onClose,
  allDesigners,
  allShops,
  onOpenHolidayModal,
  refreshKey,
}: HolidayCalendarModalProps) {
  const request = useAppointmentRequest();
  const [selectedDesignerFilter, setSelectedDesignerFilter] = useState('전체');
  const [selectedShopFilter, setSelectedShopFilter] = useState('전체');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [rawTimeOffs, setRawTimeOffs] = useState<any[]>([]);
  const [rawSchedules, setRawSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Resolve selected shop filter to shop ID (null = all shops)
  const selectedShopId = useMemo(() => {
    if (selectedShopFilter === '전체') return null;
    const shop = allShops.find((s) => s.name === selectedShopFilter);
    return shop?.id ?? null;
  }, [selectedShopFilter, allShops]);

  // Designers belonging to the selected shop (for "전체 휴무" detection)
  const designersForShop = useMemo(() => {
    if (selectedShopId === null) return allDesigners;
    return allDesigners.filter((d) => {
      if (isDirectorRole(d.role)) return true;
      return d.shop_id != null && Number(d.shop_id) === selectedShopId;
    });
  }, [allDesigners, selectedShopId]);

  // Fetch raw data (no processing — processing happens in useMemo below)
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

        const [timeOffRes, schedulesRes] = await Promise.all([
          request(`/api/designer-time-off?start_date=${monthStart}&end_date=${monthEnd}`),
          request(`/api/designer-schedules?all=true`),
        ]);

        const timeOffJson = await timeOffRes.json();
        const schedulesJson = await schedulesRes.json();

        if (!timeOffRes.ok) {
          console.error('Error fetching designer time off for calendar:', timeOffJson);
          setRawTimeOffs([]);
          setRawSchedules([]);
          return;
        }

        setRawTimeOffs(timeOffJson.timeOffs || []);
        setRawSchedules(schedulesRes.ok ? schedulesJson.schedules || [] : []);
      } catch (error) {
        console.error('Error fetching calendar data:', error);
        setRawTimeOffs([]);
        setRawSchedules([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, currentMonth, refreshKey]);

  // Build calendar data from raw data, applying shop filter
  const calendarData = useMemo(() => {
    if (rawTimeOffs.length === 0 && rawSchedules.length === 0) return {};

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const designerNameMap = new Map<number, string>();
    allDesigners.forEach((d) => {
      if (d.id && d.name) designerNameMap.set(d.id, d.name);
    });

    // Build schedule lookup: Map<designerId, Set<weekday>>
    const scheduleMap = new Map<number, Set<number>>();
    rawSchedules.forEach((s: any) => {
      if (!scheduleMap.has(s.designer_id)) {
        scheduleMap.set(s.designer_id, new Set());
      }
      scheduleMap.get(s.designer_id)!.add(s.weekday);
    });

    // Filter time-offs by shop
    const filteredTimeOffs = selectedShopId === null
      ? rawTimeOffs
      : rawTimeOffs.filter((to: any) => {
          const sid = to.shop_id;
          return sid == null || Number(sid) === selectedShopId;
        });

    const data: Record<string, DayEntry[]> = {};
    const seenEntries = new Map<string, HolidayType>();
    const typePriority: Record<HolidayType, number> = { special: 3, arbitrary: 2, regular: 1 };

    // Process time-off records with dedup
    filteredTimeOffs.forEach((to: any) => {
      const designerId = to.designer_id as number | undefined;
      if (!designerId) return;
      const name = (to.designer && to.designer.name) || designerNameMap.get(designerId);
      if (!name) return;

      const start = new Date(to.start_date);
      const end = new Date(to.end_date);
      const current = new Date(start);
      while (current <= end) {
        if (current.getFullYear() === year && current.getMonth() === month) {
          const dateStr = `${current.getFullYear()}-${String(
            current.getMonth() + 1,
          ).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;

          let type: HolidayType = 'arbitrary';
          if (to.reason === '정기 휴무') {
            type = 'regular';
          } else if (to.reason === '특별 근무일') {
            type = 'special';
          }

          const key = `${dateStr}::${name}`;
          const existing = seenEntries.get(key);
          if (!existing || typePriority[type] > typePriority[existing]) {
            if (existing && data[dateStr]) {
              const idx = data[dateStr].findIndex(
                (e) => e.name === name && e.type === existing,
              );
              if (idx !== -1) data[dateStr].splice(idx, 1);
            }
            if (!data[dateStr]) data[dateStr] = [];
            data[dateStr].push({ name, type });
            seenEntries.set(key, type);
          }
        }
        current.setDate(current.getDate() + 1);
      }
    });

    // Compute regular holidays from designer_schedules
    // When shop filter is active, only show regular holidays for designers belonging to that shop
    const designersToCheck = selectedShopId === null ? allDesigners : designersForShop;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const weekday = date.getDay();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      designersToCheck.forEach((designer) => {
        const designerScheduledDays = scheduleMap.get(designer.id);
        if (!designerScheduledDays || designerScheduledDays.size === 0) return;

        const hasScheduleForDay = designerScheduledDays.has(weekday);
        if (hasScheduleForDay) return;

        const name = designerNameMap.get(designer.id);
        if (!name) return;

        const key = `${dateStr}::${name}`;
        const existing = seenEntries.get(key);
        if (existing) return;

        if (!data[dateStr]) data[dateStr] = [];
        data[dateStr].push({ name, type: 'regular' });
        seenEntries.set(key, 'regular');
      });
    }

    return data;
  }, [rawTimeOffs, rawSchedules, currentMonth, allDesigners, selectedShopId, designersForShop]);

  // Apply designer name filter on top of shop-filtered data
  const filteredCalendarData = useMemo(() => {
    if (selectedDesignerFilter === '전체') {
      return calendarData;
    } else if (selectedDesignerFilter === '전체(휴무 제외)') {
      const filtered: Record<string, DayEntry[]> = {};
      Object.keys(calendarData).forEach((dateStr) => {
        const nonRegularEntries = calendarData[dateStr].filter(
          (entry) => entry.type !== 'regular',
        );
        if (nonRegularEntries.length > 0) {
          filtered[dateStr] = nonRegularEntries;
        }
      });
      return filtered;
    } else {
      const filtered: Record<string, DayEntry[]> = {};
      Object.keys(calendarData).forEach((dateStr) => {
        const filteredEntries = calendarData[dateStr].filter(
          (entry) => entry.name === selectedDesignerFilter,
        );
        if (filteredEntries.length > 0) {
          filtered[dateStr] = filteredEntries;
        }
      });
      return filtered;
    }
  }, [calendarData, selectedDesignerFilter]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const handleRegisterModify = () => {
    if (!onOpenHolidayModal) return;

    if (selectedDesignerFilter === '전체' || selectedDesignerFilter === '전체(휴무 제외)') {
      onOpenHolidayModal(null, '전체', selectedShopId);
      return;
    }

    const selectedDesigner = allDesigners.find((d) => d.name === selectedDesignerFilter);
    onOpenHolidayModal(selectedDesigner?.id ?? null, selectedDesigner?.name ?? '전체', selectedShopId);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      hideHeader
      zIndex={Z.MODAL_BASE}
      maxWidth="max-w-7xl"
      className="max-h-[90vh] flex flex-col overflow-hidden"
      bodyClassName="p-0 flex-1 min-h-0 flex flex-col"
    >
      <HolidayCalendarHeader onClose={onClose} />

      <div className="flex-1 min-h-0 overflow-auto">
        <HolidayCalendarControls
          selectedDesignerFilter={selectedDesignerFilter}
          allDesigners={allDesigners}
          onDesignerFilterChange={setSelectedDesignerFilter}
          allShops={allShops}
          selectedShopFilter={selectedShopFilter}
          onShopFilterChange={setSelectedShopFilter}
          currentMonth={currentMonth}
          onPreviousMonth={() => handleMonthChange('prev')}
          onNextMonth={() => handleMonthChange('next')}
          onRegisterModify={handleRegisterModify}
        />

        {loading ? (
          <div className="flex items-center justify-center h-60">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-600">로딩 중...</p>
            </div>
          </div>
        ) : (
          <HolidayCalendarGrid
            currentMonth={currentMonth}
            calendarData={filteredCalendarData}
            allDesignerCount={designersForShop.length}
            onDesignerClick={(designerName) => {
              if (!onOpenHolidayModal) return;
              const designer = allDesigners.find((d) => d.name === designerName);
              if (designer) {
                onOpenHolidayModal(designer.id, designer.name, selectedShopId);
              }
            }}
          />
        )}

        <HolidayCalendarLegend onClose={onClose} />
      </div>
    </Modal>
  );
}
