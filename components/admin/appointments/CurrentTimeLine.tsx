'use client';

import { useEffect, useState } from 'react';
import {
  getSydneyToday,
  GRID_START_HOUR,
  GRID_END_HOUR,
  GRID_HOUR_HEIGHT,
} from '@/lib/utils/appointment-utils';

interface CurrentTimeLineProps {
  selectedDate: string;
}

function computeCurrentTime(
  selectedDate: string,
): { top: number; label: string } | null {
  const todaySydney = getSydneyToday();
  if (selectedDate !== todaySydney) return null;

  const nowSydney = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }),
  );
  const hour = nowSydney.getHours();
  const minute = nowSydney.getMinutes();

  if (hour < GRID_START_HOUR || hour >= GRID_END_HOUR) return null;

  const minutesSinceStart = (hour - GRID_START_HOUR) * 60 + minute;
  const top = (minutesSinceStart / 60) * GRID_HOUR_HEIGHT;
  const label = nowSydney.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return { top, label };
}

export default function CurrentTimeLine({ selectedDate }: CurrentTimeLineProps) {
  const [currentTime, setCurrentTime] = useState(() =>
    computeCurrentTime(selectedDate),
  );

  useEffect(() => {
    setCurrentTime(computeCurrentTime(selectedDate));
    const id = setInterval(
      () => setCurrentTime(computeCurrentTime(selectedDate)),
      60_000,
    );
    return () => clearInterval(id);
  }, [selectedDate]);

  if (!currentTime) return null;

  return (
    <div
      className="absolute w-full border-t-2 border-[#135bec] z-10 pointer-events-none flex items-center"
      style={{ top: currentTime.top + 8 }}
    >
      <div className="absolute left-0 -translate-y-1/2 bg-[#135bec] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-r-md">
        {currentTime.label}
      </div>
      <div className="size-2 rounded-full bg-[#135bec] -ml-1" />
    </div>
  );
}
