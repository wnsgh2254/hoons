'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  formatLocalDateString,
  getSydneyToday,
  parseLocalDateString,
} from '@/lib/utils/appointment-utils';
import Select from '@/components/ui/Select';

interface ScheduleHeaderControlsProps {
  isLeftPanelVisible: boolean;
  selectedDate: string;
  selectedShopFilter: string;
  allShops: Array<{ id: number; name: string }>;
  onShopFilterChange: (filter: string) => void;
  selectedDesignerFilter: string;
  allDesigners: Array<{ id: number; name: string }>;
  searchInput: string;
  isSearchDropdownOpen: boolean;
  searchDropdownPosition: { top: number; left: number; width: number } | null;
  isCalendarPopupOpen: boolean;
  calendarPopupMonth: Date;
  isMenuDropdownOpen: boolean;
  menuDropdownPosition: { top: number; left: number; width: number } | null;
  searchAutocompleteResults: Array<{ id: number; name: string; phone?: string; customer_number?: number }>;
  isSearchAutocompleteLoading: boolean;
  recentSearches: Array<{ name: string; phone?: string; id?: number }>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
  onToggleLeftPanel: () => void;
  onDateChange: (date: string) => void;
  onDesignerFilterChange: (filter: string) => void;
  onSearchInputChange: (value: string) => void;
  onSearchFocus: () => void;
  onSearchToggle: () => void;
  onSearch: () => void;
  onCustomerSelect: (customer: { id: number; name: string; phone?: string }) => void;
  onDeleteRecentSearch: (index: number, e: React.MouseEvent) => void;
  onCalendarPopupToggle: () => void;
  onCalendarMonthChange: (month: Date) => void;
  onMenuToggle: () => void;
  onSetSearchDropdownPosition: (position: { top: number; left: number; width: number } | null) => void;
  onSetMenuDropdownPosition: (position: { top: number; left: number; width: number } | null) => void;
  onSetIsSearchDropdownOpen: (open: boolean) => void;
  onSetIsCalendarPopupOpen: (open: boolean) => void;
  onSetIsMenuDropdownOpen: (open: boolean) => void;
  onSetRecentSearches: (searches: Array<{ name: string; phone?: string; id?: number }>) => void;
  onSetViewingCustomerId: (id: number | null) => void;
  onLoadCustomerInfo: (id: number) => void;
  onOpenReservationHistory: () => void;
  onOpenHolidayCalendar?: () => void;
  isWeekViewMode?: boolean;
  weekViewStartDate?: string;
  onWeekNavigate?: (newStartDate: string) => void;
}

