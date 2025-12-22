import { NextRequest, NextResponse } from 'next/server';
import { getAllStaff, getStaffStats, getWorkLogs, getDesignerSalesForPeriod, getShops } from '@/lib/data';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shop_id');
    const role = searchParams.get('role');
    const type = searchParams.get('type'); // 'list' | 'stats' | 'worklogs'

    if (type === 'stats') {
      const stats = await getStaffStats(shopId ? Number(shopId) : undefined);
      return NextResponse.json({ stats }, { status: 200 });
    }

    if (type === 'worklogs') {
      const designerId = searchParams.get('designer_id') || searchParams.get('staff_id');
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');

      const period = startDate && endDate ? { start: startDate, end: endDate } : undefined;
      try {
        const workLogs = await getWorkLogs(designerId ? Number(designerId) : undefined, period);
        return NextResponse.json({ workLogs }, { status: 200 });
      } catch (error: any) {
        // If work_logs table doesn't exist, return empty array
        if (error.message?.includes('work_logs') || error.message?.includes('schema cache')) {
          console.warn('work_logs table not found, returning empty array');
          return NextResponse.json({ workLogs: [] }, { status: 200 });
        }
        throw error;
      }
    }

    // Default: return staff list with sales data
    const staff = await getAllStaff(shopId ? Number(shopId) : undefined, role || undefined);
    
    // Get shops data for venue names
    const shops = await getShops();
    const shopsMap = new Map(shops.map((s: { id: number; name: string }) => [s.id, s.name]));
    
    // Get current month in Sydney timezone
    const sydneyTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
    const year = sydneyTime.getFullYear();
    const month = String(sydneyTime.getMonth() + 1).padStart(2, '0');
    const currentMonth = `${year}-${month}`;
    
    // Get sales data from designer_sales table for current month
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

    // Combine staff with sales data and shop info
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

    return NextResponse.json({ staff: staffWithSales, shops }, { status: 200 });
  } catch (error) {
    console.error('Error in staff GET route:', error);
    return NextResponse.json(
      { error: '직원 목록을 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, role, shop_id, wage_type, percent_rate, hourly_rate, is_active } = body;

    console.log('Received POST request:', body); // Debug log

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!role || !role.trim()) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

    if (!wage_type) {
      return NextResponse.json(
        { error: 'Wage type is required' },
        { status: 400 }
      );
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

    console.log('Inserting designer:', insertData); // Debug log

    const { data, error } = await supabase
      .from('designers')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error); // Debug log
      throw new Error(error.message);
    }

    console.log('Designer inserted successfully:', data); // Debug log
    return NextResponse.json({ designer: data }, { status: 201 });
  } catch (error: any) {
    console.error('Error in staff POST route:', error);
    return NextResponse.json(
      { error: error.message || '직원을 추가하지 못했습니다.' },
      { status: 500 }
    );
  }
}

