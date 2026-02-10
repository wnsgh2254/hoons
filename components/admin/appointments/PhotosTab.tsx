'use client';

import React from 'react';

interface PhotosTabProps {
  customerId: number;
}

export default function PhotosTab({ customerId }: PhotosTabProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-black mb-3">시술사진</div>
      <div className="text-sm text-gray-500 text-center py-4">
        시술사진 기능은 추후 구현 예정입니다.
      </div>
    </div>
  );
}
