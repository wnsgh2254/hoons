'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { formatDateRange, getSydneyToday } from '@/lib/utils/appointment-utils';

interface ScheduleHeaderControlsProps {
  isLeftPanelVisible: boolean;
  selectedDate: string;
  selectedDesignerFilter: string;
  allDesigners: Array<{ id: number; name: string }>;
  searchInput: string;
  isSearchDropdownOpen: boolean;
  searchDropdownPosition: { top: number; left: number; width: number } | null;
  isDesignerFilterOpen: boolean;
  designerFilterPosition: { top: number; left: number; width: number } | null;
  isCalendarPopupOpen: boolean;
  calendarPopupMonth: Date;
  isMenuDropdownOpen: boolean;
  menuDropdownPosition: { top: number; left: number; width: number } | null;
  searchAutocompleteResults: Array<{ id: number; name: string; phone?: string }>;
  isSearchAutocompleteLoading: boolean;
  recentSearches: Array<{ name: string; phone?: string; id?: number }>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  designerFilterButtonRef: React.RefObject<HTMLButtonElement | null>;
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
  onSetDesignerFilterPosition: (position: { top: number; left: number; width: number } | null) => void;
  onSetMenuDropdownPosition: (position: { top: number; left: number; width: number } | null) => void;
  onSetIsSearchDropdownOpen: (open: boolean) => void;
  onSetIsDesignerFilterOpen: (open: boolean) => void;
  onSetIsCalendarPopupOpen: (open: boolean) => void;
  onSetIsMenuDropdownOpen: (open: boolean) => void;
  onSetRecentSearches: (searches: Array<{ name: string; phone?: string; id?: number }>) => void;
  onSetViewingCustomerId: (id: number | null) => void;
  onLoadCustomerInfo: (id: number) => void;
  onOpenReservationHistory: () => void;
}

