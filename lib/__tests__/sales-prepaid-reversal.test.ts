import { describe, expect, it } from 'vitest';
import {
  getSaleIssuedPrepaidCreditLines,
  inferPrepaidCreditPointsFromSaleItem,
  prepaidCustomerIdForStorage,
  resolvePrepaidOwnerCustomerId,
} from '@/lib/sales-payment-utils';

describe('sales prepaid reversal', () => {
  it('uses stored prepaid_credit_points when present', () => {
    expect(
      inferPrepaidCreditPointsFromSaleItem({
        item_name: '1000볼',
        prepaid_credit_points: 1200,
        amount: 1000,
      }),
    ).toBe(1200);
  });

  it('parses credit from prepaid item name for legacy rows', () => {
    expect(
      inferPrepaidCreditPointsFromSaleItem({
        item_name: '1000볼',
        amount: 1000,
      }),
    ).toBe(1000);
  });

  it('builds issued prepaid lines for delete reversal', () => {
    const lines = getSaleIssuedPrepaidCreditLines([
      {
        item_type: 'prepaid',
        item_name: '1000볼',
        quantity: 1,
        amount: 1000,
      },
      {
        item_type: 'service',
        item_name: 'Cut',
        amount: 50,
      },
    ]);

    expect(lines).toEqual([{ passLabel: '1000볼', points: 1000 }]);
  });

  it('resolves prepaid owner from explicit id or sale customer', () => {
    expect(resolvePrepaidOwnerCustomerId(42, 10)).toBe(42);
    expect(resolvePrepaidOwnerCustomerId(null, 10)).toBe(10);
    expect(resolvePrepaidOwnerCustomerId('', 10)).toBe(10);
    expect(resolvePrepaidOwnerCustomerId(undefined, undefined)).toBeNull();
  });

  it('stores prepaid_customer_id only when deduction exists', () => {
    expect(prepaidCustomerIdForStorage(42, 100)).toBe(42);
    expect(prepaidCustomerIdForStorage(42, 0)).toBeNull();
    expect(prepaidCustomerIdForStorage(null, 100)).toBeNull();
  });
});
