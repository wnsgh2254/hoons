'use client';

import React, { useEffect, useState } from 'react';
import { useStaff } from '@/hooks/useStaff';
import { useServices } from '@/hooks/useServices';
import { getSydneyToday } from '@/lib/utils/appointment-utils';
import { formatPaymentMethod, formatAudNumber } from '@/lib/utils';
import {
  AdminPageLayout,
  PageHeader,
  Tabs,
  Button,
  Modal,
  Select,
  Input,
  DataTable,
  EmptyState,
  Badge,
} from '@/components/ui';
import CustomerInfoDrawer from '@/components/admin/appointments/CustomerInfoDrawer';
import { useSalesDetailActions } from '@/hooks/useSalesDetailActions';

type TabType = 'total' | 'byStaff' | 'byItem';
type DateMode = 'daily' | 'period';

const SALES_TABS = [
  { key: 'total', label: '전체 매출' },
  { key: 'byStaff', label: '직원별 매출' },
  { key: 'byItem', label: '항목별 매출' },
];

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('total');
  const [dateMode, setDateMode] = useState<DateMode>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(getSydneyToday());
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>('');
  const [selectedItemType, setSelectedItemType] = useState<string>('service');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const { staff: designers } = useStaff();

  return (
    <AdminPageLayout>
      <PageHeader
        title="매출 관리"
        actions={
          <Button variant="outline" icon="history" onClick={() => setShowHistoryModal(true)}>
            판매내역
          </Button>
        }
      />

      <Tabs
        tabs={SALES_TABS}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as TabType)}
      />

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

      {/* Sales History Modal */}
      {showHistoryModal && (
        <SalesHistoryModal
          dateMode={dateMode}
          selectedDate={selectedDate}
          startDate={startDate}
          endDate={endDate}
          designerId={activeTab === 'byStaff' || activeTab === 'byItem' ? selectedDesignerId : undefined}
          itemType={activeTab === 'byItem' ? selectedItemType : undefined}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </AdminPageLayout>
  );
}

