'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useServices } from '@/hooks/useServices';
import { useStaff } from '@/hooks/useStaff';
import { formatTimeString } from '@/lib/utils';

interface BookingHistoryItem {
  id: number;
  shop_id?: number;
  shop_name?: string;
  booking_date: string;
  booking_time?: string;
  service_id?: number;
  service_name?: string;
  designer_id?: number;
  designer_name?: string;
  status?: string;
  created_at?: string;
  memo?: string;
}

interface BookingHistoryTableProps {
  customerId: number;
}

function getStatusLabel(status: string | undefined): { label: string; className: string } {
  const s = (status || '').toUpperCase().trim();
  if (s === 'NOSHOW' || s === 'NO_SHOW') {
    return { label: '노쇼', className: 'text-red-600 font-semibold' };
  }
  if (s === 'CANCELLED' || s === 'CANCELED') {
    return { label: '취소', className: 'text-gray-400' };
  }
  if (s === 'ARRIVED' || s === 'CUSTOMER_ENTERED' || s === 'CUSTOMER_ENTRANCE' || s === 'ENTERED') {
    return { label: '고객입장', className: 'text-purple-600' };
  }
  if (s === 'PAID' || s === 'PAYMENT_COMPLETED' || s === 'PAYMENT_COMPLETE' || s === 'COMPLETED') {
    return { label: '결제완료', className: 'text-blue-600' };
  }
  // Default: BOOKED or unknown
  return { label: '예약완료', className: 'text-gray-900' };
}

export default function BookingHistoryTable({ customerId }: BookingHistoryTableProps) {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingHistoryItem[]>([]);
  const [shops, setShops] = useState<Map<number, string>>(new Map());
  const { services: servicesList } = useServices();
  const { staff: staffList } = useStaff();

  const servicesMap = useMemo(() => {
    const map = new Map<number, string>();
    servicesList.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [servicesList]);

  const designersMap = useMemo(() => {
    const map = new Map<number, string>();
    staffList.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [staffList]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const bookingsRes = await fetch(`/api/appointment?customer_id=${customerId}&limit=1000`);
        const bookingsData = await bookingsRes.json();

        if (!bookingsRes.ok) {
          console.error('Failed to fetch bookings');
          return;
        }

        const rawBookings = bookingsData.bookings || [];

        // Fetch shops
        const shopsRes = await fetch('/api/shops');
        const shopsData = await shopsRes.json();
        const shopsMap = new Map<number, string>();
        if (shopsRes.ok && shopsData.shops) {
          shopsData.shops.forEach((shop: any) => {
            shopsMap.set(shop.id, shop.name);
          });
        }
        setShops(shopsMap);

        const items: BookingHistoryItem[] = rawBookings.map((b: any) => ({
          id: b.id,
          shop_id: b.shop_id,
          shop_name: shopsMap.get(b.shop_id) || b.shop?.name,
          booking_date: b.booking_date,
          booking_time: b.booking_time,
          service_id: b.service_id,
          service_name: servicesMap.get(b.service_id) || b.service?.name,
          designer_id: b.designer_id,
          designer_name: designersMap.get(b.designer_id) || b.designer?.name,
          status: b.status || b.booking_status,
          created_at: b.created_at,
          memo: b.memo,
        }));

        // Sort by booking_date descending
        items.sort((a, b) => {
          const dateCompare = b.booking_date.localeCompare(a.booking_date);
          if (dateCompare !== 0) return dateCompare;
          return (b.booking_time || '').localeCompare(a.booking_time || '');
        });

        setBookings(items);
      } catch (error) {
        console.error('Error fetching booking history:', error);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchData();
    }
  }, [customerId, servicesMap, designersMap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-7.5">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with count */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-black">총 {bookings.length}건의 예약</span>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">지점</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">예약일</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">예약시간</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">예약항목</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">자원명</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">예약상태</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">등록일</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">메모</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center text-sm text-gray-500">
                    예약 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                bookings.map((item) => {
                  const statusInfo = getStatusLabel(item.status);
                  const createdDate = item.created_at ? item.created_at.split('T')[0] : '-';
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{item.shop_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.booking_date}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatTimeString(item.booking_time)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.service_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.designer_name ? `${item.designer_name}선생님` : '-'}</td>
                      <td className={`px-4 py-3 text-sm ${statusInfo.className}`}>{statusInfo.label}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{createdDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.memo || '-'}</td>
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
