'use client';

import React from 'react';
import { Button, Input, Select } from '@/components/ui';

interface WagesOverviewFiltersProps {
  dateMode: 'monthly' | 'period';
  selectedYear: number;
  selectedMonth: number;
  startDate: string;
  endDate: string;
  wageTypeFilter: 'all' | 'hourly' | 'percent';
  selectedDesignerId: string;
  selectedShopId: string;
  designerOptions: Array<{ value: string; label: string }>;
  shopOptions: Array<{ value: string; label: string }>;
  onDateModeChange: (mode: 'monthly' | 'period') => void;
  onMonthChange: (year: number, month: number) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onWageTypeFilterChange: (filter: 'all' | 'hourly' | 'percent') => void;
  onDesignerChange: (designerId: string) => void;
  onShopChange: (shopId: string) => void;
  onSearch: () => void;
}

export default function WagesOverviewFilters({
  dateMode,
  selectedYear,
  selectedMonth,
  startDate,
  endDate,
  wageTypeFilter,
  selectedDesignerId,
  selectedShopId,
  designerOptions,
  shopOptions,
  onDateModeChange,
  onMonthChange,
  onStartDateChange,
  onEndDateChange,
  onWageTypeFilterChange,
  onDesignerChange,
  onShopChange,
  onSearch,
}: WagesOverviewFiltersProps) {
  const monthValue = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const handlePrev = () => {
    let newMonth = selectedMonth - 1;
    let newYear = selectedYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    onMonthChange(newYear, newMonth);
  };

  const handleNext = () => {
    let newMonth = selectedMonth + 1;
    let newYear = selectedYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    onMonthChange(newYear, newMonth);
  };

  const handleMonthInput = (value: string) => {
    const [y, m] = value.split('-').map(Number);
    if (y && m) onMonthChange(y, m);
  };

  const wageTypeOptions = [
    { value: 'all', label: '전체' },
    { value: 'hourly', label: '시급제' },
    { value: 'percent', label: '인센티브' },
  ];

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={dateMode === 'monthly'}
              onChange={() => onDateModeChange('monthly')}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">월</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={dateMode === 'period'}
              onChange={() => onDateModeChange('period')}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">기간</span>
          </label>
        </div>

        {dateMode === 'monthly' ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrev}>
              &lt;
            </Button>
            <Input
              type="month"
              value={monthValue}
              onChange={(e) => handleMonthInput(e.target.value)}
              className="w-auto"
            />
            <Button variant="outline" size="sm" onClick={handleNext}>
              &gt;
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-auto"
            />
            <span className="text-gray-400">~</span>
            <Input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-auto"
            />
          </div>
        )}

        <div className="w-40 min-w-40">
          <Select
            value={wageTypeFilter}
            onChange={(e) => onWageTypeFilterChange(e.target.value as 'all' | 'hourly' | 'percent')}
            options={wageTypeOptions}
          />
        </div>

        <div className="w-40 min-w-40">
          <Select
            value={selectedDesignerId}
            onChange={(e) => onDesignerChange(e.target.value)}
            options={designerOptions}
            placeholder="전체 직원"
          />
        </div>

        <div className="w-40 min-w-40">
          <Select
            value={selectedShopId}
            onChange={(e) => onShopChange(e.target.value)}
            options={shopOptions}
            placeholder="전체 지점"
          />
        </div>

        <Button icon="search" size="sm" onClick={onSearch}>
          검색
        </Button>
      </div>
    </div>
  );
}
