'use client';

import React from 'react';
import { Button, Input, Select } from '@/components/ui';

interface WagesOverviewFiltersProps {
  selectedYear: number;
  selectedMonth: number;
  wageTypeFilter: 'all' | 'hourly' | 'percent';
  onMonthChange: (year: number, month: number) => void;
  onWageTypeFilterChange: (filter: 'all' | 'hourly' | 'percent') => void;
  onSearch: () => void;
}

export default function WagesOverviewFilters({
  selectedYear,
  selectedMonth,
  wageTypeFilter,
  onMonthChange,
  onWageTypeFilterChange,
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

        <div className="w-40">
          <Select
            value={wageTypeFilter}
            onChange={(e) => onWageTypeFilterChange(e.target.value as 'all' | 'hourly' | 'percent')}
            options={wageTypeOptions}
          />
        </div>

        <Button icon="search" size="sm" onClick={onSearch}>
          검색
        </Button>
      </div>
    </div>
  );
}
