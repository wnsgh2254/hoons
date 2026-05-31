import { roundToCents } from '@/lib/utils';

export type DepositMethodKey = 'cash' | 'card' | 'bank_transfer';

export type DepositRow = {
  deposit: number;
  depositRefund: number;
  paymentAtSale: number;
  uncollectedDeposit: number;
  refund: number;
  total: number;
};

export type DepositSummary = Record<DepositMethodKey, DepositRow>;

const toNum = (value: unknown) => Number(value || 0);

export function emptyDepositSummary(): DepositSummary {
  const row = (): DepositRow => ({
    deposit: 0,
    depositRefund: 0,
    paymentAtSale: 0,
    uncollectedDeposit: 0,
    refund: 0,
    total: 0,
  });
  return {
    cash: row(),
    card: row(),
    bank_transfer: row(),
  };
}

export function resolveDepositMethod(method: string): DepositMethodKey {
  const normalized = String(method || 'card').toLowerCase();
  if (normalized === 'cash') return 'cash';
  if (normalized === 'bank_transfer') return 'bank_transfer';
  // card, stripe, and unknown card-like methods
  return 'card';
}

export function addDepositInflow(summary: DepositSummary, method: DepositMethodKey, amount: number) {
  const value = roundToCents(toNum(amount));
  if (value <= 0) return;
  summary[method].total += value;
}

export function addDepositPaymentAtSale(
  summary: DepositSummary,
  method: DepositMethodKey,
  amount: number,
) {
  const value = roundToCents(toNum(amount));
  if (value <= 0) return;
  summary[method].paymentAtSale += value;
  summary[method].total += value;
}

export function recalculateDepositTotals(summary: DepositSummary) {
  (['cash', 'card', 'bank_transfer'] as const).forEach((method) => {
    const row = summary[method];
    row.total = roundToCents(
      row.deposit -
        row.depositRefund +
        row.paymentAtSale +
        row.uncollectedDeposit -
        row.refund,
    );
  });
}

type PaymentRecord = {
  amount?: unknown;
  method?: string | null;
  type?: string | null;
};

type SalePaymentRecord = {
  payment_method?: string | null;
  cash_amount?: unknown;
  card_amount?: unknown;
  bank_transfer_amount?: unknown;
};

/** Apply booking payments received on payment date (created_at). */
export function applyPaymentsToDepositSummary(
  summary: DepositSummary,
  payments: PaymentRecord[],
) {
  payments.forEach((payment) => {
    const method = resolveDepositMethod(String(payment.method || 'card'));
    const amount = toNum(payment.amount);
    if (amount <= 0) return;

    const type = String(payment.type || '');
    if (type === 'deposit') {
      const cents = roundToCents(amount);
      summary[method].deposit += cents;
      summary[method].total += cents;
      return;
    }

    if (type === 'balance' || type === 'product') {
      addDepositPaymentAtSale(summary, method, amount);
      return;
    }

    addDepositInflow(summary, method, amount);
  });
}

/** Apply walk-in / POS sale payments on sales_date (cash/card/bank on sale header). */
export function applySalesToDepositSummary(
  summary: DepositSummary,
  sales: SalePaymentRecord[],
) {
  sales.forEach((sale) => {
    const method = String(sale.payment_method || '').toLowerCase();
    if (method === 'prepaid_pass' || method === 'prepaid') return;

    addDepositPaymentAtSale(summary, 'cash', toNum(sale.cash_amount));
    addDepositPaymentAtSale(summary, 'card', toNum(sale.card_amount));
    addDepositPaymentAtSale(summary, 'bank_transfer', toNum(sale.bank_transfer_amount));
  });
}

type RefundRecord = {
  total_amount?: unknown;
  cash_amount?: unknown;
  card_amount?: unknown;
  bank_transfer_amount?: unknown;
  refund_items?: Array<{ item_type?: string; amount?: unknown }>;
};

export function applyRefundsToDepositSummary(summary: DepositSummary, refunds: RefundRecord[]) {
  refunds.forEach((refund) => {
    const totalRefundAmount = toNum(refund.total_amount);
    const depositRefundAmount = (refund.refund_items || [])
      .filter((item) => String(item.item_type) === 'deposit')
      .reduce((sum, item) => sum + toNum(item.amount), 0);

    const paymentBuckets = [
      { key: 'cash' as const, amount: toNum(refund.cash_amount) },
      { key: 'card' as const, amount: toNum(refund.card_amount) },
      { key: 'bank_transfer' as const, amount: toNum(refund.bank_transfer_amount) },
    ];

    paymentBuckets.forEach(({ key, amount }) => {
      if (amount <= 0) return;

      const depositShare =
        totalRefundAmount > 0
          ? Math.min(amount, (depositRefundAmount / totalRefundAmount) * amount)
          : 0;
      const regularRefundShare = Math.max(0, amount - depositShare);

      summary[key].depositRefund += roundToCents(depositShare);
      summary[key].refund += roundToCents(regularRefundShare);
      summary[key].total -= roundToCents(amount);
    });
  });
}
