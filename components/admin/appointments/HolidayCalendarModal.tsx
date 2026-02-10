'use client';

import React, { useState, useEffect, useMemo } from 'react';
import HolidayCalendarHeader from './HolidayCalendarHeader';
import HolidayCalendarControls from './HolidayCalendarControls';
import HolidayCalendarGrid from './HolidayCalendarGrid';
import HolidayCalendarLegend from './HolidayCalendarLegend';

interface HolidayCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  allDesigners: Array<{ id: number; name: string }>;
  onOpenHolidayModal?: (designerId: number | null, designerName: string) => void;
}

type HolidayType = 'regular' | 'arbitrary' | 'special';

interface DayEntry {
  name: string;
  type: HolidayType;
}

export default function HolidayCalendarModal({
  isOpen,
  onClose,
  allDesigners,
  onOpenHolidayModal,
}: HolidayCalendarModalProps) {
  const [selectedDesignerFilter, setSelectedDesignerFilter] = useState('전체');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [calendarData, setCalendarData] = useState<Record<string, DayEntry[]>>({});
  const [loading, setLoading] = useState(false);

  // Filter calendar data based on selected designer filter
  const filteredCalendarData = useMemo(() => {
    if (selectedDesignerFilter === '전체') {
      // Show all designers
      return calendarData;
    } else if (selectedDesignerFilter === '전체(휴무 제외)') {
      // TODO: Implement logic to exclude designers on holiday
      // For now, show all designers
      return calendarData;
    } else {
      // Show only selected designer
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

  // Comment: Fetch calendar data from API when month changes
  useEffect(() => {
    if (!isOpen) return;

    const fetchCalendarData = async () => {
      setLoading(true);
      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth(); // 0-based
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(
          daysInMonth,
        ).padStart(2, '0')}`;

        // Comment: Load designer_time_off records for the month
        const timeOffRes = await fetch(
          `/api/designer-time-off?start_date=${monthStart}&end_date=${monthEnd}`,
        );
        const timeOffJson = await timeOffRes.json();
        if (!timeOffRes.ok) {
          console.error('Error fetching designer time off for calendar:', timeOffJson);
          setCalendarData({});
          return;
        }

        const timeOffs: any[] = timeOffJson.timeOffs || [];

        // Comment: Map designer_id -> name for quick lookup
        const designerNameMap = new Map<number, string>();
        allDesigners.forEach((d) => {
          if (d.id && d.name) designerNameMap.set(d.id, d.name);
        });

        const data: Record<string, DayEntry[]> = {};

        // Comment: Expand each time off range into per-day entries
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
            // Only include days in current month
            if (
              current.getFullYear() === year &&
              current.getMonth() === month
            ) {
              const dateStr = `${current.getFullYear()}-${String(
                current.getMonth() + 1,
              ).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;

              let type: HolidayType = 'arbitrary';
              if (to.reason === '정기 휴무') {
                type = 'regular';
              } else if (to.reason === '특별 근무일') {
                type = 'special';
              } else {
                type = 'arbitrary';
              }

              if (!data[dateStr]) data[dateStr] = [];
              data[dateStr].push({ name, type });
            }
            current.setDate(current.getDate() + 1);
          }
        });

        setCalendarData(data);
      } catch (error) {
        console.error('Error fetching calendar data:', error);
        setCalendarData({});
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  // Note: allDesigners는 parent에서 거의 변하지 않으므로 deps에서 제외하여
  // useEffect dependency array 크기 경고를 피한다.
  }, [isOpen, currentMonth]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <HolidayCalendarHeader onClose={onClose} />

        {/* Controls */}
        <HolidayCalendarControls
          selectedDesignerFilter={selectedDesignerFilter}
          allDesigners={allDesigners}
          onDesignerFilterChange={setSelectedDesignerFilter}
          currentMonth={currentMonth}
          onPreviousMonth={() => handleMonthChange('prev')}
          onNextMonth={() => handleMonthChange('next')}
          onRegisterModify={handleRegisterModify}
        />

        {/* Calendar Grid */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
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

        {/* Footer with Legend */}
        <HolidayCalendarLegend onClose={onClose} />
      </div>
    </div>
  );
}
