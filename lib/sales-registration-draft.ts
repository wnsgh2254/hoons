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
    designerId?: number | null;
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

/** Comment: Customer-level fallback key so drafts saved from booking flow are found from drawer/mobile entry. */
export function getSalesDraftFallbackKey(customerId: number) {
  return getSalesDraftKey(customerId, null);
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

export function loadSalesDraftForCustomer(
  customerId: number,
  bookingId: number | null | undefined,
): { draft: SalesRegistrationDraft; key: string } | null {
  const keysToTry = Array.from(
    new Set([
      getSalesDraftKey(customerId, bookingId),
      getSalesDraftFallbackKey(customerId),
    ]),
  );

  for (const key of keysToTry) {
    const draft = loadSalesDraft(key);
    if (draft && draft.salesItems.length > 0) {
      return { draft, key };
    }
  }

  // Comment: Drawer/mobile entry uses bookingId=null — also pick up drafts saved from a booking flow.
  if (typeof window !== 'undefined') {
    const prefix = `haeyoom-sales-draft-${customerId}-`;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix) || keysToTry.includes(key)) continue;
      const draft = loadSalesDraft(key);
      if (draft && draft.salesItems.length > 0) {
        return { draft, key };
      }
    }
  }

  return null;
}

export function saveSalesDraft(key: string, draft: SalesRegistrationDraft): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearSalesDraft(key: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

export function hasSalesRegistrationDraft(
  customerId: number,
  bookingId: number | null | undefined,
): boolean {
  return !!loadSalesDraftForCustomer(customerId, bookingId);
}
