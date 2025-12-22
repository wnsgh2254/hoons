'use client';

import { useState } from 'react';

export default function DateSelector() {
  const [selectedDate, setSelectedDate] = useState<string>('');

  const today = new Date();
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 2); // 2 months ahead

  return (
    <div>
      <label className="block text-lg font-semibold text-gray-900 mb-4">
        날짜 선택
      </label>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        min={today.toISOString().split('T')[0]}
        max={maxDate.toISOString().split('T')[0]}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
      />
    </div>
  );
}