export default function ScheduleHeaderControls({
  isLeftPanelVisible,
  selectedDate,
  selectedShopFilter,
  allShops,
  onShopFilterChange,
  selectedDesignerFilter,
  allDesigners,
  searchInput,
  isSearchDropdownOpen,
  searchDropdownPosition,
  isCalendarPopupOpen,
  calendarPopupMonth,
  isMenuDropdownOpen,
  menuDropdownPosition,
  searchAutocompleteResults,
  isSearchAutocompleteLoading,
  recentSearches,
  searchInputRef,
  menuButtonRef,
  onToggleLeftPanel,
  onDateChange,
  onDesignerFilterChange,
  onSearchInputChange,
  onSearchFocus,
  onSearchToggle,
  onSearch,
  onCustomerSelect,
  onDeleteRecentSearch,
  onCalendarPopupToggle,
  onCalendarMonthChange,
  onMenuToggle,
  onSetSearchDropdownPosition,
  onSetMenuDropdownPosition,
  onSetIsSearchDropdownOpen,
  onSetIsCalendarPopupOpen,
  onSetIsMenuDropdownOpen,
  onSetRecentSearches,
  onSetViewingCustomerId,
  onLoadCustomerInfo,
  onOpenReservationHistory,
  onOpenHolidayCalendar,
  isWeekViewMode = false,
  weekViewStartDate = '',
  onWeekNavigate,
}: ScheduleHeaderControlsProps) {
  return (
    <div className="bg-white border-b border-gray-200 shrink-0 relative z-[100]">
      <div className="max-w-full mx-auto px-3 md:px-9.5">
        {/* Row 1 (always visible on all screens): date nav + MENU */}
        <div className="flex items-center gap-2 py-2">
          {/* Calendar toggle — icon button on mobile, chevron on desktop */}
          <button
            type="button"
            onClick={onToggleLeftPanel}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0 ${
              isLeftPanelVisible
                ? 'bg-black text-white hover:bg-gray-800 lg:bg-transparent lg:text-gray-600 lg:hover:bg-gray-100 lg:hover:text-black'
                : 'text-gray-600 hover:bg-gray-100 hover:text-black'
            }`}
            title={isLeftPanelVisible ? '달력 닫기' : '달력 열기'}
          >
            {/* Mobile: calendar icon / Desktop: chevron */}
            <span className="material-symbols-outlined text-lg lg:hidden">
              {isLeftPanelVisible ? 'calendar_today' : 'calendar_month'}
            </span>
            <span className="material-symbols-outlined text-lg hidden lg:inline">
              {isLeftPanelVisible ? 'chevron_left' : 'chevron_right'}
            </span>
          </button>

          {/* Date navigation — centered, takes remaining space */}
          <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-center">
            {/* Previous day/week button */}
            <button
              type="button"
              onClick={() => {
                if (isWeekViewMode && onWeekNavigate && weekViewStartDate) {
                  const prevWeek = parseLocalDateString(weekViewStartDate);
                  prevWeek.setDate(prevWeek.getDate() - 7);
                  onWeekNavigate(formatLocalDateString(prevWeek));
                } else {
                  const prevDay = parseLocalDateString(selectedDate);
                  prevDay.setDate(prevDay.getDate() - 1);
                  onDateChange(formatLocalDateString(prevDay));
                }
              }}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors shrink-0"
              title={isWeekViewMode ? '이전 주' : '이전 날'}
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>

            {/* Date display with calendar popup */}
            <div className="relative" data-calendar-popup>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCalendarPopupToggle();
                  onCalendarMonthChange(parseLocalDateString(selectedDate));
                }}
                className="px-2 sm:px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                {(() => {
                  if (isWeekViewMode && weekViewStartDate) {
                    const start = parseLocalDateString(weekViewStartDate);
                    const end = parseLocalDateString(weekViewStartDate);
                    end.setDate(end.getDate() + 6);
                    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
                    const endStr = `${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
                    return `${startStr} ~ ${endStr}`;
                  }
                  const date = parseLocalDateString(selectedDate);
                  const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
                  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${dayName})`;
                })()}
              </button>
                {isCalendarPopupOpen && (
                  <div 
                    className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-[200] p-4 min-w-[280px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          const prev = new Date(calendarPopupMonth);
                          prev.setMonth(prev.getMonth() - 1);
                          onCalendarMonthChange(prev);
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                      </button>
                      <span className="text-sm font-semibold text-gray-900">
                        {calendarPopupMonth.getFullYear()}년 {calendarPopupMonth.getMonth() + 1}월
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Date(calendarPopupMonth);
                          next.setMonth(next.getMonth() + 1);
                          onCalendarMonthChange(next);
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                        <div key={day} className="text-center text-xs font-medium text-gray-600 py-1">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const year = calendarPopupMonth.getFullYear();
                        const month = calendarPopupMonth.getMonth();
                        const firstDay = new Date(year, month, 1);
                        const lastDay = new Date(year, month + 1, 0);
                        const startDate = new Date(firstDay);
                        startDate.setDate(startDate.getDate() - firstDay.getDay());
                        const days: Date[] = [];
                        for (let i = 0; i < 42; i++) {
                          const date = new Date(startDate);
                          date.setDate(startDate.getDate() + i);
                          days.push(date);
                        }
                        return days.map((date, idx) => {
                          const dateStr = formatLocalDateString(date);
                          const isCurrentMonth = date.getMonth() === month;
                          const isSelected = dateStr === selectedDate;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDateChange(dateStr);
                                onSetIsCalendarPopupOpen(false);
                              }}
                              disabled={!isCurrentMonth}
                              className={`aspect-square text-xs rounded-lg transition-colors ${
                                !isCurrentMonth ? 'text-gray-300' : 'text-gray-900 hover:bg-gray-100'
                              } ${isSelected ? 'bg-black text-white' : ''}`}
                            >
                              {date.getDate()}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Next day/week button */}
              <button
                type="button"
                onClick={() => {
                  if (isWeekViewMode && onWeekNavigate && weekViewStartDate) {
                  const nextWeek = parseLocalDateString(weekViewStartDate);
                    nextWeek.setDate(nextWeek.getDate() + 7);
                  onWeekNavigate(formatLocalDateString(nextWeek));
                  } else {
                  const nextDay = parseLocalDateString(selectedDate);
                    nextDay.setDate(nextDay.getDate() + 1);
                  onDateChange(formatLocalDateString(nextDay));
                  }
                }}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                title={isWeekViewMode ? "다음 주" : "다음 날"}
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>

              {/* Today button */}
              <button
                type="button"
                onClick={() => {
                  onDateChange(getSydneyToday());
                }}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs sm:text-sm font-medium transition-colors shrink-0"
              >
                오늘
              </button>
            </div>

            {/* MENU button — stays in Row 1 on all screens */}
            <div className="relative shrink-0" data-menu-dropdown>
              <button
                ref={menuButtonRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (menuButtonRef.current) {
                    const rect = menuButtonRef.current.getBoundingClientRect();
                    onSetMenuDropdownPosition({
                      top: rect.bottom + 4,
                      left: rect.right,
                      width: rect.width,
                    });
                  }
                  onMenuToggle();
                }}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 flex items-center gap-1 transition-colors"
                data-menu-button
              >
                MENU
                <span className="material-symbols-outlined text-base sm:text-lg">
                  {isMenuDropdownOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {isMenuDropdownOpen && menuDropdownPosition && typeof window !== 'undefined' && createPortal(
                <div
                  className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[200] min-w-[200px]"
                  style={{
                    top: `${menuDropdownPosition.top}px`,
                    right: `${window.innerWidth - menuDropdownPosition.left}px`,
                    width: `${menuDropdownPosition.width}px`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  data-menu-dropdown-menu
                >
                  <button
                    type="button"
                    className="block w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 first:rounded-t-lg transition-colors"
                    onClick={() => {
                      onOpenReservationHistory();
                      onSetIsMenuDropdownOpen(false);
                      onSetMenuDropdownPosition(null);
                    }}
                  >
                    예약 내역
                  </button>
                  <button
                    type="button"
                    className="block w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 last:rounded-b-lg transition-colors"
                    onClick={() => {
                      if (onOpenHolidayCalendar) {
                        onOpenHolidayCalendar();
                      }
                      onSetIsMenuDropdownOpen(false);
                      onSetMenuDropdownPosition(null);
                    }}
                  >
                    휴일 및 특근 현황
                  </button>
                </div>,
                document.body
              )}
            </div>
          </div>

          {/* Row 2: Shop/Designer filters + Search — stacks full-width on mobile, inline on md+ */}
          <div className="flex flex-wrap items-center gap-2 pb-2 md:pb-2">
            {/* Shop filter */}
            <Select
              value={selectedShopFilter}
              onChange={(e) => onShopFilterChange(e.target.value)}
              options={[
                { value: '전체', label: '전 지점' },
                ...allShops.map((s) => ({ value: String(s.id), label: s.name })),
              ]}
              className="min-w-[110px] flex-1 md:flex-none md:min-w-[120px]"
            />
            {/* REQ_SCH_001_02 - Designer filter */}
            <Select
              value={selectedDesignerFilter}
              onChange={(e) => onDesignerFilterChange(e.target.value)}
              options={[
                { value: '전체', label: '전체' },
                { value: '전체(휴무 제외)', label: '전체(휴무 제외)' },
                ...allDesigners.map((d) => ({ value: d.name, label: d.name })),
              ]}
              className="min-w-[130px] flex-1 md:flex-none md:min-w-[140px]"
            />
            {/* REQ_SCH_001_07~08 - Search */}
            <div className="relative flex-1 min-w-[160px]" data-search-dropdown>
              <div className="relative flex items-center">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-lg pointer-events-none">
                  search
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    onSearchInputChange(e.target.value);
                  }}
                  onFocus={onSearchFocus}
                  placeholder="고객명 또는 휴대폰"
                  className="w-full pl-9.5 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSearch();
                    }
                  }}
                />
              </div>
              {isSearchDropdownOpen && searchDropdownPosition && searchInput.trim().length > 0 && typeof window !== 'undefined' && createPortal(
                <div
                  className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[200] max-h-[400px] overflow-y-auto"
                  style={{
                    top: `${searchDropdownPosition.top}px`,
                    left: `${searchDropdownPosition.left}px`,
                    width: `${searchDropdownPosition.width}px`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  data-search-dropdown-menu
                >
                  {isSearchAutocompleteLoading ? (
                    <div className="text-xs text-gray-500 text-center py-2">검색 중...</div>
                  ) : searchAutocompleteResults.length > 0 ? (
                    <ul className="divide-y divide-gray-100">
                      {searchAutocompleteResults.map((customer) => (
                        <li
                          key={customer.id}
                          className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCustomerSelect(customer);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{customer.name} ({customer.customer_number || customer.id})</span>
                            {customer.phone && (
                              <span className="text-[11px] text-gray-500">{customer.phone}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-gray-500 text-center py-2">검색 결과가 없습니다.</div>
                  )}
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
