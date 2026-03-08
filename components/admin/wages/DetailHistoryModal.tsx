'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Button, Tabs, EmptyState } from '@/components/ui';

export default function DetailHistoryModal({ detail, onClose }: {
  detail: { designerId: number; designerName: string; startDate: string; endDate: string };
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [designer, setDesigner] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'service' | 'product' | 'membership'>('service');

  useEffect(() => {
    const fetchDetailData = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/wages/sales-history?start_date=${detail.startDate}&end_date=${detail.endDate}&designer_id=${detail.designerId}`
        );
        const data = await res.json();
        if (res.ok) {
          setSalesHistory(data.salesHistory || []);
          setDesigner(data.designer);
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
    const [, month, day] = dateStr.split('-');
    return `${month}-${day}`;
  };

  const serviceSales = salesHistory.filter((h: any) => !h.isPrepaidDeduction);
  const prepaidDeductions = salesHistory.filter((h: any) => h.isPrepaidDeduction);
  const serviceSalesTotal = serviceSales.reduce((sum: number, h: any) => sum + (h.incentive || 0), 0);
  const prepaidDeductionsTotal = prepaidDeductions.reduce((sum: number, h: any) => sum + (h.incentive || 0), 0);
  const totalIncentive = serviceSalesTotal + prepaidDeductionsTotal;

  const detailTabs = [
    { key: 'service', label: '서비스 판매/차감' },
    { key: 'product', label: '제품 판매/차감' },
    { key: 'membership', label: '회원권 판매' },
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`${detail.designerName} — ${detail.startDate} ~ ${detail.endDate}`}
      maxWidth="max-w-6xl"
      scrollable
      footer={
        <Button
          variant="ghost"
          icon="download"
          onClick={() => {}}
        >
          엑셀 다운로드
        </Button>
      }
    >
      <Tabs
        tabs={detailTabs}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as 'service' | 'product' | 'membership')}
      />

      <div className="mt-4">
        {loading ? (
          <EmptyState title="로딩 중..." />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {/* Row 1: Group headers */}
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-200" colSpan={3}>
                      기본 정보
                    </th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-200" colSpan={3}>
                      금액 정보
                    </th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-200" colSpan={2}>
                      결제 정보
                    </th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" colSpan={3}>
                      인센티브
                    </th>
                  </tr>
                  {/* Row 2: Sub headers */}
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-200">날짜</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-200">고객명</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-200">서비스명</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-r border-gray-200">단가</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">수량</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-r border-gray-200">금액 (할인)</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">결제 방법</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-r border-gray-200">결제금액</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-r border-gray-200">공제 후</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">지급률</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">인센티브</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {activeTab === 'service' && (
                    <>
                      {serviceSales.map((item: any) => (
                        <tr key={item.id} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2.5 text-sm text-gray-900 border-r border-gray-100">{formatDate(item.date)}</td>
                          <td className="px-3 py-2.5 text-sm text-gray-900 border-r border-gray-100">{item.customerName}</td>
                          <td className="px-3 py-2.5 text-sm text-gray-900 border-r border-gray-100">{item.serviceName}</td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">{item.unitPrice.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-sm text-center tabular-nums text-gray-900 border-r border-gray-100">{item.quantity}</td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">
                            {item.amount.toLocaleString()}{item.discount > 0 ? ` (${Math.round((item.discount / item.amount) * 100)}%)` : ''}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-center text-gray-900 border-r border-gray-100">{item.paymentMethod}</td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">{item.paymentAmount.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">{item.afterDeduction.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-sm text-center tabular-nums text-gray-900 border-r border-gray-100">{item.incentiveRate}%</td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums font-semibold text-gray-900">
                            {Math.round(item.incentive).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {prepaidDeductions.map((item: any) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 bg-yellow-50/60">
                          <td className="px-3 py-2.5 text-sm text-gray-900 border-r border-gray-100">{formatDate(item.date)}</td>
                          <td className="px-3 py-2.5 text-sm text-gray-900 border-r border-gray-100">{item.customerName}</td>
                          <td className="px-3 py-2.5 text-sm text-gray-900 border-r border-gray-100">{item.serviceName}</td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">{item.unitPrice.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-sm text-center tabular-nums text-gray-900 border-r border-gray-100">{item.quantity}</td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">{item.amount.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-sm text-center text-gray-900 border-r border-gray-100">{item.paymentMethod}</td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">{item.paymentAmount.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">{item.afterDeduction.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-sm text-center tabular-nums text-gray-900 border-r border-gray-100">{item.incentiveRate}%</td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums font-semibold text-gray-900">
                            {Math.round(item.incentive).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {salesHistory.length > 0 && (
                        <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                          <td colSpan={8} className="px-3 py-2.5 text-sm text-right text-gray-900 border-r border-gray-100">합계</td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">
                            {(serviceSales.reduce((sum: number, h: any) => sum + (h.afterDeduction || 0), 0) +
                              prepaidDeductions.reduce((sum: number, h: any) => sum + (h.afterDeduction || 0), 0)).toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-center text-gray-900 border-r border-gray-100">-</td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-900">
                            {Math.round(totalIncentive).toLocaleString()}
                          </td>
                        </tr>
                      )}
                      {salesHistory.length === 0 && (
                        <tr>
                          <td colSpan={11} className="px-4 py-11.5 text-center text-gray-500">
                            서비스 판매 데이터가 없습니다.
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                  {activeTab === 'product' && (
                    <tr>
                      <td colSpan={11} className="px-4 py-11.5 text-center text-gray-500">
                        제품 판매 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                  {activeTab === 'membership' && (
                    <tr>
                      <td colSpan={11} className="px-4 py-11.5 text-center text-gray-500">
                        회원권 판매 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
