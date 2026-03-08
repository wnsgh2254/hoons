import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to YYYY-MM-DD
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Format time to HH:MM
export function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
}

// Format number string with commas (e.g. "1234567" → "1,234,567")
export function formatNumberWithCommas(value: string): string {
  const digits = value.replace(/[^0-9]/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format payment method code to Korean label
export function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    cash: '현금',
    card: '카드',
    bank_transfer: '계좌이체',
    prepaid_pass: '정액권',
    stripe: 'Stripe',
  };
  return map[method] || method;
}

// Format "HH:mm" time string to 12-hour display (e.g. "14:30" → "2:30 PM")
export function formatTimeString(time: string | undefined | null): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  if (isNaN(hour)) return time;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

