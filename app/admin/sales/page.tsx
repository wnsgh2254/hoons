'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import RevenueTrendsChart from '@/components/RevenueTrendsChart';
import AdminTopNav from '@/components/AdminTopNav';

type TimeRange = 'Today' | 'Week' | 'Month' | 'Year' | 'Custom';

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

// Comment: Helper to build date range (UTC ISO) based on selected time range
function getDateRangeForTimeRange(
  timeRange: TimeRange,
  customStartDate?: string,
  customEndDate?: string
) {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  if (timeRange === 'Today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (timeRange === 'Week') {
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7;
    start.setDate(now.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (timeRange === 'Month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(start.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  } else if (timeRange === 'Year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  } else if (timeRange === 'Custom') {
    if (customStartDate && customEndDate) {
      start.setTime(new Date(customStartDate).getTime());
      start.setHours(0, 0, 0, 0);
      end.setTime(new Date(customEndDate).getTime());
      end.setHours(23, 59, 59, 999);
    } else {
      // Comment: Default to last 7 days if custom dates not set
      end.setHours(23, 59, 59, 999);
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    }
  }

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

export default function SalesOverviewPage() {
  // Comment: Single timeRange state for all sections (chart, cards, payment methods, etc.)
  const [timeRange, setTimeRange] = useState<TimeRange>('Month');
  // Comment: Custom date range states
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  // Comment: Track if custom range has been applied
  const [customRangeApplied, setCustomRangeApplied] = useState(false);
  const [productRows, setProductRows] = useState<
    {
      itemId: number;
      name: string;
      category: string;
      icon: string | null;
      unitPrice: number;
      totalQuantity: number;
      totalAmount: number;
    }[]
  >([]);
  const [productSummary, setProductSummary] = useState<{
    totalAmount: number;
    totalQuantity: number;
  } | null>(null);
  const [loadingProductSales, setLoadingProductSales] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  const [summary, setSummary] = useState<{
    totalRevenue: number;
    transactions: number;
    avgTicket: number;
    trendPoints: { date: string; revenue: number }[];
    paymentMethods: { method: string; amount: number; percentage: number }[];
    topStylists: {
      designerId: number;
      name: string;
      revenue: number;
      bookingsCount: number;
      percentageOfTop: number;
    }[];
    serviceCategories: {
      serviceId: number;
      name: string;
      transactions: number;
      revenue: number;
    }[];
  } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Comment: Service History modal state
  const [isServiceHistoryOpen, setIsServiceHistoryOpen] = useState(false);


  // Comment: Refetch product sales whenever time range changes
  useEffect(() => {
    // Comment: Skip API calls if Custom is selected but not applied yet
    if (timeRange === 'Custom' && !customRangeApplied) {
      return;
    }
    // Comment: Skip API calls if Custom is selected but dates are not fully set
    if (timeRange === 'Custom' && (!customStartDate || !customEndDate)) {
      return;
    }

    const { from, to } = getDateRangeForTimeRange(timeRange, customStartDate, customEndDate);

    const fetchProductSales = async () => {
      try {
        setLoadingProductSales(true);
        setProductError(null);

        const params = new URLSearchParams({ from, to });
        const res = await fetch(`/api/sales/products?${params.toString()}`);

        if (!res.ok) {
          throw new Error('Failed to fetch product sales');
        }

        const json = await res.json();
        setProductRows(json.products ?? []);
        setProductSummary(json.summary ?? { totalAmount: 0, totalQuantity: 0 });
      } catch (error) {
        console.error(error);
        setProductError('제품 매출을 불러오지 못했습니다.');
      } finally {
        setLoadingProductSales(false);
      }
    };

    const fetchSummary = async () => {
      try {
        setLoadingSummary(true);
        setSummaryError(null);

        const params = new URLSearchParams({ from, to });
        const res = await fetch(`/api/sales/summary?${params.toString()}`);

        if (!res.ok) {
          throw new Error('Failed to fetch sales summary');
        }

        const json = await res.json();
        setSummary({
          totalRevenue: json.totalRevenue ?? 0,
          transactions: json.transactions ?? 0,
          avgTicket: json.avgTicket ?? 0,
          trendPoints: json.trendPoints ?? [],
          paymentMethods: json.paymentMethods ?? [],
          topStylists: json.topStylists ?? [],
          serviceCategories: json.serviceCategories ?? [],
        });
      } catch (error) {
        console.error(error);
        setSummaryError('매출 요약을 불러오지 못했습니다.');
        setSummary(null);
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchProductSales();
    fetchSummary();
  }, [timeRange, customStartDate, customEndDate, customRangeApplied]);

  const timeRangeLabel = useMemo(() => {
    if (timeRange === 'Today') return '오늘';
    if (timeRange === 'Week') return '이번 주';
    if (timeRange === 'Month') return '이번 달';
    if (timeRange === 'Year') return '올해';
    if (timeRange === 'Custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      return `${start.toLocaleDateString('ko-KR')} - ${end.toLocaleDateString('ko-KR')}`;
    }
    return '기간 선택';
  }, [timeRange, customStartDate, customEndDate]);

  // Comment: Handle time range selection
  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    // Comment: Reset custom range applied flag when switching away from Custom
    if (range !== 'Custom') {
      setCustomRangeApplied(false);
    }
    // Comment: No default dates - user must select dates manually
  };

  // Comment: Apply custom date range
  const handleApplyCustomRange = () => {
    if (!customStartDate || !customEndDate) {
      alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
      return;
    }
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    if (start > end) {
      alert('시작 날짜는 종료 날짜보다 이전이어야 합니다.');
      return;
    }
    // Comment: Mark custom range as applied to trigger data loading
    setCustomRangeApplied(true);
  };

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex flex-col">
      <AdminTopNav />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-white">
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-black">Performance Overview</h2>
                <p className="text-gray-500 text-sm">Track your salon&apos;s financial health and stylist performance.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsServiceHistoryOpen(true)}
                  className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">history</span>
                  Service History
                </button>
                <div className="bg-gray-100 rounded-lg p-1 flex border border-gray-200">
                  {['Today', 'Week', 'Month', 'Year', 'Custom'].map((range) => (
                    <button
                      key={range}
                      onClick={() => handleTimeRangeChange(range as TimeRange)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        timeRange === range
                          ? 'bg-black text-white shadow-sm'
                          : 'text-gray-500 font-medium hover:text-black hover:bg-gray-200'
                      }`}
                    >
                      {range === 'Custom' ? 'Custom' : range}
                    </button>
                  ))}
                </div>
                {timeRange === 'Custom' && (
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-500 font-medium">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => {
                          setCustomStartDate(e.target.value);
                          setCustomRangeApplied(false);
                        }}
                        onClick={(e) => {
                          // Comment: Open date picker when clicking anywhere on the input
                          if (e.currentTarget.showPicker) {
                            e.currentTarget.showPicker();
                          }
                        }}
                        className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                      />
                    </div>
                    <span className="text-gray-400 text-xs mt-5">~</span>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-500 font-medium">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => {
                          setCustomEndDate(e.target.value);
                          setCustomRangeApplied(false);
                        }}
                        onClick={(e) => {
                          // Comment: Open date picker when clicking anywhere on the input
                          if (e.currentTarget.showPicker) {
                            e.currentTarget.showPicker();
                          }
                        }}
                        min={customStartDate}
                        className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={handleApplyCustomRange}
                      className="px-3 py-1 bg-black text-white text-xs font-semibold rounded hover:bg-gray-800 transition-colors"
                    >
                      적용
                    </button>
                    <button
                      onClick={() => {
                        setTimeRange('Month');
                        setCustomRangeApplied(false);
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }}
                      className="px-2 py-1 text-gray-500 hover:text-black text-xs transition-colors"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-gray-50 p-2 rounded-lg text-gray-400 group-hover:text-black transition-colors">
                    <span className="material-symbols-outlined">attach_money</span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm font-medium mb-1">Total Revenue</p>
                <h3 className="text-2xl font-bold text-black">
                  {loadingSummary || !summary
                    ? '...'
                    : `$${summary.totalRevenue.toLocaleString('en-US')}`}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-gray-50 p-2 rounded-lg text-gray-400 group-hover:text-black transition-colors">
                    <span className="material-symbols-outlined">receipt_long</span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm font-medium mb-1">Transactions</p>
                <h3 className="text-2xl font-bold text-black">
                  {loadingSummary || !summary ? '...' : summary.transactions}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-gray-50 p-2 rounded-lg text-gray-400 group-hover:text-black transition-colors">
                    <span className="material-symbols-outlined">savings</span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm font-medium mb-1">Net Profit</p>
                <h3 className="text-2xl font-bold text-black">
                  {loadingSummary || !summary
                    ? '...'
                    : `$${summary.totalRevenue.toLocaleString('en-US')}`}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-gray-50 p-2 rounded-lg text-gray-400 group-hover:text-black transition-colors">
                    <span className="material-symbols-outlined">shopping_bag</span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm font-medium mb-1">Avg Ticket</p>
                <h3 className="text-2xl font-bold text-black">
                  {loadingSummary || !summary
                    ? '...'
                    : `$${Math.round(summary.avgTicket).toLocaleString('en-US')}`}
                </h3>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-black">Revenue Trends</h3>
                  <button className="text-gray-400 hover:text-black transition-colors">
                    <span className="material-symbols-outlined">more_horiz</span>
                  </button>
                </div>
                <RevenueTrendsChart
                  trendPoints={summary?.trendPoints || []}
                  timeRange={timeRange}
                  loading={loadingSummary}
                  customStartDate={timeRange === 'Custom' ? customStartDate : undefined}
                  customEndDate={timeRange === 'Custom' ? customEndDate : undefined}
                />
              </div>
              <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-black">Payment Method</h3>
                  <button className="text-gray-400 hover:text-black transition-colors">
                    <span className="material-symbols-outlined">more_horiz</span>
                  </button>
                </div>
                <div className="flex-1 flex flex-col">
                  {loadingSummary || !summary ? (
                    <div className="text-sm text-gray-500 py-8 text-center">Loading...</div>
                  ) : summary.paymentMethods.length === 0 ? (
                    <div className="text-sm text-gray-500 py-8 text-center">
                      No payments in this period.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...summary.paymentMethods]
                        .sort((a, b) => b.amount - a.amount)
                        .map((item) => {
                          const label =
                            item.method === 'card'
                              ? 'Card'
                              : item.method === 'cash'
                                ? 'Cash'
                                : item.method === 'bank_transfer'
                                  ? 'Transfer'
                                  : item.method;
                          return (
                            <div
                              key={item.method}
                              className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-2 rounded-lg ${
                                    item.method === 'card'
                                      ? 'bg-black text-white'
                                      : item.method === 'cash'
                                        ? 'bg-gray-500 text-white'
                                        : 'bg-gray-300 text-gray-700'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    {item.method === 'card'
                                      ? 'credit_card'
                                      : item.method === 'cash'
                                        ? 'payments'
                                        : 'account_balance'}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-black">{label}</span>
                              </div>
                              <span className="text-sm font-bold text-black">
                                ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col flex-1 min-h-0">
                <h3 className="text-lg font-bold text-black mb-6">Revenue by Designer</h3>
                <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                  {loadingSummary || !summary ? (
                    <div className="text-sm text-gray-500">Loading designer revenue...</div>
                  ) : summary.topStylists.length === 0 ? (
                    <div className="text-sm text-gray-500">No designer revenue data in this period.</div>
                  ) : (
                    <div className="space-y-4">
                      {[...summary.topStylists]
                        .sort((a, b) => b.revenue - a.revenue)
                        .map((stylist, index) => (
                        <div
                          key={stylist.designerId}
                          className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`${
                                index === 0 ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
                              } p-2 rounded-lg`}
                            >
                              <span className="material-symbols-outlined">person</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-black">{stylist.name}</p>
                              <p className="text-xs text-gray-500">
                                {stylist.bookingsCount} bookings
                              </p>
                            </div>
                          </div>
                          <p className="font-bold text-black">
                            ${stylist.revenue.toLocaleString('en-US')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col flex-1 min-h-0">
                <h3 className="text-lg font-bold text-black mb-6">Revenue by Service</h3>
                <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                  {loadingSummary || !summary ? (
                    <div className="text-sm text-gray-500">Loading service revenue...</div>
                  ) : summary.serviceCategories.length === 0 ? (
                    <div className="text-sm text-gray-500">No service revenue data in this period.</div>
                  ) : (
                    <div className="space-y-4">
                      {[...summary.serviceCategories]
                        .sort((a, b) => b.revenue - a.revenue)
                        .map((category, index) => (
                        <div
                          key={category.serviceId}
                          className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`${
                                index === 0 ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
                              } p-2 rounded-lg`}
                            >
                              <span className="material-symbols-outlined">content_cut</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-black">{category.name}</p>
                              <p className="text-xs text-gray-500">
                                {category.transactions} transactions
                              </p>
                            </div>
                          </div>
                          <p className="font-bold text-black">
                            ${category.revenue.toLocaleString('en-US')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col flex-1 min-h-0">
                <h3 className="text-lg font-bold text-black mb-2">Revenue by Products</h3>
                <p className="text-xs text-gray-500 mb-4">
                  {productError
                    ? productError
                    : loadingProductSales
                      ? '제품 매출을 불러오는 중입니다...'
                      : productSummary && productSummary.totalAmount > 0
                        ? `${timeRangeLabel} 기준 제품 매출 합계 $${productSummary.totalAmount.toLocaleString('en-US')} · 총 ${productSummary.totalQuantity}개 판매`
                        : `${timeRangeLabel} 기준 제품 매출 데이터가 없습니다.`}
                </p>
                <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                  {loadingProductSales ? (
                    <div className="text-sm text-gray-500 py-4 text-center">Loading...</div>
                  ) : productRows.length === 0 ? (
                    <div className="text-sm text-gray-500 py-4 text-center">No product sales in this period.</div>
                  ) : (
                    <div className="space-y-3">
                      {[...productRows]
                        .sort((a, b) => b.totalAmount - a.totalAmount)
                        .map((product) => (
                        <div
                          key={product.itemId}
                          className="bg-gray-50 rounded-xl p-3 flex items-center justify-between border border-gray-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-white border border-gray-200 rounded-lg p-2 text-gray-600">
                              <span className="material-symbols-outlined">
                                {product.icon || 'inventory_2'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-black">
                                {product.name}
                              </p>
                              <p className="text-[11px] text-gray-500">
                                {product.category} · {product.totalQuantity}개 · 단가 $
                                {product.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                          <p className="font-bold text-sm text-black">
                            ${product.totalAmount.toLocaleString('en-US')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Service History Modal */}
      {isServiceHistoryOpen && (
        <ServiceHistoryModal
          onClose={() => setIsServiceHistoryOpen(false)}
        />
      )}
    </div>
  );
}

// Comment: Service History Modal Component
function ServiceHistoryModal({ onClose }: { onClose: () => void }) {
  const [serviceHistory, setServiceHistory] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [designers, setDesigners] = useState<any[]>([]);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Comment: Single date filter (instead of date range)
  const [selectedDate, setSelectedDate] = useState<string>(getSydneyToday());
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>('');

  const ITEMS_PER_PAGE = 20;

  // Comment: Fetch designers
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const designersRes = await fetch('/api/staff');
        const designersData = await designersRes.json();
        if (designersData.staff) setDesigners(designersData.staff);
      } catch (error) {
        console.error('Error fetching options:', error);
      }
    };
    fetchOptions();
  }, []);

  // Comment: Fetch service history with pagination
  const fetchServiceHistory = async (page: number = 1) => {
    if (!selectedDate) return;

    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('start_date', selectedDate);
      params.append('end_date', selectedDate);
      params.append('page', String(page));
      params.append('limit', String(ITEMS_PER_PAGE));
      if (selectedDesignerId) {
        params.append('designer_id', selectedDesignerId);
      }

      const res = await fetch(`/api/appointment?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load service history');
      }
      setServiceHistory(data.bookings || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.page || 1);
    } catch (error: any) {
      console.error('Error fetching service history:', error);
      setError(error.message || 'Failed to load service history');
      setServiceHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      setCurrentPage(1);
      fetchServiceHistory(1);
    }
  }, [selectedDate, selectedDesignerId]);

  const formatTime = (time: string) => {
    if (!time) return '—';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">Service History</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Filters */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Designer</label>
                <select
                  value={selectedDesignerId}
                  onChange={(e) => setSelectedDesignerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                >
                  <option value="">All Designers</option>
                  {designers.map((designer) => (
                    <option key={designer.id} value={designer.id}>
                      {designer.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Service History Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-black">Service Records</h3>
              <p className="text-xs text-gray-500 mt-1">
                {loading
                  ? 'Loading service history...'
                  : serviceHistory.length === 0
                    ? 'No service records found for the selected date.'
                    : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, total)} of ${total} service record${total === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500 text-sm">Loading service history...</div>
              ) : serviceHistory.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-gray-400 text-3xl">history</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">No service records</p>
                  <p className="text-xs text-gray-500">Try adjusting your date or filters.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                      <th className="px-6 py-4">Date & Time</th>
                      <th className="px-6 py-4">Designer</th>
                      <th className="px-6 py-4">Service</th>
                      <th className="px-6 py-4">Shop</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">$</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                    {serviceHistory.map((service) => (
                      <tr key={service.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-black">
                              {new Date(service.booking_date).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span className="text-xs text-gray-500">{formatTime(service.booking_time)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-600">
                            {service.designer?.name || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-600">
                            {service.custom_service_name || service.service?.name || '—'}
                          </span>
                          {(service.custom_service_duration || service.service?.duration_minutes) && (
                            <span className="text-xs text-gray-500 block">
                              {service.custom_service_duration || service.service?.duration_minutes} min
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-600">
                            {service.shop?.name || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              service.status === 'confirmed'
                                ? 'bg-green-100 text-green-700'
                                : service.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : service.status === 'noshow'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {service.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-black">
                            ${service.total_amount ? Number(service.total_amount).toLocaleString('en-US') : '0'}
                          </span>
                          {service.deposit_amount > 0 && (
                            <span className="text-xs text-gray-500 block">
                              Deposit: ${Number(service.deposit_amount).toLocaleString('en-US')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setEditingService(service)}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined text-[1.1rem]">edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {totalPages > 1 && (
                <div className="p-6 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newPage = currentPage - 1;
                        if (newPage >= 1) {
                          setCurrentPage(newPage);
                          fetchServiceHistory(newPage);
                        }
                      }}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-black"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                        if (
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => {
                                setCurrentPage(pageNum);
                                fetchServiceHistory(pageNum);
                              }}
                              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-black text-white'
                                  : 'border border-gray-200 hover:bg-gray-50 text-black'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (
                          pageNum === currentPage - 2 ||
                          pageNum === currentPage + 2
                        ) {
                          return (
                            <span key={pageNum} className="px-2 text-gray-400">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <button
                      onClick={() => {
                        const newPage = currentPage + 1;
                        if (newPage <= totalPages) {
                          setCurrentPage(newPage);
                          fetchServiceHistory(newPage);
                        }
                      }}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-black"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">check_circle</span>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <EditServiceModal
          service={editingService}
          onClose={() => setEditingService(null)}
          onSuccess={() => {
            setEditingService(null);
            setSuccessMessage('Service record updated successfully');
            fetchServiceHistory(currentPage);
            setTimeout(() => {
              setSuccessMessage(null);
            }, 3000);
          }}
        />
      )}
    </div>
  );
}

// Comment: Edit Service Modal Component
function EditServiceModal({
  service,
  onClose,
  onSuccess,
}: {
  service: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [bookingDate, setBookingDate] = useState(
    service.booking_date ? service.booking_date.split('T')[0] : ''
  );
  const [bookingTime, setBookingTime] = useState(service.booking_time || '');
  const [status, setStatus] = useState(service.status || 'pending');
  const [totalAmount, setTotalAmount] = useState<string>(String(service.total_amount || 0));
  const [depositAmount, setDepositAmount] = useState<string>(String(service.deposit_amount || 0));
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    service.service_id ? String(service.service_id) : 'other'
  );
  const [customServiceName, setCustomServiceName] = useState<string>(
    service.custom_service_name || (service.service_id ? '' : (service.service?.name || ''))
  );
  const [customServiceDuration, setCustomServiceDuration] = useState<string>(
    service.service_id ? '' : String(service.custom_service_duration || service.service?.duration_minutes || '')
  );
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isOtherSelected = selectedServiceId === 'other';

  // Comment: Fetch services list
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch('/api/services');
        const data = await res.json();
        if (res.ok && data.services) {
          setServices(data.services);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
      }
    };
    fetchServices();
  }, []);

  // Comment: Update total amount when service is selected
  useEffect(() => {
    if (selectedServiceId && selectedServiceId !== 'other' && services.length > 0) {
      const selectedService = services.find((svc) => String(svc.id) === selectedServiceId);
      if (selectedService) {
        setTotalAmount(String(selectedService.price || 0));
        const newDeposit = Math.round((selectedService.price || 0) * 0.2);
        setDepositAmount(String(newDeposit));
        setCustomServiceName('');
        setCustomServiceDuration('');
      }
    }
  }, [selectedServiceId, services]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/appointment/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_date: bookingDate,
          booking_time: bookingTime,
          status,
          total_amount: Number(totalAmount) || 0,
          deposit_amount: Number(depositAmount) || 0,
          service_id: isOtherSelected ? null : (selectedServiceId ? Number(selectedServiceId) : undefined),
          custom_service_name: isOtherSelected ? customServiceName : undefined,
          custom_service_duration: isOtherSelected && customServiceDuration ? Number(customServiceDuration) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update service');
      }

      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">Edit Service Record</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              required
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => {
                setSelectedServiceId(e.target.value);
                if (e.target.value !== 'other') {
                  setCustomServiceName('');
                  setCustomServiceDuration('');
                }
              }}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent bg-white"
            >
              <option value="">Select a service</option>
              {services.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name} - ${Number(svc.price).toLocaleString('en-US')} ({svc.duration_minutes} min)
                </option>
              ))}
              <option value="other">Other</option>
            </select>
          </div>
          {isOtherSelected && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                  required={isOtherSelected}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Enter service name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={customServiceDuration}
                  onChange={(e) => setCustomServiceDuration(e.target.value)}
                  required={isOtherSelected}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Enter duration in minutes"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent bg-white"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="noshow">No Show</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
            <input
              type="number"
              min="0"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Enter total amount"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount</label>
            <input
              type="number"
              min="0"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Enter deposit amount"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-black"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-black text-white hover:bg-gray-900 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


