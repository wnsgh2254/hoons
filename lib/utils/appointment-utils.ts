/**
 * Effective booking length in minutes for admin grid / overlap checks.
 * Prefer custom_service_duration (public booking total or admin override), then catalog service.
 */
export function getBookingDurationMinutes(booking: {
  service?: { duration_minutes?: number | null } | null;
  custom_service_duration?: number | null;
}): number {
  const custom = (booking as { custom_service_duration?: unknown }).custom_service_duration;
  if (custom != null && Number.isFinite(Number(custom)) && Number(custom) > 0) {
    return Math.round(Number(custom));
  }
  const dm = booking.service?.duration_minutes;
  if (dm != null && Number.isFinite(Number(dm)) && Number(dm) > 0) {
    return Math.round(Number(dm));
  }
  return 60;
}

/** Keeps fixed booking context menus fully inside the viewport horizontally (right-column clipping). */
export function clampBookingMenuHorizontalPosition(
  menuLeft: number,
  menuWidth: number,
  options?: { viewportPadding?: number; menuMinWidth?: number },
): { left: number; width: number } {
  const pad = options?.viewportPadding ?? 12;
  const minW = options?.menuMinWidth ?? 220;
  const width = Math.max(menuWidth, minW);
  const maxLeft = window.innerWidth - pad - width;
  let left = menuLeft;
  if (left > maxLeft) left = Math.max(pad, maxLeft);
  if (left < pad) left = pad;
  return { left, width };
}

// Comment: Grid configuration for full schedule view
export const GRID_START_HOUR = 8; // 08:00
export const GRID_END_HOUR = 21; // 21:00 (exclusive upper bound, last label 20:00)
export const GRID_HOUR_HEIGHT = 80; // px per hour (increased for better spacing and to fill container)
export const GRID_30MIN_HEIGHT = 40; // px per 30 minutes (increased for better spacing and to fill container)

