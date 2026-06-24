import { resolvePaidDepositFromSaleRecord, capPaidDepositToService } from '@/lib/sale-paid-deposit';
import { roundToCents } from '@/lib/utils';

const toNum = (value: unknown) => Number(value || 0);

const isServiceItem = (itemType: unknown) => String(itemType || '') === 'service';
const isProductItem = (itemType: unknown) => String(itemType || '') === 'product';
const isMembershipItem = (itemType: unknown) => String(itemType || '') === 'prepaid';

function serviceLineAmount(item: {
  item_type?: string | null;
  amount?: unknown;
}): number {
  if (!isServiceItem(item.item_type)) return 0;
  return toNum(item.amount);
}

export type PaymentDetailBucket = {
  service: number;
  product: number;
  membership: number;
  total: number;
};

export type PaymentDetailsBreakdown = {
  cash: PaymentDetailBucket;
  card: PaymentDetailBucket;
  bank_transfer: PaymentDetailBucket;
  prepaid_pass: PaymentDetailBucket;
  deposit: PaymentDetailBucket;
  columnTotals: PaymentDetailBucket;
};

type TypePools = {
  service: number;
  product: number;
  membership: number;
};

function emptyBucket(): PaymentDetailBucket {
  return { service: 0, product: 0, membership: 0, total: 0 };
}

export function emptyPaymentDetails(): PaymentDetailsBreakdown {
  return {
    cash: emptyBucket(),
    card: emptyBucket(),
    bank_transfer: emptyBucket(),
    prepaid_pass: emptyBucket(),
    deposit: emptyBucket(),
    columnTotals: emptyBucket(),
  };
}

/** Allocate cash/card/bank payment across remaining pools (capped; no spill). */
export function allocatePaymentToTypePools(
  amount: number,
  pools: TypePools,
): TypePools {
  const gross = Math.max(0, amount);
  const splitBase = pools.service + pools.product + pools.membership;
  if (gross <= 0 || splitBase <= 0) {
    return { service: 0, product: 0, membership: 0 };
  }

  const allocatable = Math.min(gross, splitBase);
  let serviceShare = (pools.service / splitBase) * allocatable;
  let productShare = (pools.product / splitBase) * allocatable;
  let membershipShare = (pools.membership / splitBase) * allocatable;

  serviceShare = Math.min(serviceShare, pools.service);
  productShare = Math.min(productShare, pools.product);
  membershipShare = Math.min(membershipShare, pools.membership);

  let remainder = allocatable - serviceShare - productShare - membershipShare;
  if (remainder > 0.0001) {
    const fillOrder: Array<keyof TypePools> = ['service', 'product', 'membership'];
    for (const key of fillOrder) {
      if (remainder <= 0.0001) break;
      const room =
        pools[key] -
        (key === 'service'
          ? serviceShare
          : key === 'product'
            ? productShare
            : membershipShare);
      if (room <= 0) continue;
      const extra = Math.min(remainder, room);
      if (key === 'service') serviceShare += extra;
      else if (key === 'product') productShare += extra;
      else membershipShare += extra;
      remainder -= extra;
    }
  }

  return { service: serviceShare, product: productShare, membership: membershipShare };
}

function subtractPools(pools: TypePools, shares: TypePools): void {
  pools.service = Math.max(0, pools.service - shares.service);
  pools.product = Math.max(0, pools.product - shares.product);
  pools.membership = Math.max(0, pools.membership - shares.membership);
}

function addSharesToBucket(
  bucket: PaymentDetailBucket,
  shares: TypePools,
  paymentTotal: number,
): void {
  bucket.service += roundToCents(shares.service);
  bucket.product += roundToCents(shares.product);
  bucket.membership += roundToCents(shares.membership);
  bucket.total += roundToCents(paymentTotal);
}

/**
 * Payment-method breakdown:
 * - Deposit row: paid_deposit (capped to service amount sum)
 * - Prepaid row: prepaid_deduction per line (amount may be 0)
 * - Cash/card/bank service: sum(service item amount) - deposit, then split payments
 */
