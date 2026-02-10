'use client';

import React, { useState, useEffect } from 'react';
import CustomerProfileSection from './CustomerProfileSection';
import CustomerSummarySection from './CustomerSummarySection';
import SalesHistoryTable from './SalesHistoryTable';

interface CustomerInfoDrawerProps {
  customerId: number | null;
  customer: any | null;
  loading: boolean;
  tab: 'sales' | 'prepaid';
  onClose: () => void;
  onTabChange: (tab: 'sales' | 'prepaid') => void;
}

export default function CustomerInfoDrawer({
  customerId,
  customer,
  loading,
  tab,
  onClose,
  onTabChange,
}: CustomerInfoDrawerProps) {
  const [salesFilter, setSalesFilter] = useState('all');

  // Comment: Derive summary numbers directly from loaded customer data
  const derivedTotalSales = Number(customer?.total_sales ?? 0);
  const derivedPoints = Number(
    customer?.prepaid_balance ?? customer?.points ?? 0,
  );
  const derivedUnpaidAmount = Number(customer?.unpaid_amount ?? 0);

  if (!customerId) return null;

  return (
    <div className="fixed inset-0 z-[100003] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-xl pointer-events-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              <p className="text-sm text-gray-600">고객 정보를 불러오는 중...</p>
            </div>
          </div>
        ) : customer ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-black">고객 정보</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Customer Info Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* 2-Column Layout: Profile (Left) and Summary (Right) */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Left Column: Customer Profile */}
                <div className="flex flex-col">
                  <CustomerProfileSection
                    customer={customer}
                    onMemoChange={(memo) => {
                      // TODO: Save memo to backend
                      console.log('Memo changed:', memo);
                    }}
                  />
                </div>

                {/* Right Column: Summary Statistics */}
                <div className="flex flex-col">
                  <CustomerSummarySection
                    customer={customer}
                    totalSales={derivedTotalSales}
                    points={derivedPoints}
                    unpaidAmount={derivedUnpaidAmount}
                    onEditPoints={() => {
                      // TODO: Open edit points modal
                      alert('포인트 편집 기능은 추후 구현 예정입니다.');
                    }}
                    onEditUnpaid={() => {
                      // TODO: Open edit unpaid amount modal
                      alert('미수금 편집 기능은 추후 구현 예정입니다.');
                    }}
                    onRegisterSale={() => {
                      // TODO: Open register sale modal
                      alert('판매 등록 기능은 추후 구현 예정입니다.');
                    }}
                    onRegisterRefund={() => {
                      // TODO: Open register refund modal
                      alert('환불 등록 기능은 추후 구현 예정입니다.');
                    }}
                  />
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 mb-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onTabChange('sales')}
                    className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                      tab === 'sales'
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-500 hover:text-black'
                    }`}
                  >
                    판매 내역
                  </button>
                  <button
                    type="button"
                    onClick={() => onTabChange('prepaid')}
                    className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                      tab === 'prepaid'
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-500 hover:text-black'
                    }`}
                  >
                    정액권
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              {tab === 'sales' && customerId && (
                <SalesHistoryTable
                  customerId={customerId}
                  filter={salesFilter}
                  onFilterChange={setSalesFilter}
                  onViewDetail={(item) => {
                    // TODO: Open detail modal
                    console.log('View detail:', item);
                  }}
                />
              )}

              {tab === 'prepaid' && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-black mb-3">정액권</div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">정액권명</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">잔액</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">만료일</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {customer.prepaid_tickets && customer.prepaid_tickets.length > 0 ? (
                            customer.prepaid_tickets.map((ticket: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">{ticket.name || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {Number(ticket.balance || 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">{ticket.expiry_date || '무제한'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="px-4 py-4 text-center text-sm text-gray-500">
                                정액권 내역이 없습니다.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-600">고객 정보를 불러올 수 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
