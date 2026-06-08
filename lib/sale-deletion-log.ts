import { normalizeBookingDepositPaid } from '@/lib/booking-deposit-paid';
import { resolvePaidDepositFromSaleRecord } from '@/lib/sale-paid-deposit';
import { resolveBookingIdForSale } from '@/lib/sale-booking-link';
import { getSalePrepaidDeductionTotal } from '@/lib/sales-payment-utils';

type SaleRow = {
  id: number;
  booking_id?: number | null;
  customer_id?: number | null;
  customer_name?: string | null;
  shop_id?: number | null;
  sales_date?: string | null;
  sales_time?: string | null;
  total_amount?: number | null;
  cash_amount?: number | null;
  card_amount?: number | null;
  bank_transfer_amount?: number | null;
  prepaid_amount?: number | null;
  payment_method?: string | null;
  sales_items?: Array<{
    manager?: string | null;
    designer_id?: number | null;
    prepaid_deduction?: number | null;
  }>;
};

function pickDesignerName(
  sale: SaleRow,
  bookingDesignerName: string | null,
): string | null {
  const fromItem = (sale.sales_items || []).find(
    (item) => item.manager && String(item.manager).trim(),
  )?.manager;
  if (fromItem) return String(fromItem).trim();
  return bookingDesignerName;
}

/** Insert audit row before the sale row is removed. */
export async function insertSalesDeletionLog(
  supabase: { from: (table: string) => any },
  sale: SaleRow,
  bookingId: number | null,
  bookingDepositPaid: number,
  bookingDesignerName: string | null,
): Promise<void> {
  const prepaidFromItems = getSalePrepaidDeductionTotal(sale.sales_items || []);
  const prepaidHeader = Number(sale.prepaid_amount || 0);
  const prepaidAmount = prepaidFromItems > 0 ? prepaidFromItems : prepaidHeader;

  const { error } = await supabase.from('sales_deletion_log').insert({
    sale_id: sale.id,
    booking_id: bookingId,
    sales_date: sale.sales_date,
    sales_time: sale.sales_time || null,
    designer_name: pickDesignerName(sale, bookingDesignerName),
    customer_name: sale.customer_name || null,
    cash_amount: Number(sale.cash_amount || 0),
    card_amount: Number(sale.card_amount || 0),
    bank_transfer_amount: Number(sale.bank_transfer_amount || 0),
    prepaid_amount: prepaidAmount,
    total_amount: Number(sale.total_amount || 0),
    payment_method: sale.payment_method || null,
    deposit_paid: bookingDepositPaid,
  });

  if (error) {
    throw new Error(error.message || 'Failed to write sales deletion log.');
  }
}

/** Load sale + items, resolve booking, write log. Call before deleting sale rows. */
export async function archiveSaleDeletion(
  supabase: { from: (table: string) => any },
  saleId: number,
): Promise<{ bookingId: number | null; depositPaid: number; sale: SaleRow }> {
  const { data: sale, error } = await supabase
    .from('sales')
    .select(
      `
      *,
      sales_items (*)
    `,
    )
    .eq('id', saleId)
    .maybeSingle();

  if (error || !sale) {
    throw new Error(error?.message || 'Sale not found for deletion log.');
  }

  const bookingId = await resolveBookingIdForSale(supabase, sale);
  const depositPaid = normalizeBookingDepositPaid(
    resolvePaidDepositFromSaleRecord(sale as Parameters<typeof resolvePaidDepositFromSaleRecord>[0]),
  );

  let bookingDesignerName: string | null = null;
  if (bookingId) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('designer:designer_id ( name )')
      .eq('id', bookingId)
      .maybeSingle();
    bookingDesignerName =
      (booking as { designer?: { name?: string | null } | null })?.designer?.name?.trim() ||
      null;
  }

  await insertSalesDeletionLog(
    supabase,
    sale as SaleRow,
    bookingId,
    normalizeBookingDepositPaid(depositPaid),
    bookingDesignerName,
  );

  return {
    bookingId,
    depositPaid: normalizeBookingDepositPaid(depositPaid),
    sale: sale as SaleRow,
  };
}