// Comment: Shared date filter bar used across tabs
function DateFilterBar({
  dateMode,
  setDateMode,
  selectedDate,
  setSelectedDate,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  handleDateChange,
  handleSearch,
  extraFilters,
}: {
  dateMode: DateMode;
  setDateMode: (mode: DateMode) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  handleDateChange: (direction: 'prev' | 'next') => void;
  handleSearch: () => void;
  extraFilters?: React.ReactNode;
}) {
  const handleStartDateChange = (nextStartDate: string) => {
    setStartDate(nextStartDate);

    // Comment: Keep the end date aligned so the range never goes backwards.
    if (endDate && nextStartDate && endDate < nextStartDate) {
      setEndDate(nextStartDate);
    }
  };

  const handleEndDateChange = (nextEndDate: string) => {
    if (startDate && nextEndDate && nextEndDate < startDate) {
      setEndDate(startDate);
      return;
    }

    setEndDate(nextEndDate);
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
        <div className="flex flex-wrap gap-4">
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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button variant="outline" size="sm" onClick={() => handleDateChange('prev')}>
              &lt;
            </Button>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              wrapperClassName="w-full sm:min-w-[180px]"
            />
            <Button variant="outline" size="sm" onClick={() => handleDateChange('next')}>
              &gt;
            </Button>
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              wrapperClassName="w-full min-w-0 sm:min-w-[180px]"
            />
            <span className="hidden text-center text-gray-400 sm:block">~</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              min={startDate || undefined}
              wrapperClassName="w-full min-w-0 sm:min-w-[180px]"
            />
          </div>
        )}

        {extraFilters && (
          <div className="flex w-full min-w-0 flex-col gap-4 md:flex-1 md:flex-row">
            {extraFilters}
          </div>
        )}

        <Button
          variant="primary"
          size="sm"
          icon="search"
          onClick={handleSearch}
          className="w-full sm:w-auto"
        >
          검색
        </Button>
      </div>
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
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');

  const [shouldFetch, setShouldFetch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchShops = async () => {
      try {
        const res = await fetch('/api/shops');
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        setShops(data.shops || []);
      } catch (error) {
        console.error('Error fetching shops for total sales filter:', error);
      }
    };

    fetchShops();

    return () => {
      isMounted = false;
    };
  }, []);

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
        if (selectedShopId) {
          params.append('shop_id', selectedShopId);
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
  }, [shouldFetch, dateMode, selectedDate, startDate, endDate, selectedShopId]);

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

  const shopOptions = shops.map((shop: any) => ({
    value: String(shop.id),
    label: shop.name,
  }));

  return (
    <div className="flex flex-col gap-6">
      <DateFilterBar
        dateMode={dateMode}
        setDateMode={setDateMode}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        handleDateChange={handleDateChange}
        handleSearch={handleSearch}
        extraFilters={
          <Select
            value={selectedShopId}
            onChange={(e) => setSelectedShopId(e.target.value)}
            options={shopOptions}
            placeholder="전체 지점"
            wrapperClassName="flex-1 min-w-0 md:max-w-xs"
          />
        }
      />

      {loading ? (
        <div className="text-center py-11.5 text-gray-500">Loading...</div>
      ) : salesData ? (
        <div className="flex flex-col gap-8">
          {/* 판매 합계 (회원권 판매 기준) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-black">판매 합계 (회원권 판매 기준)</h3>
              <Button
                variant="outline"
                size="sm"
                icon={showPaymentDetails ? 'visibility_off' : 'visibility'}
                onClick={() => setShowPaymentDetails(!showPaymentDetails)}
              >
                결제 방법별 상세보기
              </Button>
            </div>
            <SalesSummaryTable showPaymentDetails={showPaymentDetails} salesData={salesData} />
          </div>

          {/* 매출 합계 (회원권 차감 기준) */}
          <div>
            <h3 className="text-sm font-bold text-black mb-2">매출 합계 (회원권 차감 기준)</h3>
            <RevenueSummaryTable revenueData={salesData?.revenueSummary} />
          </div>

          {/* 입금 합계 (결제일 기준) */}
          <div>
            <h3 className="text-sm font-bold text-black mb-2">입금 합계 (결제일 기준)</h3>
            <DepositSummaryTable depositData={salesData?.depositSummary} />
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
      total: 0,
    },
    refund: {
      service: { quantity: 0, amount: 0 },
      product: { quantity: 0, amount: 0 },
      membership: { quantity: 0, amount: 0 },
      total: 0,
    },
    paymentDetails: {
      cash: {
        service: 0,
        product: 0,
        membership: 0,
        total: 0,
      },
      card: {
        service: 0,
        product: 0,
        membership: 0,
        total: 0,
      },
      bank_transfer: {
        service: 0,
        product: 0,
        membership: 0,
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

  const tableClass = "w-full min-w-[480px] text-sm [&_td]:border-l [&_td]:border-gray-200 [&_th]:border-l [&_th]:border-gray-200 [&_td:first-child]:border-l-0 [&_th:first-child]:border-l-0";
  const tableWrapperClass = "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden";

  return (
    <div>
      <div className={tableWrapperClass}>
        <div className="overflow-x-auto">
        <table className={tableClass}>
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider w-[140px]" rowSpan={2}>유형</th>
              <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" colSpan={2}>
                서비스
              </th>
              <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" colSpan={2}>
                제품
              </th>
              <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" colSpan={2}>
                정액권
              </th>
              <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider w-[100px]" rowSpan={2}>합계</th>
            </tr>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 !border-l !border-gray-200">수량</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">금액</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">수량</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">금액</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">수량</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">금액</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 hover:bg-gray-50/50">
              <td className="px-4 py-2 font-medium">판매</td>
              <td className="px-4 py-2 text-center tabular-nums">{salesData_actual.sales.service.quantity}</td>
              <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(salesData_actual.sales.service.amount)}</td>
              <td className="px-4 py-2 text-center tabular-nums">{salesData_actual.sales.product.quantity}</td>
              <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(salesData_actual.sales.product.amount)}</td>
              <td className="px-4 py-2 text-center tabular-nums">{salesData_actual.sales.membership.quantity}</td>
              <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(salesData_actual.sales.membership.amount)}</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(salesData_actual.sales.total)}</td>
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50/50">
              <td className="px-4 py-2 font-medium">환불</td>
              <td className="px-4 py-2 text-center tabular-nums">{salesData_actual.refund.service.quantity}</td>
              <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(salesData_actual.refund.service.amount)}</td>
              <td className="px-4 py-2 text-center tabular-nums">{salesData_actual.refund.product.quantity}</td>
              <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(salesData_actual.refund.product.amount)}</td>
              <td className="px-4 py-2 text-center tabular-nums">{salesData_actual.refund.membership.quantity}</td>
              <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(salesData_actual.refund.membership.amount)}</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(salesData_actual.refund.total)}</td>
            </tr>
            <tr className="bg-green-50 border-b-2 border-green-200">
              <td className="px-4 py-2 font-bold">판매 합계</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{salesData_actual.sales.service.quantity}</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(salesData_actual.sales.service.amount)}</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{salesData_actual.sales.product.quantity}</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(salesData_actual.sales.product.amount)}</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{salesData_actual.sales.membership.quantity}</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(salesData_actual.sales.membership.amount)}</td>
              <td className="px-4 py-2 text-center font-bold tabular-nums">{formatAudNumber(salesData_actual.sales.total)}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      {showPaymentDetails && (
        <div className={`${tableWrapperClass} mt-3`}>
          <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider w-[140px]">결제 방법</th>
                <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">서비스</th>
                <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">제품</th>
                <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">정액권</th>
                <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider w-[100px]">합계</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-2 font-medium">현금</td>
                <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(salesData_actual.paymentDetails.cash.service)}</td>
                <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(salesData_actual.paymentDetails.cash.product)}</td>
                <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(salesData_actual.paymentDetails.cash.membership)}</td>
                <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(salesData_actual.paymentDetails.cash.total)}</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-2 font-medium">카드</td>
                <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(salesData_actual.paymentDetails.card.service)}</td>
                <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(salesData_actual.paymentDetails.card.product)}</td>
                <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(salesData_actual.paymentDetails.card.membership)}</td>
                <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(salesData_actual.paymentDetails.card.total)}</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-2 font-medium">계좌 이체</td>
                <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber((salesData_actual.paymentDetails.bank_transfer?.service ?? 0))}</td>
                <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber((salesData_actual.paymentDetails.bank_transfer?.product ?? 0))}</td>
                <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber((salesData_actual.paymentDetails.bank_transfer?.membership ?? 0))}</td>
                <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber((salesData_actual.paymentDetails.bank_transfer?.total ?? 0))}</td>
              </tr>
              <tr className="bg-gray-50 border-t-2 border-gray-300">
                <td className="px-4 py-2 font-bold">합계</td>
                <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(salesData_actual.sales.service.amount)}</td>
                <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(salesData_actual.sales.product.amount)}</td>
                <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(salesData_actual.sales.membership.amount)}</td>
                <td className="px-4 py-2 text-center font-bold tabular-nums">{formatAudNumber(salesData_actual.sales.total)}</td>
              </tr>
            </tbody>
          </table>
          </div>
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
    bank_transfer: {
      deposit: 0,
      depositRefund: 0,
      paymentAtSale: 0,
      uncollectedDeposit: 0,
      refund: 0,
      total: 0,
    },
  };

  const depositData_actual = depositData || data;
  const bankTransferDeposit = depositData_actual.bank_transfer ?? data.bank_transfer;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm [&_td]:border-l [&_td]:border-gray-200 [&_th]:border-l [&_th]:border-gray-200 [&_td:first-child]:border-l-0 [&_th:first-child]:border-l-0">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider w-[140px]">결제 방법</th>
            <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">예약금</th>
            <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">예약금 환불</th>
            <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">판매시 결제</th>
            <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">미수 입금</th>
            <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">환불</th>
            <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider w-[100px]">합계</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100 hover:bg-gray-50/50">
            <td className="px-4 py-2 font-medium">현금</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(depositData_actual.cash.deposit)}</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(depositData_actual.cash.depositRefund)}</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(depositData_actual.cash.paymentAtSale)}</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(depositData_actual.cash.uncollectedDeposit)}</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(depositData_actual.cash.refund)}</td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(depositData_actual.cash.total)}</td>
          </tr>
          <tr className="border-b border-gray-100 hover:bg-gray-50/50">
            <td className="px-4 py-2 font-medium">카드</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(depositData_actual.card.deposit)}</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(depositData_actual.card.depositRefund)}</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(depositData_actual.card.paymentAtSale)}</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(depositData_actual.card.uncollectedDeposit)}</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(depositData_actual.card.refund)}</td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(depositData_actual.card.total)}</td>
          </tr>
          <tr className="border-b border-gray-100 hover:bg-gray-50/50">
            <td className="px-4 py-2 font-medium">계좌 이체</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(bankTransferDeposit.deposit)}</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(bankTransferDeposit.depositRefund)}</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(bankTransferDeposit.paymentAtSale)}</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(bankTransferDeposit.uncollectedDeposit)}</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(bankTransferDeposit.refund)}</td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(bankTransferDeposit.total)}</td>
          </tr>
          <tr className="bg-blue-50 border-b-2 border-blue-200">
            <td className="px-4 py-2 font-bold">입금 합계</td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">
              {formatAudNumber((depositData_actual.cash.deposit + depositData_actual.card.deposit + bankTransferDeposit.deposit))}
            </td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">
              {formatAudNumber((depositData_actual.cash.depositRefund + depositData_actual.card.depositRefund + bankTransferDeposit.depositRefund))}
            </td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">
              {formatAudNumber((depositData_actual.cash.paymentAtSale + depositData_actual.card.paymentAtSale + bankTransferDeposit.paymentAtSale))}
            </td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">
              {formatAudNumber((depositData_actual.cash.uncollectedDeposit + depositData_actual.card.uncollectedDeposit + bankTransferDeposit.uncollectedDeposit))}
            </td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">
              {formatAudNumber((depositData_actual.cash.refund + depositData_actual.card.refund + bankTransferDeposit.refund))}
            </td>
            <td className="px-4 py-2 text-center font-bold tabular-nums">
              {formatAudNumber((depositData_actual.cash.total + depositData_actual.card.total + bankTransferDeposit.total))}
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm [&_td]:border-l [&_td]:border-gray-200 [&_th]:border-l [&_th]:border-gray-200 [&_td:first-child]:border-l-0 [&_th:first-child]:border-l-0">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider w-[140px]" rowSpan={2}>유형</th>
            <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" colSpan={2}>
              서비스
            </th>
            <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" colSpan={2}>
              제품
            </th>
            <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider w-[100px]" rowSpan={2}>합계</th>
          </tr>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 !border-l !border-gray-200">수량</th>
            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">금액</th>
            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">수량</th>
            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">금액</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100 hover:bg-gray-50/50">
            <td className="px-4 py-2 font-medium">판매</td>
            <td className="px-4 py-2 text-center tabular-nums">{revenueData_actual.sales.service.quantity}</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(revenueData_actual.sales.service.amount)}</td>
            <td className="px-4 py-2 text-center tabular-nums">{revenueData_actual.sales.product.quantity}</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(revenueData_actual.sales.product.amount)}</td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(revenueData_actual.sales.total)}</td>
          </tr>
          <tr className="border-b border-gray-100 hover:bg-gray-50/50">
            <td className="px-4 py-2 font-medium">정액권 차감</td>
            <td className="px-4 py-2 text-center tabular-nums">{revenueData_actual.membershipDeduction.service.quantity}</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(revenueData_actual.membershipDeduction.service.amount)}</td>
            <td className="px-4 py-2 text-center tabular-nums">{revenueData_actual.membershipDeduction.product.quantity}</td>
            <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(revenueData_actual.membershipDeduction.product.amount)}</td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(revenueData_actual.membershipDeduction.total)}</td>
          </tr>
          <tr className="bg-yellow-50 border-b-2 border-yellow-200">
            <td className="px-4 py-2 font-bold">매출 합계</td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">{revenueData_actual.sales.service.quantity + revenueData_actual.membershipDeduction.service.quantity}</td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(revenueData_actual.total.service.amount)}</td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">{revenueData_actual.sales.product.quantity + revenueData_actual.membershipDeduction.product.quantity}</td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(revenueData_actual.total.product.amount)}</td>
            <td className="px-4 py-2 text-center font-bold tabular-nums">{formatAudNumber(revenueData_actual.total.total)}</td>
          </tr>
          <tr className="bg-gray-50 border-t border-gray-200">
            <td className="px-4 py-2 font-medium">고객 수 및 객 단가</td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">{revenueData_actual.customers.service.quantity}</td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(revenueData_actual.customers.service.amount)}</td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">{revenueData_actual.customers.product.quantity}</td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(revenueData_actual.customers.product.amount)}</td>
            <td className="px-4 py-2 text-center font-semibold tabular-nums">
              {revenueData_actual.customers.total.quantity} / {formatAudNumber(revenueData_actual.customers.total.amount)}
            </td>
          </tr>
        </tbody>
      </table>
      </div>
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
  }, [shouldFetch, dateMode, selectedDate, startDate, endDate, selectedDesignerId]);

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

  const designerOptions = designers.map((d: any) => ({
    value: String(d.id),
    label: d.shop_name ? `${d.name} - ${d.shop_name}` : d.name,
  }));

  return (
    <div className="flex flex-col gap-6">
      <DateFilterBar
        dateMode={dateMode}
        setDateMode={setDateMode}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        handleDateChange={handleDateChange}
        handleSearch={handleSearch}
        extraFilters={
          <>
            <Select
              value={selectedDesignerId}
              onChange={(e) => setSelectedDesignerId(e.target.value)}
              options={designerOptions}
              placeholder="전체 직원"
              wrapperClassName="flex-1 min-w-0"
            />
          </>
        }
      />

      {loading ? (
        <div className="text-center py-11.5 text-gray-500">Loading...</div>
      ) : !hasSearched ? null : staffSalesData.length === 0 ? (
        <EmptyState title="해당 기간에 데이터가 없습니다." />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm [&_td]:whitespace-nowrap [&_td]:border-l [&_td]:border-gray-200 [&_th]:whitespace-nowrap [&_th]:border-l [&_th]:border-gray-200 [&_td:first-child]:border-l-0 [&_th:first-child]:border-l-0">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider w-[100px]" rowSpan={2}>직원</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider" rowSpan={2}>판매/차감</th>
                    <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" colSpan={2}>
                      서비스 매출
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" colSpan={2}>
                      제품 매출
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" rowSpan={2}>소계 (A + B)</th>
                    <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" colSpan={2}>
                      정액권 판매
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider w-[140px]" rowSpan={2}>합계 (A + B + C)</th>
                  </tr>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 !border-l !border-gray-200">수량</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">금액 (A)</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">수량</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">금액 (B)</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">수량</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">금액 (C)</th>
                  </tr>
                </thead>
                <tbody>
                  {staffSalesData.map((staff, idx) => (
                    <React.Fragment key={staff.designerId}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-4 py-2 font-medium" rowSpan={3}>
                          {staff.name}
                        </td>
                        <td className="px-4 py-2 font-medium">판매</td>
                        <td className="px-4 py-2 text-center tabular-nums">{staff.sales.service.quantity}</td>
                        <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(staff.sales.service.amount)}</td>
                        <td className="px-4 py-2 text-center tabular-nums">{staff.sales.product.quantity}</td>
                        <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(staff.sales.product.amount)}</td>
                        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(staff.sales.subtotal)}</td>
                        <td className="px-4 py-2 text-center tabular-nums">{staff.sales.membership.quantity}</td>
                        <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(staff.sales.membership.amount)}</td>
                        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(staff.sales.total)}</td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-4 py-2 font-medium !border-l !border-gray-200">회원권 차감</td>
                        <td className="px-4 py-2 text-center tabular-nums">{staff.membershipDeduction.service.quantity}</td>
                        <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(staff.membershipDeduction.service.amount)}</td>
                        <td className="px-4 py-2 text-center"></td>
                        <td className="px-4 py-2 text-center"></td>
                        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(staff.membershipDeduction.subtotal)}</td>
                        <td className="px-4 py-2 text-center"></td>
                        <td className="px-4 py-2 text-center"></td>
                        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(staff.membershipDeduction.subtotal)}</td>
                      </tr>
                      <tr className="bg-yellow-50 border-b-2 border-yellow-200">
                        <td className="px-4 py-2 font-bold !border-l !border-gray-200">합계</td>
                        <td className="px-4 py-2 text-center"></td>
                        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(staff.total.service.amount)}</td>
                        <td className="px-4 py-2 text-center"></td>
                        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(staff.total.product.amount)}</td>
                        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(staff.total.subtotal)}</td>
                        <td className="px-4 py-2 text-center"></td>
                        <td className="px-4 py-2 text-center"></td>
                        <td className="px-4 py-2 text-center font-bold tabular-nums">{formatAudNumber(staff.total.subtotal)}</td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
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
  const [searchedAggregationMode, setSearchedAggregationMode] = useState<'category' | 'service'>('category');
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
    setSearchedAggregationMode(aggregationMode);
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
        if (selectedItemType) {
          params.append('item_type', selectedItemType);
        }
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

  const designerOptions = designers.map((d) => ({ value: String(d.id), label: d.name }));

  const itemTypeOptions = [
    { value: 'service', label: '서비스' },
    { value: 'product', label: '제품' },
    { value: 'membership', label: '정액권' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <DateFilterBar
        dateMode={dateMode}
        setDateMode={setDateMode}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        handleDateChange={handleDateChange}
        handleSearch={handleSearch}
        extraFilters={
          <>
            <Select
              value={selectedDesignerId}
              onChange={(e) => setSelectedDesignerId(e.target.value)}
              options={designerOptions}
              placeholder="전체 직원"
              wrapperClassName="flex-1 min-w-0"
            />
            <Select
              value={selectedItemType}
              onChange={(e) => {
                setSelectedItemType(e.target.value);
                if (e.target.value !== 'service') {
                  setAggregationMode('category');
                }
              }}
              options={itemTypeOptions}
              wrapperClassName="flex-1 min-w-0"
            />
            <div className="flex gap-4">
              <label className={`flex items-center gap-2 ${selectedItemType !== 'service' ? 'opacity-40 pointer-events-none' : ''}`}>
                <input
                  type="radio"
                  checked={aggregationMode === 'category'}
                  onChange={() => setAggregationMode('category')}
                  disabled={selectedItemType !== 'service'}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">분류</span>
              </label>
              <label className={`flex items-center gap-2 ${selectedItemType !== 'service' ? 'opacity-40 pointer-events-none' : ''}`}>
                <input
                  type="radio"
                  checked={aggregationMode === 'service'}
                  onChange={() => setAggregationMode('service')}
                  disabled={selectedItemType !== 'service'}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">서비스</span>
              </label>
            </div>
          </>
        }
      />

      {loading ? (
        <div className="text-center py-11.5 text-gray-500">Loading...</div>
      ) : !hasSearched ? null : itemSalesData.length === 0 ? (
        <EmptyState title="해당 기간에 데이터가 없습니다." />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm [&_td]:whitespace-nowrap [&_td]:border-l [&_td]:border-gray-200 [&_th]:whitespace-nowrap [&_th]:border-l [&_th]:border-gray-200 [&_td:first-child]:border-l-0 [&_th:first-child]:border-l-0">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider w-[140px]" rowSpan={2}>분류</th>
                    {searchedAggregationMode === 'service' && (
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider" rowSpan={2}>서비스</th>
                    )}
                    <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" colSpan={2}>
                      판매
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" colSpan={2}>
                      정액권 차감
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" rowSpan={2}>합계 (A + B)</th>
                    <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" rowSpan={2}>평균 단가</th>
                  </tr>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 !border-l !border-gray-200">수량</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">금액 (A)</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">수량</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">금액 (B)</th>
                  </tr>
                </thead>
                <tbody>
                  {itemSalesData.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-2 font-medium">{item.category}</td>
                      {searchedAggregationMode === 'service' && (
                        <td className="px-4 py-2">{item.serviceName}</td>
                      )}
                      <td className="px-4 py-2 text-center tabular-nums">{item.sales.quantity}</td>
                      <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(item.sales.amount)}</td>
                      <td className="px-4 py-2 text-center tabular-nums">{item.membershipDeduction.quantity}</td>
                      <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(item.membershipDeduction.amount)}</td>
                      <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(item.total)}</td>
                      <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(item.avgPrice)}</td>
                    </tr>
                  ))}
                  {summary && (
                    <tr className="bg-yellow-50 border-t-2 border-yellow-200">
                      <td className="px-4 py-2 font-bold">합계</td>
                      {searchedAggregationMode === 'service' && (
                        <td className="px-4 py-2"></td>
                      )}
                      <td className="px-4 py-2 text-center font-semibold tabular-nums">{summary.salesQuantity}</td>
                      <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(summary.salesAmount)}</td>
                      <td className="px-4 py-2 text-center font-semibold tabular-nums">{summary.membershipQuantity}</td>
                      <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(summary.membershipAmount)}</td>
                      <td className="px-4 py-2 text-center font-bold tabular-nums">{formatAudNumber(summary.totalAmount)}</td>
                      <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(summary.avgPrice)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Comment: Sales History Modal Component
