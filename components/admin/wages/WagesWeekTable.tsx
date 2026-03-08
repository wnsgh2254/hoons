'use client';

import React from 'react';
import { Badge } from '@/components/ui';
import { getFullWeekDays } from '@/lib/utils/wage-utils';
import type { EmployeeOverviewData, WeekInfo } from '@/types/wages';

interface WagesWeekTableProps {
  week: WeekInfo;
  employees: EmployeeOverviewData[];
  showIncentiveColumns: boolean;
}

// Sticky column widths (px) — must match between header and body
const NAME_COL_W = 'w-[72px] min-w-[72px]';
const TYPE_COL_W = 'w-[56px] min-w-[56px]';
// Use box-shadow for borders on sticky cells (border-r gets hidden behind scrolling content)
const NAME_SHADOW_HEAD = 'shadow-[inset_-1px_0_0_0_#e5e7eb]';          // border-gray-200
const NAME_SHADOW_BODY = 'shadow-[inset_-1px_0_0_0_#f3f4f6]';          // border-gray-100
const TYPE_SHADOW_HEAD = 'shadow-[inset_-1px_0_0_0_#e5e7eb,3px_0_4px_-2px_rgba(0,0,0,0.08)]';
const TYPE_SHADOW_BODY = 'shadow-[inset_-1px_0_0_0_#f3f4f6,3px_0_4px_-2px_rgba(0,0,0,0.08)]';

