'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import RevenueTrendsChart from '@/components/RevenueTrendsChart';

type TimeRange = 'Today' | 'Week' | 'Month' | 'Year';

// Comment: Helper to build date range (UTC ISO) based on selected time range
function getDateRangeForTimeRange(timeRange: TimeRange) {
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
  }

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

export default function SalesOverviewPage() {
  // Comment: Separate state for Revenue Trends (only affects chart)
  const [trendRange, setTrendRange] = useState<TimeRange>('Month');
  // Comment: Keep timeRange for other sections (cards, payment methods, etc.) - default to Month
  const [timeRange, setTimeRange] = useState<TimeRange>('Month');
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

  // Comment: Prepaid pass management state
  const [prepaidSearchQuery, setPrepaidSearchQuery] = useState('');
  const [prepaidMembers, setPrepaidMembers] = useState<any[]>([]);
  const [loadingPrepaid, setLoadingPrepaid] = useState(false);

  // Comment: Refetch product sales whenever time range changes
  useEffect(() => {
    const { from, to } = getDateRangeForTimeRange(timeRange);

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

    // Comment: Load prepaid pass members for status display
    const fetchPrepaidMembers = async () => {
      try {
        setLoadingPrepaid(true);
        const res = await fetch('/api/prepaid');
        const data = await res.json();
        if (res.ok) {
          setPrepaidMembers(data.members || []);
        } else {
          setPrepaidMembers([]);
        }
      } catch (error) {
        console.error('Error fetching prepaid members:', error);
        setPrepaidMembers([]);
      } finally {
        setLoadingPrepaid(false);
      }
    };

    fetchPrepaidMembers();
  }, [timeRange]);

  const timeRangeLabel = useMemo(() => {
    if (timeRange === 'Today') return '오늘';
    if (timeRange === 'Week') return '이번 주';
    if (timeRange === 'Month') return '이번 달';
    return '올해';
  }, [timeRange]);

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex">
      <aside className="w-64 shrink-0 flex flex-col justify-between bg-white border-r border-gray-200 h-full overflow-y-auto hidden md:flex">
        <div className="flex flex-col gap-8 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-black flex items-center justify-center rounded-full size-10 text-white">
              <span className="material-symbols-outlined">content_cut</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-wider text-black">HAEYOOM</h1>
              <p className="text-xs text-gray-500 font-medium tracking-widest">SEOUL • SYDNEY</p>
            </div>
          </div>
          <nav className="flex flex-col gap-2">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
            <Link
              href="/admin/sales"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black text-white shadow-lg shadow-black/20"
            >
              <span className="material-symbols-outlined">monitoring</span>
              <span className="text-sm font-medium">Sales Overview</span>
            </Link>
            <Link
              href="/admin/appointments"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">calendar_month</span>
              <span className="text-sm font-medium">Appointments</span>
            </Link>
            <Link
              href="/admin/service-history"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">history</span>
              <span className="text-sm font-medium">Service History</span>
            </Link>
            <Link
              href="/admin/staff"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">groups</span>
              <span className="text-sm font-medium">Staff</span>
            </Link>
            <Link
              href="/admin/inventory"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">inventory_2</span>
              <span className="text-sm font-medium">Inventory</span>
            </Link>
            <Link
              href="/admin/prepaid"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">card_membership</span>
              <span className="text-sm font-medium">Prepaid Pass</span>
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">settings</span>
              <span className="text-sm font-medium">Settings</span>
            </Link>
          </nav>
        </div>
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="size-10 rounded-full bg-cover bg-center grayscale"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAjhD0WmE9CSsv_JWqCz325cTf4HM2m39YT5VSu09Lc2YQqci2GEmubVTLNi3mhaSzXeI1aOETFfv9VpKUOwV_LoiTkw5FBCVBNCznsSmppHNQiAWcQrAE7cw73i0kzJkDOrZHBn-rVhTR-sBvQ9yPTejyv271gCTallJe0gM8N5_cOiuGK0ZhmDcFdRyL97zFu_5tj-DgObrIlkZqquHTlK8OeBJB297gGVKfjJWl_e8t3cnmO4nqHfGDOJjhwTSHFyyB9M083o3dh')",
              }}
            />
            <div className="flex flex-col">
              <p className="text-sm font-medium text-black">Sarah Kim</p>
              <p className="text-xs text-gray-500">Manager</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <header className="h-16 flex items-center justify-between px-6 md:px-10 py-4 bg-[#1a1a1a] text-white z-10 shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Dashboard</span>
            <span className="text-gray-500">/</span>
            <span className="font-medium text-white">Sales Overview</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center justify-center size-8 rounded-full hover:bg-white/10 text-gray-300 transition-colors">
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
            <button className="flex items-center justify-center size-8 rounded-full hover:bg-white/10 text-gray-300 md:hidden transition-colors">
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-white">
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-black">Performance Overview</h2>
                <p className="text-gray-500 text-sm">Track your salon&apos;s financial health and stylist performance.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-gray-100 rounded-lg p-1 flex border border-gray-200">
                  {['Today', 'Week', 'Month', 'Year'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range as TimeRange)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        timeRange === range
                          ? 'bg-black text-white shadow-sm'
                          : 'text-gray-500 font-medium hover:text-black hover:bg-gray-200'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
                <button className="flex items-center gap-2 bg-white hover:bg-gray-50 text-black border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm">
                  <span className="material-symbols-outlined text-lg">download</span>
                  Export
                </button>
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
                    : `₩${summary.totalRevenue.toLocaleString('ko-KR')}`}
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
                    : `₩${summary.totalRevenue.toLocaleString('ko-KR')}`}
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
                    : `₩${Math.round(summary.avgTicket).toLocaleString('ko-KR')}`}
                </h3>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-black">Revenue Trends</h3>
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-100 rounded-lg p-1 flex border border-gray-200">
                      {['Today', 'Week', 'Month', 'Year'].map((range) => (
                        <button
                          key={range}
                          onClick={() => setTrendRange(range as TimeRange)}
                          className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                            trendRange === range
                              ? 'bg-black text-white shadow-sm'
                              : 'text-gray-500 font-medium hover:text-black hover:bg-gray-200'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                    <button className="text-gray-400 hover:text-black transition-colors">
                      <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                  </div>
                </div>
                <RevenueTrendsChart
                  trendPoints={summary?.trendPoints || []}
                  timeRange={trendRange}
                  loading={loadingSummary}
                />
              </div>
              <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-black">Payment Method</h3>
                  <button className="text-gray-400 hover:text-black transition-colors">
                    <span className="material-symbols-outlined">more_horiz</span>
                  </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center relative my-4">
                  <div
                    className="size-48 rounded-full relative flex items-center justify-center shadow-inner"
                    style={{
                      background:
                        'conic-gradient(#111111 0% 45%, #71717a 45% 70%, #d4d4d8 70% 100%)',
                    }}
                  >
                    <div className="size-36 bg-white rounded-full flex flex-col items-center justify-center z-10 shadow-sm">
                      <span className="text-xs text-gray-500">Total</span>
                      <span className="text-xl font-bold text-black">
                        {loadingSummary || !summary
                          ? '...'
                          : `₩${summary.totalRevenue.toLocaleString('ko-KR')}`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 mt-2">
                  {loadingSummary || !summary ? (
                    <span className="text-sm text-gray-500">Loading...</span>
                  ) : summary.paymentMethods.length === 0 ? (
                    <span className="text-sm text-gray-500">
                      No payments in this period.
                    </span>
                  ) : (
                    summary.paymentMethods.map((item) => {
                      const color =
                        item.method === 'card'
                          ? 'bg-black'
                          : item.method === 'cash'
                            ? 'bg-gray-500'
                            : 'bg-gray-300';
                      const label =
                        item.method === 'card'
                          ? 'Card'
                          : item.method === 'cash'
                            ? 'Cash'
                            : item.method === 'bank_transfer'
                              ? 'Transfer'
                              : item.method;
                      return (
                        <div key={item.method} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`size-3 rounded-full ${color} shadow-sm`}></div>
                            <span className="text-sm text-gray-500">{label}</span>
                          </div>
                          <span className="text-sm font-medium text-black">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-black">Prepaid Pass Status</h3>
                  <Link
                    href="/admin/prepaid"
                    className="text-xs font-medium text-gray-500 hover:text-black transition-colors flex items-center gap-1"
                  >
                    Manage
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
                <div className="mb-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[18px]">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={prepaidSearchQuery}
                      onChange={(e) => setPrepaidSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  {loadingPrepaid ? (
                    <div className="text-sm text-gray-500 py-8 text-center">Loading prepaid members...</div>
                  ) : prepaidMembers.length === 0 ? (
                    <div className="text-sm text-gray-500 py-8 text-center">
                      {prepaidSearchQuery ? 'No members found.' : 'No prepaid pass members yet.'}
                    </div>
                  ) : (
                    <div className="space-y-3 h-full max-h-[28rem] overflow-y-auto pr-1">
                      {prepaidMembers
                        .filter((member) => {
                          if (!prepaidSearchQuery) return true;
                          const query = prepaidSearchQuery.toLowerCase();
                          return (
                            member.name?.toLowerCase().includes(query) ||
                            member.phone?.includes(query) ||
                            member.email?.toLowerCase().includes(query)
                          );
                        })
                        .map((member) => (
                          <div
                            key={member.id}
                            className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-gray-300 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium text-black">
                                    {member.name || 'Unknown'}
                                  </p>
                                  {member.is_active && (
                                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                      Active
                                    </span>
                                  )}
                                </div>
                                {member.phone && (
                                  <p className="text-xs text-gray-500 mb-0.5">{member.phone}</p>
                                )}
                                {member.email && (
                                  <p className="text-xs text-gray-500">{member.email}</p>
                                )}
                              </div>
                              <div className="text-right">
                                {member.points !== undefined && (
                                  <p className="text-sm font-bold text-black">
                                    {member.points} points
                                  </p>
                                )}
                                {member.expires_at && (
                                  <p className="text-xs text-gray-500">
                                    Expires: {new Date(member.expires_at).toLocaleDateString('ko-KR')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-black mb-6">Revenue by Service</h3>
                  {loadingSummary || !summary ? (
                    <div className="text-sm text-gray-500">Loading service revenue...</div>
                  ) : summary.serviceCategories.length === 0 ? (
                    <div className="text-sm text-gray-500">No service revenue data in this period.</div>
                  ) : (
                    <div className="space-y-4">
                      {summary.serviceCategories.map((category, index) => (
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
                            ₩{category.revenue.toLocaleString('ko-KR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-black mb-2">Revenue by Products</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    {productError
                      ? productError
                      : loadingProductSales
                        ? '제품 매출을 불러오는 중입니다...'
                        : productSummary && productSummary.totalAmount > 0
                          ? `${timeRangeLabel} 기준 제품 매출 합계 ₩${productSummary.totalAmount.toLocaleString('ko-KR')} · 총 ${productSummary.totalQuantity}개 판매`
                          : `${timeRangeLabel} 기준 제품 매출 데이터가 없습니다.`}
                  </p>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {loadingProductSales ? (
                      <div className="text-sm text-gray-500 py-4 text-center">Loading...</div>
                    ) : productRows.length === 0 ? (
                      <div className="text-sm text-gray-500 py-4 text-center">No product sales in this period.</div>
                    ) : (
                      productRows.map((product) => (
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
                                {product.category} · {product.totalQuantity}개 · 단가 ₩
                                {product.unitPrice.toLocaleString('ko-KR')}
                              </p>
                            </div>
                          </div>
                          <p className="font-bold text-sm text-black">
                            ₩{product.totalAmount.toLocaleString('ko-KR')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


