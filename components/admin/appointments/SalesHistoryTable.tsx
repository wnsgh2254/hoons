'use client';

import { useAppointmentRequest } from '@/lib/appointment-request';
import React, { useState, useEffect } from 'react';
import { Select, Badge } from '@/components/ui';
import { formatPaymentMethod, formatTimeString, formatAudNumber } from '@/lib/utils';
import {
  buildSaleHistoryPayments,
  getSaleLineGrossAmount,
} from '@/lib/sales-payment-utils';

interface SalesItemRecord {
  id: number;
  item_type: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  discount: number;
  amount: number;
  manager: string | null;
  sales_classification: string | null;
  prepaid_deduction?: number;
}

interface SalesRecord {
  id: number;
  _isRefund?: boolean;
  customer_id: number;
  shop_id?: number | null;
  sales_date: string;
  sales_time: string;
  sales_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string | null;
  cash_amount: number;
  card_amount: number;
  bank_transfer_amount: number;
  memo: string | null;
  sales_items: SalesItemRecord[];
}

interface SalesHistoryTableProps {
  customerId: number;
  filter?: string;
  onFilterChange?: (filter: string) => void;
  onViewDetail?: (item: any) => void;
}

export default function SalesHistoryTable({
  customerId,
  filter = 'all',
  onFilterChange,
  onViewDetail,
}: SalesHistoryTableProps) {
  const request = useAppointmentRequest();
  const [loading, setLoading] = useState(true);
  const [salesHistory, setSalesHistory] = useState<SalesRecord[]>([]);
  const [shops, setShops] = useState<any[]>([]);

  useEffect(() => {
    request('/api/shops').then(r => r.json()).then(d => setShops(d.shops || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [salesRes, refundsRes] = await Promise.all([
          request(`/api/sales?customer_id=${customerId}`),
          request(`/api/refunds?customer_id=${customerId}`),
        ]);

        const salesData = await salesRes.json();
        const refundsData = await refundsRes.json();

        const sales: SalesRecord[] = (salesData.sales || []).map((s: any) => ({
          ...s,
          _isRefund: false,
        }));

        const refunds: SalesRecord[] = (refundsData.refunds || []).map((r: any) => ({
          id: r.id,
          _isRefund: true,
          customer_id: r.customer_id,
          shop_id: r.shop_id || null,
          sales_date: r.refund_date,
          sales_time: r.refund_time,
          sales_amount: r.total_amount,
          discount_amount: 0,
          total_amount: r.total_amount,
          payment_method: null,
          cash_amount: r.cash_amount || 0,
          card_amount: r.card_amount || 0,
          bank_transfer_amount: r.bank_transfer_amount || 0,
          memo: r.memo,
          sales_items: (r.refund_items || []).map((ri: any) => ({
            id: ri.id,
            item_type: ri.item_type,
            item_name: ri.item_name,
            unit_price: ri.unit_price,
            quantity: ri.quantity,
            discount: 0,
            amount: ri.amount,
            manager: ri.manager,
            sales_classification: null,
          })),
        }));

        const merged = [...sales, ...refunds].sort((a, b) => {
          const dateCompare = b.sales_date.localeCompare(a.sales_date);
          if (dateCompare !== 0) return dateCompare;
          return (b.sales_time || '').localeCompare(a.sales_time || '');
        });

        setSalesHistory(merged);
      } catch (error) {
        console.error('Error fetching sales history:', error);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchData();
    }
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const getShopName = (shopId: number | null | undefined) => {
    if (!shopId) return '-';
    const shop = shops.find((s: any) => s.id === shopId);
    return shop?.name || '-';
  };

  const getHistoryPayments = (sale: SalesRecord) =>
    buildSaleHistoryPayments(sale, sale.sales_items);

  const getPaymentMethodLabel = (sale: SalesRecord) => {
    const methods = getHistoryPayments(sale).map((p) => formatPaymentMethod(p.method));
    if (methods.length === 0 && sale.payment_method) {
      return formatPaymentMethod(sale.payment_method);
    }
    return methods.join(', ') || '-';
  };

  const renderPaymentAmount = (sale: SalesRecord, isRefund: boolean) => {
    const paymentLines = getHistoryPayments(sale);
    const grossFallback = (sale.sales_items || []).reduce(
      (sum, item) => sum + getSaleLineGrossAmount(item),
      0,
    );

    if (paymentLines.length === 0) {
      const fallback = grossFallback > 0 ? grossFallback : Number(sale.total_amount || 0);
      const formatted = formatAudNumber(fallback);
      return isRefund ? `-${formatted}` : formatted;
    }

    if (paymentLines.length === 1) {
      const formatted = formatAudNumber(Math.abs(paymentLines[0].amount));
      const prefix = isRefund || paymentLines[0].amount < 0 ? '-' : '';
      return `${prefix}${formatted}`;
    }

    return (
      <div className={`flex flex-col gap-0.5 items-end ${isRefund ? 'text-red-500 font-medium' : ''}`}>
        {paymentLines.map(({ method, amount }) => {
          const formatted = formatAudNumber(Math.abs(amount));
          const prefix = isRefund || amount < 0 ? '-' : '';
          return (
            <div key={method} className="whitespace-nowrap">
              {formatPaymentMethod(method)} {prefix}{formatted}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with count and filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-black">총 {salesHistory.length}건</span>
        <Select
          value={filter}
          onChange={(e) => {
            if (onFilterChange) {
              onFilterChange(e.target.value);
            }
          }}
          options={[{ value: 'all', label: '전체' }]}
        />
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">지점</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">날짜</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">판매 항목</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">담당자</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">영업 구분</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">할인</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">금액</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">결제 방법</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">결제 금액</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">메모</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">상세</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesHistory.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-4 text-center text-sm text-gray-500">
                    판매 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                salesHistory.map((sale) => {
                  const items = sale.sales_items || [];
                  const isRefund = sale._isRefund;

                  return (
                    <tr key={`${isRefund ? 'r' : 's'}-${sale.id}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {getShopName(sale.shop_id)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {sale.sales_date} {formatTimeString(sale.sales_time)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {items.length > 0
                          ? items.map((i, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                {isRefund && idx === 0 && (
                                  <Badge variant="error" size="sm">환불</Badge>
                                )}
                                <span>{i.item_name || '-'}</span>
                              </div>
                            ))
                          : isRefund
                            ? <Badge variant="error" size="sm">환불</Badge>
                            : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {items.length > 0
                          ? items.map((i, idx) => (
                              <div key={idx}>{i.manager || '-'}</div>
                            ))
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {items.length > 0
                          ? items.map((i, idx) => (
                              <div key={idx}>{i.sales_classification || '-'}</div>
                            ))
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {sale.discount_amount > 0 ? formatAudNumber(Number(sale.discount_amount)) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right ${isRefund ? 'text-red-500 font-medium' : 'text-gray-900'}`}>
                        {(() => {
                          const gross =
                            items.reduce((sum, i) => sum + getSaleLineGrossAmount(i), 0) ||
                            Number(sale.sales_amount || 0);
                          return isRefund ? `-${formatAudNumber(gross)}` : formatAudNumber(gross);
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {getPaymentMethodLabel(sale)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right ${isRefund ? 'text-red-500 font-medium' : 'text-gray-900'}`}>
                        {renderPaymentAmount(sale, !!isRefund)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{sale.memo || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {onViewDetail && !isRefund && (
                          <button
                            type="button"
                            onClick={() => onViewDetail(sale)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            보기
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
