'use client';

import React from 'react';
import { Button, Input, Select } from '@/components/ui';

type ReservationStatusFilter =
  | 'all'
  | 'BOOKED'
  | 'ARRIVED'
  | 'PAID'
  | 'NOSHOW'
  | 'CANCELLED';

type ReservationDesignerFilter = 'all' | number;

interface ReservationHistoryFiltersProps {
  dateType: 'booking' | 'created';
  setDateType: (type: 'booking' | 'created') => void;
  dateMode: 'single' | 'range';
  setDateMode: (mode: 'single' | 'range') => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  statusFilter: ReservationStatusFilter;
  setStatusFilter: (status: ReservationStatusFilter) => void;
  designerFilter: ReservationDesignerFilter;
  setDesignerFilter: (designer: ReservationDesignerFilter) => void;
  searchKeyword: string;
  setSearchKeyword: (keyword: string) => void;
  onSearch: () => void;
  designers: Array<{ id: number; name: string }>;
}

export default function ReservationHistoryFilters({
  dateType,
  setDateType,
  dateMode,
  setDateMode,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  statusFilter,
  setStatusFilter,
  designerFilter,
  setDesignerFilter,
  searchKeyword,
  setSearchKeyword,
  onSearch,
  designers,
}: ReservationHistoryFiltersProps) {
  return (
    <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex flex-col gap-4">
        {/* 첫 번째 줄: 날짜 기준 선택 및 날짜 입력 */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* 날짜 기준 선택 */}
          <Select
            value={dateType}
            onChange={(e) => setDateType(e.target.value as 'booking' | 'created')}
            options={[
              { value: 'booking', label: '예약일' },
              { value: 'created', label: '등록일' },
            ]}
            className="min-w-[120px]"
          />

          {/* 날짜/기간별 선택 */}
          <div className="flex items-center gap-2 h-[38px]">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="dateMode"
                checked={dateMode === 'single'}
                onChange={() => setDateMode('single')}
                className="w-3.5 h-3.5"
              />
              <span className="text-xs text-gray-700">날짜</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="dateMode"
                checked={dateMode === 'range'}
                onChange={() => setDateMode('range')}
                className="w-3.5 h-3.5"
              />
              <span className="text-xs text-gray-700">기간별</span>
            </label>
          </div>

          {/* 날짜 입력 */}
          {dateMode === 'range' ? (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-xs text-gray-500">~</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setEndDate(e.target.value);
                }}
              />
            </div>
          )}
        </div>

        {/* 두 번째 줄: 자원, 상태, 검색 */}
        <div className="flex flex-wrap gap-4 items-end">
          {/* 자원 필터 */}
          <Select
            label="자원"
            value={designerFilter === 'all' ? 'all' : String(designerFilter)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'all') setDesignerFilter('all');
              else setDesignerFilter(Number(v));
            }}
            options={[
              { value: 'all', label: '전체' },
              ...designers.map((d) => ({ value: String(d.id), label: d.name })),
            ]}
            className="min-w-[140px]"
          />

          {/* 상태 필터 */}
          <Select
            label="상태"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReservationStatusFilter)}
            options={[
              { value: 'all', label: '전체(취소포함)' },
              { value: 'BOOKED', label: '예약' },
              { value: 'ARRIVED', label: '고객입장' },
              { value: 'PAID', label: '계산완료' },
              { value: 'NOSHOW', label: '노쇼' },
              { value: 'CANCELLED', label: '취소' },
            ]}
            className="min-w-[140px]"
          />

          {/* 검색 입력 */}
          <div className="flex flex-1 min-w-[200px] flex-col gap-1">
            <span className="text-xs text-gray-500">고객명 또는 휴대폰번호</span>
            <div className="flex items-center gap-2">
              <Input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSearch();
                  }
                }}
                placeholder="고객명 또는 휴대폰 번호"
                wrapperClassName="flex-1"
              />
              <Button onClick={onSearch}>검색</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
