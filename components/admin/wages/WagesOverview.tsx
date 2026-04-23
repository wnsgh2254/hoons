'use client';

import React, { useState, useEffect } from 'react';
import { EmptyState } from '@/components/ui';
import { useWagesOverview } from '@/hooks/useWagesOverview';
import { useStaff } from '@/hooks/useStaff';
import WagesOverviewFilters from './WagesOverviewFilters';
import WagesWeekTable from './WagesWeekTable';
import WagesMonthlyTotals from './WagesMonthlyTotals';

export default function WagesOverview() {
  const today = new Date();
  const [dateMode, setDateMode] = useState<'monthly' | 'period'>('monthly');
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [wageTypeFilter, setWageTypeFilter] = useState<'all' | 'hourly' | 'percent'>('all');
  const [selectedDesignerId, setSelectedDesignerId] = useState('');
  const [selectedShopId, setSelectedShopId] = useState('');
  const [shopOptions, setShopOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [searched, setSearched] = useState(false);
  const { staff } = useStaff({ onlyActive: true });

  const { data, loading, error, refetch, toggleSettlement } = useWagesOverview({
    dateMode,
    year: selectedYear,
    month: selectedMonth,
    startDate,
    endDate,
    wageTypeFilter,
    designerId: selectedDesignerId,
    shopId: selectedShopId,
  });

  useEffect(() => {
    let mounted = true;
    const fetchShops = async () => {
      try {
        const res = await fetch('/api/shops');
        if (!res.ok) return;
        const json = await res.json();
        if (!mounted) return;
        const options = (json.shops || []).map((shop: any) => ({
          value: String(shop.id),
          label: shop.name,
        }));
        setShopOptions(options);
      } catch (err) {
        console.error('Error fetching shops for wages overview:', err);
      }
    };
    fetchShops();
    return () => {
      mounted = false;
    };
  }, []);

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const handleSearch = () => {
    if (dateMode === 'period' && (!startDate || !endDate)) {
      alert('시작 날짜와 종료 날짜를 선택해주세요.');
      return;
    }

    setSearched(true);
    // Call refetch directly — no useEffect needed
    setTimeout(() => refetch(), 0);
  };

  // Determine if we should show incentive columns
  const showIncentiveColumns =
    wageTypeFilter !== 'hourly' &&
    (data?.employees || []).some((emp) => emp.wageType === 'percent');

  const designerOptions = staff.map((member) => ({
    value: String(member.id),
    label: member.name as string,
  }));

  return (
    <div className="space-y-4">
      <WagesOverviewFilters
        dateMode={dateMode}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        startDate={startDate}
        endDate={endDate}
        wageTypeFilter={wageTypeFilter}
        selectedDesignerId={selectedDesignerId}
        selectedShopId={selectedShopId}
        designerOptions={designerOptions}
        shopOptions={shopOptions}
        onDateModeChange={setDateMode}
        onMonthChange={handleMonthChange}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onWageTypeFilterChange={setWageTypeFilter}
        onDesignerChange={setSelectedDesignerId}
        onShopChange={setSelectedShopId}
        onSearch={handleSearch}
      />

      {!searched ? null : loading ? (
        <div className="text-center py-11.5 text-gray-500">로딩 중...</div>
      ) : error ? (
        <EmptyState title={error} />
      ) : !data ? null : data.employees.length === 0 ? (
        <EmptyState title={dateMode === 'monthly' ? '해당 월에 직원 데이터가 없습니다.' : '해당 기간에 직원 데이터가 없습니다.'} />
      ) : (
        <>
          {/* Weekly tables are shown only in monthly mode */}
          {dateMode === 'monthly' &&
            data.period.weeks.map((week) => (
              <WagesWeekTable
                key={week.weekNum}
                week={week}
                employees={data.employees}
                showIncentiveColumns={showIncentiveColumns}
              />
            ))}

          {/* Aggregated totals for selected range */}
          <WagesMonthlyTotals
            employees={data.employees}
            grandTotals={data.grandTotals}
            title={dateMode === 'monthly' ? '월간 누적 합계' : '기간 누적 합계'}
          />
        </>
      )}
    </div>
  );
}
