'use client';

import React from 'react';

interface MessagesTabProps {
  customerId: number;
}

export default function MessagesTab({ customerId }: MessagesTabProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-black mb-3">문자전송내역</div>
      <div className="text-sm text-gray-500 text-center py-4">
        문자전송내역 기능은 추후 구현 예정입니다.
      </div>
    </div>
  );
}
