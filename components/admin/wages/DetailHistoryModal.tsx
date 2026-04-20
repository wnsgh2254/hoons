'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Button, Tabs, EmptyState } from '@/components/ui';

type TabKey = 'service' | 'product' | 'membership';

export default function DetailHistoryModal({
  detail,
  onClose,
}: {
  detail: { designerId: number; designerName: string; startDate: string; endDate: string };
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('service');

  useEffect(() => {
    const fetchDetailData = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/wages/sales-history?start_date=${detail.startDate}&end_date=${detail.endDate}&designer_id=${detail.designerId}`,
        );
        const data = await res.json();
        if (res.ok) {
          setSalesHistory(data.salesHistory || []);
        } else {
          console.error('Error fetching sales history:', data.error);
        }
      } catch (error) {
        console.error('Error fetching detail data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetailData();
  }, [detail]);

  const formatDate = (dateStr: string) => {
    const [, month, day] = String(dateStr || '').split('-');
    return month && day ? `${month}-${day}` : dateStr;
  };

  const tabs = [
    { key: 'service', label: '서비스 매출/차감' },
    { key: 'product', label: '제품 매출/차감' },
    { key: 'membership', label: '정액권 판매' },
  ];

  const filteredRows = salesHistory.filter((row: any) => {
    if (activeTab === 'membership') return row.itemType === 'prepaid';
    if (activeTab === 'product') return row.itemType === 'product';
    return row.itemType === 'service';
  });

  const totalAfterDeduction = filteredRows.reduce(
    (sum: number, row: any) => sum + Number(row.afterDeduction || 0),
    0,
  );
  const totalIncentive = filteredRows.reduce(
    (sum: number, row: any) => sum + Number(row.incentive || 0),
    0,
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`${detail.designerName} · ${detail.startDate} ~ ${detail.endDate}`}
      maxWidth="max-w-6xl"
      scrollable
      footer={
        <Button variant="ghost" icon="download" onClick={() => {}}>
          엑셀 다운로드
        </Button>
      }
    >
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as TabKey)}
      />

      <div className="mt-4">
        {loading ? (
          <EmptyState title="로딩 중..." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">날짜</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">고객명</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">항목명</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">단가</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">수량</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">금액</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">결제</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">결제금액</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">반영금액</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">지급률</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">인센티브</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                      표시할 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((item: any) => (
                    <tr
                      key={item.id}
                      className={item.isPrepaidDeduction ? 'bg-yellow-50/60 hover:bg-yellow-50' : 'hover:bg-gray-50'}
                    >
                      <td className="px-3 py-2.5 text-gray-900">{formatDate(item.date)}</td>
                      <td className="px-3 py-2.5 text-gray-900">{item.customerName}</td>
                      <td className="px-3 py-2.5 text-gray-900">{item.serviceName}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">
                        {Number(item.unitPrice || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-gray-900">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">
                        {Number(item.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-900">{item.paymentMethod}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">
                        {Number(item.paymentAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">
                        {Number(item.afterDeduction || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-gray-900">
                        {Number(item.incentiveRate || 0)}%
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-900">
                        {Math.round(Number(item.incentive || 0)).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}

                {filteredRows.length > 0 && (
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                    <td colSpan={8} className="px-3 py-2.5 text-right text-gray-900">
                      합계
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">
                      {totalAfterDeduction.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-900">-</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">
                      {Math.round(totalIncentive).toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
