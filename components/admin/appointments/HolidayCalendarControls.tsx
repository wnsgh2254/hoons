'use client';

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui';

interface HolidayCalendarControlsProps {
  selectedDesignerFilter: string;
  allDesigners: Array<{ id: number; name: string }>;
  onDesignerFilterChange: (filter: string) => void;
  currentMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onRegisterModify?: () => void;
}

export default function HolidayCalendarControls({
  selectedDesignerFilter,
  allDesigners,
  onDesignerFilterChange,
  currentMonth,
  onPreviousMonth,
  onNextMonth,
  onRegisterModify,
}: HolidayCalendarControlsProps) {
  const [isDesignerFilterOpen, setIsDesignerFilterOpen] = useState(false);
  const [designerFilterPosition, setDesignerFilterPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const designerFilterButtonRef = useRef<HTMLButtonElement | null>(null);

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
    };

    if (isDesignerFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDesignerFilterOpen]);

  return (
    <div className="px-4 py-3 sm:px-5.5 sm:py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Filter Dropdown */}
        <div className="relative w-full lg:w-auto" data-designer-filter-dropdown>
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
                  width: rect.width
                });
              }
              setIsDesignerFilterOpen(!isDesignerFilterOpen);
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
                width: `${Math.max(designerFilterPosition.width, 220)}px`
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
                  isLast: idx === allDesigners.length - 1 
                }))
              ].map((item) => {
                const isSelected = selectedDesignerFilter === item.value;
                const handleClick = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDesignerFilterChange(item.value);
                  setIsDesignerFilterOpen(false);
                  setDesignerFilterPosition(null);
                };

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={handleClick}
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
            document.body
          )}
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
