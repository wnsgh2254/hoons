import { describe, expect, it } from 'vitest';
import {
  capPaymentToRemaining,
  cashTenderedForStorage,
  remainingDueBeforeCash,
  resolveCashChangeDisplay,
  splitCashTender,
} from '@/lib/sales-cash-payment';

describe('sales-cash-payment', () => {
  it('computes change when tender exceeds remaining due', () => {
    const result = splitCashTender(100, 55, { card: 0, bank_transfer: 0 }, 0);
    expect(result.cashApplied).toBe(55);
    expect(result.changeDue).toBe(45);
  });

  it('respects card payments before cash', () => {
    const remaining = remainingDueBeforeCash(55, { card: 20, bank_transfer: 0 }, 0);
    expect(remaining).toBe(35);
    const result = splitCashTender(100, 55, { card: 20, bank_transfer: 0 }, 0);
    expect(result.cashApplied).toBe(35);
    expect(result.changeDue).toBe(65);
  });

  it('resolves change display from tendered vs applied', () => {
    expect(resolveCashChangeDisplay(55, 100)).toEqual({
      cashDisplay: 100,
      changeDue: 45,
    });
    expect(resolveCashChangeDisplay(55, 0)).toEqual({
      cashDisplay: 55,
      changeDue: 0,
    });
  });

  it('stores tendered only when over applied', () => {
    expect(cashTenderedForStorage(55, 100)).toBe(100);
    expect(cashTenderedForStorage(55, 55)).toBe(0);
    expect(cashTenderedForStorage(0, 100)).toBe(0);
  });

  it('caps card payment to remaining balance', () => {
    const capped = capPaymentToRemaining(
      100,
      55,
      { cash: 20, card: 0, bank_transfer: 0 },
      0,
      'card',
    );
    expect(capped).toBe(35);
  });
});
