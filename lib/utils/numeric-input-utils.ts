import { formatNumberWithCommas } from '@/lib/utils';

function formatNumericInput(value: string, maxDecimalPlaces = 0): string {
  if (maxDecimalPlaces <= 0) {
    return formatNumberWithCommas(value);
  }

  const normalized = value.replace(/,/g, '').replace(/[^0-9.]/g, '');
  const hasDecimalPoint = normalized.includes('.');
  const [integerPart = '', ...decimalParts] = normalized.split('.');
  const integerDigits = integerPart.replace(/^0+(?=\d)/, '') || '0';
  const decimalDigits = decimalParts.join('').slice(0, maxDecimalPlaces);

  return `${formatNumberWithCommas(integerDigits)}${hasDecimalPoint ? `.${decimalDigits}` : ''}`;
}

/** Append digits to a comma-formatted string (e.g. "1,234" + "5" → "12,345") */
export function addDigits(prev: string, num: string, maxDecimalPlaces = 0): string {
  const current = prev.replace(/,/g, '');
  if (num === '.' && maxDecimalPlaces > 0) {
    return current.includes('.') ? prev : `${prev || '0'}.`;
  }

  const [, decimalPart = ''] = current.split('.');
  if (current.includes('.') && decimalPart.length >= maxDecimalPlaces) {
    return prev;
  }

  const raw = current === '0' && num !== '0' && !num.startsWith('0') ? num : current + num;
  return formatNumericInput(raw, maxDecimalPlaces);
}

/** Remove last digit from a comma-formatted string (e.g. "1,234" → "123") */
export function removeLastDigit(prev: string, maxDecimalPlaces = 0): string {
  const current = prev.replace(/,/g, '');
  if (current.length <= 1) return '0';
  return formatNumericInput(current.slice(0, -1), maxDecimalPlaces);
}

/** Parse comma-formatted string to number (e.g. "1,234" → 1234) */
export function parseAmount(value: string): number {
  return Number(value.replace(/,/g, ''));
}
