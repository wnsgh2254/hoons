import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const toNum = (value: unknown) => Number(value || 0);
const normalizeName = (value: string | null | undefined) => String(value || '').trim().toLowerCase();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let fromDate = from;
    let toDate = to;

    if (!fromDate || !toDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      fromDate = start.toISOString();
      toDate = end.toISOString();
    }

    const fromDay = fromDate.split('T')[0];
    const toDay = toDate.split('T')[0];

    const [{ data: sales, error: salesError }, { data: refunds, error: refundsError }, { data: designers }, { data: services }] =
      await Promise.all([
        supabase
          .from('sales')
          .select(`
            id,
            sales_date,
            total_amount,
            cash_amount,
            card_amount,
            bank_transfer_amount,
            sales_items (
              item_type,
              item_name,
              quantity,
              amount,
              designer_id,
              manager
            )
          `)
          .gte('sales_date', fromDay)
          .lte('sales_date', toDay),
        supabase
          .from('refunds')
          .select(`
            id,
            refund_date,
            total_amount,
            cash_amount,
            card_amount,
            bank_transfer_amount,
            refund_items (
              item_type,
              item_name,
              quantity,
              amount,
              manager
            )
          `)
          .gte('refund_date', fromDay)
          .lte('refund_date', toDay),
        supabase.from('designers').select('id, name, english_name'),
        supabase.from('services').select('name, category'),
      ]);

    if (salesError || refundsError) {
      console.error('Error fetching sales summary data:', salesError || refundsError);
      return NextResponse.json({ error: 'Failed to fetch sales summary.' }, { status: 500 });
    }

    const salesData = sales || [];
    const refundsData = refunds || [];

    const designerByManager = new Map<string, { id: number; name: string }>();
    const designerById = new Map<number, { id: number; name: string }>();
    (designers || []).forEach((designer: any) => {
      designerById.set(Number(designer.id), { id: designer.id, name: designer.name });
      if (designer.name) {
        designerByManager.set(normalizeName(designer.name), { id: designer.id, name: designer.name });
      }
      if (designer.english_name) {
        designerByManager.set(normalizeName(designer.english_name), { id: designer.id, name: designer.name });
      }
    });

    const serviceCategoryMap = new Map<string, string>();
    (services || []).forEach((service: any) => {
      serviceCategoryMap.set(normalizeName(service.name), String(service.category || 'Others'));
    });

    const totalSalesAmount = salesData.reduce((sum: number, sale: any) => sum + toNum(sale.total_amount), 0);
    const totalRefundAmount = refundsData.reduce((sum: number, refund: any) => sum + toNum(refund.total_amount), 0);
    const totalRevenue = totalSalesAmount - totalRefundAmount;
    const transactions = salesData.length;
    const avgTicket = transactions > 0 ? totalSalesAmount / transactions : 0;

    const trendMap = new Map<string, { date: string; revenue: number }>();
    const addTrend = (date: string, amount: number) => {
      const existing = trendMap.get(date) || { date, revenue: 0 };
      existing.revenue += amount;
      trendMap.set(date, existing);
    };
    salesData.forEach((sale: any) => addTrend(String(sale.sales_date), toNum(sale.total_amount)));
    refundsData.forEach((refund: any) => addTrend(String(refund.refund_date), -toNum(refund.total_amount)));
    const trendPoints = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const paymentTotals = new Map<string, number>();
    const addPayment = (method: string, amount: number) => {
      if (amount === 0) return;
      paymentTotals.set(method, (paymentTotals.get(method) || 0) + amount);
    };

    salesData.forEach((sale: any) => {
      addPayment('cash', toNum(sale.cash_amount));
      addPayment('card', toNum(sale.card_amount));
      addPayment('bank_transfer', toNum(sale.bank_transfer_amount));
    });
    refundsData.forEach((refund: any) => {
      addPayment('cash', -toNum(refund.cash_amount));
      addPayment('card', -toNum(refund.card_amount));
      addPayment('bank_transfer', -toNum(refund.bank_transfer_amount));
    });

    const paymentMethodsRaw = Array.from(paymentTotals.entries()).map(([method, amount]) => ({
      method,
      amount,
    }));
    const paymentTotal = paymentMethodsRaw.reduce((sum, entry) => sum + Math.max(0, entry.amount), 0);
    const paymentMethods = paymentMethodsRaw.map((entry) => ({
      method: entry.method,
      amount: entry.amount,
      percentage: paymentTotal > 0 ? (Math.max(0, entry.amount) / paymentTotal) * 100 : 0,
    }));

    const stylistMap = new Map<number, { designerId: number; name: string; revenue: number; bookingsCount: number }>();
    const serviceMap = new Map<string, { serviceId: number; name: string; transactions: number; revenue: number }>();

    const applyItem = (item: any, sign: 1 | -1) => {
      const amount = toNum(item.amount) * sign;
      const quantity = Math.max(1, toNum(item.quantity));
      const designer =
        item.designer_id != null
          ? designerById.get(Number(item.designer_id)) || null
          : designerByManager.get(normalizeName(item.manager));

      if (designer) {
        const current = stylistMap.get(designer.id) || {
          designerId: designer.id,
          name: designer.name,
          revenue: 0,
          bookingsCount: 0,
        };
        current.revenue += amount;
        current.bookingsCount += sign > 0 ? quantity : -quantity;
        stylistMap.set(designer.id, current);
      }

      if (String(item.item_type) === 'service') {
        const serviceName = String(item.item_name || 'Unknown').trim() || 'Unknown';
        const current = serviceMap.get(serviceName) || {
          serviceId: 0,
          name: serviceName,
          transactions: 0,
          revenue: 0,
        };
        current.transactions += sign > 0 ? quantity : -quantity;
        current.revenue += amount;
        serviceMap.set(serviceName, current);
      }
    };

    salesData.forEach((sale: any) => (sale.sales_items || []).forEach((item: any) => applyItem(item, 1)));
    refundsData.forEach((refund: any) => (refund.refund_items || []).forEach((item: any) => applyItem(item, -1)));

    const topStylistsRaw = Array.from(stylistMap.values())
      .filter((entry) => entry.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
    const topStylistsTotal = topStylistsRaw.reduce((sum, entry) => sum + entry.revenue, 0);
    const topStylists = topStylistsRaw.slice(0, 10).map((entry) => ({
      designerId: entry.designerId,
      name: entry.name,
      revenue: entry.revenue,
      bookingsCount: Math.max(0, entry.bookingsCount),
      percentageOfTop: topStylistsTotal > 0 ? (entry.revenue / topStylistsTotal) * 100 : 0,
    }));

    const serviceCategories = Array.from(serviceMap.values())
      .filter((entry) => entry.revenue > 0)
      .map((entry) => ({
        ...entry,
        category: serviceCategoryMap.get(normalizeName(entry.name)) || 'Others',
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json(
      {
        from: fromDate,
        to: toDate,
        totalRevenue,
        transactions,
        avgTicket,
        trendPoints,
        paymentMethods,
        topStylists,
        serviceCategories,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in sales summary route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 },
    );
  }
}
