import { NextRequest, NextResponse } from 'next/server';
import { attachBookingDepositPaidToSales } from '@/lib/booking-deposit-paid';
import {
  capPaidDepositToService,
  resolvePaidDepositFromSaleRecord,
} from '@/lib/sale-paid-deposit';
import { supabase } from '@/lib/supabase';
import { roundToCents } from '@/lib/utils';

const toNum = (value: unknown) => Number(value || 0);
const normalizeName = (value: string | null | undefined) => value?.trim().toLowerCase() || '';
const SALES_PAGE_SIZE = 1000;
const SALE_ID_CHUNK = 200;

const SALES_HEADER_SELECT = `
  id,
  shop_id,
  sales_date,
  booking_id,
  paid_deposit
`;

const SALES_ITEMS_SELECT = `
  sale_id,
  item_type,
  quantity,
  amount,
  designer_id,
  manager,
  prepaid_deduction
`;

async function fetchSalesItemsBySaleIds(saleIds: number[]) {
  const itemsBySaleId = new Map<number, any[]>();

  for (let i = 0; i < saleIds.length; i += SALE_ID_CHUNK) {
    const chunk = saleIds.slice(i, i + SALE_ID_CHUNK);
    const { data, error } = await supabase
      .from('sales_items')
      .select(SALES_ITEMS_SELECT)
      .in('sale_id', chunk);

    if (error) {
      throw error;
    }

    for (const item of data || []) {
      const saleId = Number(item.sale_id);
      const list = itemsBySaleId.get(saleId) || [];
      list.push(item);
      itemsBySaleId.set(saleId, list);
    }
  }

  return itemsBySaleId;
}

async function fetchSalesInDateRange(
  startDate: string,
  endDate: string,
  shopId: string | null,
) {
  const allSales: any[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from('sales')
      .select(SALES_HEADER_SELECT)
      .gte('sales_date', startDate)
      .lte('sales_date', endDate)
      .order('sales_date', { ascending: true })
      .order('id', { ascending: true });

    if (shopId) {
      query = query.eq('shop_id', Number(shopId));
    }

    const { data, error } = await query.range(offset, offset + SALES_PAGE_SIZE - 1);
    if (error) {
      throw error;
    }

    const batch = data || [];
    allSales.push(...batch);
    if (batch.length < SALES_PAGE_SIZE) {
      break;
    }
    offset += SALES_PAGE_SIZE;
  }

  if (allSales.length === 0) {
    return allSales;
  }

  const saleIds = allSales.map((sale) => Number(sale.id));
  const itemsBySaleId = await fetchSalesItemsBySaleIds(saleIds);

  for (const sale of allSales) {
    sale.sales_items = itemsBySaleId.get(Number(sale.id)) || [];
  }

  return allSales;
}

