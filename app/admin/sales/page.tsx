'use client';

import React, { useEffect, useState } from 'react';
import AdminTopNav from '@/components/AdminTopNav';

// Comment: Get today's date string in Sydney timezone (YYYY-MM-DD)
function getSydneyToday(): string {
  const sydney = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
  );
  const year = sydney.getFullYear();
  const month = String(sydney.getMonth() + 1).padStart(2, '0');
  const day = String(sydney.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type TabType = 'total' | 'byStaff' | 'byItem';
type DateMode = 'daily' | 'period';

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('total');
  const [dateMode, setDateMode] = useState<DateMode>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(getSydneyToday());
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>('');
  const [selectedItemType, setSelectedItemType] = useState<string>('service');
  const [designers, setDesigners] = useState<any[]>([]);

  // Comment: Fetch designers list
  useEffect(() => {
    const fetchDesigners = async () => {
      try {
        const res = await fetch('/api/staff');
        const data = await res.json();
        if (data.staff) {
          setDesigners(data.staff);
        }
      } catch (error) {
        console.error('Error fetching designers:', error);
      }
    };
    fetchDesigners();
  }, []);

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex flex-col">
      <AdminTopNav />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-white">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-1">
              <h2 className="text-3xl font-bold tracking-tight text-black">매출 관리</h2>
              <p className="text-gray-500 text-sm">전체 매출, 직원별 매출, 항목별 매출을 확인하세요.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('total')}
                className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === 'total'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-black'
                }`}
              >
                전체 매출
              </button>
              <button
                onClick={() => setActiveTab('byStaff')}
                className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === 'byStaff'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-black'
                }`}
              >
                직원별 매출
              </button>
              <button
                onClick={() => setActiveTab('byItem')}
                className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === 'byItem'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-black'
                }`}
              >
                항목별 매출
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'total' && (
              <TotalSalesTab
                dateMode={dateMode}
                setDateMode={setDateMode}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
              />
            )}
            {activeTab === 'byStaff' && (
              <ByStaffSalesTab
                dateMode={dateMode}
                setDateMode={setDateMode}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                selectedDesignerId={selectedDesignerId}
                setSelectedDesignerId={setSelectedDesignerId}
                designers={designers}
              />
            )}
            {activeTab === 'byItem' && (
              <ByItemSalesTab
                dateMode={dateMode}
                setDateMode={setDateMode}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                selectedDesignerId={selectedDesignerId}
                setSelectedDesignerId={setSelectedDesignerId}
                selectedItemType={selectedItemType}
                setSelectedItemType={setSelectedItemType}
                designers={designers}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Comment: Total Sales Tab Component
function TotalSalesTab({
  dateMode,
  setDateMode,
  selectedDate,
  setSelectedDate,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: {
  dateMode: DateMode;
  setDateMode: (mode: DateMode) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<any>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(true);

  const [shouldFetch, setShouldFetch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (dateMode === 'daily' && !selectedDate) {
      alert('날짜를 선택해주세요.');
      return;
    }
    if (dateMode === 'period' && (!startDate || !endDate)) {
      alert('시작 날짜와 종료 날짜를 선택해주세요.');
      return;
    }
    setHasSearched(true);
    setShouldFetch(true);
  };

  useEffect(() => {
    if (!shouldFetch) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (dateMode === 'daily') {
          params.append('start_date', selectedDate);
          params.append('end_date', selectedDate);
        } else {
          params.append('start_date', startDate);
          params.append('end_date', endDate);
        }

        // Comment: Fetch sales data from API
        const res = await fetch(`/api/sales/total?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to fetch sales data');
        }
        const data = await res.json();
        setSalesData(data);
      } catch (error) {
        console.error('Error fetching sales data:', error);
        setSalesData(null);
      } finally {
        setLoading(false);
        setShouldFetch(false);
      }
    };

    fetchData();
  }, [shouldFetch, dateMode, selectedDate, startDate, endDate]);

  const handleDateChange = (direction: 'prev' | 'next') => {
    if (dateMode === 'daily') {
      const date = new Date(selectedDate);
      if (direction === 'prev') {
        date.setDate(date.getDate() - 1);
      } else {
        date.setDate(date.getDate() + 1);
      }
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={dateMode === 'daily'}
                onChange={() => setDateMode('daily')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">일별</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={dateMode === 'period'}
                onChange={() => setDateMode('period')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">기간</span>
            </label>
          </div>

          {dateMode === 'daily' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDateChange('prev')}
                className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                &lt;
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <button
                onClick={() => handleDateChange('next')}
                className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                &gt;
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          )}

          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">search</span>
            검색
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : salesData ? (
        <div className="flex flex-col gap-6">
          {/* 판매 합계 (회원권 판매 기준) */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-black">판매 합계 (회원권 판매 기준)</h3>
                <button
                  onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">
                    {showPaymentDetails ? 'visibility_off' : 'visibility'}
                  </span>
                  결제 방법별 상세보기
                </button>
              </div>
            </div>
            <SalesSummaryTable showPaymentDetails={showPaymentDetails} salesData={salesData} />
          </div>

          {/* 입금 합계 (결제일 기준) */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-black">입금 합계 (결제일 기준)</h3>
            </div>
            <DepositSummaryTable depositData={salesData?.depositSummary} />
          </div>

          {/* 매출 합계 (회원권 차감 기준) */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-black">매출 합계 (회원권 차감 기준)</h3>
            </div>
            <RevenueSummaryTable revenueData={salesData?.revenueSummary} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Comment: Sales Summary Table Component
function SalesSummaryTable({
  showPaymentDetails,
  salesData,
}: {
  showPaymentDetails: boolean;
  salesData: any;
}) {
  // Comment: Use actual data or default to empty
  const data = salesData || {
    sales: {
      service: { quantity: 0, amount: 0 },
      product: { quantity: 0, amount: 0 },
      membership: { quantity: 0, amount: 0 },
      ticket: { quantity: 0, amount: 0 },
      total: 0,
    },
    refund: {
      service: { quantity: 0, amount: 0 },
      product: { quantity: 0, amount: 0 },
      membership: { quantity: 0, amount: 0 },
      ticket: { quantity: 0, amount: 0 },
      total: 0,
    },
    paymentDetails: {
      cash: {
        service: 0,
        product: 0,
        membership: 0,
        ticket: 0,
        total: 0,
      },
      card: {
        service: 0,
        product: 0,
        membership: 0,
        ticket: 0,
        total: 0,
      },
    },
  };

  const salesData_actual = salesData
    ? {
        sales: salesData.sales || data.sales,
        refund: salesData.refund || data.refund,
        paymentDetails: salesData.paymentDetails || data.paymentDetails,
      }
    : data;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left font-semibold text-gray-700">유형</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700" colSpan={2}>
              서비스
            </th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700" colSpan={2}>
              제품
            </th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700" colSpan={2}>
              정액권
            </th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700" colSpan={2}>
              티켓
            </th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">합계</th>
          </tr>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th></th>
            <th className="px-4 py-2 text-center text-xs text-gray-600">수량</th>
            <th className="px-4 py-2 text-center text-xs text-gray-600">금액</th>
            <th className="px-4 py-2 text-center text-xs text-gray-600">수량</th>
            <th className="px-4 py-2 text-center text-xs text-gray-600">금액</th>
            <th className="px-4 py-2 text-center text-xs text-gray-600">수량</th>
            <th className="px-4 py-2 text-center text-xs text-gray-600">금액</th>
            <th className="px-4 py-2 text-center text-xs text-gray-600">수량</th>
            <th className="px-4 py-2 text-center text-xs text-gray-600">금액</th>
            <th className="px-4 py-2 text-center text-xs text-gray-600">금액</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="px-4 py-3 font-medium">판매</td>
            <td className="px-4 py-3 text-center">{salesData_actual.sales.service.quantity}</td>
            <td className="px-4 py-3 text-center">{salesData_actual.sales.service.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{salesData_actual.sales.product.quantity}</td>
            <td className="px-4 py-3 text-center">{salesData_actual.sales.product.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{salesData_actual.sales.membership.quantity}</td>
            <td className="px-4 py-3 text-center">{salesData_actual.sales.membership.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{salesData_actual.sales.ticket.quantity}</td>
            <td className="px-4 py-3 text-center">{salesData_actual.sales.ticket.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center font-semibold">{salesData_actual.sales.total.toLocaleString()}</td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="px-4 py-3 font-medium">환불</td>
            <td className="px-4 py-3 text-center">{salesData_actual.refund.service.quantity}</td>
            <td className="px-4 py-3 text-center">{salesData_actual.refund.service.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{salesData_actual.refund.product.quantity}</td>
            <td className="px-4 py-3 text-center">{salesData_actual.refund.product.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{salesData_actual.refund.membership.quantity}</td>
            <td className="px-4 py-3 text-center">{salesData_actual.refund.membership.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{salesData_actual.refund.ticket.quantity}</td>
            <td className="px-4 py-3 text-center">{salesData_actual.refund.ticket.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center font-semibold">{salesData_actual.refund.total.toLocaleString()}</td>
          </tr>
          <tr className="bg-green-50 border-b-2 border-green-200">
            <td className="px-4 py-3 font-bold">판매 합계</td>
            <td className="px-4 py-3 text-center font-semibold">{salesData_actual.sales.service.quantity}</td>
            <td className="px-4 py-3 text-center font-semibold">{salesData_actual.sales.service.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center font-semibold">{salesData_actual.sales.product.quantity}</td>
            <td className="px-4 py-3 text-center font-semibold">{salesData_actual.sales.product.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center font-semibold"></td>
            <td className="px-4 py-3 text-center font-semibold">{salesData_actual.sales.membership.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center font-semibold"></td>
            <td className="px-4 py-3 text-center font-semibold"></td>
            <td className="px-4 py-3 text-center font-bold">{salesData_actual.sales.total.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      {showPaymentDetails && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">결제 방법별 상세 보기</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-2 text-left font-semibold text-gray-700">결제 방법</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">서비스</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">제품</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">정액권</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">티켓</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">합계</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2 font-medium">현금</td>
                <td className="px-4 py-2 text-center">{salesData_actual.paymentDetails.cash.service.toLocaleString()}</td>
                <td className="px-4 py-2 text-center">{salesData_actual.paymentDetails.cash.product.toLocaleString()}</td>
                <td className="px-4 py-2 text-center">{salesData_actual.paymentDetails.cash.membership.toLocaleString()}</td>
                <td className="px-4 py-2 text-center">{salesData_actual.paymentDetails.cash.ticket.toLocaleString()}</td>
                <td className="px-4 py-2 text-center font-semibold">{salesData_actual.paymentDetails.cash.total.toLocaleString()}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2 font-medium">카드</td>
                <td className="px-4 py-2 text-center">{salesData_actual.paymentDetails.card.service.toLocaleString()}</td>
                <td className="px-4 py-2 text-center">{salesData_actual.paymentDetails.card.product.toLocaleString()}</td>
                <td className="px-4 py-2 text-center">{salesData_actual.paymentDetails.card.membership.toLocaleString()}</td>
                <td className="px-4 py-2 text-center">{salesData_actual.paymentDetails.card.ticket.toLocaleString()}</td>
                <td className="px-4 py-2 text-center font-semibold">{salesData_actual.paymentDetails.card.total.toLocaleString()}</td>
              </tr>
              <tr className="bg-gray-50 border-t-2 border-gray-300">
                <td className="px-4 py-2 font-bold">합계</td>
                <td className="px-4 py-2 text-center font-semibold">{salesData_actual.sales.service.amount.toLocaleString()}</td>
                <td className="px-4 py-2 text-center font-semibold">{salesData_actual.sales.product.amount.toLocaleString()}</td>
                <td className="px-4 py-2 text-center font-semibold">{salesData_actual.sales.membership.amount.toLocaleString()}</td>
                <td className="px-4 py-2 text-center font-semibold">{salesData_actual.sales.ticket.amount.toLocaleString()}</td>
                <td className="px-4 py-2 text-center font-bold">{salesData_actual.sales.total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Comment: Deposit Summary Table Component
function DepositSummaryTable({ depositData }: { depositData?: any }) {
  // Comment: Use actual data or default to empty
  const data = depositData || {
    cash: {
      deposit: 0,
      depositRefund: 0,
      paymentAtSale: 0,
      uncollectedDeposit: 0,
      refund: 0,
      total: 0,
    },
    card: {
      deposit: 0,
      depositRefund: 0,
      paymentAtSale: 0,
      uncollectedDeposit: 0,
      refund: 0,
      total: 0,
    },
  };

  const depositData_actual = depositData || data;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left font-semibold text-gray-700">결제 방법</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">예약금</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">예약금 환불</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">판매시 결제</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">미수 입금</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">환불</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">합계</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="px-4 py-3 font-medium">현금</td>
            <td className="px-4 py-3 text-center">{depositData_actual.cash.deposit.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{depositData_actual.cash.depositRefund.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{depositData_actual.cash.paymentAtSale.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{depositData_actual.cash.uncollectedDeposit.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{depositData_actual.cash.refund.toLocaleString()}</td>
            <td className="px-4 py-3 text-center font-semibold">{depositData_actual.cash.total.toLocaleString()}</td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="px-4 py-3 font-medium">카드</td>
            <td className="px-4 py-3 text-center">{depositData_actual.card.deposit.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{depositData_actual.card.depositRefund.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{depositData_actual.card.paymentAtSale.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{depositData_actual.card.uncollectedDeposit.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{depositData_actual.card.refund.toLocaleString()}</td>
            <td className="px-4 py-3 text-center font-semibold">{depositData_actual.card.total.toLocaleString()}</td>
          </tr>
          <tr className="bg-blue-50 border-b-2 border-blue-200">
            <td className="px-4 py-3 font-bold">입금 합계</td>
            <td className="px-4 py-3 text-center font-semibold">
              {(depositData_actual.cash.deposit + depositData_actual.card.deposit).toLocaleString()}
            </td>
            <td className="px-4 py-3 text-center font-semibold">
              {(depositData_actual.cash.depositRefund + depositData_actual.card.depositRefund).toLocaleString()}
            </td>
            <td className="px-4 py-3 text-center font-semibold">
              {(depositData_actual.cash.paymentAtSale + depositData_actual.card.paymentAtSale).toLocaleString()}
            </td>
            <td className="px-4 py-3 text-center font-semibold">
              {(depositData_actual.cash.uncollectedDeposit + depositData_actual.card.uncollectedDeposit).toLocaleString()}
            </td>
            <td className="px-4 py-3 text-center font-semibold">
              {(depositData_actual.cash.refund + depositData_actual.card.refund).toLocaleString()}
            </td>
            <td className="px-4 py-3 text-center font-bold">
              {(depositData_actual.cash.total + depositData_actual.card.total).toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-600">* 미수 발생 합계: 0</p>
      </div>
    </div>
  );
}

// Comment: Revenue Summary Table Component
function RevenueSummaryTable({ revenueData }: { revenueData?: any }) {
  // Comment: Use actual data or default to empty
  const data = revenueData || {
      sales: {
        service: { quantity: 0, amount: 0 },
        product: { quantity: 0, amount: 0 },
        total: 0,
      },
      membershipDeduction: {
        service: { quantity: 0, amount: 0 },
        product: { quantity: 0, amount: 0 },
        total: 0,
      },
      ticketDeduction: {
        service: { quantity: 0, amount: 0 },
        product: { quantity: 0, amount: 0 },
        total: 0,
      },
      total: {
        service: { amount: 0 },
        product: { amount: 0 },
        total: 0,
      },
      customers: {
        service: { quantity: 0, amount: 0 },
        product: { quantity: 0, amount: 0 },
        total: { quantity: 0, amount: 0 },
      },
    };

  const revenueData_actual = revenueData || data;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left font-semibold text-gray-700">유형</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700" colSpan={2}>
              서비스
            </th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700" colSpan={2}>
              제품
            </th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">합계</th>
          </tr>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th></th>
            <th className="px-4 py-2 text-center text-xs text-gray-600">수량</th>
            <th className="px-4 py-2 text-center text-xs text-gray-600">금액</th>
            <th className="px-4 py-2 text-center text-xs text-gray-600">수량</th>
            <th className="px-4 py-2 text-center text-xs text-gray-600">금액</th>
            <th className="px-4 py-2 text-center text-xs text-gray-600">금액</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="px-4 py-3 font-medium">판매</td>
            <td className="px-4 py-3 text-center">{revenueData_actual.sales.service.quantity}</td>
            <td className="px-4 py-3 text-center">{revenueData_actual.sales.service.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{revenueData_actual.sales.product.quantity}</td>
            <td className="px-4 py-3 text-center">{revenueData_actual.sales.product.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center font-semibold">{revenueData_actual.sales.total.toLocaleString()}</td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="px-4 py-3 font-medium">정액권 차감</td>
            <td className="px-4 py-3 text-center">{revenueData_actual.membershipDeduction.service.quantity}</td>
            <td className="px-4 py-3 text-center">{revenueData_actual.membershipDeduction.service.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{revenueData_actual.membershipDeduction.product.quantity}</td>
            <td className="px-4 py-3 text-center">{revenueData_actual.membershipDeduction.product.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center font-semibold">{revenueData_actual.membershipDeduction.total.toLocaleString()}</td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="px-4 py-3 font-medium">티켓 차감</td>
            <td className="px-4 py-3 text-center">{revenueData_actual.ticketDeduction.service.quantity}</td>
            <td className="px-4 py-3 text-center">{revenueData_actual.ticketDeduction.service.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">{revenueData_actual.ticketDeduction.product.quantity}</td>
            <td className="px-4 py-3 text-center">{revenueData_actual.ticketDeduction.product.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center font-semibold">{revenueData_actual.ticketDeduction.total.toLocaleString()}</td>
          </tr>
          <tr className="bg-yellow-50 border-b-2 border-yellow-200">
            <td className="px-4 py-3 font-bold">매출 합계</td>
            <td className="px-4 py-3 text-center font-semibold"></td>
            <td className="px-4 py-3 text-center font-semibold">{revenueData_actual.total.service.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center font-semibold"></td>
            <td className="px-4 py-3 text-center font-semibold">{revenueData_actual.total.product.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center font-bold">{revenueData_actual.total.total.toLocaleString()}</td>
          </tr>
          <tr className="bg-gray-50 border-t border-gray-200">
            <td className="px-4 py-3 font-medium">고객 수 및 객 단가</td>
            <td className="px-4 py-3 text-center font-semibold">{revenueData_actual.customers.service.quantity}</td>
            <td className="px-4 py-3 text-center font-semibold">{revenueData_actual.customers.service.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center font-semibold">{revenueData_actual.customers.product.quantity}</td>
            <td className="px-4 py-3 text-center font-semibold">{revenueData_actual.customers.product.amount.toLocaleString()}</td>
            <td className="px-4 py-3 text-center font-semibold">
              {revenueData_actual.customers.total.quantity} / {revenueData_actual.customers.total.amount.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Comment: By Staff Sales Tab Component
function ByStaffSalesTab({
  dateMode,
  setDateMode,
  selectedDate,
  setSelectedDate,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedDesignerId,
  setSelectedDesignerId,
  designers,
}: {
  dateMode: DateMode;
  setDateMode: (mode: DateMode) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  selectedDesignerId: string;
  setSelectedDesignerId: (id: string) => void;
  designers: any[];
}) {
  const [loading, setLoading] = useState(false);
  const [staffSalesData, setStaffSalesData] = useState<any[]>([]);
  const [includePointDeduction, setIncludePointDeduction] = useState(true);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (dateMode === 'daily' && !selectedDate) {
      alert('날짜를 선택해주세요.');
      return;
    }
    if (dateMode === 'period' && (!startDate || !endDate)) {
      alert('시작 날짜와 종료 날짜를 선택해주세요.');
      return;
    }
    setHasSearched(true);
    setShouldFetch(true);
  };

  useEffect(() => {
    if (!shouldFetch) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (dateMode === 'daily') {
          params.append('start_date', selectedDate);
          params.append('end_date', selectedDate);
        } else {
          params.append('start_date', startDate);
          params.append('end_date', endDate);
        }
        if (selectedDesignerId) {
          params.append('designer_id', selectedDesignerId);
        }
        if (includePointDeduction) {
          params.append('include_point_deduction', 'true');
        }

        const res = await fetch(`/api/sales/by-staff?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to fetch staff sales data');
        }
        const data = await res.json();
        setStaffSalesData(data.staffSales || []);
      } catch (error) {
        console.error('Error fetching staff sales data:', error);
        setStaffSalesData([]);
      } finally {
        setLoading(false);
        setShouldFetch(false);
      }
    };

    fetchData();
  }, [shouldFetch, dateMode, selectedDate, startDate, endDate, selectedDesignerId, includePointDeduction]);

  const handleDateChange = (direction: 'prev' | 'next') => {
    if (dateMode === 'daily') {
      const date = new Date(selectedDate);
      if (direction === 'prev') {
        date.setDate(date.getDate() - 1);
      } else {
        date.setDate(date.getDate() + 1);
      }
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={dateMode === 'daily'}
                onChange={() => setDateMode('daily')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">일별</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={dateMode === 'period'}
                onChange={() => setDateMode('period')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">기간</span>
            </label>
          </div>

          {dateMode === 'daily' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDateChange('prev')}
                className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                &lt;
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <button
                onClick={() => handleDateChange('next')}
                className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                &gt;
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          )}

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">직원</label>
            <select
              value={selectedDesignerId}
              onChange={(e) => setSelectedDesignerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent bg-white"
            >
              <option value="">전체</option>
              {designers.map((designer) => (
                <option key={designer.id} value={designer.id}>
                  {designer.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includePointDeduction}
              onChange={(e) => setIncludePointDeduction(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-600">포인트 차감 포함</span>
          </label>

          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">search</span>
            검색
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : !hasSearched ? null : staffSalesData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">해당 기간에 데이터가 없습니다.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">직원</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">판매/차감</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700" colSpan={2}>
                    서비스 매출
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700" colSpan={2}>
                    제품 매출
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">소계 (A + B)</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700" colSpan={2}>
                    정액권 판매
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700" colSpan={2}>
                    티켓 판매
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">합계 (A + B + C + D)</th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th colSpan={2}></th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">수량</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">금액 (A)</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">수량</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">금액 (B)</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">금액</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">수량</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">금액 (C)</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">수량</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">금액 (D)</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">금액</th>
                </tr>
              </thead>
              <tbody>
                {staffSalesData.map((staff, idx) => (
                  <React.Fragment key={staff.designerId}>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium" rowSpan={3}>
                        {staff.name}
                      </td>
                      <td className="px-4 py-3 font-medium">판매</td>
                      <td className="px-4 py-3 text-center">{staff.sales.service.quantity}</td>
                      <td className="px-4 py-3 text-center">{staff.sales.service.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">{staff.sales.product.quantity}</td>
                      <td className="px-4 py-3 text-center">{staff.sales.product.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center font-semibold">{staff.sales.subtotal.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">{staff.sales.membership.quantity}</td>
                      <td className="px-4 py-3 text-center">{staff.sales.membership.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">{staff.sales.ticket.quantity}</td>
                      <td className="px-4 py-3 text-center">{staff.sales.ticket.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center font-semibold">{staff.sales.total.toLocaleString()}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium">회원권 차감</td>
                      <td className="px-4 py-3 text-center">{staff.membershipDeduction.service.quantity}</td>
                      <td className="px-4 py-3 text-center">{staff.membershipDeduction.service.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center"></td>
                      <td className="px-4 py-3 text-center"></td>
                      <td className="px-4 py-3 text-center font-semibold">{staff.membershipDeduction.subtotal.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center"></td>
                      <td className="px-4 py-3 text-center"></td>
                      <td className="px-4 py-3 text-center"></td>
                      <td className="px-4 py-3 text-center"></td>
                      <td className="px-4 py-3 text-center font-semibold">{staff.membershipDeduction.subtotal.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-yellow-50 border-b-2 border-yellow-200">
                      <td className="px-4 py-3 font-bold">합계</td>
                      <td className="px-4 py-3 text-center"></td>
                      <td className="px-4 py-3 text-center font-semibold">{staff.total.service.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center"></td>
                      <td className="px-4 py-3 text-center font-semibold">{staff.total.product.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center font-semibold">{staff.total.subtotal.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center"></td>
                      <td className="px-4 py-3 text-center"></td>
                      <td className="px-4 py-3 text-center"></td>
                      <td className="px-4 py-3 text-center"></td>
                      <td className="px-4 py-3 text-center font-bold">{staff.total.subtotal.toLocaleString()}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Comment: By Item Sales Tab Component
function ByItemSalesTab({
  dateMode,
  setDateMode,
  selectedDate,
  setSelectedDate,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedDesignerId,
  setSelectedDesignerId,
  selectedItemType,
  setSelectedItemType,
  designers,
}: {
  dateMode: DateMode;
  setDateMode: (mode: DateMode) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  selectedDesignerId: string;
  setSelectedDesignerId: (id: string) => void;
  selectedItemType: string;
  setSelectedItemType: (type: string) => void;
  designers: any[];
}) {
  const [loading, setLoading] = useState(false);
  const [itemSalesData, setItemSalesData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [aggregationMode, setAggregationMode] = useState<'category' | 'service'>('category');
  const [shouldFetch, setShouldFetch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (dateMode === 'daily' && !selectedDate) {
      alert('날짜를 선택해주세요.');
      return;
    }
    if (dateMode === 'period' && (!startDate || !endDate)) {
      alert('시작 날짜와 종료 날짜를 선택해주세요.');
      return;
    }
    setHasSearched(true);
    setShouldFetch(true);
  };

  useEffect(() => {
    if (!shouldFetch) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (dateMode === 'daily') {
          params.append('start_date', selectedDate);
          params.append('end_date', selectedDate);
        } else {
          params.append('start_date', startDate);
          params.append('end_date', endDate);
        }
        if (selectedDesignerId) {
          params.append('designer_id', selectedDesignerId);
        }
        params.append('item_type', selectedItemType);
        params.append('aggregation_mode', aggregationMode);

        const res = await fetch(`/api/sales/by-item?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to fetch item sales data');
        }
        const data = await res.json();
        setItemSalesData(data.itemSales || []);
        setSummary(data.summary || null);
      } catch (error) {
        console.error('Error fetching item sales data:', error);
        setItemSalesData([]);
        setSummary(null);
      } finally {
        setLoading(false);
        setShouldFetch(false);
      }
    };

    fetchData();
  }, [shouldFetch, dateMode, selectedDate, startDate, endDate, selectedDesignerId, selectedItemType, aggregationMode]);

  const handleDateChange = (direction: 'prev' | 'next') => {
    if (dateMode === 'daily') {
      const date = new Date(selectedDate);
      if (direction === 'prev') {
        date.setDate(date.getDate() - 1);
      } else {
        date.setDate(date.getDate() + 1);
      }
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  };


  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={dateMode === 'daily'}
                onChange={() => setDateMode('daily')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">일별</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={dateMode === 'period'}
                onChange={() => setDateMode('period')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">기간</span>
            </label>
          </div>

          {dateMode === 'daily' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDateChange('prev')}
                className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                &lt;
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <button
                onClick={() => handleDateChange('next')}
                className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                &gt;
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          )}

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">직원</label>
            <select
              value={selectedDesignerId}
              onChange={(e) => setSelectedDesignerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent bg-white"
            >
              <option value="">전체</option>
              {designers.map((designer) => (
                <option key={designer.id} value={designer.id}>
                  {designer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">항목</label>
            <select
              value={selectedItemType}
              onChange={(e) => setSelectedItemType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent bg-white"
            >
              <option value="service">서비스</option>
              <option value="product">제품</option>
              <option value="membership">정액권</option>
              <option value="ticket">티켓</option>
            </select>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={aggregationMode === 'category'}
                onChange={() => setAggregationMode('category')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">분류</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={aggregationMode === 'service'}
                onChange={() => setAggregationMode('service')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">서비스</span>
            </label>
          </div>

          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">search</span>
            검색
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : !hasSearched ? null : itemSalesData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">해당 기간에 데이터가 없습니다.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">분류</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700" colSpan={2}>
                    판매
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700" colSpan={2}>
                    정액권 차감
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700" colSpan={2}>
                    티켓 차감
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">합계 (A + B + C)</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">평균 단가</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">포인트 차감</th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th></th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">수량</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">금액 (A)</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">수량</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">금액 (B)</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">수량</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">금액 (C)</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">금액</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">금액</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-600">금액</th>
                </tr>
              </thead>
              <tbody>
                {itemSalesData.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium">{item.category}</td>
                    <td className="px-4 py-3 text-center">{item.sales.quantity}</td>
                    <td className="px-4 py-3 text-center">{item.sales.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">{item.membershipDeduction.quantity}</td>
                    <td className="px-4 py-3 text-center">{item.membershipDeduction.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">{item.ticketDeduction.quantity}</td>
                    <td className="px-4 py-3 text-center">{item.ticketDeduction.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center font-semibold">{item.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">{item.avgPrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">{item.pointDeduction.toLocaleString()}</td>
                  </tr>
                ))}
                {summary && (
                  <tr className="bg-yellow-50 border-t-2 border-yellow-200">
                    <td className="px-4 py-3 font-bold">합계</td>
                    <td className="px-4 py-3 text-center font-semibold">{summary.salesQuantity}</td>
                    <td className="px-4 py-3 text-center font-semibold">{summary.salesAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center font-semibold">{summary.membershipQuantity}</td>
                    <td className="px-4 py-3 text-center font-semibold">{summary.membershipAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center font-semibold">0</td>
                    <td className="px-4 py-3 text-center font-semibold">0</td>
                    <td className="px-4 py-3 text-center font-bold">{summary.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center font-semibold">{summary.avgPrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center font-semibold">0</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
