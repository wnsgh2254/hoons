import { NextRequest, NextResponse } from 'next/server';
import {
  getAllStaff,
  getStaffStats,
  getDesignerSalesForPeriod,
  getShops,
  getDesignerById,
  updateDesigner,
  deleteDesigner,
} from '@/lib/data';
import { supabase } from '@/lib/supabase';

// Comment: GET - Fetch staff list with stats, or single staff by id, or just stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const shopId = searchParams.get('shop_id');
    const role = searchParams.get('role');
    const includeStats = searchParams.get('include_stats') === 'true';

    // Comment: Single staff member by id
    if (id) {
      const designer = await getDesignerById(Number(id));
      return NextResponse.json({ designer }, { status: 200 });
    }

    // Comment: Get staff list
    const staff = await getAllStaff(shopId ? Number(shopId) : undefined, role || undefined);

    // Comment: Get shops data for venue names
    const shops = await getShops();
    const shopsMap = new Map(shops.map((s: { id: number; name: string }) => [s.id, s.name]));

    // Comment: Get current month in Sydney timezone
    const sydneyTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
    const year = sydneyTime.getFullYear();
    const month = String(sydneyTime.getMonth() + 1).padStart(2, '0');
    const currentMonth = `${year}-${month}`;

    // Comment: Get sales data from designer_sales table for current month
    const staffIds = staff.map((s: any) => s.id);
    let salesData: any[] = [];

    if (staffIds.length > 0) {
      try {
        salesData = await getDesignerSalesForPeriod(staffIds, currentMonth);
      } catch (error) {
        // If table doesn't exist, continue without sales
        console.warn('Could not fetch sales data:', error);
      }
    }

    // Comment: Combine staff with sales data and shop info
    const staffWithSales = staff.map((member: any) => {
      const sales = salesData.find((s: any) => s.designer_id === member.id);
      const shopName = member.shop_id ? shopsMap.get(member.shop_id) : null;

      if (member.wage_type === 'percent') {
        // Commission staff: use sales from designer_sales table
        return {
          ...member,
          sales: sales?.total_sales || 0,
          bookings: sales?.bookings_count || 0,
          shop_name: shopName,
        };
      } else {
        // Hourly staff: no sales
        return {
          ...member,
          sales: 0,
          bookings: 0,
          shop_name: shopName,
        };
      }
    });

    // Comment: Include stats if requested
    const response: any = { staff: staffWithSales, shops };
    if (includeStats) {
      const stats = await getStaffStats(shopId ? Number(shopId) : undefined);
      response.stats = stats;
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error in staff GET route:', error);
    const status = error.message?.includes('찾을 수 없') ? 404 : error.message?.includes('유효하지 않은') ? 400 : 500;
    return NextResponse.json(
      { error: error.message || '직원 목록을 불러오지 못했습니다.' },
      { status }
    );
  }
}

// Comment: POST - Create a new staff member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, role, shop_id, wage_type, percent_rate, hourly_rate, is_active } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!role || !role.trim()) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    if (!wage_type) {
      return NextResponse.json({ error: 'Wage type is required' }, { status: 400 });
    }

    // Validate wage type specific fields
    if (wage_type === 'percent' && !percent_rate) {
      return NextResponse.json(
        { error: 'percent_rate is required for commission type' },
        { status: 400 }
      );
    }

    if (wage_type === 'hourly' && !hourly_rate) {
      return NextResponse.json(
        { error: 'hourly_rate is required for hourly type' },
        { status: 400 }
      );
    }

    // Insert new designer
    const insertData = {
      name: name.trim(),
      role: role.trim(),
      shop_id: shop_id || null,
      wage_type,
      percent_rate: wage_type === 'percent' ? percent_rate : null,
      hourly_rate: wage_type === 'hourly' ? hourly_rate : null,
      is_active: is_active !== undefined ? is_active : true,
    };

    const { data, error } = await supabase.from('designers').insert(insertData).select().single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ designer: data }, { status: 201 });
  } catch (error: any) {
    console.error('Error in staff POST route:', error);
    return NextResponse.json(
      { error: error.message || '직원을 추가하지 못했습니다.' },
      { status: 400 }
    );
  }
}

// Comment: PATCH - Update a staff member (id in query parameter)
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    const body = await request.json();
    const { name, role, shop_id, wage_type, percent_rate, hourly_rate, is_active } = body;

    const designer = await updateDesigner(Number(id), {
      name,
      role,
      shop_id,
      wage_type,
      percent_rate,
      hourly_rate,
      is_active,
    });

    return NextResponse.json({ designer }, { status: 200 });
  } catch (error: any) {
    console.error('Error in staff PATCH route:', error);
    return NextResponse.json(
      { error: error.message || '직원을 업데이트하지 못했습니다.' },
      { status: 400 }
    );
  }
}

// Comment: DELETE - Delete a staff member (id in query parameter)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    await deleteDesigner(Number(id));
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in staff DELETE route:', error);
    return NextResponse.json(
      { error: error.message || '직원을 삭제하지 못했습니다.' },
      { status: 400 }
    );
  }
}

