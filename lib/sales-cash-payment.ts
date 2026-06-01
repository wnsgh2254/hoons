import { roundToCents } from '@/lib/utils';
import type { SalePaymentAmounts } from '@/lib/sales-payment-utils';

/** Remaining balance before applying cash (other methods and prepaid already counted). */
export function remainingDueBeforeCash(
  netDue: number,
  amounts: Pick<SalePaymentAmounts, 'card' | 'bank_transfer'>,
  prepaidDeduction: number,
): number {
  const nonCash = roundToCents(
    Math.max(0, amounts.card) + Math.max(0, amounts.bank_transfer),
  );
  const prepaid = Math.max(0, prepaidDeduction);
  return Math.max(0, roundToCents(netDue - nonCash - prepaid));
}

/** Split customer cash into applied sale amount and change to return. */
export function splitCashTender(
  tendered: number,
  netDue: number,
  amounts: Pick<SalePaymentAmounts, 'card' | 'bank_transfer'>,
  prepaidDeduction: number,
): { cashApplied: number; changeDue: number } {
  const tender = Math.max(0, roundToCents(tendered));
  const remaining = remainingDueBeforeCash(netDue, amounts, prepaidDeduction);
  const cashApplied = Math.min(tender, remaining);
  const changeDue = Math.max(0, roundToCents(tender - cashApplied));
  return { cashApplied, changeDue };
}

/** Cap non-cash payment to what is still owed. */
export function capPaymentToRemaining(
  amount: number,
  netDue: number,
  amounts: SalePaymentAmounts,
  prepaidDeduction: number,
  method: keyof SalePaymentAmounts,
): number {
  const grossTotalPaid = roundToCents(
    (method === 'cash' ? 0 : amounts.cash) +
      (method === 'card' ? 0 : amounts.card) +
      (method === 'bank_transfer' ? 0 : amounts.bank_transfer),
  );
  const remaining = Math.max(
    0,
    roundToCents(netDue - grossTotalPaid - Math.max(0, prepaidDeduction)),
  );
  return Math.min(Math.max(0, roundToCents(amount)), remaining);
}

/** Cash line display amount and change for sale detail / history. */
export function resolveCashChangeDisplay(
  cashAmount: number,
  cashTendered?: number | null,
): { cashDisplay: number; changeDue: number } {
  const applied = Math.max(0, roundToCents(cashAmount));
  const tenderedRaw = cashTendered != null ? Number(cashTendered) : 0;
  const tendered =
    Number.isFinite(tenderedRaw) && tenderedRaw > applied
      ? roundToCents(tenderedRaw)
      : applied;
  const changeDue = Math.max(0, roundToCents(tendered - applied));
  return {
    cashDisplay: changeDue > 0 ? tendered : applied,
    changeDue,
  };
}

/** Value to persist on sales.cash_tendered (0 when no over-tender). */
export function cashTenderedForStorage(
  cashApplied: number,
  cashTendered: number | null | undefined,
): number {
  const applied = Math.max(0, roundToCents(cashApplied));
  if (applied <= 0) return 0;
  const tendered = roundToCents(Number(cashTendered) || 0);
  return tendered > applied ? tendered : 0;
}