export default function ScheduleHeaderControls({
  isLeftPanelVisible,
  selectedDate,
  selectedDesignerFilter,
  allDesigners,
  searchInput,
  isSearchDropdownOpen,
  searchDropdownPosition,
  isDesignerFilterOpen,
  designerFilterPosition,
  isCalendarPopupOpen,
  calendarPopupMonth,
  isMenuDropdownOpen,
  menuDropdownPosition,
  searchAutocompleteResults,
  isSearchAutocompleteLoading,
  recentSearches,
  searchInputRef,
  designerFilterButtonRef,
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
  onSetDesignerFilterPosition,
  onSetMenuDropdownPosition,
  onSetIsSearchDropdownOpen,
  onSetIsDesignerFilterOpen,
  onSetIsCalendarPopupOpen,
  onSetIsMenuDropdownOpen,
  onSetRecentSearches,
  onSetViewingCustomerId,
  onLoadCustomerInfo,
  onOpenReservationHistory,
}: ScheduleHeaderControlsProps) {
  return (
    <div className="bg-white border-b border-gray-200 shrink-0 relative z-[100]">
      <div className="max-w-full mx-auto px-6 md:px-10 md:py-2">
        <div className={`grid grid-cols-1 ${isLeftPanelVisible ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-6`}>
          {/* Left: Toggle panel button - matches left panel width (col-span-3) */}
          {isLeftPanelVisible ? (
            <div className="lg:col-span-3 flex items-center">
              {/* REQ_SCH_001_01 - Left panel toggle buttons */}
              <button
                type="button"
                onClick={onToggleLeftPanel}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                title="좌측 패널 숨기기"
              >
                <span className="material-symbols-outlined text-lg">
                  chevron_left
                </span>
              </button>
            </div>
          ) : null}

          {/* Center + Right: Designer filter, Date navigation, Search and Menu */}
          <div className={`${isLeftPanelVisible ? 'lg:col-span-9' : 'lg:col-span-12'} flex items-center gap-4`}>
            {/* Left: Toggle button when panel is hidden */}
            {!isLeftPanelVisible && (
              <button
                type="button"
                onClick={onToggleLeftPanel}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors shrink-0"
                title="좌측 패널 보이기"
              >
                <span className="material-symbols-outlined text-lg">
                  chevron_right
                </span>
              </button>
            )}

            {/* Left-center: Designer filter dropdown */}
            <div className="flex items-center gap-4">
              {/* REQ_SCH_001_02 - Designer filter dropdown */}
              <div className="relative" data-designer-filter-dropdown>
                <button
                  ref={designerFilterButtonRef}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (designerFilterButtonRef.current) {
                      const rect = designerFilterButtonRef.current.getBoundingClientRect();
                      onSetDesignerFilterPosition({
                        top: rect.bottom + 4,
                        left: rect.left,
                        width: rect.width
                      });
                    }
                    onSetIsDesignerFilterOpen(!isDesignerFilterOpen);
                  }}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 min-w-[120px] justify-between transition-colors"
                  data-designer-filter-button
                >
                  <span>{selectedDesignerFilter}</span>
                  <span className="material-symbols-outlined text-lg">
                    {isDesignerFilterOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {isDesignerFilterOpen && designerFilterPosition && typeof window !== 'undefined' && createPortal(
                  <div 
                    className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[200] min-w-[200px] max-h-[300px] overflow-y-auto"
                    style={{
                      top: `${designerFilterPosition.top}px`,
                      left: `${designerFilterPosition.left}px`,
                      width: `${designerFilterPosition.width}px`
                    }}
                    onClick={(e) => e.stopPropagation()}
                    data-designer-filter-menu
                  >
                    {/* 전체 (default) */}
                    <button
                      key="전체"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDesignerFilterChange('전체');
                        onSetIsDesignerFilterOpen(false);
                        onSetDesignerFilterPosition(null);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg transition-colors ${
                        selectedDesignerFilter === '전체' ? 'bg-gray-100 font-medium' : ''
                      }`}
                    >
                      전체
                    </button>
                    
                    {/* 전체(휴무 제외) */}
                    <button
                      key="전체(휴무 제외)"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDesignerFilterChange('전체(휴무 제외)');
                        onSetIsDesignerFilterOpen(false);
                        onSetDesignerFilterPosition(null);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        selectedDesignerFilter === '전체(휴무 제외)' ? 'bg-gray-100 font-medium' : ''
                      }`}
                    >
                      전체(휴무 제외)
                    </button>
                    
                    {/* 디자이너 리스트 */}
                    {allDesigners.length > 0 && (
                      <>
                        {allDesigners.map((designer) => (
                          <button
                            key={designer.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDesignerFilterChange(designer.name);
                              onSetIsDesignerFilterOpen(false);
                              onSetDesignerFilterPosition(null);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 last:rounded-b-lg transition-colors ${
                              selectedDesignerFilter === designer.name ? 'bg-gray-100 font-medium' : ''
                            }`}
                          >
                            {designer.name}
                          </button>
                        ))}
                      </>
                    )}
                  </div>,
                  document.body
                )}
              </div>
            </div>

            {/* Center: Date navigation */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              {/* Previous week button */}
              <button
                type="button"
                onClick={() => {
                  const prevWeek = new Date(selectedDate);
                  prevWeek.setDate(prevWeek.getDate() - 7);
                  onDateChange(prevWeek.toISOString().split('T')[0]);
                }}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                title="이전 주"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>

              {/* Date range display with calendar popup */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCalendarPopupToggle();
                    onCalendarMonthChange(new Date(selectedDate));
                  }}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  {(() => {
                    const start = new Date(selectedDate);
                    const end = new Date(selectedDate);
                    end.setDate(end.getDate() + 6);
                    return formatDateRange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
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
                          const dateStr = date.toISOString().split('T')[0];
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

              {/* Next week button */}
              <button
                type="button"
                onClick={() => {
                  const nextWeek = new Date(selectedDate);
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  onDateChange(nextWeek.toISOString().split('T')[0]);
                }}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                title="다음 주"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>

              {/* Today button */}
              <button
                type="button"
                onClick={() => {
                  onDateChange(getSydneyToday());
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                오늘
              </button>
            </div>

            {/* Right: Search and Menu */}
            <div className="flex items-center gap-4">
              {/* REQ_SCH_001_07~08 - Search */}
              <div className="relative" data-search-dropdown>
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
                    className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent min-w-[200px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onSearch();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (searchInputRef.current) {
                        const rect = searchInputRef.current.getBoundingClientRect();
                        onSetSearchDropdownPosition({
                          top: rect.bottom + 4,
                          left: rect.left,
                          width: rect.width
                        });
                      }
                      onSearchToggle();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors z-10 flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-lg leading-none">
                      {isSearchDropdownOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div>
                {isSearchDropdownOpen && searchDropdownPosition && typeof window !== 'undefined' && createPortal(
                  <div 
                    className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[200] max-h-[400px] overflow-y-auto"
                    style={{
                      top: `${searchDropdownPosition.top}px`,
                      left: `${searchDropdownPosition.left}px`,
                      width: `${searchDropdownPosition.width}px`
                    }}
                    onClick={(e) => e.stopPropagation()}
                    data-search-dropdown-menu
                  >
                    {/* Autocomplete results */}
                    {searchInput.trim().length > 0 && (
                      <div className="p-3 border-b border-gray-100">
                        {isSearchAutocompleteLoading ? (
                          <div className="text-xs text-gray-500 text-center py-2">검색 중...</div>
                        ) : searchAutocompleteResults.length > 0 ? (
                          <div className="space-y-1">
                            {searchAutocompleteResults.map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCustomerSelect(customer);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                <div className="font-medium text-gray-900">{customer.name}</div>
                                {customer.phone && (
                                  <div className="text-xs text-gray-500">{customer.phone}</div>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 text-center py-2">검색 결과가 없습니다.</div>
                        )}
                      </div>
                    )}
                    
                    {/* Recent searches */}
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-700">최근 조회 고객</p>
                        {recentSearches.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetRecentSearches([]);
                              try {
                                localStorage.setItem('recentSearches', JSON.stringify([]));
                              } catch (err) {
                                console.error('Error clearing recent searches:', err);
                              }
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            전체 삭제
                          </button>
                        )}
                      </div>
                      {recentSearches.length === 0 ? (
                        <p className="text-xs text-gray-500">내역이 없습니다.</p>
                      ) : (
                        <div className="space-y-1">
                          {recentSearches.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 group"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.id) {
                                    onSetViewingCustomerId(item.id);
                                    onLoadCustomerInfo(item.id);
                                  } else {
                                    onSearchInputChange(item.name);
                                    onSearch();
                                  }
                                  onSetIsSearchDropdownOpen(false);
                                  onSetSearchDropdownPosition(null);
                                }}
                                className="flex-1 text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                <div className="font-medium text-gray-900">{item.name}</div>
                                {item.phone && (
                                  <div className="text-xs text-gray-500">{item.phone}</div>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => onDeleteRecentSearch(idx, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity"
                                title="삭제"
                              >
                                <span className="material-symbols-outlined text-sm">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>,
                  document.body
                )}
              </div>

              {/* REQ_SCH_001_09 - Menu dropdown */}
              <div className="relative" data-menu-dropdown>
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
                        width: rect.width
                      });
                    }
                    onMenuToggle();
                  }}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  data-menu-button
                >
                  MENU
                  <span className="material-symbols-outlined text-lg">
                    {isMenuDropdownOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {isMenuDropdownOpen && menuDropdownPosition && typeof window !== 'undefined' && createPortal(
                  <div 
                    className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[200] min-w-[200px]"
                    style={{
                      top: `${menuDropdownPosition.top}px`,
                      right: `${window.innerWidth - menuDropdownPosition.left}px`,
                      width: `${menuDropdownPosition.width}px`
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
                    <Link
                      href="/admin/appointments"
                      className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 last:rounded-b-lg transition-colors"
                      onClick={() => {
                        onSetIsMenuDropdownOpen(false);
                        onSetMenuDropdownPosition(null);
                      }}
                    >
                      휴일 및 특근 현황
                    </Link>
                  </div>,
                  document.body
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
