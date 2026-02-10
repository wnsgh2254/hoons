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

  // Fetch calendar data when month changes
  useEffect(() => {
    if (!isOpen) return;

    const fetchCalendarData = async () => {
      setLoading(true);
      try {
        // TODO: Fetch actual data from API
        // For now, use dummy data for UI verification
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const dummyData: Record<string, DayEntry[]> = {};
        
        // Add some dummy entries for demonstration using actual designers
        // Distribute entries across the month for better visualization
        const designerNames = allDesigners.length > 0 
          ? allDesigners.map(d => d.name)
          : ['윤훈원장', '태훈원장', 'winter선생님'];
        
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const entries: DayEntry[] = [];
          
          // Add entries for some designers on different days
          designerNames.forEach((name, index) => {
            // Create a pattern: each designer appears on certain days
            const shouldShow = (day + index) % 3 === 0 || (day + index) % 5 === 0;
            if (shouldShow) {
              const typeIndex = (day + index) % 3;
              let type: HolidayType;
              if (typeIndex === 0) {
                type = 'regular';
              } else if (typeIndex === 1) {
                type = 'arbitrary';
              } else {
                type = 'special';
              }
              entries.push({ name, type });
            }
          });
          
          if (entries.length > 0) {
            dummyData[dateStr] = entries;
          }
        }

        setCalendarData(dummyData);
      } catch (error) {
        console.error('Error fetching calendar data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
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
