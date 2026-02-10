'use client';

import React, { useState, useEffect } from 'react';

interface SalesHistoryItem {
  id: number;
  shop_id?: number;
  shop_name?: string;
  booking_date: string;
  booking_time?: string;
  items: Array<{
    service_id?: number;
    service_name?: string;
    designer_id?: number;
    designer_name?: string;
    total_amount?: number;
    memo?: string;
  }>;
  payments: Array<{
    method: string;
    amount: number;
  }>;
  total_amount?: number;
  discount?: number;
  memo?: string;
}

interface SalesHistoryTableProps {
  customerId: number;
  filter?: string;
  onFilterChange?: (filter: string) => void;
  onViewDetail?: (item: SalesHistoryItem) => void;
}

export default function SalesHistoryTable({
  customerId,
  filter = 'all',
  onFilterChange,
  onViewDetail,
}: SalesHistoryTableProps) {
  const [loading, setLoading] = useState(true);
  const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
  const [shops, setShops] = useState<Map<number, string>>(new Map());
  const [services, setServices] = useState<Map<number, string>>(new Map());
  const [designers, setDesigners] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch customer bookings
        const bookingsRes = await fetch(`/api/appointment?customer_id=${customerId}&limit=1000`);
        const bookingsData = await bookingsRes.json();

        if (!bookingsRes.ok) {
          console.error('Failed to fetch bookings');
          return;
        }

        const bookings = bookingsData.bookings || [];

        // Fetch related data
        const [shopsRes, servicesRes, designersRes] = await Promise.all([
          fetch('/api/shops'),
          fetch('/api/services'),
          fetch('/api/staff'),
        ]);

        const shopsData = await shopsRes.json();
        const servicesData = await servicesRes.json();
        const designersData = await designersRes.json();

        // Create maps
        const shopsMap = new Map<number, string>();
        if (shopsRes.ok && shopsData.shops) {
          shopsData.shops.forEach((shop: any) => {
            shopsMap.set(shop.id, shop.name);
          });
        }

        const servicesMap = new Map<number, string>();
        if (servicesRes.ok && servicesData.services) {
          servicesData.services.forEach((service: any) => {
            servicesMap.set(service.id, service.name);
          });
        }

        const designersMap = new Map<number, string>();
        if (designersRes.ok && designersData.staff) {
          designersData.staff.forEach((designer: any) => {
            designersMap.set(designer.id, designer.name);
          });
        }

        setShops(shopsMap);
        setServices(servicesMap);
        setDesigners(designersMap);

        // Fetch payments
        if (bookings.length > 0) {
          const bookingIds = bookings.map((b: any) => b.id);
          const paymentsRes = await fetch(`/api/payments?booking_ids=${bookingIds.join(',')}`);
          const paymentsData = await paymentsRes.json();

          const paymentsMap = new Map<number, any[]>();
          if (paymentsRes.ok && paymentsData.payments) {
            paymentsData.payments.forEach((p: any) => {
              if (p.booking_id) {
                if (!paymentsMap.has(p.booking_id)) {
                  paymentsMap.set(p.booking_id, []);
                }
                paymentsMap.get(p.booking_id)!.push(p);
              }
            });
          }

          // Group bookings by date/time
          const grouped = new Map<string, SalesHistoryItem>();
          bookings.forEach((booking: any) => {
            const key = `${booking.booking_date}_${booking.booking_time || ''}`;
            if (!grouped.has(key)) {
              grouped.set(key, {
                id: booking.id,
                shop_id: booking.shop_id,
                shop_name: shopsMap.get(booking.shop_id),
                booking_date: booking.booking_date,
                booking_time: booking.booking_time,
                items: [],
                payments: paymentsMap.get(booking.id) || [],
                total_amount: booking.total_amount,
                discount: 0,
                memo: booking.memo,
              });
            }
            const item = grouped.get(key)!;
            item.items.push({
              service_id: booking.service_id,
              service_name: servicesMap.get(booking.service_id),
              designer_id: booking.designer_id,
              designer_name: designersMap.get(booking.designer_id),
              total_amount: booking.total_amount,
              memo: booking.memo,
            });
          });

          const history = Array.from(grouped.values());
          // Sort by date descending
          history.sort((a, b) => {
            const dateCompare = b.booking_date.localeCompare(a.booking_date);
            if (dateCompare !== 0) return dateCompare;
            return (b.booking_time || '').localeCompare(a.booking_time || '');
          });

          setSalesHistory(history);
        }
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

  const formatTime = (time?: string) => {
    if (!time) return '';
    const [hour, minute] = time.split(':');
    const hourNum = Number(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
    return `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;
  };

  const formatPaymentMethod = (method: string) => {
    if (method === 'cash') return '현금';
    if (method === 'card') return '카드';
    if (method === 'bank_transfer') return '계좌이체';
    if (method === 'prepaid_pass') return '정액권';
    return method;
  };

  const totalAmount = salesHistory.reduce((sum, item) => {
    return sum + (item.payments.reduce((pSum, p) => pSum + Number(p.amount || 0), 0) || Number(item.total_amount || 0));
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with count and filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-black">총 {salesHistory.length}건</span>
        <select
          value={filter}
          onChange={(e) => {
            if (onFilterChange) {
              onFilterChange(e.target.value);
            }
          }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
        >
          <option value="all">전체</option>
        </select>
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
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">금액</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">결제 방법</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">결제 금액</th>
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
                salesHistory.map((item) => {
                  const paymentAmount = item.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0) || Number(item.total_amount || 0);
                  const discount = Number(item.total_amount || 0) - paymentAmount;
                  const paymentMethods = item.payments.map(p => formatPaymentMethod(p.method)).join(', ') || '-';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{item.shop_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.booking_date} {formatTime(item.booking_time)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.items.map((i, idx) => (
                          <div key={idx}>{i.service_name || '-'}</div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.items.map((i, idx) => (
                          <div key={idx}>{i.designer_name || '-'}</div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">-</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {discount > 0 ? discount.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {Number(item.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{paymentMethods}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {paymentAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.memo || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {onViewDetail && (
                          <button
                            type="button"
                            onClick={() => onViewDetail(item)}
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
