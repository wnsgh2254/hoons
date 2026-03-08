import { formatNumberWithCommas } from '@/lib/utils';

/** Append digits to a comma-formatted string (e.g. "1,234" + "5" → "12,345") */
export function addDigits(prev: string, num: string): string {
  const current = prev.replace(/,/g, '');
  const raw = current === '0' ? num : current + num;
  return formatNumberWithCommas(raw);
}

/** Remove last digit from a comma-formatted string (e.g. "1,234" → "123") */
export function removeLastDigit(prev: string): string {
  const current = prev.replace(/,/g, '');
  if (current.length <= 1) return '0';
  return formatNumberWithCommas(current.slice(0, -1));
}

/** Parse comma-formatted string to number (e.g. "1,234" → 1234) */
export function parseAmount(value: string): number {
  return Number(value.replace(/,/g, ''));
}
