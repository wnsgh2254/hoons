import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const toNum = (value: unknown) => Number(value || 0);
const normalizeName = (value: string | null | undefined) => value?.trim().toLowerCase() || '';

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

    let salesQuery = supabase
      .from('sales')
      .select(`
        id,
        shop_id,
        sales_date,
        sales_items (
          item_type,
          quantity,
          amount,
          designer_id,
          manager,
          prepaid_deduction
        )
      `)
      .gte('sales_date', startDate)
      .lte('sales_date', endDate);

    if (shopId) {
      salesQuery = salesQuery.eq('shop_id', Number(shopId));
    }

    const [{ data: sales, error: salesError }, { data: designers, error: designersError }] =
      await Promise.all([
        salesQuery,
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

    const designersMap = new Map<number, { id: number; name: string; english_name?: string | null }>();
    (designers || []).forEach((designer: any) => {
      designersMap.set(designer.id, designer);
    });

    const targetDesigner = designerId ? designersMap.get(Number(designerId)) || null : null;
    if (designerId && !targetDesigner) {
      return NextResponse.json({ staffSales: [] }, { status: 200 });
    }

    const matchDesignerByManager = (manager: string | null | undefined) => {
      const normalizedManager = normalizeName(manager);
      if (!normalizedManager) return [];

      const availableDesigners = targetDesigner ? [targetDesigner] : Array.from(designersMap.values());
      return availableDesigners.filter((designer) =>
        [designer.name, designer.english_name].some(
          (candidate) => normalizeName(candidate) === normalizedManager,
        ),
      );
    };

    const resolveDesignersForItem = (item: any) => {
      if (item.designer_id != null) {
        const d = designersMap.get(Number(item.designer_id));
        if (!d) return [];
        if (targetDesigner && Number(targetDesigner.id) !== Number(d.id)) return [];
        return [d];
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
        });
      }

      return staffSalesMap.get(designer.id)!;
    };

    (sales || []).forEach((sale: any) => {
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

    return NextResponse.json(
      {
        staffSales: Array.from(staffSalesMap.values()),
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
