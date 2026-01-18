import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Helper to safely convert to number
const toNum = (v: any) => Number(v || 0);

// Comment: Calculate hours between two times
function calculateHours(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return (endMinutes - startMinutes) / 60;
}

// Comment: Get default working hours for a weekday
function getDefaultHours(weekday: number): { start: string; end: string; hours: number } {
  if (weekday === 6) {
    // Saturday
    return { start: '09:00:00', end: '17:00:00', hours: 8 };
  }
  // Monday-Friday
  return { start: '10:00:00', end: '19:00:00', hours: 9 };
}

// Comment: Calculate working hours for a date range
async function calculateWorkingHours(
  designerId: number,
  startDate: string,
  endDate: string
): Promise<number> {
  // Comment: Get designer schedules
  const { data: schedules } = await supabase
    .from('designer_schedules')
    .select('weekday, start_time, end_time, effective_from, effective_to')
    .eq('designer_id', designerId)
    .lte('effective_from', endDate)
    .or(`effective_to.is.null,effective_to.gte.${startDate}`);

  // Comment: Get time off records (excluding special work days)
  const { data: timeOffs } = await supabase
    .from('designer_time_off')
    .select('start_date, end_date, reason')
    .eq('designer_id', designerId)
    .neq('reason', '특별 근무일')
    .lte('start_date', endDate)
    .gte('end_date', startDate);

  // Comment: Create a map of weekday to schedule
  const scheduleMap = new Map<number, { start: string; end: string }>();
  (schedules || []).forEach((s: any) => {
    if (!s.effective_to || s.effective_to >= startDate) {
      scheduleMap.set(s.weekday, {
        start: s.start_time || getDefaultHours(s.weekday).start,
        end: s.end_time || getDefaultHours(s.weekday).end,
      });
    }
  });

  // Comment: Create a set of time off dates
  const timeOffDates = new Set<string>();
  (timeOffs || []).forEach((to: any) => {
    const start = new Date(to.start_date);
    const end = new Date(to.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      timeOffDates.add(d.toISOString().split('T')[0]);
    }
  });

  // Comment: Calculate total hours
  let totalHours = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const weekday = d.getDay();

    // Comment: Skip if it's a time off day
    if (timeOffDates.has(dateStr)) {
      continue;
    }

    // Comment: Get schedule for this weekday
    const schedule = scheduleMap.get(weekday);
    if (schedule) {
      const hours = calculateHours(schedule.start, schedule.end);
      totalHours += hours;
    } else {
      // Comment: Use default hours if no schedule
      const defaultHours = getDefaultHours(weekday);
      totalHours += defaultHours.hours;
    }
  }

  return totalHours;
}

// Comment: Calculate wages for designers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const designerId = searchParams.get('designer_id');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '시작 날짜와 종료 날짜가 필요합니다.' },
        { status: 400 }
      );
    }

    // Comment: Fetch all active designers or specific designer
    let designersQuery = supabase
      .from('designers')
      .select('id, name, wage_type, percent_rate, hourly_rate, is_active')
      .eq('is_active', true);

    if (designerId) {
      designersQuery = designersQuery.eq('id', designerId);
    }

    const { data: designers, error: designersError } = await designersQuery;

    if (designersError) {
      console.error('Error fetching designers:', designersError);
      return NextResponse.json(
        { error: '직원 데이터 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // Comment: Fetch sales data for all designers
    // Comment: Use internal API call or direct database query
    const salesResponse = await fetch(
      `${request.nextUrl.origin}/api/sales/by-staff?start_date=${startDate}&end_date=${endDate}`
    );
    const salesData = await salesResponse.json();

    const staffSalesMap = new Map<number, any>();
    (salesData?.staffSales || []).forEach((staff: any) => {
      staffSalesMap.set(staff.designerId, staff);
    });

    // Comment: Calculate wages for each designer
    const wages = await Promise.all(
      (designers || []).map(async (designer: any) => {
        const sales = staffSalesMap.get(designer.id) || {
          total: { subtotal: 0 },
        };

        let wage = 0;
        let calculationDetails: any = {};

        if (designer.wage_type === 'percent') {
          // Comment: Commission-based wage
          const totalSales = toNum(sales.total?.subtotal || 0);
          const rate = toNum(designer.percent_rate || 0);
          wage = (totalSales * rate) / 100;
          calculationDetails = {
            type: 'commission',
            totalSales,
            rate,
            wage,
          };
        } else if (designer.wage_type === 'hourly') {
          // Comment: Hourly-based wage
          const workingHours = await calculateWorkingHours(
            designer.id,
            startDate,
            endDate
          );
          const hourlyRate = toNum(designer.hourly_rate || 0);
          wage = workingHours * hourlyRate;
          calculationDetails = {
            type: 'hourly',
            workingHours,
            hourlyRate,
            wage,
          };
        }

        return {
          designerId: designer.id,
          name: designer.name,
          wageType: designer.wage_type,
          wage: Math.round(wage * 100) / 100, // Comment: Round to 2 decimal places
          calculationDetails,
          sales: {
            total: sales.total?.subtotal || 0,
            service: sales.total?.service?.amount || 0,
            product: sales.total?.product?.amount || 0,
            membership: sales.sales?.membership?.amount || 0,
            membershipDeduction: sales.membershipDeduction?.subtotal || 0,
          },
        };
      })
    );

    return NextResponse.json(
      {
        wages,
        period: {
          startDate,
          endDate,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in wages calculate route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
