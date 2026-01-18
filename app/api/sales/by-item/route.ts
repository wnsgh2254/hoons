import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Helper to safely convert to number
const toNum = (v: any) => Number(v || 0);

// Comment: Get sales data by item (service/product/membership/ticket)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const designerId = searchParams.get('designer_id');
    const itemType = searchParams.get('item_type') || 'service'; // Comment: service, product, membership, ticket
    const aggregationMode = searchParams.get('aggregation_mode') || 'category'; // Comment: category or service

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '시작 날짜와 종료 날짜가 필요합니다.' },
        { status: 400 }
      );
    }

    if (itemType === 'service') {
      // Comment: Fetch service sales
      let bookingsQuery = supabase
        .from('bookings')
        .select('id, designer_id, service_id, total_amount, booking_date, status, prepaid_pass_id')
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .eq('status', 'confirmed');

      if (designerId) {
        bookingsQuery = bookingsQuery.eq('designer_id', designerId);
      }

      const { data: bookings, error: bookingsError } = await bookingsQuery;

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        return NextResponse.json(
          { error: '예약 데이터 조회에 실패했습니다.' },
          { status: 500 }
        );
      }

      // Comment: Fetch services
      const serviceIds = Array.from(
        new Set(
          (bookings || [])
            .map((b: any) => b.service_id)
            .filter((id: number | null | undefined): id is number => id !== null && id !== undefined)
        )
      );

      const { data: services } = await supabase
        .from('services')
        .select('id, name, price, category')
        .in('id', serviceIds.length > 0 ? serviceIds : [-1]);

      const servicesMap = new Map<number, { id: number; name: string; price: number; category: string | null }>();
      (services || []).forEach((s: any) => servicesMap.set(s.id, s));

      // Comment: Group by category or service name
      const itemSalesMap = new Map<
        string,
        {
          category: string;
          sales: { quantity: number; amount: number };
          membershipDeduction: { quantity: number; amount: number };
          ticketDeduction: { quantity: number; amount: number };
          total: number;
          avgPrice: number;
          pointDeduction: number;
        }
      >();

      // Comment: Process bookings
      (bookings || []).forEach((booking: any) => {
        const service = servicesMap.get(booking.service_id || 0);
        if (!service) return;

        const key = aggregationMode === 'category' && service.category
          ? service.category
          : service.name;

        if (!itemSalesMap.has(key)) {
          itemSalesMap.set(key, {
            category: key,
            sales: { quantity: 0, amount: 0 },
            membershipDeduction: { quantity: 0, amount: 0 },
            ticketDeduction: { quantity: 0, amount: 0 },
            total: 0,
            avgPrice: 0,
            pointDeduction: 0,
          });
        }

        const itemData = itemSalesMap.get(key)!;
        const isPrepaidDeduction = booking.prepaid_pass_id !== null && booking.prepaid_pass_id !== undefined;
        const amount = toNum(booking.total_amount);

        if (isPrepaidDeduction) {
          itemData.membershipDeduction.quantity += 1;
          itemData.membershipDeduction.amount += amount;
        } else {
          itemData.sales.quantity += 1;
          itemData.sales.amount += amount;
        }
      });

      // Comment: Calculate totals and averages
      itemSalesMap.forEach((itemData) => {
        itemData.total =
          itemData.sales.amount +
          itemData.membershipDeduction.amount +
          itemData.ticketDeduction.amount;
        itemData.avgPrice =
          itemData.sales.quantity > 0
            ? Math.round(itemData.sales.amount / itemData.sales.quantity)
            : 0;
      });

      const itemSales = Array.from(itemSalesMap.values());

      // Comment: Calculate summary
      const summary = itemSales.reduce(
        (acc, item) => ({
          salesQuantity: acc.salesQuantity + item.sales.quantity,
          salesAmount: acc.salesAmount + item.sales.amount,
          membershipQuantity: acc.membershipQuantity + item.membershipDeduction.quantity,
          membershipAmount: acc.membershipAmount + item.membershipDeduction.amount,
          totalAmount: acc.totalAmount + item.total,
        }),
        {
          salesQuantity: 0,
          salesAmount: 0,
          membershipQuantity: 0,
          membershipAmount: 0,
          totalAmount: 0,
        }
      );

      const avgPrice =
        summary.salesQuantity > 0
          ? Math.round(summary.salesAmount / summary.salesQuantity)
          : 0;

      return NextResponse.json(
        {
          itemSales,
          summary: {
            ...summary,
            avgPrice,
          },
        },
        { status: 200 }
      );
    } else if (itemType === 'product') {
      // Comment: Fetch product sales
      let productSalesQuery = supabase
        .from('product_sale_items')
        .select('quantity, line_amount, created_at, inventory_items(id, name, category, price)')
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);

      const { data: productSales, error: productSalesError } = await productSalesQuery;

      if (productSalesError) {
        console.error('Error fetching product sales:', productSalesError);
        return NextResponse.json(
          { error: '제품 매출 데이터 조회에 실패했습니다.' },
          { status: 500 }
        );
      }

      // Comment: Group by product
      const itemSalesMap = new Map<
        string,
        {
          category: string;
          sales: { quantity: number; amount: number };
          membershipDeduction: { quantity: number; amount: number };
          ticketDeduction: { quantity: number; amount: number };
          total: number;
          avgPrice: number;
          pointDeduction: number;
        }
      >();

      (productSales || []).forEach((item: any) => {
        const inventoryItem = item.inventory_items;
        if (!inventoryItem) return;

        const key = aggregationMode === 'category' && inventoryItem.category
          ? inventoryItem.category
          : inventoryItem.name;

        if (!itemSalesMap.has(key)) {
          itemSalesMap.set(key, {
            category: key,
            sales: { quantity: 0, amount: 0 },
            membershipDeduction: { quantity: 0, amount: 0 },
            ticketDeduction: { quantity: 0, amount: 0 },
            total: 0,
            avgPrice: 0,
            pointDeduction: 0,
          });
        }

        const itemData = itemSalesMap.get(key)!;
        itemData.sales.quantity += toNum(item.quantity);
        itemData.sales.amount += toNum(item.line_amount);
      });

      // Comment: Calculate totals and averages
      itemSalesMap.forEach((itemData) => {
        itemData.total = itemData.sales.amount;
        itemData.avgPrice =
          itemData.sales.quantity > 0
            ? Math.round(itemData.sales.amount / itemData.sales.quantity)
            : 0;
      });

      const itemSales = Array.from(itemSalesMap.values());

      const summary = itemSales.reduce(
        (acc, item) => ({
          salesQuantity: acc.salesQuantity + item.sales.quantity,
          salesAmount: acc.salesAmount + item.sales.amount,
          membershipQuantity: 0,
          membershipAmount: 0,
          totalAmount: acc.totalAmount + item.total,
        }),
        {
          salesQuantity: 0,
          salesAmount: 0,
          membershipQuantity: 0,
          membershipAmount: 0,
          totalAmount: 0,
        }
      );

      const avgPrice =
        summary.salesQuantity > 0
          ? Math.round(summary.salesAmount / summary.salesQuantity)
          : 0;

      return NextResponse.json(
        {
          itemSales,
          summary: {
            ...summary,
            avgPrice,
          },
        },
        { status: 200 }
      );
    } else {
      // Comment: Membership and ticket sales (not yet fully implemented)
      return NextResponse.json(
        {
          itemSales: [],
          summary: {
            salesQuantity: 0,
            salesAmount: 0,
            membershipQuantity: 0,
            membershipAmount: 0,
            totalAmount: 0,
            avgPrice: 0,
          },
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error in by-item sales route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
