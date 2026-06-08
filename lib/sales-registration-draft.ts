export type SalesRegistrationDraft = {
  salesItems: Array<{
    id: string;
    type: 'service' | 'product' | 'prepaid';
    name: string;
    unitPrice: number;
    quantity: number;
    discount: number;
    discountType?: 'percentage' | 'amount' | 'category';
    discountValue?: number | string;
    amount: number;
    manager: string;
    salesClassification: string;
    prepaidDeduction: number;
    prepaidCreditPoints?: number;
    prepaidExpiresAt?: string | null;
  }>;
  memo: string;
  salesDate: string;
  salesTime: string;
  selectedShopId: number | null;
  paymentAmounts: {
    cash: number;
    card: number;
    bank_transfer: number;
  };
  prepaidDeductionAmount: number;
  depositCredit: number;
  cashTendered: number | null;
  activeTab: 'service' | 'product' | 'prepaid';
  savedAt: string;
};

export function getSalesDraftKey(customerId: number, bookingId: number | null | undefined) {
  return `haeyoom-sales-draft-${customerId}-${bookingId ?? 'none'}`;
}

export function loadSalesDraft(key: string): SalesRegistrationDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as SalesRegistrationDraft;
  } catch {
    return null;
  }
}

export function saveSalesDraft(key: string, draft: SalesRegistrationDraft) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(draft));
}

export function clearSalesDraft(key: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

export function hasSalesRegistrationDraft(
  customerId: number,
  bookingId: number | null | undefined,
): boolean {
  const draft = loadSalesDraft(getSalesDraftKey(customerId, bookingId));
  return !!(draft && draft.salesItems.length > 0);
}