export function applySaleToPaymentDetails(
  paymentDetails: PaymentDetailsBreakdown,
  sale: {
    paid_deposit?: unknown;
    booking_deposit_paid?: unknown;
    total_amount?: unknown;
    cash_amount?: unknown;
    card_amount?: unknown;
    bank_transfer_amount?: unknown;
    booking_id?: number | null;
    bookings?: { deposit_paid?: unknown } | { deposit_paid?: unknown }[] | null;
    sales_items?: Array<{
      item_type?: string | null;
      amount?: unknown;
      prepaid_deduction?: unknown;
    }>;
  },
): void {
  const items = sale.sales_items || [];

  const serviceAmountTotal = items.reduce((sum, item) => sum + serviceLineAmount(item), 0);
  const productTotal = items
    .filter((item) => isProductItem(item.item_type))
    .reduce((sum, item) => sum + toNum(item.amount), 0);
  const membershipTotal = items
    .filter((item) => isMembershipItem(item.item_type))
    .reduce((sum, item) => sum + toNum(item.amount), 0);

  const depositCredit = capPaidDepositToService(
    resolvePaidDepositFromSaleRecord(sale),
    serviceAmountTotal,
  );

  if (depositCredit > 0) {
    paymentDetails.deposit.service += roundToCents(depositCredit);
    paymentDetails.deposit.total += roundToCents(depositCredit);
  }

  // Prepaid: own row only (lines often have amount 0); do not share pool with cash/card.
  items.forEach((item) => {
    const prepaidDeduction = toNum(item.prepaid_deduction);
    if (prepaidDeduction <= 0) return;

    if (isServiceItem(item.item_type)) {
      paymentDetails.prepaid_pass.service += roundToCents(prepaidDeduction);
    } else if (isProductItem(item.item_type)) {
      paymentDetails.prepaid_pass.product += roundToCents(prepaidDeduction);
    } else if (isMembershipItem(item.item_type)) {
      paymentDetails.prepaid_pass.membership += roundToCents(prepaidDeduction);
    }
    paymentDetails.prepaid_pass.total += roundToCents(prepaidDeduction);
  });

  // Cash/card/bank: service pool = sum(amount) - deposit (not including prepaid).
  const pools: TypePools = {
    service: Math.max(0, serviceAmountTotal - depositCredit),
    product: productTotal,
    membership: membershipTotal,
  };

  const paymentBuckets = [
    { key: 'cash' as const, amount: toNum(sale.cash_amount) },
    { key: 'card' as const, amount: toNum(sale.card_amount) },
    { key: 'bank_transfer' as const, amount: toNum(sale.bank_transfer_amount) },
  ];

  paymentBuckets.forEach(({ key, amount }) => {
    if (amount <= 0) return;

    const shares = allocatePaymentToTypePools(amount, pools);
    subtractPools(pools, shares);
    addSharesToBucket(paymentDetails[key], shares, amount);
  });
}

/** Footer row totals: cash, card, bank transfer, deposit only (not prepaid_pass). */
const COLUMN_TOTAL_PAYMENT_KEYS = [
  'cash',
  'card',
  'bank_transfer',
  'deposit',
] as const;

export function recalculatePaymentDetailColumnTotals(
  paymentDetails: PaymentDetailsBreakdown,
): void {
  const totals = emptyBucket();
  COLUMN_TOTAL_PAYMENT_KEYS.forEach((key) => {
    totals.service += paymentDetails[key].service;
    totals.product += paymentDetails[key].product;
    totals.membership += paymentDetails[key].membership;
    totals.total += paymentDetails[key].total;
  });
  paymentDetails.columnTotals = {
    service: roundToCents(totals.service),
    product: roundToCents(totals.product),
    membership: roundToCents(totals.membership),
    total: roundToCents(totals.total),
  };
}
