'use client';

import React from 'react';

type HolidayType = 'regular' | 'arbitrary' | 'special';

interface DayEntry {
  name: string;
  type: HolidayType;
}

interface HolidayCalendarGridProps {
  currentMonth: Date;
  calendarData: Record<string, DayEntry[]>;
  onDesignerClick?: (designerName: string) => void;
}

const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export default function HolidayCalendarGrid({
  currentMonth,
  calendarData,
  onDesignerClick,
}: HolidayCalendarGridProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Generate calendar days
  const calendarDays: Array<{ date: number; dateStr: string }> = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push({ date: 0, dateStr: '' });
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({ date: day, dateStr });
  }

  const getHolidayIcon = (type: HolidayType) => {
    switch (type) {
      case 'regular':
        return <span className="text-red-500 text-sm">●</span>;
      case 'arbitrary':
        return <span className="text-gray-500 text-sm">○</span>;
      case 'special':
        return <span className="text-blue-500 text-sm">●</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-auto px-6 pb-6">
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {DAYS_OF_WEEK.map((day) => (
                  <th
                    key={day}
                    className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, weekIndex) => (
              <tr key={weekIndex}>
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  const dayIndexInMonth = weekIndex * 7 + dayIndex;
                  const dayData = calendarDays[dayIndexInMonth];
                  
                  if (!dayData || dayData.date === 0) {
                    return (
                      <td
                        key={dayIndex}
                        className={`px-3 py-2 ${dayIndex < 6 ? 'border-r border-gray-200' : ''} min-h-[100px] align-top bg-gray-50`}
                      ></td>
                    );
                  }

                  const entries = calendarData[dayData.dateStr] || [];

                  return (
                    <td
                      key={dayIndex}
                      className={`px-3 py-2 ${dayIndex < 6 ? 'border-r border-gray-200' : ''} min-h-[100px] align-top`}
                    >
                      <div className="text-sm font-semibold text-gray-900 mb-2 text-right">
                        {dayData.date}
                      </div>
                      <div className="space-y-1">
                        {entries.map((entry, idx) => (
                          <div 
                            key={idx} 
                            className={`flex items-center gap-1.5 text-sm font-medium text-gray-900 ${
                              onDesignerClick ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''
                            }`}
                            onClick={() => {
                              if (onDesignerClick) {
                                onDesignerClick(entry.name);
                              }
                            }}
                          >
                            {getHolidayIcon(entry.type)}
                            <span className="leading-tight">{entry.name}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
