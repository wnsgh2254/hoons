import { resolvePaidDepositFromSaleRecord } from '@/lib/sale-paid-deposit';
import type { SalesDetailData } from '@/lib/types';

/** Map GET /api/sales/:id (or list row) payload to SalesDetailData for modals */
export function mapSaleRecordToDetailData(sale: any, customerNameFallback = ''): SalesDetailData {
  const name =
    (typeof sale.customer_name === 'string' && sale.customer_name) ||
    customerNameFallback ||
    '';
  return {
    id: sale.id,
    customer_id: sale.customer_id ?? 0,
    shop_id: sale.shop_id ?? null,
    booking_id: sale.booking_id ?? null,
    booking_deposit_paid: resolvePaidDepositFromSaleRecord(sale),
    customer_name: name,
    sales_date: sale.sales_date,
    sales_time: sale.sales_time || '',
    sales_amount: sale.sales_amount || 0,
    discount_amount: sale.discount_amount || 0,
    total_amount: sale.total_amount || 0,
    cash_amount: sale.cash_amount || 0,
    card_amount: sale.card_amount || 0,
    bank_transfer_amount: sale.bank_transfer_amount || 0,
    payment_method: sale.payment_method || null,
    point_accumulation: sale.point_accumulation || 0,
    memo: sale.memo || null,
    items: (sale.sales_items || []).map((i: any) => ({
      item_type: i.item_type || 'service',
      item_name: i.item_name || '-',
      unit_price: Number(i.unit_price) || 0,
      quantity: Number(i.quantity) || 1,
      discount: Number(i.discount) || 0,
      discount_type: i.discount_type || null,
      discount_value: i.discount_value ?? null,
      amount: Number(i.amount) || 0,
      manager: i.manager || null,
      sales_classification: i.sales_classification || null,
      prepaid_deduction: Number(i.prepaid_deduction) || 0,
    })),
    created_by: sale.created_by,
    created_at: sale.created_at,
    edit_history: sale.edit_history || [],
  };
}
