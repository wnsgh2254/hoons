// Comment: Pure helpers for public booking time overlap checks (client + server safe)

export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Comment: Parse "HH:MM:SS" or "HH:MM" to minutes from midnight */
export function dbTimeStringToMinutes(t: string | null | undefined): number {
  if (!t) return 0;
  const parts = String(t).split(':').map((x) => Number(x));
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

/** Comment: Display label like "2:00 PM" to minutes from midnight */
export function timeLabelToMinutes(timeLabel: string): number | null {
  const match = timeLabel.trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const ap = match[3].toUpperCase();
  if (ap === 'PM' && hour < 12) hour += 12;
  if (ap === 'AM' && hour === 12) hour = 0;
  return hour * 60 + min;
}

export type DesignerAvailabilityIntervals = {
  fullDayBlocked: boolean;
  restrictionIntervals: { start: number; end: number }[];
  bookingIntervals: { start: number; end: number }[];
  /**
   * When set and non-empty: slot [start, start+duration) must lie fully inside at least one interval.
   * From designer_schedules for this shop+weekday, or shop business_hours when schedule is missing (e.g. special-work day).
   * Omitted or null: no window enforcement.
   */
  workingIntervals?: { start: number; end: number }[] | null;
};

/** Comment: True if starting at slotStartMin for newDurationMin would overlap restrictions or existing bookings */
export function isStartSlotUnavailable(
  slotStartMin: number,
  newDurationMin: number,
  data: DesignerAvailabilityIntervals,
): boolean {
  if (data.fullDayBlocked) return true;
  if (newDurationMin <= 0) return false;
  const aStart = slotStartMin;
  const aEnd = slotStartMin + newDurationMin;
  // Comment: Enforce per-designer working window from designer_schedules (this shop + weekday)
  const windows = data.workingIntervals;
  if (windows && windows.length > 0) {
    const inside = windows.some((w) => aStart >= w.start && aEnd <= w.end);
    if (!inside) return true;
  }
  for (const r of data.restrictionIntervals) {
    if (intervalsOverlap(aStart, aEnd, r.start, r.end)) return true;
  }
  for (const b of data.bookingIntervals) {
    if (intervalsOverlap(aStart, aEnd, b.start, b.end)) return true;
  }
  return false;
}
