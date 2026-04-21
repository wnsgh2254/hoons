import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const normalizeName = (value: string | null | undefined) => String(value || '').trim().toLowerCase();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const designerId = searchParams.get('designer_id');

    if (!startDate || !endDate || !designerId) {
      return NextResponse.json(
        { error: 'start_date, end_date, and designer_id are required.' },
        { status: 400 },
      );
    }

    const [{ data: sales, error: salesError }, { data: customers }, { data: designer, error: designerError }] =
      await Promise.all([
        supabase
          .from('sales')
          .select(`
            id,
            customer_id,
            sales_date,
            sales_time,
            cash_amount,
            card_amount,
            bank_transfer_amount,
            sales_items (
              id,
              item_type,
              item_name,
              unit_price,
              quantity,
              discount,
              amount,
              manager,
              prepaid_deduction
            )
          `)
          .gte('sales_date', startDate)
          .lte('sales_date', endDate)
          .order('sales_date', { ascending: true })
          .order('sales_time', { ascending: true }),
        supabase.from('customers').select('id, name'),
        supabase
          .from('designers')
          .select('id, name, english_name, percent_rate, product_sale_pct, product_deduction_pct')
          .eq('id', Number(designerId))
          .single(),
      ]);

    if (salesError || designerError || !designer) {
      console.error('Error fetching sales history:', salesError || designerError);
      return NextResponse.json(
        { error: 'Failed to fetch sales history.' },
        { status: 500 },
      );
    }

    const customerMap = new Map<number, string>();
    (customers || []).forEach((customer: any) => {
      customerMap.set(Number(customer.id), String(customer.name || '-'));
    });

    const matchesDesigner = (manager: string | null | undefined) =>
      [designer.name, designer.english_name].some(
        (candidate) => normalizeName(candidate) === normalizeName(manager),
      );

    const getPaymentMethodLabel = (sale: any) => {
      const labels: string[] = [];
      if (Number(sale.cash_amount || 0) > 0) labels.push('현금');
      if (Number(sale.card_amount || 0) > 0) labels.push('카드');
      if (Number(sale.bank_transfer_amount || 0) > 0) labels.push('계좌이체');
      return labels.join(', ') || '-';
    };

    const serviceRate = Number(designer.percent_rate || 0);
    const productSaleRate = Number(designer.product_sale_pct ?? designer.percent_rate ?? 0);
    const productDeductionRate = Number(designer.product_deduction_pct ?? designer.percent_rate ?? 0);

    const salesHistory: any[] = [];

    (sales || []).forEach((sale: any) => {
      const customerName = customerMap.get(Number(sale.customer_id)) || '-';
      const paymentMethod = getPaymentMethodLabel(sale);

      (sale.sales_items || [])
        .filter((item: any) => matchesDesigner(item.manager))
        .forEach((item: any) => {
          const itemType = String(item.item_type || 'service');
          const quantity = Math.max(1, Number(item.quantity || 1));
          const unitPrice = Number(item.unit_price || 0);
          const discount = Number(item.discount || 0);
          const cashAmount = Number(item.amount || 0);
          const prepaidAmount = Number(item.prepaid_deduction || 0);
          const normalRate = itemType === 'product' ? productSaleRate : serviceRate;
          const deductionRate = itemType === 'product' ? productDeductionRate : serviceRate;
          const grossAmount = cashAmount + prepaidAmount;

          if (cashAmount > 0) {
            salesHistory.push({
              id: `sale-${sale.id}-item-${item.id}`,
              itemType,
              date: sale.sales_date,
              customerName,
              serviceName: item.item_name || '-',
              unitPrice,
              quantity,
              amount: grossAmount,
              discount,
              paymentMethod,
              paymentAmount: cashAmount,
              isPrepaidDeduction: false,
              afterDeduction: cashAmount,
              incentiveRate: normalRate,
              incentive: (cashAmount * normalRate) / 100,
            });
          }

          if (prepaidAmount > 0) {
            salesHistory.push({
              id: `sale-${sale.id}-item-${item.id}-prepaid`,
              itemType,
              date: sale.sales_date,
              customerName,
              serviceName: item.item_name || '-',
              unitPrice,
              quantity,
              amount: grossAmount,
              discount,
              paymentMethod: '정액권 차감',
              paymentAmount: prepaidAmount,
              isPrepaidDeduction: true,
              afterDeduction: prepaidAmount,
              incentiveRate: deductionRate,
              incentive: (prepaidAmount * deductionRate) / 100,
            });
          }
        });
    });

    salesHistory.sort((a, b) => {
      const dateCompare = String(a.date).localeCompare(String(b.date));
      if (dateCompare !== 0) return dateCompare;
      return String(a.id).localeCompare(String(b.id));
    });

    return NextResponse.json({
      salesHistory,
      designer: {
        id: designer.id,
        name: designer.name,
        incentiveRate: designer.percent_rate,
        productSaleRate: designer.product_sale_pct,
        productDeductionRate: designer.product_deduction_pct,
      },
    });
  } catch (error: any) {
    console.error('Error in sales-history route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sales history.' },
      { status: 500 },
    );
  }
}
