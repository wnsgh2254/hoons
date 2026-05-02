import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function normalizeComparablePhone(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '');
}

function normalizeComparableName(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

// Comment: GET - Fetch customers list with pagination and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Comment: Build query
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Comment: Apply search filter
    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Comment: Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Comment: Calculate total pages
    const totalPages = count ? Math.ceil(count / limit) : 1;

    // Comment: Get prepaid pass balances and total sales for each customer
    const customerIds = (data || []).map((c: any) => c.id);
    const prepaidBalances: Record<number, number> = {};
    const totalSales: Record<number, number> = {};

    if (customerIds.length > 0) {
      // Comment: Balance is grouped by customer link or customer name + phone fallback.
      const { data: linkedPrepaidData } = await supabase
        .from('prepaid_passes')
        .select('customer_id, name, phone, points, is_active, expires_at')
        .eq('is_active', true);

      (linkedPrepaidData || []).forEach((p: any) => {
        const matchedCustomer = (data || []).find((customer: any) => {
          if (p.customer_id != null && Number(p.customer_id) === Number(customer.id)) return true;
          return (
            normalizeComparableName(p.name) === normalizeComparableName(customer.name) &&
            normalizeComparablePhone(p.phone) === normalizeComparablePhone(customer.phone)
          );
        });
        if (!matchedCustomer) return;

        if (!prepaidBalances[matchedCustomer.id]) {
          prepaidBalances[matchedCustomer.id] = 0;
        }
        prepaidBalances[matchedCustomer.id] += Number(p.points || 0);
      });
      const [{ data: salesData }, { data: refundData }] = await Promise.all([
        supabase
          .from('sales')
          .select('customer_id, total_amount')
          .in('customer_id', customerIds),
        supabase
          .from('refunds')
          .select('customer_id, total_amount')
          .in('customer_id', customerIds),
      ]);

      (salesData || []).forEach((sale: any) => {
        if (!totalSales[sale.customer_id]) {
          totalSales[sale.customer_id] = 0;
        }
        totalSales[sale.customer_id] += Number(sale.total_amount || 0);
      });

      (refundData || []).forEach((refund: any) => {
        if (!totalSales[refund.customer_id]) {
          totalSales[refund.customer_id] = 0;
        }
        totalSales[refund.customer_id] -= Number(refund.total_amount || 0);
      });
    }

    // Comment: Get designer information for customers with assigned_designer_id
    const designerIds = Array.from(
      new Set((data || []).map((c: any) => c.assigned_designer_id).filter(Boolean))
    );
    const designersMap: Record<number, { id: number; name: string }> = {};

    if (designerIds.length > 0) {
      const { data: designersData } = await supabase
        .from('designers')
        .select('id, name')
        .in('id', designerIds);

      (designersData || []).forEach((d: any) => {
        designersMap[d.id] = { id: d.id, name: d.name };
      });
    }

    // Comment: Add calculated fields and designer information to customers
    const customersWithStats = (data || []).map((customer: any) => ({
      ...customer,
      prepaid_balance: prepaidBalances[customer.id] || 0,
      total_sales: totalSales[customer.id] || 0,
      assigned_designer: customer.assigned_designer_id 
        ? designersMap[customer.assigned_designer_id] || null
        : null,
    }));

    return NextResponse.json({
      customers: customersWithStats,
      total: count || 0,
      page,
      totalPages,
    });
  } catch (error: any) {
    console.error('Error in customers GET route:', error);
    return NextResponse.json(
      { error: error.message || '고객 목록을 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}

// Comment: POST - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, assigned_designer_id } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: '고객명은 필수입니다.' },
        { status: 400 }
      );
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { error: '휴대폰번호는 필수입니다.' },
        { status: 400 }
      );
    }

    const normalizedPhone = phone.trim().replace(/\D/g, '');
    const normalizedName = name.trim();

    // Comment: Block duplicate phone (one customer record per phone number)
    const { data: samePhoneRows } = await supabase
      .from('customers')
      .select('id, name')
      .eq('phone', normalizedPhone)
      .limit(1);
    const existingByPhone = samePhoneRows?.[0];
    if (existingByPhone) {
      return NextResponse.json(
        {
          error: '이미 등록된 전화번호입니다.',
          existingCustomerName: String(existingByPhone.name || '').trim(),
        },
        { status: 409 },
      );
    }

    // Comment: Insert new customer (customer_number is no longer used here)
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: normalizedName,
        phone: normalizedPhone,
        created_at: new Date().toISOString(),
        assigned_designer_id: assigned_designer_id ? Number(assigned_designer_id) : null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Comment: Get designer information if assigned
    let assignedDesigner = null;
    if (data?.assigned_designer_id) {
      const { data: designerData } = await supabase
        .from('designers')
        .select('id, name')
        .eq('id', data.assigned_designer_id)
        .single();
      assignedDesigner = designerData;
    }

    return NextResponse.json(
      {
        customer: {
          ...data,
          assigned_designer: assignedDesigner,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Error in customers POST route:', error);
    return NextResponse.json(
      { error: error.message || '고객을 등록하지 못했습니다.' },
      { status: 500 },
    );
  }
}

// Comment: PATCH - Update a customer
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '고객 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, phone, assigned_designer_id } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: '고객명은 필수입니다.' },
        { status: 400 }
      );
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { error: '휴대폰번호는 필수입니다.' },
        { status: 400 }
      );
    }

    const normalizedPhone = phone.trim().replace(/\D/g, '');
    const updateData: any = {
      name: name.trim(),
      phone: normalizedPhone,
    };

    // Comment: Update assigned_designer_id if provided
    if (assigned_designer_id !== undefined) {
      updateData.assigned_designer_id = assigned_designer_id ? Number(assigned_designer_id) : null;
    }

    const customerId = Number(id);
    const { data: phoneConflictRows } = await supabase
      .from('customers')
      .select('id, name')
      .eq('phone', normalizedPhone)
      .neq('id', customerId)
      .limit(1);
    const phoneConflict = phoneConflictRows?.[0];
    if (phoneConflict) {
      return NextResponse.json(
        {
          error: '이미 다른 고객이 사용 중인 전화번호입니다.',
          existingCustomerName: String(phoneConflict.name || '').trim(),
        },
        { status: 409 },
      );
    }

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', Number(id))
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Comment: Get designer information if assigned
    let assignedDesigner = null;
    if (data?.assigned_designer_id) {
      const { data: designerData } = await supabase
        .from('designers')
        .select('id, name')
        .eq('id', data.assigned_designer_id)
        .single();
      assignedDesigner = designerData;
    }

    return NextResponse.json({ 
      customer: {
        ...data,
        assigned_designer: assignedDesigner,
      }
    });
  } catch (error: any) {
    console.error('Error in customers PATCH route:', error);
    return NextResponse.json(
      { error: error.message || '고객을 수정하지 못했습니다.' },
      { status: 500 }
    );
  }
}

