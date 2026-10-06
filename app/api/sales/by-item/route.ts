import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { roundToCents } from '@/lib/utils';

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
  customerCount: number;
  customerBookable: boolean;
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
        customer_id,
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

    const inventoryQuery = supabase.from('inventory_items').select('name, brand, category');
    const scopedInventoryQuery = shopId ? inventoryQuery.eq('shop_id', Number(shopId)) : inventoryQuery;

    const [{ data: sales, error: salesError }, { data: designers }, { data: services }, { data: inventoryItems }] =
      await Promise.all([
        salesQuery,
        supabase.from('designers').select('id, name, english_name'),
        supabase.from('services').select('name, category'),
        scopedInventoryQuery,
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
          customerCount: 0,
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

    // Comment: Rank/length surcharge add-ons (e.g. "원장 직급 추가 - Color", "기장추가 L") are
    // never a standalone item a customer books directly — they're admin-added extra fees.
    // `services.visible_to` doesn't distinguish these (the settings UI sets every card-priced
    // row to 'both' regardless), so we key off the "추가"/"addition" naming convention instead.
    const isSurchargeAddonName = (name: string) =>
      name.includes('추가') || name.toLowerCase().includes('addition');

    const productCategoryMap = new Map<string, string>();
    (inventoryItems || []).forEach((item: any) => {
      productCategoryMap.set(normalizeName(item.name), item.brand || item.category || 'Others');
    });

    const normalizedItemType = itemType === 'membership' ? 'prepaid' : itemType;
    const itemSalesMap = new Map<string, ItemSalesRow>();
    const customerIdsByKey = new Map<string, Set<number>>();
    // Comment: distinct customers across ALL matched items/sales, for the overall summary —
    // a customer who gets cut + color + clinic in one visit should count once here, not 3 times.
    const summaryCustomerIds = new Set<number>();

    const ensureItemSales = (
      key: string,
      category: string,
      serviceName?: string,
      customerBookable: boolean = true,
    ) => {
      if (!itemSalesMap.has(key)) {
        itemSalesMap.set(key, {
          category,
          ...(serviceName ? { serviceName } : {}),
          sales: { quantity: 0, amount: 0 },
          membershipDeduction: { quantity: 0, amount: 0 },
          total: 0,
          avgPrice: 0,
          pointDeduction: 0,
          customerCount: 0,
          customerBookable,
        });
      }

      return itemSalesMap.get(key)!;
    };

    (sales || []).forEach((sale: any) => {
      const customerId = sale.customer_id != null ? Number(sale.customer_id) : null;

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
        const isServiceBookable =
          normalizedItemType === 'service' ? !isSurchargeAddonName(item.item_name || '') : true;

        if (normalizedItemType === 'service') {
          if (aggregationMode === 'service') {
            category = serviceCategoryMap.get(normalizedItemName) || 'Others';
            key = item.item_name || 'Unknown';
            serviceName = item.item_name || 'Unknown';
          } else {
            // Comment: Category mapping isn't reliable enough to break services down by
            // Cut/Color/Perm/etc. today, so this view is just two rows: real bookable
            // services vs. addon/surcharge fees (rank/length additions).
            key = isServiceBookable ? 'service' : 'addon';
            category = isServiceBookable ? '서비스' : 'Others';
          }
        } else if (normalizedItemType === 'product') {
          category = productCategoryMap.get(normalizedItemName) || 'Others';
          key = aggregationMode === 'category' ? category : (item.item_name || 'Unknown');
        } else {
          category = item.item_name || 'Prepaid';
          key = item.item_name || 'Prepaid';
        }

        const row = ensureItemSales(key, category, serviceName, isServiceBookable);
        row.sales.quantity += quantity;
        row.sales.amount += amount;

        if (prepaidDeduction > 0) {
          row.membershipDeduction.quantity += 1;
          row.membershipDeduction.amount += prepaidDeduction;
        }

        if (customerId != null) {
          let customerSet = customerIdsByKey.get(key);
          if (!customerSet) {
            customerSet = new Set<number>();
            customerIdsByKey.set(key, customerSet);
          }
          customerSet.add(customerId);
          summaryCustomerIds.add(customerId);
        }
      });
    });

    itemSalesMap.forEach((row, key) => {
      row.total = row.sales.amount + row.membershipDeduction.amount;
      // Comment: 객단가 includes membership/deposit deduction amount, not just cash sales,
      // so it reflects the full value of the service.
      row.avgPrice = row.sales.quantity > 0 ? roundToCents(row.total / row.sales.quantity) : 0;
      row.customerCount = customerIdsByKey.get(key)?.size || 0;
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
              ? roundToCents(summary.totalAmount / summary.salesQuantity)
              : 0,
          customerCount: summaryCustomerIds.size,
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
