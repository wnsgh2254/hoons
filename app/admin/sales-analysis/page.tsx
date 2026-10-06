'use client';

import React, { useEffect, useState } from 'react';
import { useStaff } from '@/hooks/useStaff';
import { getSydneyToday, addDaysToDateStr } from '@/lib/utils/appointment-utils';
import { formatAudNumber } from '@/lib/utils';
import { AdminPageLayout, PageHeader, Select, EmptyState } from '@/components/ui';
import {
  DateFilterBar,
  StaffSalesRowBlock,
  aggregateStaffSales,
} from '@/components/admin/sales/SalesSharedBlocks';

type DateMode = 'daily' | 'period';

type ItemSalesRow = {
  category: string;
  serviceName?: string;
  sales: { quantity: number; amount: number };
  membershipDeduction: { quantity: number; amount: number };
  total: number;
  avgPrice: number;
  customerCount: number;
  customerBookable: boolean;
};

type ItemSalesSummary = {
  salesQuantity: number;
  salesAmount: number;
  membershipQuantity: number;
  membershipAmount: number;
  totalAmount: number;
  avgPrice: number;
  customerCount: number;
};

type ItemSalesResponse = { itemSales: ItemSalesRow[]; summary: ItemSalesSummary | null };

export default function SalesAnalysisPage() {
  const [dateMode, setDateMode] = useState<DateMode>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(getSydneyToday());
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>('');
  const { staff: designers } = useStaff();

  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [categoryData, setCategoryData] = useState<ItemSalesResponse | null>(null);
  const [staffSummary, setStaffSummary] = useState<any[]>([]);
  const [staffDetails, setStaffDetails] = useState<Record<number, ItemSalesResponse | null>>({});
  const [searchedDateMode, setSearchedDateMode] = useState<DateMode>('daily');

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
        console.error('Error fetching shops for sales analysis filter:', error);
      }
    };

    fetchShops();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDateChange = (direction: 'prev' | 'next') => {
    if (dateMode === 'daily') {
      setSelectedDate(addDaysToDateStr(selectedDate, direction === 'prev' ? -1 : 1));
    }
  };

  const handleSearch = () => {
    if (dateMode === 'daily' && !selectedDate) {
      alert('날짜를 선택해주세요.');
      return;
    }
    if (dateMode === 'period' && (!startDate || !endDate)) {
      alert('시작 날짜와 종료 날짜를 선택해주세요.');
      return;
    }
    fetchAll();
  };

  const fetchAll = async () => {
    const actualStartDate = dateMode === 'daily' ? selectedDate : startDate;
    const actualEndDate = dateMode === 'daily' ? selectedDate : endDate;

    try {
      setLoading(true);
      setHasSearched(true);
      setSearchedDateMode(dateMode);

      const baseParams: Array<[string, string]> = [
        ['start_date', actualStartDate],
        ['end_date', actualEndDate],
        ...(selectedShopId ? ([['shop_id', selectedShopId]] as Array<[string, string]>) : []),
        ...(selectedDesignerId
          ? ([['designer_id', selectedDesignerId]] as Array<[string, string]>)
          : []),
      ];

      const categoryParams = new URLSearchParams(baseParams);
      categoryParams.append('item_type', 'service');
      categoryParams.append('aggregation_mode', 'category');

      const staffParams = new URLSearchParams(baseParams);

      const [categoryRes, staffRes] = await Promise.all([
        fetch(`/api/sales/by-item?${categoryParams.toString()}`),
        fetch(`/api/sales/by-staff?${staffParams.toString()}`),
      ]);

      const categoryJson: ItemSalesResponse = categoryRes.ok
        ? await categoryRes.json()
        : { itemSales: [], summary: null };
      const staffJson = staffRes.ok ? await staffRes.json() : { staffSales: [] };

      setCategoryData(categoryJson);
      const staffList: any[] = staffJson.staffSales || [];
      setStaffSummary(staffList);

      // Comment: Virtual/unassigned designers (negative ids from by-staff) have no matching
      // real designer row, so by-item can't resolve a per-service breakdown for them.
      const realStaff = staffList.filter((staff) => Number(staff.designerId) > 0);

      const detailEntries = await Promise.all(
        realStaff.map(async (staff) => {
          const params = new URLSearchParams(baseParams);
          params.append('designer_id', String(staff.designerId));
          params.append('item_type', 'service');
          params.append('aggregation_mode', 'service');
          try {
            const res = await fetch(`/api/sales/by-item?${params.toString()}`);
            const json: ItemSalesResponse = res.ok
              ? await res.json()
              : { itemSales: [], summary: null };
            return [staff.designerId, json] as const;
          } catch (error) {
            console.error('Error fetching staff service detail:', error);
            return [staff.designerId, null] as const;
          }
        }),
      );
      setStaffDetails(Object.fromEntries(detailEntries));
    } catch (error) {
      console.error('Error fetching sales analysis:', error);
      setCategoryData(null);
      setStaffSummary([]);
      setStaffDetails({});
    } finally {
      setLoading(false);
    }
  };

  const shopOptions = shops.map((shop: any) => ({ value: String(shop.id), label: shop.name }));
  const designerOptions = designers.map((d: any) => ({
    value: String(d.id),
    label: d.shop_name ? `${d.name} - ${d.shop_name}` : d.name,
  }));

  return (
    <AdminPageLayout>
      <PageHeader title="매출 분석" />

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
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              options={shopOptions}
              placeholder="전체 지점"
              wrapperClassName="flex-1 min-w-0 md:max-w-xs"
            />
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
      ) : !hasSearched ? null : (
        <div className="flex flex-col gap-10 mt-6">
          <CategoryBreakdownSection data={categoryData} />
          <StaffAnalysisSection
            staffSummary={staffSummary}
            staffDetails={staffDetails}
            dateMode={searchedDateMode}
          />
        </div>
      )}
    </AdminPageLayout>
  );
}

