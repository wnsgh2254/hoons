'use client';

import { GRID_START_HOUR, GRID_END_HOUR, GRID_30MIN_HEIGHT } from '@/lib/utils/appointment-utils';

interface TimeColumnProps {
  isWeekViewMode: boolean;
}

export default function TimeColumn({ isWeekViewMode }: TimeColumnProps) {
  const timeColumnStyle = {
    minHeight: `${(GRID_END_HOUR - GRID_START_HOUR) * 2 * GRID_30MIN_HEIGHT + 16}px` 
  };

  if (!isWeekViewMode) {
    // Day view time column - sticky
    return (
      <div 
        className="w-20 shrink-0 border-r border-[#e2e8f0] bg-white text-xs font-medium text-[#94a3b8] flex flex-col" 
        style={{ 
          position: 'sticky', 
          left: 0,
          zIndex: 50,
          backgroundColor: 'white',
          boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
          ...timeColumnStyle
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
                  <span className="absolute -top-1 right-1 bg-white px-0.5 text-[8px] text-gray-400">30</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Week view time column - sticky left
  return (
    <div
      className="w-20 shrink-0 border-r border-[#e2e8f0] bg-white text-xs font-medium text-[#94a3b8] flex flex-col"
      style={{
        position: 'sticky',
        left: 0,
        zIndex: 50,
        backgroundColor: 'white',
        boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
        ...timeColumnStyle
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
                <span className="absolute -top-1 right-1 bg-white px-0.5 text-[8px] text-gray-400">30</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
