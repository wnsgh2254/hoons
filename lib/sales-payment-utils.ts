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

export type SaleHistoryPaymentLine = {
  method: PaymentMethodKey | 'prepaid_pass';
  amount: number;
};

export function getSalePrepaidDeductionTotal(
  items: Array<{ prepaid_deduction?: number | null }> | null | undefined,
): number {
  return roundToCents(
    (items || []).reduce((sum, item) => sum + Number(item.prepaid_deduction || 0), 0),
  );
}

/** Gross line amount before prepaid (unit × qty − discount). */
export function getSaleLineGrossAmount(item: {
  amount?: number | null;
  prepaid_deduction?: number | null;
  unit_price?: number | null;
  quantity?: number | null;
  discount?: number | null;
}): number {
  const prepaid = Number(item.prepaid_deduction || 0);
  const net = Number(item.amount || 0);
  if (prepaid > 0) return roundToCents(net + prepaid);
  const unit = Number(item.unit_price || 0);
  const qty = Math.max(1, Number(item.quantity || 1));
  const discount = Number(item.discount || 0);
  return roundToCents(unit * qty - discount);
}

export type SaleIssuedPrepaidCreditLine = {
  passLabel: string;
  points: number;
};

type SalePrepaidItemRow = {
  item_type?: string | null;
  item_name?: string | null;
  quantity?: number | null;
  amount?: number | null;
  unit_price?: number | null;
  discount?: number | null;
  prepaid_credit_points?: number | null;
};

/** Infer credit issued for legacy rows without prepaid_credit_points. */
export function inferPrepaidCreditPointsFromSaleItem(item: SalePrepaidItemRow): number {
  const stored = Math.round(Number(item.prepaid_credit_points || 0));
  if (stored > 0) return stored;

  const fromName = String(item.item_name || '').match(/^(\d+(?:\.\d+)?)/);
  if (fromName) {
    const parsed = Math.round(Number(fromName[1]));
    if (parsed > 0) return parsed;
  }

  return Math.round(getSaleLineGrossAmount(item));
}

/** Prepaid pass purchases on a sale (item_type = prepaid). */
export function getSaleIssuedPrepaidCreditLines(
  items: SalePrepaidItemRow[] | null | undefined,
): SaleIssuedPrepaidCreditLine[] {
  const lines: SaleIssuedPrepaidCreditLine[] = [];

  for (const item of items || []) {
    if (String(item.item_type || '') !== 'prepaid') continue;

    const qty = Math.max(1, Math.round(Number(item.quantity || 1)));
    const perCredit = inferPrepaidCreditPointsFromSaleItem(item);
    const totalCredit = perCredit * qty;
    if (totalCredit <= 0) continue;

    lines.push({
      passLabel: String(item.item_name || 'Prepaid').trim(),
      points: totalCredit,
    });
  }

  return lines;
}

export function getSaleIssuedPrepaidCreditTotal(
  items: SalePrepaidItemRow[] | null | undefined,
): number {
  return roundToCents(
    getSaleIssuedPrepaidCreditLines(items).reduce((sum, line) => sum + line.points, 0),
  );
}

export function buildSaleHistoryPayments(
  sale: {
    cash_amount?: number | null;
    card_amount?: number | null;
    bank_transfer_amount?: number | null;
  },
  items: Array<{ prepaid_deduction?: number | null }> | null | undefined,
): SaleHistoryPaymentLine[] {
  const amounts = saleRecordToPaymentAmounts(sale);
  const payments: SaleHistoryPaymentLine[] = getActivePaymentLines(amounts).map(
    ({ method, amount }) => ({ method, amount }),
  );
  const prepaidTotal = getSalePrepaidDeductionTotal(items);
  if (prepaidTotal > 0) {
    payments.push({ method: 'prepaid_pass', amount: prepaidTotal });
  }
  return payments;
}

/** Stored payment_method including prepaid when no cash/card/bank was used. */
export function resolveSalePaymentMethod(
  amounts: SalePaymentAmounts,
  prepaidTotal: number,
  fallback?: string | null,
): string | null {
  const fromAmounts = resolvePaymentMethodFromAmounts(amounts);
  if (prepaidTotal > 0 && !fromAmounts) return 'prepaid_pass';
  if (prepaidTotal > 0 && fromAmounts) return `${fromAmounts}+prepaid_pass`;
  return fromAmounts || fallback || null;
}