// Comment: 1) Service revenue grouped by category — same data as 항목별 매출 > 서비스 > 분류
function CategoryTable({ rows }: { rows: ItemSalesRow[] }) {
  const summary = summarizeItemSales(rows);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm [&_td]:whitespace-nowrap [&_td]:border-l [&_td]:border-gray-200 [&_th]:whitespace-nowrap [&_th]:border-l [&_th]:border-gray-200 [&_td:first-child]:border-l-0 [&_th:first-child]:border-l-0">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider w-[140px]" rowSpan={2}>분류</th>
              <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" colSpan={2}>판매</th>
              <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" colSpan={2}>정액권 차감</th>
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
            {rows.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-2 font-medium">{item.category}</td>
                <td className="px-4 py-2 text-center tabular-nums">{item.sales.quantity}</td>
                <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(item.sales.amount)}</td>
                <td className="px-4 py-2 text-center tabular-nums">{item.membershipDeduction.quantity}</td>
                <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(item.membershipDeduction.amount)}</td>
                <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(item.total)}</td>
                <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(item.avgPrice)}</td>
              </tr>
            ))}
            <tr className="bg-yellow-50 border-t-2 border-yellow-200">
              <td className="px-4 py-2 font-bold">합계</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{summary.salesQuantity}</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(summary.salesAmount)}</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{summary.membershipQuantity}</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(summary.membershipAmount)}</td>
              <td className="px-4 py-2 text-center font-bold tabular-nums">{formatAudNumber(summary.totalAmount)}</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(summary.avgPrice)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Comment: One table — API already collapses this into two rows: bookable ("서비스") vs addon/surcharge fees ("Others")
function CategoryBreakdownSection({ data }: { data: ItemSalesResponse | null }) {
  const itemSales = data?.itemSales || [];

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-bold text-black">서비스 분류별 매출</h3>
      {itemSales.length === 0 ? (
        <EmptyState title="해당 기간에 데이터가 없습니다." />
      ) : (
        <CategoryTable rows={itemSales} />
      )}
    </section>
  );
}

