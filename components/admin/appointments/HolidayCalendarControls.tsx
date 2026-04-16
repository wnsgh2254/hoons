'use client';

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui';

interface HolidayCalendarControlsProps {
  selectedDesignerFilter: string;
  allDesigners: Array<{ id: number; name: string }>;
  onDesignerFilterChange: (filter: string) => void;
  allShops: Array<{ id: number; name: string }>;
  selectedShopFilter: string;
  onShopFilterChange: (filter: string) => void;
  currentMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onRegisterModify?: () => void;
}

export default function HolidayCalendarControls({
  selectedDesignerFilter,
  allDesigners,
  onDesignerFilterChange,
  allShops,
  selectedShopFilter,
  onShopFilterChange,
  currentMonth,
  onPreviousMonth,
  onNextMonth,
  onRegisterModify,
}: HolidayCalendarControlsProps) {
  const [isDesignerFilterOpen, setIsDesignerFilterOpen] = useState(false);
  const [designerFilterPosition, setDesignerFilterPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const designerFilterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isShopFilterOpen, setIsShopFilterOpen] = useState(false);
  const [shopFilterPosition, setShopFilterPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const shopFilterButtonRef = useRef<HTMLButtonElement | null>(null);

  const monthYear = `${currentMonth.getFullYear()}년 ${String(currentMonth.getMonth() + 1).padStart(2, '0')}월`;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('[data-designer-filter-dropdown]') &&
        !target.closest('[data-designer-filter-menu]')
      ) {
        setIsDesignerFilterOpen(false);
        setDesignerFilterPosition(null);
      }
      if (
        !target.closest('[data-shop-filter-dropdown]') &&
        !target.closest('[data-shop-filter-menu]')
      ) {
        setIsShopFilterOpen(false);
        setShopFilterPosition(null);
      }
    };

    if (isDesignerFilterOpen || isShopFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDesignerFilterOpen, isShopFilterOpen]);

  const shopFilterLabel = selectedShopFilter === '전체' ? '전 지점' : selectedShopFilter;

  return (
    <div className="px-4 py-3 sm:px-5.5 sm:py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Filter Dropdowns */}
        <div className="flex gap-2 w-full lg:w-auto">
          {/* Shop Filter Dropdown */}
          <div className="relative" data-shop-filter-dropdown>
            <button
              ref={shopFilterButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (shopFilterButtonRef.current) {
                  const rect = shopFilterButtonRef.current.getBoundingClientRect();
                  setShopFilterPosition({
                    top: rect.bottom + 4,
                    left: rect.left,
                    width: rect.width,
                  });
                }
                setIsShopFilterOpen(!isShopFilterOpen);
                setIsDesignerFilterOpen(false);
              }}
              className="w-full lg:w-auto px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 min-w-[120px] justify-between transition-colors"
            >
              <span>{shopFilterLabel}</span>
              <span className="material-symbols-outlined text-lg">
                {isShopFilterOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {isShopFilterOpen && shopFilterPosition && typeof window !== 'undefined' && createPortal(
              <div
                className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[100001] min-w-[200px] max-h-[300px] overflow-y-auto"
                style={{
                  top: `${shopFilterPosition.top}px`,
                  left: `${shopFilterPosition.left}px`,
                  width: `${Math.max(shopFilterPosition.width, 200)}px`,
                }}
                onClick={(e) => e.stopPropagation()}
                data-shop-filter-menu
              >
                {[
                  { value: '전체', label: '전 지점' },
                  ...allShops.map((s) => ({ value: s.name, label: s.name })),
                ].map((item, idx, arr) => {
                  const isSelected = selectedShopFilter === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShopFilterChange(item.value);
                        setIsShopFilterOpen(false);
                        setShopFilterPosition(null);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        idx === 0 ? 'rounded-t-lg' : ''
                      } ${idx === arr.length - 1 ? 'rounded-b-lg' : ''} ${
                        isSelected ? 'bg-gray-100 font-medium' : ''
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>,
              document.body,
            )}
          </div>

          {/* Designer Filter Dropdown */}
          <div className="relative" data-designer-filter-dropdown>
            <button
              ref={designerFilterButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (designerFilterButtonRef.current) {
                  const rect = designerFilterButtonRef.current.getBoundingClientRect();
                  setDesignerFilterPosition({
                    top: rect.bottom + 4,
                    left: rect.left,
                    width: rect.width,
                  });
                }
                setIsDesignerFilterOpen(!isDesignerFilterOpen);
                setIsShopFilterOpen(false);
              }}
              className="w-full lg:w-auto px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 min-w-[120px] justify-between transition-colors"
              data-designer-filter-button
            >
              <span>{selectedDesignerFilter}</span>
              <span className="material-symbols-outlined text-lg">
                {isDesignerFilterOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {isDesignerFilterOpen && designerFilterPosition && typeof window !== 'undefined' && createPortal(
              <div
                className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[100001] min-w-[200px] max-h-[300px] overflow-y-auto"
                style={{
                  top: `${designerFilterPosition.top}px`,
                  left: `${designerFilterPosition.left}px`,
                  width: `${Math.max(designerFilterPosition.width, 220)}px`,
                }}
                onClick={(e) => e.stopPropagation()}
                data-designer-filter-menu
              >
                {[
                  { value: '전체', isFirst: true, isLast: false },
                  { value: '전체(휴무 제외)', isFirst: false, isLast: false },
                  ...allDesigners.map((d, idx) => ({
                    value: d.name,
                    isFirst: false,
                    isLast: idx === allDesigners.length - 1,
                  })),
                ].map((item) => {
                  const isSelected = selectedDesignerFilter === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDesignerFilterChange(item.value);
                        setIsDesignerFilterOpen(false);
                        setDesignerFilterPosition(null);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        item.isFirst ? 'first:rounded-t-lg' : ''
                      } ${item.isLast ? 'last:rounded-b-lg' : ''} ${
                        isSelected ? 'bg-gray-100 font-medium' : ''
                      }`}
                    >
                      {item.value}
                    </button>
                  );
                })}
              </div>,
              document.body,
            )}
          </div>
        </div>

        {/* Center: Month Navigation */}
        <div className="flex items-center justify-between gap-2 w-full lg:flex-1 lg:justify-center">
          <button
            type="button"
            onClick={onPreviousMonth}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
            title="이전 달"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>

          <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium whitespace-nowrap">
            {monthYear}
          </div>

          <button
            type="button"
            onClick={onNextMonth}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
            title="다음 달"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>

        {/* Right: Action Button */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          {onRegisterModify && (
            <Button className="w-full lg:w-auto" onClick={onRegisterModify}>등록/수정</Button>
          )}
        </div>
      </div>
    </div>
  );
}
