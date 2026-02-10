'use client';

import React from 'react';

interface CustomerSummarySectionProps {
  customer: any;
  totalSales?: number;
  points?: number;
  unpaidAmount?: number;
  onEditPoints?: () => void;
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
  onEditPoints,
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

      {/* Points */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-500 w-20 flex-shrink-0">포인트</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-black">
            {Number(points).toLocaleString()}
          </p>
          {onEditPoints && (
            <button
              type="button"
              onClick={onEditPoints}
              className="text-gray-400 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
          )}
        </div>
      </div>

      {/* Prepaid Balance */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-500 w-20 flex-shrink-0">정액권 잔액</p>
        <p className="text-sm font-medium text-black">
          {customer.prepaid_balance
            ? `${Number(customer.prepaid_balance).toLocaleString()}`
            : '0'}
        </p>
      </div>

      {/* Unpaid Amount */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-500 w-20 flex-shrink-0">미수금</p>
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium ${Number(unpaidAmount) > 0 ? 'text-red-600' : 'text-black'}`}>
            {Number(unpaidAmount).toLocaleString()}
          </p>
          {onEditUnpaid && (
            <button
              type="button"
              onClick={onEditUnpaid}
              className="text-gray-400 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
          )}
        </div>
      </div>

      {/* Last Visit Date */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-500 w-20 flex-shrink-0">최근 방문일</p>
        <p className="text-sm font-medium text-black">
          {customer.last_visit_date
            ? (() => {
                const date = new Date(customer.last_visit_date);
                const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                return `${formattedDate} (${customer.days_since_last_visit || 0}일전)`;
              })()
            : '-'}
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
