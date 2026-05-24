import { roundToCents } from '@/lib/utils';

export type SalePaymentAmounts = {
  cash: number;
  card: number;
  bank_transfer: number;
};

export const PAYMENT_METHOD_KEYS = ['cash', 'card', 'bank_transfer'] as const;
export type PaymentMethodKey = (typeof PAYMENT_METHOD_KEYS)[number];

export function normalizePaymentAmounts(
  amounts: Partial<SalePaymentAmounts> | null | undefined,
): SalePaymentAmounts {
  return {
    cash: roundToCents(Number(amounts?.cash) || 0),
    card: roundToCents(Number(amounts?.card) || 0),
    bank_transfer: roundToCents(Number(amounts?.bank_transfer) || 0),
  };
}

/** Derive stored payment_method from per-method amounts (supports mixed payments). */
export function resolvePaymentMethodFromAmounts(amounts: SalePaymentAmounts): string | null {
  const active = PAYMENT_METHOD_KEYS.filter((key) => amounts[key] !== 0);
  if (active.length === 0) return null;
  if (active.length === 1) return active[0];
  return active.join('+');
}

export function getActivePaymentLines(
  amounts: SalePaymentAmounts,
): Array<{ method: PaymentMethodKey; amount: number }> {
  return PAYMENT_METHOD_KEYS.filter((key) => amounts[key] !== 0).map((key) => ({
    method: key,
    amount: amounts[key],
  }));
}

export function sumPaymentAmounts(amounts: SalePaymentAmounts): number {
  return roundToCents(amounts.cash + amounts.card + amounts.bank_transfer);
}

export function saleRecordToPaymentAmounts(sale: {
  cash_amount?: number | null;
  card_amount?: number | null;
  bank_transfer_amount?: number | null;
}): SalePaymentAmounts {
  return normalizePaymentAmounts({
    cash: sale.cash_amount ?? 0,
    card: sale.card_amount ?? 0,
    bank_transfer: sale.bank_transfer_amount ?? 0,
  });
}
