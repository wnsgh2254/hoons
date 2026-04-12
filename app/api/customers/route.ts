import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    const customerPhoneMap: Record<number, string> = {};
    (data || []).forEach((c: any) => {
      const normalized = String(c.phone || '').replace(/\D/g, '');
      if (normalized) customerPhoneMap[c.id] = normalized;
    });
    const phoneValues = Array.from(new Set(Object.values(customerPhoneMap)));
    const prepaidBalances: Record<number, number> = {};
    const totalSales: Record<number, number> = {};

    if (customerIds.length > 0) {
      // Comment: Get prepaid pass balances (sum of points for each customer)
      const { data: linkedPrepaidData } = await supabase
        .from('prepaid_passes')
        .select('customer_id, points, is_active, expires_at')
        .in('customer_id', customerIds)
        .eq('is_active', true);
      const { data: legacyPrepaidData } = phoneValues.length > 0
        ? await supabase
            .from('prepaid_passes')
            .select('customer_id, phone, points, is_active, expires_at')
            .is('customer_id', null)
            .in('phone', phoneValues)
            .eq('is_active', true)
        : { data: [] as any[] };

      const now = new Date();
      (linkedPrepaidData || []).forEach((p: any) => {
        if (p.expires_at) {
          const expires = new Date(p.expires_at);
          if (!Number.isNaN(expires.getTime()) && expires < now) return;
        }
        if (!prepaidBalances[p.customer_id]) {
          prepaidBalances[p.customer_id] = 0;
        }
        // Comment: Sum up points for each customer
        prepaidBalances[p.customer_id] += Number(p.points || 0);
      });
      (legacyPrepaidData || []).forEach((p: any) => {
        if (p.expires_at) {
          const expires = new Date(p.expires_at);
          if (!Number.isNaN(expires.getTime()) && expires < now) return;
        }
        const normalizedPhone = String(p.phone || '').replace(/\D/g, '');
        const targetCustomerId = customerIds.find((cid: number) => customerPhoneMap[cid] === normalizedPhone);
        if (!targetCustomerId) return;
        if (!prepaidBalances[targetCustomerId]) prepaidBalances[targetCustomerId] = 0;
        prepaidBalances[targetCustomerId] += Number(p.points || 0);
      });

      // Comment: Get total sales from bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('customer_id, total_amount')
        .in('customer_id', customerIds)
        .eq('status', 'confirmed');

      (bookingsData || []).forEach((b: any) => {
        if (!totalSales[b.customer_id]) {
          totalSales[b.customer_id] = 0;
        }
        totalSales[b.customer_id] += Number(b.total_amount || 0);
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

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', Number(id));

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
