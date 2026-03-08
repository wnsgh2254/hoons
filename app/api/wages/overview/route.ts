import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getWeeksInMonth, getFirstDayOfMonth, getLastDayOfMonth } from '@/lib/utils/wage-utils';

const toNum = (v: any) => Number(v || 0);
const round2 = (x: number) => Math.round(x * 100) / 100;

function computeMinutesFromAttendance(row: {
  clock_in: string | null;
  clock_out: string | null;
  manual_total_minutes: number | null;
}): number {
  if (row.manual_total_minutes != null && Number.isFinite(row.manual_total_minutes)) {
    return row.manual_total_minutes;
  }
  const cin = row.clock_in;
  const cout = row.clock_out;
  if (!cin || !cout) return 0;
  const [h1, m1] = String(cin).split(':').map(Number);
  const [h2, m2] = String(cout).split(':').map(Number);
  const startM = (h1 || 0) * 60 + (m1 || 0);
  let endM = (h2 || 0) * 60 + (m2 || 0);
  if (endM <= startM) endM += 24 * 60;
  return endM - startM;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get('year'));
    const month = Number(searchParams.get('month'));
    const wageTypeFilter = searchParams.get('wage_type_filter') || 'all';

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'year와 month 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    const weeks = getWeeksInMonth(year, month);
    const monthStart = getFirstDayOfMonth(year, month);
    const monthEnd = getLastDayOfMonth(year, month);
    // Use full range including any days from adjacent months covered by weeks
    const fullStart = weeks.length > 0 ? weeks[0].startDate : monthStart;
    const fullEnd = weeks.length > 0 ? weeks[weeks.length - 1].endDate : monthEnd;

    // 1. Fetch active designers (try with weekly_deduction, fallback without)
    let designers: any[] | null = null;
    let designersError: any = null;

    let designersQuery = supabase
      .from('designers')
      .select('id, name, wage_type, percent_rate, hourly_rate, weekly_deduction, is_active')
      .eq('is_active', true);

    if (wageTypeFilter === 'hourly') {
      designersQuery = designersQuery.eq('wage_type', 'hourly');
    } else if (wageTypeFilter === 'percent') {
      designersQuery = designersQuery.eq('wage_type', 'percent');
    }

    const result = await designersQuery;
    if (result.error && result.error.code === '42703') {
      // weekly_deduction column doesn't exist yet — retry without it
      let fallbackQuery = supabase
        .from('designers')
        .select('id, name, wage_type, percent_rate, hourly_rate, is_active')
        .eq('is_active', true);
      if (wageTypeFilter === 'hourly') {
        fallbackQuery = fallbackQuery.eq('wage_type', 'hourly');
      } else if (wageTypeFilter === 'percent') {
        fallbackQuery = fallbackQuery.eq('wage_type', 'percent');
      }
      const fallbackResult = await fallbackQuery;
      designers = fallbackResult.data;
      designersError = fallbackResult.error;
    } else {
      designers = result.data;
      designersError = result.error;
    }

    if (designersError) {
      console.error('Error fetching designers:', designersError);
      return NextResponse.json({ error: '직원 데이터 조회 실패' }, { status: 500 });
    }
    if (!designers || designers.length === 0) {
      return NextResponse.json({
        employees: [],
        grandTotals: { wageSum: 0, cashWageSum: 0 },
        period: { year, month, weeks },
      });
    }

    const designerIds = designers.map((d: any) => d.id);

    // 2. Batch fetch attendance for all designers for the full period
    const { data: allAttendance } = await supabase
      .from('staff_attendance')
      .select('designer_id, work_date, clock_in, clock_out, manual_total_minutes')
      .in('designer_id', designerIds)
      .gte('work_date', fullStart)
      .lte('work_date', fullEnd);

    // 3. Batch fetch settlements for the month (table may not exist yet)
    let allSettlements: any[] | null = null;
    try {
      const { data, error } = await supabase
        .from('wage_settlements')
        .select('id, designer_id, week_start_date, week_end_date, is_settled')
        .in('designer_id', designerIds)
        .eq('year', year)
        .eq('month', month);
      if (!error) allSettlements = data;
    } catch {
      // Table doesn't exist yet — settlements will be empty
    }

    // 4. Fetch sales data per week (reuse existing sales/by-staff API pattern)
    const weekSalesMap = new Map<number, Map<number, any>>();

    await Promise.all(
      weeks.map(async (week) => {
        try {
          const salesResponse = await fetch(
            `${request.nextUrl.origin}/api/sales/by-staff?start_date=${week.startDate}&end_date=${week.endDate}`
          );
          const salesData = await salesResponse.json();
          const staffMap = new Map<number, any>();
          (salesData?.staffSales || []).forEach((staff: any) => {
            staffMap.set(staff.designerId, staff);
          });
          weekSalesMap.set(week.weekNum, staffMap);
        } catch {
          weekSalesMap.set(week.weekNum, new Map());
        }
      })
    );

    // 5. Build per-employee per-week data
    const attendanceByDesigner = new Map<number, any[]>();
    (allAttendance || []).forEach((row: any) => {
      const list = attendanceByDesigner.get(row.designer_id) || [];
      list.push(row);
      attendanceByDesigner.set(row.designer_id, list);
    });

    const settlementMap = new Map<string, any>();
    (allSettlements || []).forEach((s: any) => {
      const key = `${s.designer_id}-${s.week_start_date}-${s.week_end_date}`;
      settlementMap.set(key, s);
    });

    let grandWageSum = 0;
    let grandCashWageSum = 0;

    const employees = designers.map((designer: any) => {
      const allDesignerAttendance = attendanceByDesigner.get(designer.id) || [];
      const weeklyDeduction = toNum(designer.weekly_deduction);

      let monthlyTotalWage = 0;
      let monthlyTotalCashWage = 0;
      let monthlyTotalHours = 0;

      const weeksData = weeks.map((week) => {
        // Filter attendance rows for this week
        const weekAttendance = allDesignerAttendance.filter(
          (a: any) => a.work_date >= week.startDate && a.work_date <= week.endDate
        );

        // Build daily hours map
        const dailyHours: Record<string, number> = {};
        let totalMinutes = 0;
        weekAttendance.forEach((a: any) => {
          const mins = computeMinutesFromAttendance(a);
          const hours = round2(mins / 60);
          dailyHours[a.work_date] = hours;
          totalMinutes += mins;
        });

        const totalHours = round2(totalMinutes / 60);

        // Calculate wage
        let totalWage = 0;
        let serviceSales: number | undefined;
        let serviceIncentive: number | undefined;
        let productSales: number | undefined;
        let productIncentive: number | undefined;

        if (designer.wage_type === 'percent') {
          const salesMap = weekSalesMap.get(week.weekNum);
          const sales = salesMap?.get(designer.id);
          const incentiveRate = toNum(designer.percent_rate);
          const productRate = 10;

          const serviceSalesRaw = toNum(sales?.sales?.service?.amount || 0);
          const serviceDeductionRaw = toNum(
            (sales?.membershipDeduction?.service?.amount ?? sales?.membershipDeduction?.subtotal) || 0
          );
          const productSalesRaw = toNum(sales?.sales?.product?.amount || 0);

          const sIncentive = round2((serviceSalesRaw * incentiveRate) / 100);
          const sDeduction = round2((serviceDeductionRaw * incentiveRate) / 100);
          const pIncentive = round2((productSalesRaw * productRate) / 100);

          serviceSales = serviceSalesRaw;
          serviceIncentive = round2(sIncentive - sDeduction);
          productSales = productSalesRaw;
          productIncentive = pIncentive;
          totalWage = round2(sIncentive - sDeduction + pIncentive);
        } else {
          // hourly
          totalWage = round2((totalMinutes / 60) * toNum(designer.hourly_rate));
        }

        const cashWage = round2(totalWage - weeklyDeduction);

        // Settlement status
        const sKey = `${designer.id}-${week.startDate}-${week.endDate}`;
        const settlement = settlementMap.get(sKey);

        monthlyTotalWage += totalWage;
        monthlyTotalCashWage += cashWage;
        monthlyTotalHours += totalHours;

        return {
          weekNum: week.weekNum,
          startDate: week.startDate,
          endDate: week.endDate,
          dailyHours,
          totalHours,
          totalWage,
          cashWage,
          isSettled: settlement?.is_settled ?? false,
          settlementId: settlement?.id ?? null,
          ...(designer.wage_type === 'percent' && {
            serviceSales,
            serviceIncentive,
            productSales,
            productIncentive,
          }),
        };
      });

      grandWageSum += monthlyTotalWage;
      grandCashWageSum += monthlyTotalCashWage;

      return {
        designerId: designer.id,
        name: designer.name,
        wageType: designer.wage_type,
        hourlyRate: designer.hourly_rate,
        percentRate: designer.percent_rate,
        weeklyDeduction,
        weeks: weeksData,
        monthlyTotal: {
          totalWage: round2(monthlyTotalWage),
          totalCashWage: round2(monthlyTotalCashWage),
          totalHours: round2(monthlyTotalHours),
        },
      };
    });

    return NextResponse.json({
      employees,
      grandTotals: {
        wageSum: round2(grandWageSum),
        cashWageSum: round2(grandCashWageSum),
      },
      period: { year, month, weeks },
    });
  } catch (error) {
    console.error('Error in wages overview route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