// Comment: Simple color palette for designers
export const DESIGNER_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500' },
  { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-500' },
  { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-500' },
];

// Comment: Color label options for booking icons
export const COLOR_LABEL_OPTIONS = [
  { value: 'red', label: '빨강', hex: '#DC2626' },
  { value: 'orange', label: '주황', hex: '#EA580C' },
  { value: 'yellow', label: '노랑', hex: '#EAB308' },
  { value: 'green', label: '초록', hex: '#16A34A' },
  { value: 'blue', label: '파랑', hex: '#2563EB' },
  { value: 'purple', label: '보라', hex: '#7C3AED' },
] as const;

export const COLOR_LABEL_MAP: Record<string, string> = Object.fromEntries(
  COLOR_LABEL_OPTIONS.map(opt => [opt.value, opt.hex])
);

// Comment: Booking status enum (고정)
export type BookingStatus = 'BOOKED' | 'ARRIVED' | 'PAID' | 'NOSHOW' | 'BLOCKED' | 'UNKNOWN';

// Comment: Booking status color mapping (프론트 고정)
export function getBookingStatusColor(status: string | null | undefined): {
  bg: string;
  border: string;
  text: string;
  headerBg: string;
  headerText: string;
  label: string;
  statusEnum: BookingStatus;
} {
  const statusUpper = (status || '').toUpperCase().trim();
  
  // Status enum 매핑
  if (statusUpper === 'NOSHOW' || statusUpper === 'NO_SHOW') {
    return {
      bg: 'bg-red-50',
      border: 'border-red-500',
      text: 'text-red-900',
      headerBg: 'bg-red-500',
      headerText: 'text-white',
      label: '노쇼',
      statusEnum: 'NOSHOW'
    };
  } else if (statusUpper === 'ARRIVED' || statusUpper === 'CUSTOMER_ENTERED' || statusUpper === 'CUSTOMER_ENTRANCE' || statusUpper === 'ENTERED') {
    return {
      bg: 'bg-purple-50',
      border: 'border-purple-500',
      text: 'text-purple-900',
      headerBg: 'bg-purple-500',
      headerText: 'text-white',
      label: '고객입장',
      statusEnum: 'ARRIVED'
    };
  } else if (statusUpper === 'PAID' || statusUpper === 'PAYMENT_COMPLETED' || statusUpper === 'PAYMENT_COMPLETE' || statusUpper === 'COMPLETED') {
    return {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      text: 'text-blue-900',
      headerBg: 'bg-blue-500',
      headerText: 'text-white',
      label: '계산완료',
      statusEnum: 'PAID'
    };
  } else if (statusUpper === 'BOOKED' || statusUpper === 'RESERVED' || statusUpper === 'CONFIRMED' || statusUpper === 'PENDING' || statusUpper === '') {
    // Default: 예약완료 (green) - confirmed, pending도 예약완료로 처리
    return {
      bg: 'bg-green-50',
      border: 'border-green-500',
      text: 'text-green-900',
      headerBg: 'bg-green-500',
      headerText: 'text-white',
      label: '예약완료',
      statusEnum: 'BOOKED'
    };
  } else if (statusUpper === 'BLOCKED' || statusUpper === 'RESTRICTED') {
    return {
      bg: 'bg-gray-200',
      border: 'border-gray-400',
      text: 'text-gray-700',
      headerBg: 'bg-gray-400',
      headerText: 'text-white',
      label: '예약금지',
      statusEnum: 'BLOCKED'
    };
  } else if (statusUpper === 'CANCELLED' || statusUpper === 'CANCELED') {
    // 취소된 예약은 회색으로 표시
    return {
      bg: 'bg-gray-100',
      border: 'border-gray-300',
      text: 'text-gray-600',
      headerBg: 'bg-gray-300',
      headerText: 'text-gray-800',
      label: '취소됨',
      statusEnum: 'BLOCKED'
    };
  } else {
    // Unknown status 처리: 임의 색상 매핑 금지, "미정 상태" 스타일
    console.warn('Unknown booking status:', status);
    return {
      bg: 'bg-gray-50',
      border: 'border-gray-300 border-dashed',
      text: 'text-gray-600',
      headerBg: 'bg-gray-300',
      headerText: 'text-gray-800',
      label: '미정 상태',
      statusEnum: 'UNKNOWN'
    };
  }
}

/** Booking row shape for schedule card coloring */
export type BookingLikeForStatusColor = {
  status?: string | null;
  booking_status?: string | null;
  sale_completed?: number | boolean | null;
};

/**
 * Blue (PAID style) when bookings.sale_completed = 1 after admin sale registration.
 * Deposit alone does not turn the card blue. Cancelled stays grey.
 */
export function resolveBookingCardStatusColor(
  booking: BookingLikeForStatusColor,
): ReturnType<typeof getBookingStatusColor> {
  const statusStr = booking.status ?? booking.booking_status;
  const base = getBookingStatusColor(statusStr);
  const st = (statusStr || '').toLowerCase();
  if (st === 'cancelled' || st === 'canceled') {
    return base;
  }
  const raw = booking.sale_completed;
  const saleDone =
    raw === 1 || raw === true || String(raw) === '1';
  if (saleDone) {
    return getBookingStatusColor('PAID');
  }
  return base;
}

// Comment: Get today's date string in Sydney timezone (YYYY-MM-DD)
export function getSydneyToday(): string {
  const sydney = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
  );
  const year = sydney.getFullYear();
  const month = String(sydney.getMonth() + 1).padStart(2, '0');
  const day = String(sydney.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Comment: Max calendar days after Sydney "today" for public /booking date picker (inclusive end date)
export const PUBLIC_BOOKING_MAX_DAYS_AHEAD = 60;

// Comment: Sydney calendar date YYYY-MM-DD = getSydneyToday() + offsetDays
export function getSydneyTodayPlusDays(offsetDays: number): string {
  const sydney = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
  );
  sydney.setDate(sydney.getDate() + offsetDays);
  const year = sydney.getFullYear();
  const month = String(sydney.getMonth() + 1).padStart(2, '0');
  const day = String(sydney.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Comment: True if YYYY-MM-DD is after the last day guests may book (Sydney today + PUBLIC_BOOKING_MAX_DAYS_AHEAD)
export function isPublicBookingDateBeyondHorizon(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return true;
  const max = getSydneyTodayPlusDays(PUBLIC_BOOKING_MAX_DAYS_AHEAD);
  return dateStr > max;
}

// Comment: fullDate for checkout/payment — Sydney today through end of horizon only
export function isPublicBookingDateAllowed(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const min = getSydneyToday();
  const max = getSydneyTodayPlusDays(PUBLIC_BOOKING_MAX_DAYS_AHEAD);
  return dateStr >= min && dateStr <= max;
}

// Comment: Get current time string in Sydney timezone (HH:mm)
export function getSydneyNowTime(): string {
  const sydney = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
  );
  const hours = String(sydney.getHours()).padStart(2, '0');
  const minutes = String(sydney.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Comment: Format a Date object as YYYY-MM-DD in local timezone (avoids UTC offset issues with toISOString)
function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Comment: Get week start date (Monday) for a given date
export function getWeekStart(date: string): string {
  const d = new Date(date + 'T00:00:00'); // Parse as local time, not UTC
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  d.setDate(diff);
  return formatLocalDate(d);
}

// Comment: Get week end date (Sunday) for a given date
export function getWeekEnd(date: string): string {
  const start = getWeekStart(date);
  const end = new Date(start + 'T00:00:00'); // Parse as local time, not UTC
  end.setDate(end.getDate() + 6);
  return formatLocalDate(end);
}

// Comment: Format date range for display (YYYY-MM-DD ~ MM-DD)
export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startYear = start.getFullYear();
  const startMonth = String(start.getMonth() + 1).padStart(2, '0');
  const startDay = String(start.getDate()).padStart(2, '0');
  const endMonth = String(end.getMonth() + 1).padStart(2, '0');
  const endDay = String(end.getDate()).padStart(2, '0');
  return `${startYear}-${startMonth}-${startDay} ~ ${endMonth}-${endDay}`;
}

// Comment: Build date string using current year/month and given day
export function buildDateFromDay(baseDate: string, day: number): string {
  const [year, month] = baseDate.split('-');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}

// Comment: Parse YYYY-MM-DD as a local date to avoid timezone shift bugs.
export function parseLocalDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map((v) => Number(v));
  return new Date(year, (month || 1) - 1, day || 1);
}

// Comment: Format a Date object as YYYY-MM-DD using local date fields.
export function formatLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Comment: Convert DB time 'HH:MM:SS' to 12h label like '3:00 PM'
// Delegates to formatTimeString from lib/utils.ts (same logic)
export { formatTimeString as bookingTimeToLabel } from '@/lib/utils';

// Comment: Convert label like '3:00 PM' to DB time '15:00:00'
export function labelToDbTime(label: string): string | null {
  const match = label.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return null;
  let [, hh, mm, ap] = match;
  let hour = parseInt(hh, 10);
  const isPM = ap.toUpperCase() === 'PM';
  if (isPM && hour < 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;
  const hStr = hour.toString().padStart(2, '0');
  return `${hStr}:${mm}:${'00'}`;
}

// Comment: Time options for From/To (30-min steps, 8:00 AM - 9:00 PM)
export const EDIT_TIME_OPTIONS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM', '9:00 PM',
];

// Comment: Group service name into category (for service picker modal, same logic as services page)
export function getServiceCategoryForPicker(name: string): string {
  const cleanName = name.replace(/\s*\(card\)\s*/gi, '').replace(/\s*\(cash\)\s*/gi, '').trim();
  const lowerName = cleanName.toLowerCase();

  // Cut / 커트
  if (
    lowerName.includes('cut') ||
    lowerName.includes('컷') ||
    lowerName.includes('커트') ||
    lowerName.includes('bangs cut') ||
    lowerName.includes('kids cut')
  ) {
    return '커트';
  }

  // Dry / 드라이
  if (
    lowerName.includes('dry') ||
    lowerName.includes('드라이') ||
    lowerName.includes('styling') ||
    lowerName.includes('shampoo')
  ) {
    return '드라이';
  }

  // Magic / 매직
  if (lowerName.includes('magic') || lowerName.includes('매직') || lowerName.includes('iron perm')) {
    return '매직';
  }

  // Hot Perm / 핫펌 (디지털/셋팅 포함)
  if (
    lowerName.includes('hot perm') ||
    lowerName.includes('hot') ||
    lowerName.includes('digital') ||
    lowerName.includes('setting') ||
    lowerName.includes('셋팅')
  ) {
    return '핫펌';
  }

  // 일반 Perm / 펌
  if (lowerName.includes('perm') || lowerName.includes('펌')) {
    return '펌';
  }

  // Color / 염색
  if (
    lowerName.includes('color') ||
    lowerName.includes('bleach') ||
    lowerName.includes('tint') ||
    lowerName.includes('toning') ||
    lowerName.includes('염색')
  ) {
    return '염색';
  }

  // Clinic / 클리닉
  if (
    lowerName.includes('clinic') ||
    lowerName.includes('클리닉') ||
    lowerName.includes('treatment') ||
    lowerName.includes('protein') ||
    lowerName.includes('care') ||
    lowerName.includes('keratin') ||
    lowerName.includes('scalp')
  ) {
    return '클리닉';
  }

  // 기타는 예약 등록 단계에서는 노출하지 않으므로 구분값만 남겨둠
  return '기타';
}

export const SERVICE_PICKER_CATEGORY_ORDER = ['커트', '드라이', '펌', '매직', '핫펌', '염색', '클리닉'];