type StaffSalesData = {
  designerId: number;
  name: string;
  sales: {
    service: { quantity: number; amount: number };
    product: { quantity: number; amount: number };
    subtotal: number;
    membership: { quantity: number; amount: number };
    total: number;
  };
  membershipDeduction: {
    service: { quantity: number; amount: number };
    product: { quantity: number; amount: number };
    subtotal: number;
  };
  total: {
    service: { amount: number };
    product: { amount: number };
    subtotal: number;
  };
  deposit: {
    service: { amount: number };
  };
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const designerId = searchParams.get('designer_id');
    const shopId = searchParams.get('shop_id');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required.' },
        { status: 400 },
      );
    }

    const [{ sales, salesError }, { data: designers, error: designersError }] =
      await Promise.all([
        fetchSalesInDateRange(startDate, endDate, shopId).then(
          (rows) => ({ sales: rows, salesError: null }),
          (error) => ({ sales: [] as any[], salesError: error }),
        ),
        supabase.from('designers').select('id, name, english_name').order('name', { ascending: true }),
      ]);

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      return NextResponse.json(
        { error: 'Failed to load sales data.' },
        { status: 500 },
      );
    }

    if (designersError) {
      console.error('Error fetching designers:', designersError);
      return NextResponse.json(
        { error: 'Failed to load staff data.' },
        { status: 500 },
      );
    }

    const salesData = sales;
    await attachBookingDepositPaidToSales(supabase, salesData);

    const designersMap = new Map<number, { id: number; name: string; english_name?: string | null }>();
    const designerByManager = new Map<string, { id: number; name: string; english_name?: string | null }>();
    // Comment: Virtual designers are created for retired staff (no longer in designers table) who still have historical sales.
    const virtualDesignerByManager = new Map<string, { id: number; name: string; english_name?: string | null }>();
    let nextVirtualDesignerId = -1;
    let unassignedDesigner: { id: number; name: string; english_name?: string | null } | null = null;

    const getUnassignedDesigner = () => {
      if (!unassignedDesigner) {
        unassignedDesigner = {
          id: nextVirtualDesignerId--,
          name: '미배정',
          english_name: null,
        };
        designersMap.set(unassignedDesigner.id, unassignedDesigner);
      }
      return unassignedDesigner;
    };
    (designers || []).forEach((designer: any) => {
      designersMap.set(designer.id, designer);
      if (designer.name) {
        designerByManager.set(normalizeName(designer.name), designer);
      }
      if (designer.english_name) {
        designerByManager.set(normalizeName(designer.english_name), designer);
      }
    });

    const targetDesigner = designerId ? designersMap.get(Number(designerId)) || null : null;
    if (designerId && !targetDesigner) {
      return NextResponse.json({ staffSales: [] }, { status: 200 });
    }

    // Comment: Resolve at most one designer per manager string to avoid duplicate rows and inflated totals.
    const matchDesignerByManager = (manager: string | null | undefined) => {
      const normalizedManager = normalizeName(manager);
      if (!normalizedManager) return [];

      if (targetDesigner) {
        const matchesTarget = [targetDesigner.name, targetDesigner.english_name].some(
          (candidate) => normalizeName(candidate) === normalizedManager,
        );
        return matchesTarget ? [targetDesigner] : [];
      }

      const matched = designerByManager.get(normalizedManager);
      if (matched) return [matched];

      // Comment: Fallback for retired staff — create a virtual designer per distinct manager name
      let virtual = virtualDesignerByManager.get(normalizedManager);
      if (!virtual) {
        virtual = {
          id: nextVirtualDesignerId--,
          name: manager?.trim() || '(퇴사 직원)',
          english_name: null,
        };
        virtualDesignerByManager.set(normalizedManager, virtual);
        designersMap.set(virtual.id, virtual);
      }
      return [virtual];
    };

    const resolveDesignersForItem = (item: any) => {
      if (item.designer_id != null) {
        const d = designersMap.get(Number(item.designer_id));
        if (!d) {
          if (targetDesigner) return [];
          return [getUnassignedDesigner()];
        }
        if (targetDesigner && Number(targetDesigner.id) !== Number(d.id)) return [];
        return [d];
      }

      const normalizedManager = normalizeName(item.manager);
      if (!normalizedManager) {
        if (targetDesigner) return [];
        return [getUnassignedDesigner()];
      }

      return matchDesignerByManager(item.manager);
    };

    const staffSalesMap = new Map<number, StaffSalesData>();

    const ensureStaffData = (designer: { id: number; name: string }) => {
      if (!staffSalesMap.has(designer.id)) {
        staffSalesMap.set(designer.id, {
          designerId: designer.id,
          name: designer.name,
          sales: {
            service: { quantity: 0, amount: 0 },
            product: { quantity: 0, amount: 0 },
            subtotal: 0,
            membership: { quantity: 0, amount: 0 },
            total: 0,
          },
          membershipDeduction: {
            service: { quantity: 0, amount: 0 },
            product: { quantity: 0, amount: 0 },
            subtotal: 0,
          },
          total: {
            service: { amount: 0 },
            product: { amount: 0 },
            subtotal: 0,
          },
          deposit: {
            service: { amount: 0 },
          },
        });
      }

      return staffSalesMap.get(designer.id)!;
    };

    const allocateDepositToDesigners = (
      sale: any,
      depositCredit: number,
      designerServiceAmounts: Map<number, number>,
    ) => {
      const totalMatched = Array.from(designerServiceAmounts.values()).reduce((sum, amt) => sum + amt, 0);
      if (totalMatched <= 0 || depositCredit <= 0) return;

      let remaining = roundToCents(depositCredit);
      const entries = Array.from(designerServiceAmounts.entries()).filter(([designerId]) =>
        designersMap.has(designerId),
      );

      entries.forEach(([designerId, serviceAmount], index) => {
        const designer = designersMap.get(designerId);
        if (!designer) return;

        const share =
          index === entries.length - 1
            ? remaining
            : roundToCents((serviceAmount / totalMatched) * depositCredit);
        remaining = roundToCents(remaining - share);
        if (share <= 0) return;

        const staffData = ensureStaffData(designer);
        staffData.deposit.service.amount += share;
      });
    };

    salesData.forEach((sale: any) => {
      (sale.sales_items || []).forEach((item: any) => {
        const matchedDesigners = resolveDesignersForItem(item);
        if (matchedDesigners.length === 0) return;

        const quantity = Math.max(1, toNum(item.quantity));
        const amount = toNum(item.amount);
        const prepaidDeduction = toNum(item.prepaid_deduction);

        matchedDesigners.forEach((designer) => {
          const staffData = ensureStaffData(designer);

          if (item.item_type === 'service') {
            staffData.sales.service.quantity += quantity;
            staffData.sales.service.amount += amount;

            if (prepaidDeduction > 0) {
              staffData.membershipDeduction.service.quantity += 1;
              staffData.membershipDeduction.service.amount += prepaidDeduction;
            }
            return;
          }

          if (item.item_type === 'product') {
            staffData.sales.product.quantity += quantity;
            staffData.sales.product.amount += amount;

            if (prepaidDeduction > 0) {
              staffData.membershipDeduction.product.quantity += 1;
              staffData.membershipDeduction.product.amount += prepaidDeduction;
            }
            return;
          }

          if (item.item_type === 'prepaid') {
            staffData.sales.membership.quantity += quantity;
            staffData.sales.membership.amount += amount;
          }
        });
      });

      const serviceItems = (sale.sales_items || []).filter(
        (item: any) => item.item_type === 'service',
      );
      const serviceGrossTotal = serviceItems.reduce(
        (sum: number, item: any) => sum + toNum(item.amount),
        0,
      );
      const depositCredit = capPaidDepositToService(
        resolvePaidDepositFromSaleRecord(sale),
        serviceGrossTotal,
      );
      if (depositCredit <= 0) return;

      const designerServiceAmounts = new Map<number, number>();
      serviceItems.forEach((item: any) => {
        const amount = toNum(item.amount);
        resolveDesignersForItem(item).forEach((designer) => {
          designerServiceAmounts.set(
            designer.id,
            (designerServiceAmounts.get(designer.id) || 0) + amount,
          );
        });
      });

      allocateDepositToDesigners(sale, depositCredit, designerServiceAmounts);
    });

    staffSalesMap.forEach((staffData) => {
      staffData.sales.subtotal =
        staffData.sales.service.amount + staffData.sales.product.amount;
      staffData.sales.total =
        staffData.sales.subtotal + staffData.sales.membership.amount;

      staffData.membershipDeduction.subtotal =
        staffData.membershipDeduction.service.amount +
        staffData.membershipDeduction.product.amount;

      staffData.total.service.amount =
        staffData.sales.service.amount + staffData.membershipDeduction.service.amount;
      staffData.total.product.amount =
        staffData.sales.product.amount + staffData.membershipDeduction.product.amount;
      staffData.total.subtotal =
        staffData.total.service.amount + staffData.total.product.amount;
    });

    const staffSales = Array.from(staffSalesMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'ko'),
    );

    return NextResponse.json(
      {
        staffSales,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in by-staff sales route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 },
    );
  }
}
