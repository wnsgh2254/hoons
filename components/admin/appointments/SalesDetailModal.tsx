'use client';

import React, { useState, useEffect } from 'react';
import type { SalesDetailItem, SalesDetailData } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Z } from '@/lib/constants';
import { formatAudAmount } from '@/lib/utils';
import {
  netDueAfterDeposit,
  normalizeBookingDepositPaid,
} from '@/lib/booking-deposit-paid';
import { mapSaleRecordToDetailData } from '@/lib/sales-detail-mapper';
import { resolveCashChangeDisplay } from '@/lib/sales-cash-payment';
import { buildSaleHistoryPayments } from '@/lib/sales-payment-utils';
import { formatPaymentMethod } from '@/lib/utils';

interface SalesDetailModalProps {
  isOpen: boolean;
  salesData: SalesDetailData | null;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function SalesDetailModal({
  isOpen,
  salesData,
  onClose,
  onEdit,
  onDelete,
}: SalesDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [detailData, setDetailData] = useState<SalesDetailData | null>(null);

  useEffect(() => {
    if (isOpen && salesData) {
      if (salesData.id) {
        fetchSalesDetail(salesData.id);
      } else {
        setDetailData(salesData);
      }
    }
  }, [isOpen, salesData]);

  const fetchSalesDetail = async (salesId: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sales/${salesId}`);
      const payload = await res.json();
      if (!res.ok || !payload.sale) {
        throw new Error(payload.error || '판매를 불러오지 못했습니다.');
      }
      setDetailData(
        mapSaleRecordToDetailData(payload.sale, salesData?.customer_name || ''),
      );
    } catch (error) {
      console.error('Error fetching sales detail:', error);
      setDetailData(salesData);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}.`;
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':');
    const hourNum = Number(hour);
    const ampm = hourNum >= 12 ? '오후' : '오전';
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
    return `${ampm} ${displayHour}:${minute}`;
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const formattedTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return `${formattedDate} ${formattedTime}`;
  };

  if (!isOpen) return null;

  const data = detailData || salesData;
  if (!data) return null;

  const grossTotal = Math.max(0, Number(data.total_amount || 0));
  const paymentLines = buildSaleHistoryPayments(data, data.items || []);
  const rawMethod = (data.payment_method || '').toLowerCase();
  const hasExplicitAmount = paymentLines.length > 0;
  const legacyFallbackAmount =
    !hasExplicitAmount &&
    (rawMethod === 'cash' || rawMethod === 'card' || rawMethod === 'bank_transfer') &&
    grossTotal > 0
      ? grossTotal
      : 0;
  const displayLines = hasExplicitAmount
    ? paymentLines
    : legacyFallbackAmount > 0
      ? [{ method: rawMethod as 'cash' | 'card' | 'bank_transfer', amount: legacyFallbackAmount }]
      : [];
  const totalPayment = displayLines.reduce((sum, line) => sum + line.amount, 0);
  const depositCredit = normalizeBookingDepositPaid(data.booking_deposit_paid);
  const netDue = netDueAfterDeposit(grossTotal, depositCredit);
  const amountToReceive = Math.max(0, netDue - totalPayment);
  const { cashDisplay, changeDue } = resolveCashChangeDisplay(
    Number(data.cash_amount || 0),
    data.cash_tendered,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="판매 상세"
      zIndex={Z.MODAL_DETAIL}
      maxWidth="max-w-6xl"
      className="max-h-[90vh] flex flex-col overflow-hidden"
      bodyClassName="flex-1 overflow-y-auto min-h-0"
    >
      {/* Customer Info Header */}
      <div className="bg-gray-100 -mx-5.5 -mt-5.5 px-5.5 py-3 mb-5.5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-gray-900">{data.customer_name}</p>
          <span className="text-xs text-gray-400">({data.customer_id})</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-7.5">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div>
            {/* Sales Items Table */}
            <div className="mb-5.5">
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">판매 항목</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">단가</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">수량</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">할인</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">금액</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">담당자</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">영업 구분</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">정액권 차감</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items && data.items.length > 0 ? (
                      data.items.map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="py-3 px-4 text-sm text-gray-900">{item.item_name || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{formatAudAmount(Number(item.unit_price || 0))}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{item.quantity || 1}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {item.discount > 0 ? formatAudAmount(Number(item.discount)) : ''}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900">{formatAudAmount(Number(item.amount || 0))}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{item.manager || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{item.sales_classification || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {item.prepaid_deduction > 0 ? formatAudAmount(Number(item.prepaid_deduction)) : ''}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-7.5 text-center text-sm text-gray-500">
                          내역이 없습니다
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Section */}
            <div className="grid grid-cols-3 gap-6">
              {/* Left: Payment Summary */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">판매 금액</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatAudAmount(Number(data.sales_amount || 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">할인 금액</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatAudAmount(Number(data.discount_amount || 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">합계</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatAudAmount(Number(data.total_amount || 0))}
                  </span>
                </div>

                {depositCredit > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">디파짓 (납부됨)</span>
                    <span className="text-sm font-medium text-emerald-700">
                      {formatAudAmount(depositCredit)}
                    </span>
                  </div>
                )}

                {displayLines.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {displayLines.map(({ method, amount }) => {
                      const lineAmount =
                        method === 'cash' ? cashDisplay : amount;
                      return (
                        <div key={method} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">{formatPaymentMethod(method)}</span>
                          <span
                            className={`font-medium ${lineAmount < 0 ? 'text-red-600' : 'text-gray-900'}`}
                          >
                            {lineAmount < 0 ? '-' : ''}
                            {formatAudAmount(Math.abs(lineAmount))}
                          </span>
                        </div>
                      );
                    })}
                    {changeDue > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-amber-800">거스름돈</span>
                        <span className="font-medium text-amber-900">
                          {formatAudAmount(changeDue)}
                        </span>
                      </div>
                    )}
                    {totalPayment > 0 && data.created_at && (
                      <div className="text-xs text-gray-500 mt-2">
                        [결제 일시 {formatDateTime(data.created_at)}]
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">받을 금액</span>
                  <span
                    className={`text-sm font-semibold ${amountToReceive > 0 ? 'text-red-600' : 'text-gray-900'}`}
                  >
                    {formatAudAmount(amountToReceive)}
                  </span>
                </div>
              </div>

              {/* Middle: Sales Date & Time */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">판매일</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formatDate(data.sales_date)}
                      readOnly
                      className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 cursor-not-allowed"
                    />
                    <input
                      type="text"
                      value={formatTime(data.sales_time)}
                      readOnly
                      className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Edit History */}
                {data.edit_history && data.edit_history.length > 0 && (
                  <div className="space-y-1">
                    {data.edit_history.map((timestamp, idx) => (
                      <p key={idx} className="text-xs text-gray-400">
                        {formatDateTime(timestamp)} 수정됨
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Memo and Action Buttons */}
              <div className="flex flex-col justify-between">
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-500 mb-2">메모</label>
                  <textarea
                    value={data.memo || ''}
                    readOnly
                    rows={4}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 cursor-not-allowed resize-none"
                    placeholder="메모가 없습니다"
                  />
                </div>

                {data.created_by && data.created_at && (
                  <div className="text-xs text-gray-500 mb-4">
                    등록자 {data.created_by} {formatDateTime(data.created_at)}
                  </div>
                )}

                <div className="space-y-2">
                  {onEdit && (
                    <Button onClick={onEdit} className="w-full">수정</Button>
                  )}
                  {onDelete && (
                    <Button variant="outline" onClick={onDelete} className="w-full">삭제</Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
