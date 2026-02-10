'use client';

import React from 'react';

interface ReservationHistoryFiltersProps {
  dateType: 'booking' | 'created';
  setDateType: (type: 'booking' | 'created') => void;
  dateMode: 'single' | 'range';
  setDateMode: (mode: 'single' | 'range') => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  statusFilter: 'all' | 'BOOKED' | 'ARRIVED' | 'PAID' | 'NOSHOW' | 'CANCELLED';
  setStatusFilter: (status: typeof statusFilter) => void;
  designerFilter: 'all' | number;
  setDesignerFilter: (designer: typeof designerFilter) => void;
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
    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/60">
      <div className="flex flex-col gap-4">
        {/* 첫 번째 줄: 날짜 기준 선택 및 날짜 입력 */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* 날짜 기준 선택 */}
          <select
            value={dateType}
            onChange={(e) => setDateType(e.target.value as 'booking' | 'created')}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[120px] focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value="booking">예약일</option>
            <option value="created">등록일</option>
          </select>

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
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <span className="text-xs text-gray-500">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          ) : (
            <div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setEndDate(e.target.value);
                }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* 두 번째 줄: 자원, 상태, 검색 */}
        <div className="flex flex-wrap gap-4 items-end">
          {/* 자원 필터 */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">자원</span>
            <select
              value={designerFilter === 'all' ? 'all' : String(designerFilter)}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'all') setDesignerFilter('all');
                else setDesignerFilter(Number(v));
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[140px] focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">전체</option>
              {designers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* 상태 필터 */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">상태</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[140px] focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">전체(취소포함)</option>
              <option value="BOOKED">예약</option>
              <option value="ARRIVED">고객입장</option>
              <option value="PAID">계산완료</option>
              <option value="NOSHOW">노쇼</option>
              <option value="CANCELLED">취소</option>
            </select>
          </div>

          {/* 검색 입력 */}
          <div className="flex flex-1 min-w-[200px] flex-col gap-1">
            <span className="text-xs text-gray-500">고객명 또는 휴대폰번호</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSearch();
                  }
                }}
                placeholder="고객명 또는 휴대폰 번호"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <button
                type="button"
                onClick={onSearch}
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
              >
                검색
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
