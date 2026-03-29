// Comment: Salon operates on Australia/Sydney civil dates (YYYY-MM-DD from UI).

const DOW_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Weekday 0–6 (Sun–Sat) for a YYYY-MM-DD string interpreted as a Sydney calendar date.
 * Avoids server local TZ shifting ISO date-only strings (which are parsed as UTC midnight).
 */
export function salonCalendarWeekdayIndex(ymd: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) {
    return new Date(ymd).getUTCDay();
  }
  const y = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const base = Date.UTC(y, month - 1, day);
  for (let h = -24; h < 48; h++) {
    const d = new Date(base + h * 3600000);
    const parts = fmt.formatToParts(d);
    const py = Number(parts.find((p) => p.type === 'year')?.value);
    const pm = Number(parts.find((p) => p.type === 'month')?.value);
    const pd = Number(parts.find((p) => p.type === 'day')?.value);
    if (py === y && pm === month && pd === day) {
      const wd = parts.find((p) => p.type === 'weekday')?.value;
      if (wd && wd in DOW_SHORT) return DOW_SHORT[wd];
    }
  }
  return new Date(base).getUTCDay();
}
