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
      const pad2 = (n: number) => String(n).padStart(2, '0');
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

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
      // Comment: Month - filter to current month only
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0~11
      
      // Comment: First, filter trendPoints to only include current month data
      const currentMonthPoints = trendPoints.filter((p) => {
        try {
          const pointDateStr = p.date.slice(0, 10); // Get YYYY-MM-DD part
          const pointDate = new Date(pointDateStr + 'T00:00:00'); // Ensure consistent parsing
          
          if (Number.isNaN(pointDate.getTime())) {
            return false;
          }
          
          // Comment: Check if date is in current year and month
          return (
            pointDate.getFullYear() === currentYear &&
            pointDate.getMonth() === currentMonth
          );
        } catch {
          return false;
        }
      });
      
      // Comment: Get all days in current month
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const dates: string[] = [];
      
      const pad2 = (n: number) => String(n).padStart(2, '0');

      for (let day = 1; day <= daysInMonth; day++) {
        dates.push(`${currentYear}-${pad2(currentMonth + 1)}-${pad2(day)}`);
      }

      
      // Comment: Aggregate revenue by day for current month only
      return dates.map((dateStr) => {
        const revenue =
          currentMonthPoints
            .filter((p) => {
              // Comment: Exact date match (YYYY-MM-DD format)
              const pointDateStr = p.date.slice(0, 10);
              return pointDateStr === dateStr;
            })
            .reduce((sum, p) => sum + (p.revenue || 0), 0) || 0;
        return { date: dateStr, revenue };
      });
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
  const barWidth = isYear ? '28px' : isToday ? '20px' : isWeek ? '48px' : '32px';

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

  const justifyContent = isToday || isWeek || isYear
  ? 'center'
  : 'flex-start';

const gap =
  isWeek ? '30px'
  : isYear ? '25px'
  : isToday ? '40px'
  : '4px'; // Month


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
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-visible pb-2">
          <div
            className="h-64 flex items-end relative overflow-visible"
            style={{
              paddingTop: '40px',
              paddingBottom: '8px',
              justifyContent,
              gap,
              minWidth: '100%',
            }}
          >
            {transformedPoints.map((item, index) => {
              const chartHeightPx = 256;
              const topPadding = 55;
              const bottomPadding = 8;
              const availableHeight = chartHeightPx - topPadding - bottomPadding;
              const minBarHeightPx = 4;
              const maxBarHeightPx = availableHeight * 0.95;
              const ratio = (item.revenue || 0) / safeMax;
              const heightPx = minBarHeightPx + ratio * (maxBarHeightPx - minBarHeightPx);
              const height = `${heightPx}px`;

              // Comment: Highlight today's date for Month view, otherwise highlight last item
              let highlight = false;
              if (timeRange === 'Month') {
                // Comment: Get today's date in YYYY-MM-DD format (Sydney timezone)
                const now = new Date();
                // Comment: Convert to Sydney timezone (UTC+10 or UTC+11 depending on DST)
                const sydneyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
                const pad2 = (n: number) => String(n).padStart(2, '0');
                const todayStr = `${sydneyTime.getFullYear()}-${pad2(sydneyTime.getMonth() + 1)}-${pad2(sydneyTime.getDate())}`;
                const itemDateStr = item.date.slice(0, 10); // Get YYYY-MM-DD part
                highlight = itemDateStr === todayStr;
              } else {
                highlight = index === transformedPoints.length - 1;
              }
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