export default function WagesWeekTable({
  week,
  employees,
  showIncentiveColumns,
}: WagesWeekTableProps) {
  const fullWeekDays = getFullWeekDays(week.startDate, week.endDate);

  // Calculate week totals
  let weekTotalWage = 0;
  let weekTotalCashWage = 0;

  employees.forEach((emp) => {
    const weekData = emp.weeks.find((w) => w.weekNum === week.weekNum);
    if (weekData) {
      weekTotalWage += weekData.totalWage;
      weekTotalCashWage += weekData.cashWage;
    }
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-sm font-bold text-black">
          {week.weekNum}주차{' '}
          <span className="text-gray-500 font-normal">
            ({week.startDate} ~ {week.endDate})
          </span>
        </h3>
        <div className="flex gap-4 text-xs text-gray-600">
          <span>웨이지: <strong className="text-black">{weekTotalWage.toLocaleString()}</strong></span>
          <span>캐쉬: <strong className="text-black">{weekTotalCashWage.toLocaleString()}</strong></span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {/* Row 1: Group headers */}
            <tr className="bg-gray-100 border-b border-gray-200">
              <th
                rowSpan={2}
                className={`px-3 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap sticky left-0 bg-gray-100 z-20 ${NAME_COL_W} ${NAME_SHADOW_HEAD}`}
              >
                이름
              </th>
              <th
                rowSpan={2}
                className={`px-2 py-2 text-center text-xs font-bold text-gray-800 whitespace-nowrap sticky left-[72px] bg-gray-100 z-20 ${TYPE_COL_W} ${TYPE_SHADOW_HEAD}`}
              >
                유형
              </th>
              <th
                colSpan={8}
                className="px-2 py-2 text-center text-xs font-bold text-gray-800 whitespace-nowrap border-r border-gray-200 bg-gray-100"
              >
                근무시간
              </th>
              {showIncentiveColumns && (
                <th
                  colSpan={4}
                  className="px-2 py-2 text-center text-xs font-bold text-gray-800 whitespace-nowrap border-r border-gray-200 bg-gray-100"
                >
                  매출/인센티브
                </th>
              )}
              <th
                colSpan={2}
                className="px-2 py-2 text-center text-xs font-bold text-gray-800 whitespace-nowrap bg-gray-100"
              >
                합계
              </th>
            </tr>

            {/* Row 2: Sub-headers */}
            <tr className="bg-gray-50 border-b border-gray-200">
              {/* 근무시간: 일~토 (7 columns) */}
              {fullWeekDays.map((day) => (
                <th
                  key={day.date}
                  className={`px-2 py-2 text-center text-xs font-semibold whitespace-nowrap border-r border-gray-200 min-w-[52px] ${
                    day.isActive
                      ? 'text-gray-700 bg-gray-50'
                      : 'text-gray-400 bg-gray-100'
                  }`}
                >
                  {day.dayLabel}
                </th>
              ))}
              {/* 근무시간: 총시간 */}
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200 bg-gray-50">
                총시간
              </th>

              {/* 매출/인센티브 sub-headers */}
              {showIncentiveColumns && (
                <>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200 bg-gray-50 min-w-[88px]">
                    서비스매출
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200 bg-gray-50 min-w-[88px]">
                    서비스인센
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200 bg-gray-50 min-w-[88px]">
                    제품매출
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200 bg-gray-50 min-w-[88px]">
                    제품인센
                  </th>
                </>
              )}

              {/* 합계 sub-headers */}
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200 bg-gray-50">
                원래웨이지
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap bg-gray-50">
                캐쉬웨이지
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {employees.map((emp) => {
              const weekData = emp.weeks.find((w) => w.weekNum === week.weekNum);
              if (!weekData) return null;

              const isHourly = emp.wageType === 'hourly';

              return (
                <tr key={emp.designerId} className="hover:bg-gray-50/50">
                  {/* 이름 — sticky */}
                  <td className={`px-3 py-2.5 text-sm font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10 ${NAME_COL_W} ${NAME_SHADOW_BODY}`}>
                    {emp.name}
                  </td>
                  {/* 유형 — sticky */}
                  <td className={`px-2 py-2.5 text-center sticky left-[72px] bg-white z-10 ${TYPE_COL_W} ${TYPE_SHADOW_BODY}`}>
                    <Badge variant={isHourly ? 'info' : 'success'}>
                      {isHourly ? '시급' : '인센'}
                    </Badge>
                  </td>

                  {/* 근무시간: 일~토 (always 7 columns) */}
                  {fullWeekDays.map((day) => {
                    if (!day.isActive) {
                      return (
                        <td
                          key={day.date}
                          className="px-2 py-2.5 text-center text-sm bg-gray-50 border-r border-gray-100"
                        />
                      );
                    }
                    const hours = weekData.dailyHours[day.date];
                    return (
                      <td
                        key={day.date}
                        className="px-2 py-2.5 text-center text-sm text-gray-700 border-r border-gray-100 tabular-nums"
                      >
                        {hours != null && hours > 0 ? hours : ''}
                      </td>
                    );
                  })}
                  {/* 근무시간: 총시간 */}
                  <td className="px-3 py-2.5 text-center text-sm font-medium text-gray-900 border-r border-gray-100 tabular-nums">
                    {weekData.totalHours > 0 ? weekData.totalHours : ''}
                  </td>

                  {/* 매출/인센티브 columns */}
                  {showIncentiveColumns && (
                    <>
                      <td className="px-3 py-2.5 text-right text-sm text-gray-700 border-r border-gray-100 tabular-nums">
                        {!isHourly && weekData.serviceSales != null && weekData.serviceSales > 0
                          ? weekData.serviceSales.toLocaleString()
                          : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm text-gray-700 border-r border-gray-100 tabular-nums">
                        {!isHourly && weekData.serviceIncentive != null
                          ? weekData.serviceIncentive.toLocaleString()
                          : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm text-gray-700 border-r border-gray-100 tabular-nums">
                        {!isHourly && weekData.productSales != null && weekData.productSales > 0
                          ? weekData.productSales.toLocaleString()
                          : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm text-gray-700 border-r border-gray-100 tabular-nums">
                        {!isHourly && weekData.productIncentive != null && weekData.productIncentive > 0
                          ? weekData.productIncentive.toLocaleString()
                          : '-'}
                      </td>
                    </>
                  )}

                  {/* 합계: 원래웨이지, 캐쉬웨이지 */}
                  <td className="px-3 py-2.5 text-right text-sm font-medium text-gray-900 border-r border-gray-100 tabular-nums">
                    {weekData.totalWage > 0 ? weekData.totalWage.toLocaleString() : '0'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm font-medium text-gray-900 tabular-nums">
                    {weekData.cashWage.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
