'use client';

import React, { useState, useRef } from 'react';
import { EmptyState } from '@/components/ui';
import { useWagesOverview } from '@/hooks/useWagesOverview';
import WagesOverviewFilters from './WagesOverviewFilters';
import WagesWeekTable from './WagesWeekTable';
import WagesMonthlyTotals from './WagesMonthlyTotals';

export default function WagesOverview() {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [wageTypeFilter, setWageTypeFilter] = useState<'all' | 'hourly' | 'percent'>('all');
  const [searched, setSearched] = useState(false);

  // Keep refs so refetch always uses the latest filter values
  const yearRef = useRef(selectedYear);
  const monthRef = useRef(selectedMonth);
  const filterRef = useRef(wageTypeFilter);
  yearRef.current = selectedYear;
  monthRef.current = selectedMonth;
  filterRef.current = wageTypeFilter;

  const { data, loading, error, refetch, toggleSettlement } = useWagesOverview({
    year: selectedYear,
    month: selectedMonth,
    wageTypeFilter,
  });

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const handleSearch = () => {
    setSearched(true);
    // Call refetch directly — no useEffect needed
    setTimeout(() => refetch(), 0);
  };

  // Determine if we should show incentive columns
  const showIncentiveColumns =
    wageTypeFilter !== 'hourly' &&
    (data?.employees || []).some((emp) => emp.wageType === 'percent');

  return (
    <div className="space-y-4">
      <WagesOverviewFilters
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        wageTypeFilter={wageTypeFilter}
        onMonthChange={handleMonthChange}
        onWageTypeFilterChange={setWageTypeFilter}
        onSearch={handleSearch}
      />

      {!searched ? null : loading ? (
        <div className="text-center py-11.5 text-gray-500">로딩 중...</div>
      ) : error ? (
        <EmptyState title={error} />
      ) : !data ? null : data.employees.length === 0 ? (
        <EmptyState title="해당 월에 직원 데이터가 없습니다." />
      ) : (
        <>
          {/* Weekly tables */}
          {data.period.weeks.map((week) => (
            <WagesWeekTable
              key={week.weekNum}
              week={week}
              employees={data.employees}
              showIncentiveColumns={showIncentiveColumns}
            />
          ))}

          {/* Monthly accumulated totals */}
          <WagesMonthlyTotals
            employees={data.employees}
            grandTotals={data.grandTotals}
          />
        </>
      )}
    </div>
  );
}
