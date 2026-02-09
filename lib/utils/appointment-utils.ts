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

// Comment: Get week start date (Monday) for a given date
export function getWeekStart(date: string): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// Comment: Get week end date (Sunday) for a given date
export function getWeekEnd(date: string): string {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end.toISOString().split('T')[0];
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

// Comment: Convert DB time 'HH:MM:SS' to 12h label like '3:00 PM'
export function bookingTimeToLabel(dbTime: string): string {
  const [hhStr, mmStr] = dbTime.split(':');
  const hh = Number(hhStr);
  if (Number.isNaN(hh)) return dbTime;
  const isPM = hh >= 12;
  const displayHour = hh % 12 === 0 ? 12 : hh % 12;
  return `${displayHour}:${mmStr.padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
}

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
  if (lowerName.includes('- perm') && !lowerName.includes('hot perm') && !lowerName.includes('magic')) return 'Perm';
  if (lowerName.includes('- magic')) return 'Magic';
  if (lowerName.includes('- hot perm')) return 'Hot Perm';
  if (lowerName.includes('- color')) return 'Color';
  if (lowerName.includes('- clinic')) return 'Clinic';
  if (lowerName.includes('- package')) return 'Package';
  if (lowerName.includes('package') || (lowerName.includes('design addition') && !lowerName.includes('-'))) return 'Package';
  if (lowerName.includes('mucota') || lowerName.includes('ahyunchae') || lowerName.includes('keratin') || lowerName.includes('scalp') || lowerName.includes('sleek') || lowerName.includes('clinic')) return 'Clinic';
  if (lowerName.includes('color') || lowerName.includes('bleach') || lowerName.includes('toning')) return 'Color';
  if (lowerName.includes('special perm') || lowerName.includes('setting perm') || lowerName.includes('design setting perm')) return 'Hot Perm';
  if (lowerName.includes('magic') || lowerName.includes('iron perm') || lowerName.includes('iron root')) return 'Magic';
  if (lowerName.includes('perm') && !lowerName.includes('magic') && !lowerName.includes('special') && !lowerName.includes('setting')) return 'Perm';
  if (lowerName.includes('styling') || lowerName.includes('shampoo') || lowerName.includes('dry')) return 'Dry';
  if (lowerName.includes('cut') || lowerName.includes('length addition') || lowerName.includes('hair extension') || lowerName.includes('director level') || lowerName.includes('manager level') || lowerName.includes('kids cut') || lowerName.includes('bangs cut')) return 'Cut';
  return 'Others';
}

export const SERVICE_PICKER_CATEGORY_ORDER = ['Cut', 'Dry', 'Perm', 'Magic', 'Hot Perm', 'Color', 'Clinic', 'Package', 'Others'];
