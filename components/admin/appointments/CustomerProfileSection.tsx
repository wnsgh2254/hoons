'use client';

import React from 'react';

interface CustomerProfileSectionProps {
  customer: any;
  onMemoChange?: (memo: string) => void;
}

export default function CustomerProfileSection({
  customer,
  onMemoChange,
}: CustomerProfileSectionProps) {
  const [memo, setMemo] = React.useState(customer.memo || '');

  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMemo = e.target.value;
    setMemo(newMemo);
    if (onMemoChange) {
      onMemoChange(newMemo);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Customer Name and Type */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-bold text-black">{customer.name || '-'}</h3>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
            {customer.customer_type === 'prepaid' ? '정액권' : '일반'}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          {customer.phone
            ? `/${customer.phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3')}`
            : '-'}
        </p>
      </div>

      {/* Customer Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500 w-20 flex-shrink-0">고객 번호</p>
          <p className="text-sm font-medium text-black">
            {customer.customer_number || customer.id || '-'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500 w-20 flex-shrink-0">담당자</p>
          <p className="text-sm font-medium text-black">{customer.manager_name || '-'}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500 w-20 flex-shrink-0">생일</p>
          <p className="text-sm font-medium text-black">
            {customer.birthday || customer.birth_date || '-'}
          </p>
        </div>
      </div>

      {/* Memo/Additional Info Text Area */}
      <div>
        <textarea
          value={memo}
          onChange={handleMemoChange}
          placeholder="추가 정보를 입력하세요"
          className="w-full min-h-[100px] border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
        />
      </div>
    </div>
  );
}
