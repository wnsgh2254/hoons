'use client';

import React, { useState, useEffect, useMemo } from 'react';
import HolidayCalendarHeader from './HolidayCalendarHeader';
import HolidayCalendarControls from './HolidayCalendarControls';
import HolidayCalendarGrid from './HolidayCalendarGrid';
import HolidayCalendarLegend from './HolidayCalendarLegend';
import Modal from '@/components/ui/Modal';
import { Z } from '@/lib/constants';
import type { HolidayType, DayEntry } from '@/lib/types';

interface HolidayCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  allDesigners: Array<{ id: number; name: string }>;
  onOpenHolidayModal?: (designerId: number | null, designerName: string) => void;
  refreshKey?: number;
}

export default function HolidayCalendarModal({
  isOpen,
  onClose,
  allDesigners,
  onOpenHolidayModal,
  refreshKey,
}: HolidayCalendarModalProps) {
  const [selectedDesignerFilter, setSelectedDesignerFilter] = useState('전체');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [calendarData, setCalendarData] = useState<Record<string, DayEntry[]>>({});
  const [loading, setLoading] = useState(false);

  const filteredCalendarData = useMemo(() => {
    if (selectedDesignerFilter === '전체') {
      return calendarData;
    } else if (selectedDesignerFilter === '전체(휴무 제외)') {
      const filtered: Record<string, DayEntry[]> = {};
      Object.keys(calendarData).forEach((dateStr) => {
        const nonRegularEntries = calendarData[dateStr].filter(
          (entry) => entry.type !== 'regular'
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
          (entry) => entry.name === selectedDesignerFilter
        );
        if (filteredEntries.length > 0) {
          filtered[dateStr] = filteredEntries;
        }
      });
      return filtered;
    }
  }, [calendarData, selectedDesignerFilter]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchCalendarData = async () => {
      setLoading(true);
      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

        const [timeOffRes, schedulesRes] = await Promise.all([
          fetch(`/api/designer-time-off?start_date=${monthStart}&end_date=${monthEnd}`),
          fetch(`/api/designer-schedules?all=true`),
        ]);

        const timeOffJson = await timeOffRes.json();
        const schedulesJson = await schedulesRes.json();

        if (!timeOffRes.ok) {
          console.error('Error fetching designer time off for calendar:', timeOffJson);
          setCalendarData({});
          return;
        }

        const timeOffs: any[] = timeOffJson.timeOffs || [];
        const allSchedules: any[] = schedulesRes.ok ? (schedulesJson.schedules || []) : [];

        const designerNameMap = new Map<number, string>();
        allDesigners.forEach((d) => {
          if (d.id && d.name) designerNameMap.set(d.id, d.name);
        });

        // Build schedule lookup: Map<designerId, Set<weekday>>
        const scheduleMap = new Map<number, Set<number>>();
        allSchedules.forEach((s: any) => {
          if (!scheduleMap.has(s.designer_id)) {
            scheduleMap.set(s.designer_id, new Set());
          }
          scheduleMap.get(s.designer_id)!.add(s.weekday);
        });

        const data: Record<string, DayEntry[]> = {};

        // Process time-off records (임의 휴일, 특별 근무일, 정기 휴무)
        timeOffs.forEach((to) => {
          const designerId = to.designer_id as number | undefined;
          if (!designerId) return;
          const name =
            (to.designer && to.designer.name) || designerNameMap.get(designerId);
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

              if (!data[dateStr]) data[dateStr] = [];
              data[dateStr].push({ name, type });
            }
            current.setDate(current.getDate() + 1);
          }
        });

        // Compute regular holidays from designer_schedules
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const weekday = date.getDay();
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          allDesigners.forEach((designer) => {
            const designerScheduledDays = scheduleMap.get(designer.id);
            // Skip designers with no schedule entries at all
            if (!designerScheduledDays || designerScheduledDays.size === 0) return;

            const hasScheduleForDay = designerScheduledDays.has(weekday);
            if (hasScheduleForDay) return;

            const name = designerNameMap.get(designer.id);
            if (!name) return;

            const existingEntries = data[dateStr] || [];
            // Skip if special work day already exists for this designer
            const hasSpecialOverride = existingEntries.some(
              (e) => e.name === name && e.type === 'special'
            );
            if (hasSpecialOverride) return;

            // Skip if already has a regular entry from time-off records
            const alreadyHasRegular = existingEntries.some(
              (e) => e.name === name && e.type === 'regular'
            );
            if (alreadyHasRegular) return;

            if (!data[dateStr]) data[dateStr] = [];
            data[dateStr].push({ name, type: 'regular' });
          });
        }

        setCalendarData(data);
      } catch (error) {
        console.error('Error fetching calendar data:', error);
        setCalendarData({});
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, [isOpen, currentMonth, refreshKey]);

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
      onOpenHolidayModal(null, '전체');
      return;
    }

    const selectedDesigner = allDesigners.find(d => d.name === selectedDesignerFilter);
    onOpenHolidayModal(selectedDesigner?.id ?? null, selectedDesigner?.name ?? '전체');
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
            onDesignerClick={(designerName) => {
              if (!onOpenHolidayModal) return;
              const designer = allDesigners.find(d => d.name === designerName);
              if (designer) {
                onOpenHolidayModal(designer.id, designer.name);
              }
            }}
          />
        )}

        <HolidayCalendarLegend onClose={onClose} />
      </div>
    </Modal>
  );
}
