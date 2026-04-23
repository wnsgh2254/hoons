export interface WeekInfo {
  weekNum: number;
  startDate: string;
  endDate: string;
}

export interface FullWeekDay {
  date: string;
  dayLabel: string;
  dayIndex: number; // 0=Sun, 6=Sat
  isActive: boolean;
}

/** Format a local Date as YYYY-MM-DD (timezone-safe, no UTC conversion) */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getFirstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function getLastDayOfMonth(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export function getWeeksInMonth(year: number, month: number): WeekInfo[] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const firstDayStr = formatDate(firstDay);
  const lastDayStr = formatDate(lastDay);
  const weeks: WeekInfo[] = [];

  // Start from Sunday of the week containing the 1st
  let currentDate = new Date(firstDay);
  const firstDayOfWeek = currentDate.getDay(); // 0=Sun
  if (firstDayOfWeek !== 0) {
    currentDate.setDate(currentDate.getDate() - firstDayOfWeek);
  }

  let weekNum = 1;
  while (currentDate <= lastDay) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sun–Sat

    const rawStart = formatDate(weekStart);
    const rawEnd = formatDate(weekEnd);

    // Clamp to month boundaries
    const clampedStart = rawStart < firstDayStr ? firstDayStr : rawStart;
    const clampedEnd = rawEnd > lastDayStr ? lastDayStr : rawEnd;

    // Only include if the clamped range is valid (week has days in this month)
    if (clampedStart <= clampedEnd) {
      weeks.push({ weekNum, startDate: clampedStart, endDate: clampedEnd });
      weekNum++;
    }

    currentDate.setDate(currentDate.getDate() + 7);
  }

  return weeks;
}

export function getWeeksInRange(startDate: string, endDate: string): WeekInfo[] {
  if (!startDate || !endDate || startDate > endDate) {
    return [];
  }

  const weeks: WeekInfo[] = [];
  const rangeStart = new Date(startDate + 'T00:00:00');
  const rangeEnd = new Date(endDate + 'T00:00:00');

  // Start from Sunday of the week containing rangeStart
  const cursor = new Date(rangeStart);
  const dayOfWeek = cursor.getDay();
  if (dayOfWeek !== 0) {
    cursor.setDate(cursor.getDate() - dayOfWeek);
  }

  let weekNum = 1;
  while (cursor <= rangeEnd) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const rawStart = formatDate(weekStart);
    const rawEnd = formatDate(weekEnd);
    const clampedStart = rawStart < startDate ? startDate : rawStart;
    const clampedEnd = rawEnd > endDate ? endDate : rawEnd;

    if (clampedStart <= clampedEnd) {
      weeks.push({ weekNum, startDate: clampedStart, endDate: clampedEnd });
      weekNum++;
    }

    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
}

/**
 * Returns all 7 days (Sun–Sat) of the week containing the given date range.
 * Days outside the startDate–endDate range are marked isActive=false.
 * Active day labels: "3/1 (일)". Inactive day labels: "일".
 */
export function getFullWeekDays(startDate: string, endDate: string): FullWeekDay[] {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const start = new Date(startDate + 'T00:00:00');

  // Find the Sunday of the week containing startDate
  const sunday = new Date(start);
  const dayOfWeek = sunday.getDay();
  if (dayOfWeek !== 0) {
    sunday.setDate(sunday.getDate() - dayOfWeek);
  }

  const days: FullWeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const dateStr = formatDate(d);
    const isActive = dateStr >= startDate && dateStr <= endDate;
    const month = d.getMonth() + 1;
    const dayNum = d.getDate();

    days.push({
      date: dateStr,
      dayLabel: isActive ? `${month}/${dayNum} (${dayNames[i]})` : dayNames[i],
      dayIndex: i,
      isActive,
    });
  }

  return days;
}

export function getDayLabels(startDate: string, endDate: string): { date: string; dayLabel: string }[] {
  const days: { date: string; dayLabel: string }[] = [];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d);
    const dayOfWeek = d.getDay();
    const dayNum = d.getDate();
    days.push({
      date: dateStr,
      dayLabel: `${dayNames[dayOfWeek]} ${dayNum}`,
    });
  }

  return days;
}
