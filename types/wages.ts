export interface WeekInfo {
  weekNum: number;
  startDate: string;
  endDate: string;
}

export interface EmployeeWeekData {
  weekNum: number;
  startDate: string;
  endDate: string;
  dailyHours: Record<string, number>;
  totalHours: number;
  totalWage: number;
  cashWage: number;
  isSettled: boolean;
  settlementId: number | null;
  // percent type only
  serviceSales?: number;
  serviceIncentive?: number;
  productSales?: number;
  productIncentive?: number;
}

export interface EmployeeOverviewData {
  designerId: number;
  name: string;
  wageType: 'percent' | 'hourly';
  hourlyRate: number | null;
  percentRate: number | null;
  weeklyDeduction: number;
  weeks: EmployeeWeekData[];
  monthlyTotal: {
    totalWage: number;
    totalCashWage: number;
    totalHours: number;
  };
}

export interface OverviewResponse {
  employees: EmployeeOverviewData[];
  grandTotals: {
    wageSum: number;
    cashWageSum: number;
  };
  period: {
    mode: 'monthly' | 'period';
    year?: number;
    month?: number;
    startDate?: string;
    endDate?: string;
    weeks: WeekInfo[];
  };
}

export interface SettlementPayload {
  designer_id: number;
  week_start_date: string;
  week_end_date: string;
  year: number;
  month: number;
  week_num: number;
  is_settled: boolean;
}
