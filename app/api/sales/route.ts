import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { issuePrepaidPassFromSale } from '@/lib/data';

const normalizeName = (value: string | null | undefined) => value?.trim().toLowerCase() || '';

function managerMatchesDesigner(
  manager: string | null | undefined,
  designer: { name?: string | null; english_name?: string | null } | null | undefined,
) {
  const normalizedManager = normalizeName(manager);
  if (!normalizedManager || !designer) return false;

  return [designer.name, designer.english_name].some(
    (candidate) => normalizeName(candidate) === normalizedManager,
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const designerId = searchParams.get('designer_id');
    const itemType = searchParams.get('item_type');
    const shopId = searchParams.get('shop_id');

    if (!customerId && !startDate) {
      return NextResponse.json(
        { error: 'customer_id or start_date is required' },
        { status: 400 },
      );
    }

    let query = supabase
      .from('sales')
      .select(`
        *,
        sales_items (*)
      `)
      .order('sales_date', { ascending: false })
      .order('sales_time', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }
    if (startDate) {
      query = query.gte('sales_date', startDate);
    }
    if (endDate) {
      query = query.lte('sales_date', endDate);
    }
    if (shopId) {
      query = query.eq('shop_id', Number(shopId));
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find')) {
        return NextResponse.json({ sales: [] }, { status: 200 });
      }
      console.error('Error fetching sales:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sales history.' },
        { status: 500 },
      );
    }

    let sales = data || [];

    if (designerId) {
      const { data: designer } = await supabase
        .from('designers')
        .select('id, name, english_name')
        .eq('id', Number(designerId))
        .maybeSingle();

      if (!designer) {
        return NextResponse.json({ sales: [] }, { status: 200 });
      }

      sales = sales
        .map((sale: any) => ({
          ...sale,
          sales_items: (sale.sales_items || []).filter((item: any) =>
            managerMatchesDesigner(item.manager, designer),
          ),
        }))
        .filter((sale: any) => (sale.sales_items || []).length > 0);
    }

    if (itemType) {
      const normalizedItemType = itemType === 'membership' ? 'prepaid' : itemType;
      sales = sales
        .map((sale: any) => ({
          ...sale,
          sales_items: (sale.sales_items || []).filter(
            (item: any) => String(item.item_type) === normalizedItemType,
          ),
        }))
        .filter((sale: any) => (sale.sales_items || []).length > 0);
    }

    return NextResponse.json({ sales }, { status: 200 });
  } catch (error: any) {
    console.error('Error in sales GET route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sales history.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customer_id,
      shop_id,
      booking_id,
      items,
      sales_amount,
      discount_amount,
      total,
      payment_method,
      payment_amounts,
      point_accumulation,
      memo,
      sales_date,
      sales_time,
    } = body;

    if (!customer_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Customer ID and sales items are required.' },
        { status: 400 },
      );
    }

    const { data: saleHeader, error: headerError } = await supabase
      .from('sales')
      .insert({
        customer_id: customer_id,
        shop_id: shop_id || null,
        sales_date: sales_date || new Date().toISOString().split('T')[0],
        sales_time: sales_time || new Date().toTimeString().slice(0, 5),
        sales_amount: sales_amount || 0,
        discount_amount: discount_amount || 0,
        total_amount: total || 0,
        payment_method: payment_method || null,
        cash_amount: payment_amounts?.cash || 0,
        card_amount: payment_amounts?.card || 0,
        bank_transfer_amount: payment_amounts?.bank_transfer || 0,
        point_accumulation: point_accumulation || 0,
        memo: memo || null,
      })
      .select()
      .single();

    if (headerError) {
      console.error('Error creating sale header:', headerError);
      return NextResponse.json(
        { error: 'Failed to register sale.' },
        { status: 500 },
      );
    }

    const saleItems = items.map((item: any) => ({
      sale_id: saleHeader.id,
      item_type: item.type,
      item_name: item.name,
      unit_price: item.unit_price || 0,
      quantity: item.quantity || 1,
      discount: item.discount || 0,
      discount_type: item.discount_type || null,
      discount_value: item.discount_value || null,
      amount: item.amount || 0,
      manager: item.manager || null,
      sales_classification: item.sales_classification || null,
      point_deduction: item.point_deduction || 0,
      prepaid_deduction: item.prepaid_deduction || 0,
    }));

    const { error: itemsError } = await supabase
      .from('sales_items')
      .insert(saleItems);

    if (itemsError) {
      console.error('Error creating sale items:', itemsError);
      await supabase.from('sales').delete().eq('id', saleHeader.id);
      return NextResponse.json(
        { error: 'Failed to register sale items.' },
        { status: 500 },
      );
    }

    const rawItems = (items || []) as any[];
    for (const rawItem of rawItems) {
      if (String(rawItem.type) !== 'prepaid') continue;
      const qty = Math.max(1, Math.round(Number(rawItem.quantity || 1)));
      const perCredit = Math.round(Number(rawItem.prepaid_credit_points ?? rawItem.prepaid_points ?? 0));
      const totalCredit = perCredit * qty;
      if (totalCredit <= 0) continue;
      const passLabel = String(rawItem.name || 'Prepaid').trim();
      const expiresAt =
        rawItem.prepaid_expires_at != null && String(rawItem.prepaid_expires_at).trim() !== ''
          ? String(rawItem.prepaid_expires_at).trim()
          : null;
      try {
        await issuePrepaidPassFromSale({
          customerId: Number(customer_id),
          passLabel,
          creditPoints: totalCredit,
          expiresAt,
        });
      } catch (prepaidIssueErr: any) {
        console.error('Error issuing prepaid pass after sale:', prepaidIssueErr);
        await supabase.from('sales_items').delete().eq('sale_id', saleHeader.id);
        await supabase.from('sales').delete().eq('id', saleHeader.id);
        return NextResponse.json(
          {
            error:
              prepaidIssueErr?.message ||
              'Failed to issue prepaid balance. The sale registration was rolled back.',
          },
          { status: 400 },
        );
      }
    }

    const totalPrepaidDeduction = saleItems.reduce(
      (sum: number, item: any) => sum + Number(item.prepaid_deduction || 0),
      0,
    );
    if (totalPrepaidDeduction > 0) {
      const { data: customerRow } = await supabase
        .from('customers')
        .select('id, phone')
        .eq('id', customer_id)
        .maybeSingle();
      const normalizedPhone = String(customerRow?.phone || '').replace(/\D/g, '');

      let prepaidQuery = supabase
        .from('prepaid_passes')
        .select('id, points, customer_id')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (normalizedPhone) {
        prepaidQuery = prepaidQuery.or(
          `customer_id.eq.${customer_id},and(customer_id.is.null,phone.eq.${normalizedPhone})`,
        );
      } else {
        prepaidQuery = prepaidQuery.eq('customer_id', customer_id);
      }
      const { data: prepaidRows, error: prepaidSelErr } = await prepaidQuery;

      if (prepaidSelErr) {
        console.error('Error fetching prepaid pass for deduction:', prepaidSelErr);
      } else {
        const legacyIds = (prepaidRows || [])
          .filter((row: any) => row.customer_id == null)
          .map((row: any) => Number(row.id))
          .filter((id: number) => Number.isFinite(id));
        if (legacyIds.length > 0) {
          await supabase
            .from('prepaid_passes')
            .update({ customer_id: customer_id })
            .in('id', legacyIds);
        }
        const usableRows = (prepaidRows || []).filter((row: any) => Number(row.points || 0) > 0);
        let remaining = totalPrepaidDeduction;
        for (const row of usableRows) {
          if (remaining <= 0) break;
          const current = Number(row.points || 0);
          const deduct = Math.min(current, remaining);
          const next = current - deduct;
          const { error: prepaidUpdErr } = await supabase
            .from('prepaid_passes')
            .update({ points: next })
            .eq('id', row.id);
          if (prepaidUpdErr) {
            console.error(`Error updating prepaid balance for pass ${row.id}:`, prepaidUpdErr);
            break;
          }
          remaining -= deduct;
        }
      }
    }

    if (booking_id != null && booking_id !== '') {
      const bid = Number(booking_id);
      if (!Number.isNaN(bid)) {
        const { data: booking, error: bookingLookupError } = await supabase
          .from('bookings')
          .select('id, customer_id')
          .eq('id', bid)
          .maybeSingle();
        if (bookingLookupError || !booking) {
          console.error('sale_completed: booking lookup failed', bookingLookupError);
          await supabase.from('sales_items').delete().eq('sale_id', saleHeader.id);
          await supabase.from('sales').delete().eq('id', saleHeader.id);
          return NextResponse.json(
            { error: 'Linked booking was not found.' },
            { status: 400 },
          );
        }
        if (booking.customer_id != null && Number(booking.customer_id) !== Number(customer_id)) {
          await supabase.from('sales_items').delete().eq('sale_id', saleHeader.id);
          await supabase.from('sales').delete().eq('id', saleHeader.id);
          return NextResponse.json(
            { error: 'Booking and customer do not match.' },
            { status: 400 },
          );
        }
        const { error: bookingUpdateError } = await supabase
          .from('bookings')
          .update({ sale_completed: 1 })
          .eq('id', bid);
        if (bookingUpdateError) {
          console.error('Error setting booking sale_completed:', bookingUpdateError);
          await supabase.from('sales_items').delete().eq('sale_id', saleHeader.id);
          await supabase.from('sales').delete().eq('id', saleHeader.id);
          return NextResponse.json(
            { error: 'Failed to mark the booking as completed.' },
            { status: 500 },
          );
        }
      }
    }

    if (point_accumulation > 0) {
      const { error: pointsError } = await supabase.rpc('increment_customer_points', {
        customer_id: customer_id,
        points: point_accumulation,
      });

      if (pointsError) {
        console.error('Error updating customer points:', pointsError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        sale: saleHeader,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Error in sales POST route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register sale.' },
      { status: 500 },
    );
  }
}
