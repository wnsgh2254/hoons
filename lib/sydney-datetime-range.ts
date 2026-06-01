const SYDNEY_TZ = 'Australia/Sydney';

/** YYYY-MM-DD for an instant in Australia/Sydney. */
export function toSydneyDateKey(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SYDNEY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function parseDateKey(dateKey: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!match) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function addCalendarDays(dateKey: string, deltaDays: number): string {
  const { y, m, d } = parseDateKey(dateKey);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** UTC instant of 00:00:00 on a Sydney calendar day. */
function sydneyMidnightUtc(dateKey: string): Date {
  const { y, m, d } = parseDateKey(dateKey);
  let low = Date.UTC(y, m - 1, d - 2, 0, 0, 0);
  let high = Date.UTC(y, m - 1, d + 1, 0, 0, 0);

  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    const midKey = toSydneyDateKey(new Date(mid));
    if (midKey < dateKey) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return new Date(low);
}

/**
 * Inclusive Sydney calendar date range [startDate, endDate] as UTC bounds for timestamptz queries.
 * Use: .gte('created_at', gteIso).lt('created_at', ltIso)
 */
export function getSydneyDayUtcRange(
  startDate: string,
  endDate: string,
): { gteIso: string; ltIso: string } {
  const gte = sydneyMidnightUtc(startDate);
  const lt = sydneyMidnightUtc(addCalendarDays(endDate, 1));
  return { gteIso: gte.toISOString(), ltIso: lt.toISOString() };
}

export function isCreatedAtInSydneyDateRange(
  createdAt: string,
  startDate: string,
  endDate: string,
): boolean {
  const key = toSydneyDateKey(createdAt);
  return key >= startDate && key <= endDate;
}

/** Display deposit pay instant in Sydney (date + 12h time). */
export function formatSydneyPayDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';

  const datePart = new Intl.DateTimeFormat('en-CA', {
    timeZone: SYDNEY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: SYDNEY_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(d);

  const hour = timeParts.find((p) => p.type === 'hour')?.value ?? '';
  const minute = timeParts.find((p) => p.type === 'minute')?.value ?? '';
  const dayPeriod = timeParts.find((p) => p.type === 'dayPeriod')?.value ?? '';

  return `${datePart} ${hour}:${minute} ${dayPeriod}`;
}
