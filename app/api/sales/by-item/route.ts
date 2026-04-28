import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const toNum = (value: unknown) => Number(value || 0);
const normalizeName = (value: string | null | undefined) => value?.trim().toLowerCase() || '';

type ItemSalesRow = {
  category: string;
  serviceName?: string;
  sales: { quantity: number; amount: number };
  membershipDeduction: { quantity: number; amount: number };
  total: number;
  avgPrice: number;
  pointDeduction: number;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const designerId = searchParams.get('designer_id');
    const itemType = searchParams.get('item_type') || 'service';
    const aggregationMode = searchParams.get('aggregation_mode') || 'category';
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
          item_name,
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

    const [{ data: sales, error: salesError }, { data: designers }, { data: services }, { data: inventoryItems }] =
      await Promise.all([
        salesQuery,
        supabase.from('designers').select('id, name, english_name'),
        supabase.from('services').select('name, category'),
        supabase.from('inventory_items').select('name, brand, category'),
      ]);

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      return NextResponse.json(
        { error: 'Failed to load sales data.' },
        { status: 500 },
      );
    }

    const designersMap = new Map<number, any>();
    (designers || []).forEach((designer: any) => {
      designersMap.set(designer.id, designer);
    });

    const targetDesigner = designerId ? designersMap.get(Number(designerId)) || null : null;
    if (designerId && !targetDesigner) {
      return NextResponse.json({
        itemSales: [],
        summary: {
          salesQuantity: 0,
          salesAmount: 0,
          membershipQuantity: 0,
          membershipAmount: 0,
          totalAmount: 0,
          avgPrice: 0,
        },
      });
    }

    const itemMatchesTarget = (item: any) => {
      if (!targetDesigner) return true;
      if (item.designer_id != null) {
        return Number(item.designer_id) === Number(targetDesigner.id);
      }
      const manager = item.manager;
      const normalizedManager = normalizeName(manager);
      if (!normalizedManager) return false;

      return [targetDesigner.name, targetDesigner.english_name].some(
        (candidate) => normalizeName(candidate) === normalizedManager,
      );
    };

    const serviceCategoryMap = new Map<string, string>();
    (services || []).forEach((service: any) => {
      serviceCategoryMap.set(normalizeName(service.name), service.category || 'Others');
    });

    const productCategoryMap = new Map<string, string>();
    (inventoryItems || []).forEach((item: any) => {
      productCategoryMap.set(normalizeName(item.name), item.brand || item.category || 'Others');
    });

    const normalizedItemType = itemType === 'membership' ? 'prepaid' : itemType;
    const itemSalesMap = new Map<string, ItemSalesRow>();

    const ensureItemSales = (key: string, category: string, serviceName?: string) => {
      if (!itemSalesMap.has(key)) {
        itemSalesMap.set(key, {
          category,
          ...(serviceName ? { serviceName } : {}),
          sales: { quantity: 0, amount: 0 },
          membershipDeduction: { quantity: 0, amount: 0 },
          total: 0,
          avgPrice: 0,
          pointDeduction: 0,
        });
      }

      return itemSalesMap.get(key)!;
    };

    (sales || []).forEach((sale: any) => {
      (sale.sales_items || []).forEach((item: any) => {
        if (String(item.item_type) !== normalizedItemType) return;
        if (!itemMatchesTarget(item)) return;

        const quantity = Math.max(1, toNum(item.quantity));
        const amount = toNum(item.amount);
        const prepaidDeduction = toNum(item.prepaid_deduction);
        const normalizedItemName = normalizeName(item.item_name);

        let key = item.item_name || 'Unknown';
        let category = item.item_name || 'Unknown';
        let serviceName: string | undefined;

        if (normalizedItemType === 'service') {
          category = serviceCategoryMap.get(normalizedItemName) || 'Others';
          if (aggregationMode === 'service') {
            key = item.item_name || 'Unknown';
            serviceName = item.item_name || 'Unknown';
          } else {
            key = category;
          }
        } else if (normalizedItemType === 'product') {
          category = productCategoryMap.get(normalizedItemName) || 'Others';
          key = aggregationMode === 'category' ? category : (item.item_name || 'Unknown');
        } else {
          category = item.item_name || 'Prepaid';
          key = item.item_name || 'Prepaid';
        }

        const row = ensureItemSales(key, aggregationMode === 'service' ? category : key, serviceName);
        row.sales.quantity += quantity;
        row.sales.amount += amount;

        if (prepaidDeduction > 0) {
          row.membershipDeduction.quantity += 1;
          row.membershipDeduction.amount += prepaidDeduction;
        }
      });
    });

    itemSalesMap.forEach((row) => {
      row.total = row.sales.amount + row.membershipDeduction.amount;
      row.avgPrice = row.sales.quantity > 0 ? Math.round(row.sales.amount / row.sales.quantity) : 0;
    });

    const itemSales = Array.from(itemSalesMap.values());
    const summary = itemSales.reduce(
      (acc, row) => ({
        salesQuantity: acc.salesQuantity + row.sales.quantity,
        salesAmount: acc.salesAmount + row.sales.amount,
        membershipQuantity: acc.membershipQuantity + row.membershipDeduction.quantity,
        membershipAmount: acc.membershipAmount + row.membershipDeduction.amount,
        totalAmount: acc.totalAmount + row.total,
      }),
      {
        salesQuantity: 0,
        salesAmount: 0,
        membershipQuantity: 0,
        membershipAmount: 0,
        totalAmount: 0,
      },
    );

    return NextResponse.json(
      {
        itemSales,
        summary: {
          ...summary,
          avgPrice:
            summary.salesQuantity > 0
              ? Math.round(summary.salesAmount / summary.salesQuantity)
              : 0,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in by-item sales route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 },
    );
  }
}
