'use client';

import React, { useState } from 'react';
import CustomerProfileSection from './CustomerProfileSection';
import CustomerSummarySection from './CustomerSummarySection';
import SalesHistoryTable from './SalesHistoryTable';
import BookingHistoryTable from './BookingHistoryTable';
import Modal from '@/components/ui/Modal';
import Tabs from '@/components/ui/Tabs';
import { Z } from '@/lib/constants';
import { formatAudNumber } from '@/lib/utils';

interface CustomerInfoDrawerProps {
  customerId: number | null;
  customer: any | null;
  loading: boolean;
  tab: 'sales' | 'bookings' | 'prepaid';
  onClose: () => void;
  onTabChange: (tab: 'sales' | 'bookings' | 'prepaid') => void;
  onRegisterSale?: () => void;
  onRegisterRefund?: () => void;
  onViewSalesDetail?: (item: any) => void;
}

const TABS = [
  { key: 'sales', label: '판매 내역' },
  { key: 'bookings', label: '예약' },
  { key: 'prepaid', label: '정액권' },
];

export default function CustomerInfoDrawer({
  customerId,
  customer,
  loading,
  tab,
  onClose,
  onTabChange,
  onRegisterSale,
  onRegisterRefund,
  onViewSalesDetail,
}: CustomerInfoDrawerProps) {
  const [salesFilter, setSalesFilter] = useState('all');

  const derivedTotalSales = Number(customer?.total_sales ?? 0);
  const derivedPoints = Number(customer?.prepaid_balance ?? customer?.points ?? 0);
  const derivedUnpaidAmount = Number(customer?.unpaid_amount ?? 0);

  if (!customerId) return null;

  return (
    <Modal
      isOpen={!!customerId}
      onClose={onClose}
      title="고객 정보"
      zIndex={Z.MODAL_DRAWER}
      maxWidth="max-w-6xl"
      className="max-h-[90vh] flex flex-col overflow-hidden"
      bodyClassName="flex-1 overflow-y-auto min-h-0"
    >
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-11.5">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-600">고객 정보를 불러오는 중...</p>
          </div>
        </div>
      ) : customer ? (
        <div className="flex-1 overflow-y-auto">
          {/* 2-Column Layout: Profile (Left) and Summary (Right) */}
          <div className="grid grid-cols-2 gap-6 mb-5.5">
            <div className="flex flex-col">
              <CustomerProfileSection
                customer={customer}
                onMemoChange={(memo) => {
                  console.log('Memo changed:', memo);
                }}
              />
            </div>
            <div className="flex flex-col">
              <CustomerSummarySection
                customer={customer}
                totalSales={derivedTotalSales}
                points={derivedPoints}
                unpaidAmount={derivedUnpaidAmount}
                onEditUnpaid={() => {
                  alert('미수금 편집 기능은 추후 구현 예정입니다.');
                }}
                onRegisterSale={onRegisterSale}
                onRegisterRefund={onRegisterRefund}
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            tabs={TABS}
            activeTab={tab}
            onTabChange={(key) => onTabChange(key as 'sales' | 'bookings' | 'prepaid')}
            className="mb-4"
          />

          {/* Tab Content */}
          {tab === 'sales' && customerId && (
            <SalesHistoryTable
              customerId={customerId}
              filter={salesFilter}
              onFilterChange={setSalesFilter}
              onViewDetail={(item) => onViewSalesDetail?.(item)}
            />
          )}

          {tab === 'bookings' && customerId && (
            <BookingHistoryTable customerId={customerId} />
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
                              {formatAudNumber(Number(ticket.points ?? ticket.balance ?? 0))}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {ticket.expires_at
                                ? new Date(ticket.expires_at).toLocaleDateString('ko-KR')
                                : ticket.expiry_date || '무제한'}
                            </td>
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
      ) : (
        <div className="flex-1 flex items-center justify-center py-11.5">
          <p className="text-sm text-gray-600">고객 정보를 불러올 수 없습니다.</p>
        </div>
      )}
    </Modal>
  );
}
