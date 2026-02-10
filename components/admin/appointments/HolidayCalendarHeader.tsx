'use client';

import React from 'react';

interface HolidayCalendarHeaderProps {
  onClose: () => void;
}

export default function HolidayCalendarHeader({
  onClose,
}: HolidayCalendarHeaderProps) {
  return (
    <div className="p-6 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-black">휴일 및 특근 현황</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-black transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  );
}