function SalesHistoryModal({
  dateMode: initialDateMode,
  selectedDate: initialSelectedDate,
  startDate: initialStartDate,
  endDate: initialEndDate,
  designerId: initialDesignerId,
  itemType: initialItemType,
  onClose,
}: {
  dateMode: DateMode;
  selectedDate: string;
  startDate: string;
  endDate: string;
  designerId?: string;
  itemType?: string;
  onClose: () => void;
}) {
  const [dateMode, setDateMode] = useState<DateMode>(initialDateMode);
  const [selectedDate, setSelectedDate] = useState<string>(initialSelectedDate);
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);
  const [selectedItemType, setSelectedItemType] = useState<string>(initialItemType || '전체');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('전체');
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>(initialDesignerId || '');
  const [showDeleted, setShowDeleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const { staff: designers } = useStaff();
  const { services } = useServices();
  const [shops, setShops] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // Customer info drawer state
  const [viewingCustomerId, setViewingCustomerId] = useState<number | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<any>(null);
  const [customerInfoLoading, setCustomerInfoLoading] = useState(false);
  const [customerInfoTab, setCustomerInfoTab] = useState<'sales' | 'bookings' | 'prepaid'>('sales');

  // Sales detail modal + edit/delete actions (shared hook)
  const salesActions = useSalesDetailActions({
    onRefresh: () => fetchHistory(currentPage),
  });

  // Comment: Fetch initial data (shops and customers)
  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        const [shopsRes, customersRes] = await Promise.all([
          fetch('/api/shops'),
          fetch('/api/customers?limit=1000'),
        ]);

        if (!isMounted) return;

        const shopsData = await shopsRes.json();
        const customersData = await customersRes.json();

        if (shopsRes.ok && shopsData.shops) {
          setShops(shopsData.shops);
        }
        if (customersRes.ok && customersData.customers) {
          setCustomers(customersData.customers);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Comment: Fetch history data
  const fetchHistory = async (page: number = 1) => {
    try {
      setLoading(true);
      const actualStartDate = dateMode === 'daily' ? selectedDate : startDate;
      const actualEndDate = dateMode === 'daily' ? selectedDate : endDate;

      const normalizeHistoryItemType = (value: string) => {
        if (!value) return null;
        const normalized = value.trim().toLowerCase();
        if (normalized === 'all' || value === '전체') return null;
        if (normalized === 'service' || value === '서비스') return 'service';
        if (normalized === 'product' || value === '제품') return 'product';
        if (
          normalized === 'membership' ||
          normalized === 'prepaid' ||
          value === '정액권' ||
          value === '선불권'
        ) {
          return 'membership';
        }
        return null;
      };

      const normalizedItemType = normalizeHistoryItemType(selectedItemType);
      const salesParams = new URLSearchParams();
      salesParams.append('start_date', actualStartDate);
      salesParams.append('end_date', actualEndDate);
      if (selectedDesignerId) {
        salesParams.append('designer_id', selectedDesignerId);
      }
      if (normalizedItemType) {
        salesParams.append('item_type', normalizedItemType);
      }

      const [registeredSalesRes, registeredRefundsRes] = await Promise.all([
        fetch(`/api/sales?${salesParams.toString()}`),
        fetch(`/api/refunds?${salesParams.toString()}`),
      ]);

      const registeredSalesData = await registeredSalesRes.json();
      const registeredRefundsData = await registeredRefundsRes.json();

      const salesHistory = (registeredSalesData.sales || []).map((sale: any) => ({
        id: sale.id,
        customer_id: sale.customer_id,
        customer_name: sale.customer_name || sale.customer?.name || null,
        customer_phone: sale.customer?.phone || null,
        shop_id: sale.shop_id || null,
        booking_date: sale.sales_date,
        booking_time: sale.sales_time,
        sales_date: sale.sales_date,
        sales_time: sale.sales_time,
        sales_amount: sale.sales_amount || 0,
        discount_amount: sale.discount_amount || 0,
        total_amount: sale.total_amount || 0,
        cash_amount: sale.cash_amount || 0,
        card_amount: sale.card_amount || 0,
        bank_transfer_amount: sale.bank_transfer_amount || 0,
        memo: sale.memo || null,
        created_at: sale.created_at || null,
        edit_history: sale.edit_history || [],
        items: (sale.sales_items || []).map((item: any) => ({
          item_type: item.item_type,
          item_name: item.item_name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          discount: item.discount,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          amount: item.amount,
          manager: item.manager,
          sales_classification: item.sales_classification,
          prepaid_deduction: item.prepaid_deduction,
        })),
        payments: [
          ...(Number(sale.cash_amount) !== 0 ? [{ method: 'cash', amount: Number(sale.cash_amount) }] : []),
          ...(Number(sale.card_amount) !== 0 ? [{ method: 'card', amount: Number(sale.card_amount) }] : []),
          ...(Number(sale.bank_transfer_amount) !== 0
            ? [{ method: 'bank_transfer', amount: Number(sale.bank_transfer_amount) }]
            : []),
        ],
      }));

      const registeredRefundHistory = (registeredRefundsData.refunds || []).map((refund: any) => ({
        id: refund.id,
        _isRefund: true,
        customer_id: refund.customer_id,
        customer_name: refund.customer?.name || null,
        customer_phone: refund.customer?.phone || null,
        shop_id: refund.shop_id || null,
        booking_date: refund.refund_date,
        booking_time: refund.refund_time,
        sales_date: refund.refund_date,
        sales_time: refund.refund_time,
        sales_amount: refund.total_amount || 0,
        discount_amount: 0,
        total_amount: refund.total_amount || 0,
        cash_amount: refund.cash_amount || 0,
        card_amount: refund.card_amount || 0,
        bank_transfer_amount: refund.bank_transfer_amount || 0,
        memo: refund.memo || null,
        items: (refund.refund_items || []).map((item: any) => ({
          item_type: item.item_type,
          item_name: item.item_name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          discount: 0,
          amount: item.amount,
          manager: item.manager,
          sales_classification: null,
          prepaid_deduction: 0,
        })),
        payments: [
          ...(refund.cash_amount > 0 ? [{ method: 'cash', amount: refund.cash_amount }] : []),
          ...(refund.card_amount > 0 ? [{ method: 'card', amount: refund.card_amount }] : []),
          ...(refund.bank_transfer_amount > 0
            ? [{ method: 'bank_transfer', amount: refund.bank_transfer_amount }]
            : []),
        ],
        refund_total: refund.total_amount,
        refund_memo: refund.memo,
      }));

      let registeredHistory = [...salesHistory, ...registeredRefundHistory];
      registeredHistory.sort((a: any, b: any) => {
        const dateA = `${a.booking_date} ${a.booking_time || ''}`;
        const dateB = `${b.booking_date} ${b.booking_time || ''}`;
        return dateB.localeCompare(dateA);
      });

      if (selectedPaymentMethod !== '전체') {
        registeredHistory = registeredHistory.filter((historyItem: any) => {
          if (selectedPaymentMethod === '정액권 차감') {
            return historyItem.items.some((historyLine: any) => Number(historyLine.prepaid_deduction) > 0);
          }
          if (historyItem.payments.length === 0) return false;
          return historyItem.payments.some((payment: any) => {
            if (selectedPaymentMethod === '현금') return payment.method === 'cash';
            if (selectedPaymentMethod === '카드') return payment.method === 'card';
            if (selectedPaymentMethod === '계좌이체') return payment.method === 'bank_transfer';
            return true;
          });
        });
      }

      setHistoryData(registeredHistory);
      setTotalCount(registeredHistory.length);
      setTotalPages(Math.ceil(registeredHistory.length / ITEMS_PER_PAGE));
      return;

      const params = new URLSearchParams();
      params.append('start_date', actualStartDate);
      params.append('end_date', actualEndDate);
      params.append('limit', String(ITEMS_PER_PAGE));
      params.append('page', String(page));
      if (selectedDesignerId) {
        params.append('designer_id', selectedDesignerId);
      }

      // Fetch bookings and refunds in parallel
      const refundParams = new URLSearchParams();
      refundParams.append('start_date', actualStartDate);
      refundParams.append('end_date', actualEndDate);

      const [bookingsRes, refundsRes] = await Promise.all([
        fetch(`/api/appointment?${params.toString()}`),
        fetch(`/api/refunds?${refundParams.toString()}`),
      ]);

      const bookingsData = await bookingsRes.json();
      const refundsData = await refundsRes.json();

      let allHistory: any[] = [];

      if (bookingsRes.ok && bookingsData.bookings) {
        let bookings = bookingsData.bookings;

        // Comment: Filter by item type
        if (selectedItemType === '서비스') {
          bookings = bookings.filter((b: any) => b.service_id !== null);
        } else if (selectedItemType === '제품') {
          bookings = [];
        }

        // Comment: Get payments for bookings
        if (bookings.length > 0) {
          const bookingIds = bookings.map((b: any) => b.id);
          const paymentsRes = await fetch(`/api/payments?booking_ids=${bookingIds.join(',')}`);
          const paymentsData = await paymentsRes.json();

          if (paymentsRes.ok && paymentsData.payments) {
            const paymentsMap = new Map();
            paymentsData.payments.forEach((p: any) => {
              if (p.booking_id) {
                if (!paymentsMap.has(p.booking_id)) {
                  paymentsMap.set(p.booking_id, []);
                }
                paymentsMap.get(p.booking_id).push(p);
              }
            });

            // Comment: Group bookings by customer and date/time, attach payments
            const grouped = new Map();
            bookings.forEach((booking: any) => {
              const key = `${booking.customer_id}_${booking.booking_date}_${booking.booking_time}`;
              if (!grouped.has(key)) {
                grouped.set(key, {
                  id: booking.id,
                  customer_id: booking.customer_id,
                  booking_date: booking.booking_date,
                  booking_time: booking.booking_time,
                  shop_id: booking.shop_id,
                  items: [],
                  payments: paymentsMap.get(booking.id) || [],
                });
              }
              grouped.get(key).items.push({
                service_id: booking.service_id,
                designer_id: booking.designer_id,
                total_amount: booking.total_amount,
                memo: booking.memo,
              });
            });

            allHistory = Array.from(grouped.values());
          } else {
            allHistory = bookings.map((b: any) => ({
              id: b.id,
              customer_id: b.customer_id,
              booking_date: b.booking_date,
              booking_time: b.booking_time,
              shop_id: b.shop_id,
              items: [{
                service_id: b.service_id,
                designer_id: b.designer_id,
                total_amount: b.total_amount,
                memo: b.memo,
              }],
              payments: [],
            }));
          }
        }
      }

      // Merge refund records
      const refunds = refundsData.refunds || [];
      const refundHistory = refunds.map((r: any) => ({
        id: r.id,
        _isRefund: true,
        customer_id: r.customer_id,
        shop_id: r.shop_id || null,
        booking_date: r.refund_date,
        booking_time: r.refund_time,
        items: (r.refund_items || []).map((ri: any) => ({
          service_id: null,
          designer_id: null,
          total_amount: ri.amount,
          item_name: ri.item_name,
          manager: ri.manager,
          memo: r.memo,
        })),
        payments: [
          ...(r.cash_amount > 0 ? [{ method: 'cash', amount: r.cash_amount }] : []),
          ...(r.card_amount > 0 ? [{ method: 'card', amount: r.card_amount }] : []),
          ...(r.bank_transfer_amount > 0 ? [{ method: 'bank_transfer', amount: r.bank_transfer_amount }] : []),
        ],
        refund_total: r.total_amount,
        refund_memo: r.memo,
      }));

      let history = [...allHistory, ...refundHistory];

      // Sort by date+time descending
      history.sort((a: any, b: any) => {
        const dateA = `${a.booking_date} ${a.booking_time || ''}`;
        const dateB = `${b.booking_date} ${b.booking_time || ''}`;
        return dateB.localeCompare(dateA);
      });

      // Comment: Filter by payment method
      if (selectedPaymentMethod !== '전체') {
        history = history.filter((h: any) => {
          if (h.payments.length === 0) return false;
          return h.payments.some((p: any) => {
            if (selectedPaymentMethod === '현금') return p.method === 'cash';
            if (selectedPaymentMethod === '카드') return p.method === 'card';
            if (selectedPaymentMethod === '계좌이체') return p.method === 'bank_transfer';
            if (selectedPaymentMethod === '정액권 차감') return p.method === 'prepaid_pass';
            return true;
          });
        });
      }

      setHistoryData(history);
      setTotalCount(history.length);
      setTotalPages(Math.ceil(history.length / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching sales history:', error);
      setHistoryData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
    setCurrentPage(1);
  }, [dateMode, selectedDate, startDate, endDate, selectedItemType, selectedPaymentMethod, selectedDesignerId]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchHistory(1);
  };

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

  const getDesignerName = (designerId: number | null) => {
    if (!designerId) return '-';
    const designer = designers.find((d) => d.id === designerId);
    return designer?.name || '-';
  };

  const getServiceName = (serviceId: number | null) => {
    if (!serviceId) return '-';
    const service = services.find((s) => s.id === serviceId);
    return service?.name || '-';
  };

  const getCustomerName = (customerId: number | null, fallbackName?: string | null) => {
    if (fallbackName) return fallbackName;
    if (!customerId) return '-';
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || '-';
  };

  const getShopName = (shopId: number | null) => {
    if (!shopId) return '-';
    const shop = shops.find((s: any) => s.id === shopId);
    return shop?.name || '-';
  };

  const handleCustomerClick = async (customerId: number) => {
    if (!customerId) return;
    setViewingCustomerId(customerId);
    setCustomerInfoTab('sales');
    setCustomerInfoLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setViewingCustomer(data.customer || data);
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
    } finally {
      setCustomerInfoLoading(false);
    }
  };

  const handleViewSalesDetail = (item: any) => {
    const salesData = {
      id: item.id,
      customer_id: item.customer_id,
      shop_id: item.shop_id ?? null,
      customer_name: getCustomerName(item.customer_id, item.customer_name),
      sales_date: item.sales_date || item.booking_date,
      sales_time: item.sales_time || item.booking_time,
      sales_amount:
        item.sales_amount ??
        item.items.reduce((sum: number, i: any) => sum + (Number(i.amount ?? i.total_amount) || 0), 0),
      discount_amount: item.discount_amount ?? 0,
      total_amount:
        item.total_amount ??
        item.items.reduce((sum: number, i: any) => sum + (Number(i.amount ?? i.total_amount) || 0), 0),
      cash_amount: item.payments?.filter((p: any) => p.method === 'cash').reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) || 0,
      card_amount: item.payments?.filter((p: any) => p.method === 'card').reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) || 0,
      bank_transfer_amount: item.payments?.filter((p: any) => p.method === 'bank_transfer').reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) || 0,
      point_accumulation: 0,
      memo: item.memo || item.items[0]?.memo || null,
      created_at: item.created_at || null,
      edit_history: item.edit_history || [],
      items: item.items.map((it: any) => ({
        item_type: it.item_type || 'service',
        item_name: it.item_name || getServiceName(it.service_id),
        unit_price: Number(it.unit_price ?? it.amount ?? it.total_amount) || 0,
        quantity: Number(it.quantity) || 1,
        discount: Number(it.discount) || 0,
        discount_type: it.discount_type ?? null,
        discount_value: it.discount_value ?? null,
        amount: Number(it.amount ?? it.total_amount) || 0,
        manager: it.manager || getDesignerName(it.designer_id),
        sales_classification: it.sales_classification ?? null,
        prepaid_deduction: Number(it.prepaid_deduction) || 0,
      })),
    };
    salesActions.openDetail(salesData);
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    return `${hour}:${minutes}`;
  };

  const paginatedData = historyData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchHistory(page);
  };

  const itemTypeOptions = [
    { value: '전체', label: '전체' },
    { value: '서비스', label: '서비스' },
    { value: '제품', label: '제품' },
    { value: '정액권', label: '정액권' },
  ];

  const paymentMethodOptions = [
    { value: '전체', label: '전체' },
    { value: '현금', label: '현금' },
    { value: '카드', label: '카드' },
    { value: '계좌이체', label: '계좌이체' },
    { value: '정액권 차감', label: '정액권 차감' },
  ];

  const designerOptions = designers.map((d) => ({ value: String(d.id), label: d.name }));

  const historyColumns = [
    {
      key: 'shop',
      header: '지점',
      className: 'hidden md:table-cell',
      render: (item: any) => getShopName(item.shop_id),
    },
    {
      key: 'date',
      header: '날짜',
      render: (item: any) => (
        <span className="whitespace-nowrap">{item.booking_date}<br className="sm:hidden" /><span className="hidden sm:inline"> </span>{formatTime(item.booking_time)}</span>
      ),
    },
    {
      key: 'customer',
      header: '고객명',
      render: (item: any) => (
        <button
          className="hover:underline cursor-pointer whitespace-nowrap"
          onClick={() => item.customer_id && handleCustomerClick(item.customer_id)}
        >
          {getCustomerName(item.customer_id, item.customer_name)}
        </button>
      ),
    },
    {
      key: 'items',
      header: '판매 항목',
      render: (item: any) => (
        <div className="flex flex-col gap-1">
          {item.items.map((it: any, i: number) => (
            <div key={i} className="flex items-center gap-1.5">
              {item._isRefund && i === 0 && (
                <Badge variant="error" size="sm">환불</Badge>
              )}
              <span>{it.item_name || getServiceName(it.service_id)}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'designer',
      header: '담당자',
      className: 'hidden sm:table-cell',
      render: (item: any) => (
        <div className="flex flex-col gap-1">
          {item.items.map((it: any, i: number) => (
            <div key={i}>{it.manager || getDesignerName(it.designer_id)}</div>
          ))}
        </div>
      ),
    },
    {
      key: 'salesType',
      header: '영업 구분',
      className: 'hidden lg:table-cell',
      render: (item: any) => (
        <div className="flex flex-col gap-1">
          {item.items.map((it: any, i: number) => (
            <div key={i}>{it.sales_classification || '-'}</div>
          ))}
        </div>
      ),
    },
    {
      key: 'discount',
      header: '할인',
      className: 'hidden lg:table-cell',
      render: (item: any) => (
        <div className="flex flex-col gap-1 items-end">
          {item.items.map((it: any, i: number) => (
            <div key={i}>
              {Number(it.discount) > 0 ? formatAudNumber(Number(it.discount)) : '-'}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'amount',
      header: '금액',
      align: 'right' as const,
      render: (item: any) => (
        <div className={`flex flex-col gap-1 items-end ${item._isRefund ? 'text-red-500 font-medium' : ''}`}>
          {item.items.map((it: any, i: number) => (
            <div key={i} className="whitespace-nowrap">
              {Number(it.amount ?? it.total_amount)
                ? (item._isRefund
                    ? `-${formatAudNumber(Number(it.amount ?? it.total_amount))}`
                    : formatAudNumber(Number(it.amount ?? it.total_amount)))
                : '-'}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'paymentMethod',
      header: '결제 방법',
      className: 'hidden sm:table-cell',
      render: (item: any) => {
        const paymentMethods = item.payments.map((p: any) => formatPaymentMethod(p.method)).join(', ') || '-';
        return paymentMethods;
      },
    },
    {
      key: 'paymentAmount',
      header: '결제 금액',
      align: 'right' as const,
      render: (item: any) => {
        if (item._isRefund) {
          const refundTotal =
            item.refund_total ||
            item.items.reduce((sum: number, i: any) => sum + (Number(i.amount ?? i.total_amount) || 0), 0);
          return <span className="text-red-500 font-medium whitespace-nowrap">-{formatAudNumber(Number(refundTotal))}</span>;
        }
        const totalAmount = item.items.reduce(
          (sum: number, i: any) => sum + (Number(i.amount ?? i.total_amount) || 0),
          0,
        );
        const totalPayment = item.payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        return <span className="whitespace-nowrap">{formatAudNumber(totalPayment > 0 ? totalPayment : totalAmount)}</span>;
      },
    },
    {
      key: 'memo',
      header: '메모',
      className: 'hidden md:table-cell',
      render: (item: any) => item._isRefund ? (item.refund_memo || '-') : (item.memo || '-'),
    },
    {
      key: 'detail',
      header: '',
      render: (item: any) => (
        item._isRefund ? null : (
          <button
            className="text-gray-500 hover:text-gray-800 cursor-pointer"
            onClick={() => handleViewSalesDetail(item)}
          >
            <span className="material-symbols-outlined text-[20px]">visibility</span>
          </button>
        )
      ),
    },
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="매출 히스토리"
      maxWidth="max-w-7xl"
      scrollable
    >
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-5.5">
        <div className="flex flex-col gap-3">
          {/* Row 1: date mode toggle + date inputs */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex gap-4 shrink-0">
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
              <div className="flex items-center gap-2 min-w-0">
                <Button variant="outline" size="sm" onClick={() => handleDateChange('prev')}>
                  &lt;
                </Button>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  wrapperClassName="flex-1 min-w-0 sm:min-w-[180px] sm:flex-none"
                />
                <Button variant="outline" size="sm" onClick={() => handleDateChange('next')}>
                  &gt;
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 min-w-0">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  wrapperClassName="min-w-0 sm:min-w-[180px]"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  wrapperClassName="min-w-0 sm:min-w-[180px]"
                />
              </div>
            )}
          </div>

          {/* Row 2: selects + search */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-end sm:gap-3">
            <Select
              label="항목"
              value={selectedItemType}
              onChange={(e) => setSelectedItemType(e.target.value)}
              options={itemTypeOptions}
              wrapperClassName="min-w-0"
            />
            <Select
              label="결제 방법"
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              options={paymentMethodOptions}
              wrapperClassName="min-w-0"
            />
            <Select
              label="담당자"
              value={selectedDesignerId}
              onChange={(e) => setSelectedDesignerId(e.target.value)}
              options={designerOptions}
              placeholder="전체"
              wrapperClassName="min-w-0"
            />
            <Button variant="primary" size="sm" icon="search" onClick={handleSearch} className="w-full sm:w-auto sm:self-end">
              검색
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-11.5">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      ) : paginatedData.length === 0 ? (
        <EmptyState title="해당 기간에 내역이 없습니다." />
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">
              총 {totalCount}건
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="w-4 h-4"
              />
              <span>삭제 항목 표시</span>
              <span className="material-symbols-outlined text-sm text-gray-400">help_outline</span>
            </label>
          </div>

          <DataTable
            columns={historyColumns}
            data={paginatedData}
            keyExtractor={(item: any) => `${item._isRefund ? 'r' : 's'}_${item.id}_${item.booking_date}_${item.booking_time}_${item.customer_id}`}
            className="rounded-none border-0 shadow-none"
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Customer Info Drawer */}
      {viewingCustomerId && (
        <CustomerInfoDrawer
          customerId={viewingCustomerId}
          customer={viewingCustomer}
          loading={customerInfoLoading}
          tab={customerInfoTab}
          onClose={() => {
            setViewingCustomerId(null);
            setViewingCustomer(null);
          }}
          onTabChange={setCustomerInfoTab}
        />
      )}

      {salesActions.modals}
    </Modal>
  );
}
