'use client';

import React from 'react';
import { formatAudNumber } from '@/lib/utils';

interface CustomerSummarySectionProps {
  customer: any;
  totalSales?: number;
  points?: number;
  unpaidAmount?: number;
  onEditUnpaid?: () => void;
  onRegisterSale?: () => void;
  onRegisterRefund?: () => void;
  onRegisterPhoto?: () => void;
}

export default function CustomerSummarySection({
  customer,
  totalSales = 0,
  points = 0,
  unpaidAmount = 0,
  onEditUnpaid,
  onRegisterSale,
  onRegisterRefund,
}: CustomerSummarySectionProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Total Sales */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-500 w-20 flex-shrink-0">총 판매액</p>
        <p className="text-sm font-medium text-black">
          {Number(totalSales).toLocaleString()}
        </p>
      </div>

      {/* Prepaid Balance */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-500 w-20 flex-shrink-0">정액권 잔액</p>
        <p className="text-sm font-medium text-black">
          {formatAudNumber(points)}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-2">
        {onRegisterSale && (
          <button
            type="button"
            onClick={onRegisterSale}
            className="flex-1 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            판매 등록
          </button>
        )}
        {onRegisterRefund && (
          <button
            type="button"
            onClick={onRegisterRefund}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            환불 등록
          </button>
        )}
      </div>
    </div>
  );
}
