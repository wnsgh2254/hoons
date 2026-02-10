'use client';

import React from 'react';

interface HolidayCalendarLegendProps {
  onClose?: () => void;
}

export default function HolidayCalendarLegend({ onClose }: HolidayCalendarLegendProps) {
  return (
    <div className="p-6 border-t border-gray-200 bg-gray-50/60">
      <div className="flex items-center justify-between">
        {/* Left: Explanation Text */}
        <div className="flex-1">
          <p className="text-xs text-gray-600">
            *매장 정기 휴일은 예약 '설정-영업 시간'에서 직원 정기 휴일은 '예약 설정-자원'에서 설정 가능 합니다.
          </p>
        </div>

        {/* Right: Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-red-500 text-xs">●</span>
            <span className="text-xs text-gray-700">정기 휴일</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 text-xs">○</span>
            <span className="text-xs text-gray-700">임의 휴일</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-blue-500 text-xs">●</span>
            <span className="text-xs text-gray-700">특별 근무일</span>
          </div>
        </div>
      </div>
    </div>
  );
}