// Comment: 2) Staff summary table + per-staff service detail (고객수/시술 건수), all inline — no click-through
function StaffAnalysisSection({
  staffSummary,
  staffDetails,
  dateMode,
}: {
  staffSummary: any[];
  staffDetails: Record<number, ItemSalesResponse | null>;
  dateMode: DateMode;
}) {
  if (staffSummary.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h3 className="text-base font-bold text-black">직원별 매출</h3>
        <EmptyState title="해당 기간에 데이터가 없습니다." />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="text-base font-bold text-black">직원별 매출</h3>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm [&_td]:whitespace-nowrap [&_td]:border-l [&_td]:border-gray-200 [&_th]:whitespace-nowrap [&_th]:border-l [&_th]:border-gray-200 [&_td:first-child]:border-l-0 [&_th:first-child]:border-l-0">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider w-[100px]" rowSpan={2}>직원</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider" rowSpan={2}>판매/차감</th>
                  <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" colSpan={2}>서비스 매출</th>
                  <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" colSpan={2}>제품 매출</th>
                  <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" rowSpan={2}>소계 (A + B)</th>
                  <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" colSpan={2}>정액권 판매</th>
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
                {staffSummary.map((staff) => (
                  <StaffSalesRowBlock key={staff.designerId} staff={staff} nameLabel={staff.name} />
                ))}
                {dateMode === 'period' && staffSummary.length > 0 && (
                  <StaffSalesRowBlock staff={aggregateStaffSales(staffSummary)} nameLabel="전체" />
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h3 className="text-base font-bold text-black">직원별 서비스 상세</h3>
        {staffSummary.map((staff) => (
          <StaffServiceDetail
            key={`detail-${staff.designerId}`}
            staff={staff}
            detail={staffDetails[staff.designerId] ?? null}
          />
        ))}
      </div>
    </section>
  );
}

// Comment: Sum a subset of item rows into the same shape as the API's overall summary.
// customerCount is NOT summed from each row (that would double-count a customer who got
// multiple services in one visit) — pass it in separately from the API's own distinct-customer total.
function summarizeItemSales(rows: ItemSalesRow[], customerCount: number = 0): ItemSalesSummary {
  const totals = rows.reduce(
    (acc, row) => ({
      salesQuantity: acc.salesQuantity + row.sales.quantity,
      salesAmount: acc.salesAmount + row.sales.amount,
      membershipQuantity: acc.membershipQuantity + row.membershipDeduction.quantity,
      membershipAmount: acc.membershipAmount + row.membershipDeduction.amount,
      totalAmount: acc.totalAmount + row.total,
    }),
    { salesQuantity: 0, salesAmount: 0, membershipQuantity: 0, membershipAmount: 0, totalAmount: 0 },
  );

  return {
    ...totals,
    // Comment: 객단가 includes membership/deposit deduction amount (totalAmount), not just cash sales.
    avgPrice: totals.salesQuantity > 0 ? totals.totalAmount / totals.salesQuantity : 0,
    customerCount,
  };
}

function ServiceDetailTable({ rows, customerCount }: { rows: ItemSalesRow[]; customerCount: number }) {
  const summary = summarizeItemSales(rows, customerCount);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm [&_td]:whitespace-nowrap [&_td]:border-l [&_td]:border-gray-200 [&_th]:whitespace-nowrap [&_th]:border-l [&_th]:border-gray-200 [&_td:first-child]:border-l-0 [&_th:first-child]:border-l-0">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">서비스</th>
              <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">시술 건수</th>
              <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">고객 수</th>
              <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">판매 금액</th>
              <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">정액권 차감</th>
              <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">합계</th>
              <th className="px-4 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">평균 단가</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-2 font-medium">{item.serviceName || item.category}</td>
                <td className="px-4 py-2 text-center tabular-nums">{item.sales.quantity}</td>
                <td className="px-4 py-2 text-center tabular-nums">{item.customerCount}</td>
                <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(item.sales.amount)}</td>
                <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(item.membershipDeduction.amount)}</td>
                <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(item.total)}</td>
                <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(item.avgPrice)}</td>
              </tr>
            ))}
            <tr className="bg-yellow-50 border-t-2 border-yellow-200">
              <td className="px-4 py-2 font-bold">합계</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{summary.salesQuantity}</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{summary.customerCount}</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(summary.salesAmount)}</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(summary.membershipAmount)}</td>
              <td className="px-4 py-2 text-center font-bold tabular-nums">{formatAudNumber(summary.totalAmount)}</td>
              <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(summary.avgPrice)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Comment: Only services bookable on the customer booking page (visible_to customer/both)
// belong in the main table — rank/seniority add-on fees etc. drop into a separate "Others" table.
function StaffServiceDetail({ staff, detail }: { staff: any; detail: ItemSalesResponse | null }) {
  const isVirtual = Number(staff.designerId) <= 0;
  const itemSales = detail?.itemSales || [];
  const bookableItems = itemSales.filter((item) => item.customerBookable !== false);
  const otherItems = itemSales.filter((item) => item.customerBookable === false);
  // Comment: 고객수 합계 is the API's own distinct-customer count (one customer booking
  // cut + color + clinic counts once), not a sum of each service row's customerCount.
  const bookableCustomerCount = detail?.summary?.customerCount ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-bold text-gray-900">{staff.name}</h4>
      {isVirtual ? (
        <p className="text-xs text-gray-400 px-1">서비스별 상세 데이터를 제공할 수 없는 직원입니다.</p>
      ) : itemSales.length === 0 ? (
        <p className="text-xs text-gray-400 px-1">해당 기간에 서비스 판매 내역이 없습니다.</p>
      ) : (
        <>
          {bookableItems.length > 0 ? (
            <ServiceDetailTable rows={bookableItems} customerCount={bookableCustomerCount} />
          ) : (
            <p className="text-xs text-gray-400 px-1">해당 기간에 예약 가능한 서비스 판매 내역이 없습니다.</p>
          )}

          {otherItems.length > 0 && (
            <div className="flex flex-col gap-2 pl-2">
              <h5 className="text-xs font-semibold text-gray-500">상세 - Others</h5>
              <ServiceDetailTable rows={otherItems} customerCount={0} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
