'use client';

import React, { useState, useEffect } from 'react';

interface SalesDetailItem {
  item_type: 'service' | 'product' | 'prepaid';
  item_name: string;
  unit_price: number;
  quantity: number;
  discount: number;
  amount: number;
  manager: string | null;
  sales_classification: string | null;
  prepaid_deduction: number;
}

interface SalesDetailData {
  id: number;
  customer_id: number;
  customer_name: string;
  sales_date: string;
  sales_time: string;
  sales_amount: number;
  discount_amount: number;
  total_amount: number;
  cash_amount: number;
  card_amount: number;
  bank_transfer_amount: number;
  point_accumulation: number;
  memo: string | null;
  items: SalesDetailItem[];
  created_by?: string;
  created_at?: string;
}

interface SalesDetailModalProps {
  isOpen: boolean;
  salesData: SalesDetailData | null;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSendStatement?: () => void;
}

export default function SalesDetailModal({
  isOpen,
  salesData,
  onClose,
  onEdit,
  onDelete,
  onSendStatement,
}: SalesDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [detailData, setDetailData] = useState<SalesDetailData | null>(null);

  useEffect(() => {
    if (isOpen && salesData) {
      // If salesData has id, fetch full details from API
      if (salesData.id) {
        fetchSalesDetail(salesData.id);
      } else {
        // Use provided data directly
        setDetailData(salesData);
      }
    }
  }, [isOpen, salesData]);

  const fetchSalesDetail = async (salesId: number) => {
    try {
      setLoading(true);
      // TODO: Create API endpoint to fetch sales detail
      // For now, use the provided data
      setDetailData(salesData);
    } catch (error) {
      console.error('Error fetching sales detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const formattedDate = `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}.`;
    return formattedDate;
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
  if (!data) {
    console.log('SalesDetailModal: No data available', { isOpen, salesData, detailData });
    return null;
  }

  const totalPayment = (data.cash_amount || 0) + (data.card_amount || 0) + (data.bank_transfer_amount || 0);
  const amountToReceive = data.total_amount - totalPayment;

  return (
    <div
      className="fixed inset-0 z-[100012] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
      style={{ pointerEvents: 'auto', zIndex: 100012 }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col relative z-[100013]"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto', zIndex: 100013 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-black">판매 상세</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Customer Info */}
        <div className="p-6 border-b border-gray-200">
          <p className="text-sm font-medium text-gray-900">{data.customer_name}</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div>
              {/* Sales Items Table */}
              <div className="mb-6">
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
                            <td className="py-3 px-4 text-sm text-gray-900">{Number(item.unit_price || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 text-sm text-gray-900">{item.quantity || 1}</td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {item.discount > 0 ? Number(item.discount).toLocaleString() : ''}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">{Number(item.amount || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 text-sm text-gray-900">{item.manager || '-'}</td>
                            <td className="py-3 px-4 text-sm text-gray-900">{item.sales_classification || '-'}</td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {item.prepaid_deduction > 0 ? item.prepaid_deduction.toLocaleString() : ''}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-sm text-gray-500">
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
                      {Number(data.sales_amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">할인 금액</span>
                    <span className="text-sm font-medium text-gray-900">
                      {Number(data.discount_amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">합계</span>
                    <span className="text-sm font-medium text-gray-900">
                      {Number(data.total_amount || 0).toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Payment Amounts Display */}
                  {(data.cash_amount > 0 || data.card_amount > 0 || data.bank_transfer_amount > 0) && (
                    <div className="space-y-2 pt-1">
                      {data.cash_amount > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">현금</span>
                          <span className="font-medium text-gray-900">
                            {Number(data.cash_amount).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {data.card_amount > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">카드</span>
                          <span className="font-medium text-gray-900">
                            {Number(data.card_amount).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {data.bank_transfer_amount > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">계좌이체</span>
                          <span className="font-medium text-gray-900">
                            {Number(data.bank_transfer_amount).toLocaleString()}
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
                    <span className="text-sm font-semibold text-red-600">{amountToReceive.toLocaleString()}</span>
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
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 cursor-not-allowed"
                      />
                      <input
                        type="text"
                        value={formatTime(data.sales_time)}
                        readOnly
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Memo and Action Buttons */}
                <div className="flex flex-col justify-between">
                  {/* Memo */}
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

                  {/* Registrant Info */}
                  {data.created_by && data.created_at && (
                    <div className="text-xs text-gray-500 mb-4">
                      등록자 {data.created_by} {formatDateTime(data.created_at)}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={onEdit}
                        className="w-full px-5 py-2 rounded-lg text-sm font-semibold text-white bg-black hover:bg-gray-800"
                      >
                        수정
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={onDelete}
                        className="w-full px-5 py-2 rounded-lg text-sm font-semibold text-white bg-black hover:bg-gray-800"
                      >
                        삭제
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full px-5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                      닫기
                    </button>
                    {onSendStatement && (
                      <button
                        type="button"
                        onClick={onSendStatement}
                        className="w-full px-5 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                      >
                        판매내역서 발송
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
