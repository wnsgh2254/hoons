'use client';

import React from 'react';

interface AppointmentsTabProps {
  customerId: number;
}

export default function AppointmentsTab({ customerId }: AppointmentsTabProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-black mb-3">예약</div>
      <div className="text-sm text-gray-500 text-center py-4">
        예약 기능은 추후 구현 예정입니다.
      </div>
    </div>
  );
}
