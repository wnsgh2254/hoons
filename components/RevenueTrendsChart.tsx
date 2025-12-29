'use client';

import { useMemo } from 'react';

type TimeRange = 'Today' | 'Week' | 'Month' | 'Year';

interface TrendPoint {
  date: string;
  revenue: number;
}

interface RevenueTrendsChartProps {
  trendPoints: TrendPoint[];
  timeRange: TimeRange;
  loading?: boolean;
}

export default function RevenueTrendsChart({
  trendPoints,
  timeRange,
  loading = false,
}: RevenueTrendsChartProps) {
  // Comment: Transform data based on timeRange
  const transformedPoints = useMemo(() => {
    if (timeRange === 'Today') {
      // Comment: Group by hour for today (09:00 ~ 18:00 only)
      const todayStr = new Date().toISOString().slice(0, 10);
      const hourMap = new Map<number, number>();

      trendPoints.forEach((point) => {
        if (point.date.startsWith(todayStr)) {
          // Comment: If date is in "HH:00" format (from API), extract hour
          if (point.date.includes(':')) {
            const hour = parseInt(point.date.split(':')[0], 10);
            if (!Number.isNaN(hour) && hour >= 0 && hour < 24) {
              const existing = hourMap.get(hour) || 0;
              hourMap.set(hour, existing + (point.revenue || 0));
            }
          } else {
            // Comment: If it's a date, use current hour as fallback
            const hour = new Date().getHours();
            const existing = hourMap.get(hour) || 0;
            hourMap.set(hour, existing + (point.revenue || 0));
          }
        }
      });

      // Comment: Create hours from 09:00 to 18:00
      const startHour = 9;
      const endHour = 18;
      return Array.from({ length: endHour - startHour + 1 }, (_, idx) => {
        const hour = startHour + idx;
        return {
          date: `${String(hour).padStart(2, '0')}:00`,
          revenue: hourMap.get(hour) || 0,
        };
      });
    } else if (timeRange === 'Week') {
      // Comment: Last 7 days (excluding today) - sliding window
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dates: string[] = [];

      for (let i = 7; i >= 1; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }

      return dates.map((dateStr) => {
        const revenue =
          trendPoints
            .filter((p) => p.date.startsWith(dateStr))
            .reduce((sum, p) => sum + (p.revenue || 0), 0) || 0;
        return { date: dateStr, revenue };
      });
    } else if (timeRange === 'Year') {
      // Comment: Group by month for current year (1월~12월)
      const now = new Date();
      const year = now.getFullYear();
      const monthTotals = new Array(12).fill(0);

      trendPoints.forEach((point) => {
        try {
          const date = new Date(point.date);
          if (!Number.isNaN(date.getTime()) && date.getFullYear() === year) {
            const monthIndex = date.getMonth(); // 0~11
            monthTotals[monthIndex] += point.revenue || 0;
          }
        } catch {
          // Comment: Skip invalid dates
        }
      });

      // Comment: Create 12 months (always show all months)
      return monthTotals.map((revenue, idx) => ({
        date: `${year}-${String(idx + 1).padStart(2, '0')}`,
        revenue,
      }));
    } else {
      // Comment: Month - use daily data as-is
      return trendPoints.map((p) => ({
        date: p.date,
        revenue: p.revenue || 0,
      }));
    }
  }, [trendPoints, timeRange]);

  const maxRevenue = Math.max(
    ...transformedPoints.map((p) => p.revenue || 0),
    1
  );
  const safeMax = maxRevenue > 0 ? maxRevenue : 1;
  const steps = 5;

  // Comment: Y-axis tick values (top: max, bottom: 0)
  const yTicks = Array.from({ length: steps }, (_, i) => {
    const ratio = (steps - 1 - i) / (steps - 1);
    return Math.round(safeMax * ratio);
  });

  const isYear = timeRange === 'Year';
  const isToday = timeRange === 'Today';
  const isWeek = timeRange === 'Week';
  const barWidth = isYear ? '28px' : isToday ? '20px' : isWeek ? '36px' : '32px';

  if (loading) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-sm text-gray-500">
        Loading revenue trends...
      </div>
    );
  }

  if (transformedPoints.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-sm text-gray-500">
        No revenue data for this period.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex gap-3">
        {/* Comment: Y-axis */}
        <div className="shrink-0 w-16">
          <div className="h-64 flex flex-col justify-between pr-2">
            {yTicks.map((v, idx) => (
              <div key={idx} className="text-[10px] text-gray-400 font-medium text-right">
                ₩{v.toLocaleString('ko-KR')}
              </div>
            ))}
          </div>
        </div>

        {/* Comment: Chart area */}
        <div className="flex-1 min-w-0 overflow-x-auto pb-2">
          <div
            className="h-64 flex items-end relative overflow-visible"
            style={{
              paddingTop: '40px',
              paddingBottom: '8px',
              justifyContent: transformedPoints.length <= 12 ? 'space-between' : 'flex-start',
              gap: '1px',
              minWidth: '100%',
            }}
          >
            {transformedPoints.map((item, index) => {
              const chartHeightPx = 256;
              const topPadding = 40;
              const bottomPadding = 8;
              const availableHeight = chartHeightPx - topPadding - bottomPadding;
              const minBarHeightPx = 4;
              const maxBarHeightPx = availableHeight * 0.95;
              const ratio = (item.revenue || 0) / safeMax;
              const heightPx = minBarHeightPx + ratio * (maxBarHeightPx - minBarHeightPx);
              const height = `${heightPx}px`;

              const highlight = index === transformedPoints.length - 1;
              const label = `₩${(item.revenue || 0).toLocaleString('ko-KR')}`;

              // Comment: Format axis label
              let axisLabel = '';
              if (timeRange === 'Today') {
                axisLabel = item.date; // Already in "HH:00" format
              } else if (timeRange === 'Year') {
                // Comment: "YYYY-MM" -> "1월", "2월", etc.
                const month = parseInt(item.date.slice(5, 7), 10);
                axisLabel = `${month}월`;
              } else {
                // Comment: Week/Month - show date as "MM/DD"
                const dateObj = new Date(item.date);
                if (!Number.isNaN(dateObj.getTime())) {
                  axisLabel = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(
                    dateObj.getDate()
                  ).padStart(2, '0')}`;
                } else {
                  axisLabel = item.date.slice(5, 10).replace('-', '/');
                }
              }

              return (
                <div
                  key={`${item.date}-${index}`}
                  className="flex flex-col justify-end items-center gap-1.5 group shrink-0 relative"
                  style={{ width: barWidth }}
                >
                  <div
                    className={`w-full rounded-t-sm relative transition-all ${
                      highlight
                        ? 'bg-gradient-to-t from-gray-800 to-black shadow-[0_4px_10px_rgba(0,0,0,0.3)] group-hover:from-gray-600 group-hover:to-gray-800'
                        : 'bg-gray-200 group-hover:bg-gray-400'
                    }`}
                    style={{ height, minHeight: `${minBarHeightPx}px` }}
                  >
                    {/* Comment: Revenue tooltip */}
                    <div
                      className={`absolute -top-8 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded pointer-events-none transition-opacity whitespace-nowrap z-10 ${
                        highlight
                          ? 'opacity-100 bg-black text-white font-bold shadow-lg border border-gray-700'
                          : 'opacity-0 group-hover:opacity-100 bg-black text-white'
                      }`}
                    >
                      {label}
                    </div>
                  </div>
                  {/* Comment: X-axis label - always visible */}
                  <span
                    className={`text-[10px] leading-tight text-center mt-1 ${
                      highlight ? 'text-black font-bold' : 'text-gray-500'
                    }`}
                    style={{ width: barWidth }}
                  >
                    {axisLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