// Comment: DELETE - Delete a customer
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '고객 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const customerId = Number(id);
    if (!Number.isFinite(customerId)) {
      return NextResponse.json(
        { error: '유효하지 않은 고객 ID입니다.' },
        { status: 400 }
      );
    }

    // Comment: Keep strict prepaid rule — customer with prepaid balance cannot be deleted directly.
    const { count: prepaidCount, error: prepaidError } = await supabase
      .from('prepaid_passes')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId);
    if (prepaidError) {
      throw new Error(prepaidError.message);
    }
    if ((prepaidCount || 0) > 0) {
      return NextResponse.json(
        { error: '정액권이 연결된 고객은 삭제할 수 없습니다. 먼저 정액권을 정리해주세요.' },
        { status: 409 }
      );
    }

    // Comment: Allow deleting customer when all linked bookings are either past or sale-completed.
    const { data: linkedBookings, error: bookingLoadError } = await supabase
      .from('bookings')
      .select('id, booking_date, booking_time, sale_completed, status')
      .eq('customer_id', customerId);
    if (bookingLoadError) {
      throw new Error(bookingLoadError.message);
    }

    const now = new Date();
    const deletableBookingIds: number[] = [];
    const blockingBookingIds: number[] = [];
    for (const booking of linkedBookings || []) {
      const saleCompleted = Number(booking.sale_completed || 0) === 1;
      const isClosedStatus =
        booking.status === 'cancelled' || booking.status === 'noshow';

      let isPast = false;
      if (booking.booking_date) {
        const timePart = booking.booking_time || '00:00:00';
        const when = new Date(`${booking.booking_date}T${timePart}`);
        isPast = !Number.isNaN(when.getTime()) && when < now;
      }

      if (saleCompleted || isClosedStatus || isPast) {
        deletableBookingIds.push(Number(booking.id));
      } else {
        blockingBookingIds.push(Number(booking.id));
      }
    }

    if (blockingBookingIds.length > 0) {
      return NextResponse.json(
        {
          error:
            '미지난/미완료 예약이 있어 고객을 삭제할 수 없습니다. 해당 예약을 먼저 취소 또는 완료 처리해주세요.',
          blockingBookingCount: blockingBookingIds.length,
        },
        { status: 409 }
      );
    }

    if (deletableBookingIds.length > 0) {
      const { error: bookingDetachError } = await supabase
        .from('bookings')
        .update({ customer_id: null })
        .in('id', deletableBookingIds);
      if (bookingDetachError) {
        throw new Error(bookingDetachError.message);
      }
    }

    // Comment: Detach historical sales records so customer deletion is not blocked by FK.
    const { error: salesDetachError } = await supabase
      .from('sales')
      .update({ customer_id: null })
      .eq('customer_id', customerId);
    if (salesDetachError) {
      throw new Error(salesDetachError.message);
    }

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in customers DELETE route:', error);
    return NextResponse.json(
      { error: error.message || '고객을 삭제하지 못했습니다.' },
      { status: 500 }
    );
  }
}
