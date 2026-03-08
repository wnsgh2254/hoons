'use client';

import React from 'react';
import { Badge, StatCard } from '@/components/ui';
import type { EmployeeOverviewData } from '@/types/wages';

interface WagesMonthlyTotalsProps {
  employees: EmployeeOverviewData[];
  grandTotals: { wageSum: number; cashWageSum: number };
}

// Match sticky column widths with WagesWeekTable
const NAME_COL_W = 'w-[72px] min-w-[72px]';
const TYPE_COL_W = 'w-[56px] min-w-[56px]';
const NAME_SHADOW_HEAD = 'shadow-[inset_-1px_0_0_0_#e5e7eb]';
const NAME_SHADOW_BODY = 'shadow-[inset_-1px_0_0_0_#f3f4f6]';
const TYPE_SHADOW_HEAD = 'shadow-[inset_-1px_0_0_0_#e5e7eb,3px_0_4px_-2px_rgba(0,0,0,0.08)]';
const TYPE_SHADOW_BODY = 'shadow-[inset_-1px_0_0_0_#f3f4f6,3px_0_4px_-2px_rgba(0,0,0,0.08)]';

export default function WagesMonthlyTotals({ employees, grandTotals }: WagesMonthlyTotalsProps) {
  return (
    <div className="space-y-4">
      {/* Grand totals */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="웨이지 합계"
          value={`$${grandTotals.wageSum.toLocaleString()}`}
          icon="payments"
        />
        <StatCard
          label="캐쉬 합계"
          value={`$${grandTotals.cashWageSum.toLocaleString()}`}
          icon="account_balance_wallet"
        />
      </div>

      {/* Per-employee monthly accumulated */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-bold text-black">월간 누적 합계</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-700 whitespace-nowrap sticky left-0 bg-gray-50 z-20 ${NAME_COL_W} ${NAME_SHADOW_HEAD}`}>
                  이름
                </th>
                <th className={`px-2 py-2.5 text-center text-xs font-semibold text-gray-700 whitespace-nowrap sticky left-[72px] bg-gray-50 z-20 ${TYPE_COL_W} ${TYPE_SHADOW_HEAD}`}>
                  유형
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200">
                  총 시간
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200">
                  전체 웨이지
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 whitespace-nowrap">
                  캐쉬 웨이지
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((emp) => (
                <tr key={emp.designerId} className="hover:bg-gray-50/50">
                  <td className={`px-3 py-2.5 text-sm font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10 ${NAME_COL_W} ${NAME_SHADOW_BODY}`}>
                    {emp.name}
                  </td>
                  <td className={`px-2 py-2.5 text-center sticky left-[72px] bg-white z-10 ${TYPE_COL_W} ${TYPE_SHADOW_BODY}`}>
                    <Badge variant={emp.wageType === 'hourly' ? 'info' : 'success'}>
                      {emp.wageType === 'hourly' ? '시급' : '인센'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-center text-sm text-gray-900 border-r border-gray-100 tabular-nums">
                    {emp.monthlyTotal.totalHours}
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm font-medium text-gray-900 border-r border-gray-100 tabular-nums">
                    {emp.monthlyTotal.totalWage.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm font-medium text-gray-900 tabular-nums">
                    {emp.monthlyTotal.totalCashWage.toLocaleString()}
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                <td className={`px-3 py-3 text-sm text-gray-900 sticky left-0 bg-gray-50 z-10 ${NAME_COL_W} ${NAME_SHADOW_HEAD}`}>
                  합계
                </td>
                <td className={`px-2 py-3 sticky left-[72px] bg-gray-50 z-10 ${TYPE_COL_W} ${TYPE_SHADOW_HEAD}`} />
                <td className="px-3 py-3 text-center text-sm text-gray-900 border-r border-gray-200 tabular-nums">
                  {employees.reduce((sum, emp) => sum + emp.monthlyTotal.totalHours, 0)}
                </td>
                <td className="px-3 py-3 text-right text-sm text-gray-900 border-r border-gray-200 tabular-nums">
                  {grandTotals.wageSum.toLocaleString()}
                </td>
                <td className="px-3 py-3 text-right text-sm text-gray-900 tabular-nums">
                  {grandTotals.cashWageSum.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
