'use client';

import React, { useState, useMemo } from 'react';
import { useStaff } from '@/hooks/useStaff';
import { getFirstDayOfMonth, getLastDayOfMonth } from '@/lib/utils/wage-utils';
import { Modal, Button, Input, Select, EmptyState } from '@/components/ui';

type DateMode = 'monthly' | 'period';

export default function IncentivesModal({ onClose }: { onClose: () => void }) {
  const [dateMode, setDateMode] = useState<DateMode>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [incentivesData, setIncentivesData] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { staff: designers } = useStaff();

  const handleSearch = async () => {
    setErrorMessage('');
    if (dateMode === 'monthly' && !selectedMonth) {
      setErrorMessage('월을 선택해주세요.');
      return;
    }
    if (dateMode === 'period' && (!startDate || !endDate)) {
      setErrorMessage('시작 날짜와 종료 날짜를 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      let start = '';
      let end = '';

      if (dateMode === 'monthly') {
        const [year, month] = selectedMonth.split('-').map(Number);
        start = getFirstDayOfMonth(year, month);
        end = getLastDayOfMonth(year, month);
      } else {
        start = startDate;
        end = endDate;
      }

      const params = new URLSearchParams();
      params.append('start_date', start);
      params.append('end_date', end);
      if (selectedDesignerId) {
        params.append('designer_id', selectedDesignerId);
      }

      const res = await fetch(`/api/wages/calculate?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch incentives data');
      }
      const data = await res.json();
      setIncentivesData(data.wages || []);
    } catch (error) {
      console.error('Error fetching incentives data:', error);
      setIncentivesData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month;

    if (direction === 'prev') {
      newMonth--;
      if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
    } else {
      newMonth++;
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      }
    }

    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const totals = useMemo(() => {
    return incentivesData.reduce((acc, item) => {
      const isPercentType = item.wageType === 'percent';
      const rate = item.calculationDetails?.rate || 0;

      if (isPercentType) {
        acc.serviceSales += Math.round(item.sales?.serviceSales || 0);
        acc.serviceDeduction += Math.round(item.sales?.serviceDeduction || 0);
        acc.productSales += Math.round(item.sales?.productSales || 0);
        if (rate > 0) {
          acc.membershipSales += Math.round(((item.sales?.membership || 0) * rate) / 100);
        }
      }

      acc.total += item.wage || 0;
      return acc;
    }, {
      serviceSales: 0,
      serviceDeduction: 0,
      productSales: 0,
      productDeduction: 0,
      membershipSales: 0,
      total: 0,
    });
  }, [incentivesData]);

  const handleExcelDownload = async (designerId: number, designerName: string) => {
    setErrorMessage(`${designerName}님의 인센티브 엑셀 다운로드 기능은 준비 중입니다.`);
  };

  const designerOptions = designers.map((designer) => ({
    value: String(designer.id),
    label: designer.name,
  }));

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="직원별 인센티브"
      maxWidth="max-w-5xl"
      scrollable
    >
      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-start">
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={dateMode === 'monthly'}
                onChange={() => setDateMode('monthly')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">월</span>
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

          {dateMode === 'monthly' ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleMonthChange('prev')}>
                &lt;
              </Button>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-auto"
              />
              <Button variant="outline" size="sm" onClick={() => handleMonthChange('next')}>
                &gt;
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
              <span className="text-gray-400">~</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-auto"
              />
            </div>
          )}

          <div className="flex-1">
            <Select
              value={selectedDesignerId}
              onChange={(e) => setSelectedDesignerId(e.target.value)}
              options={designerOptions}
              placeholder="전체"
            />
          </div>

          <Button icon="search" size="sm" onClick={handleSearch}>
            검색
          </Button>
        </div>
        {errorMessage && (
          <p className="text-sm text-red-600 mt-2">{errorMessage}</p>
        )}
      </div>

      {loading ? (
        <EmptyState title="로딩 중..." />
      ) : incentivesData.length === 0 ? (
        <EmptyState title="데이터가 없습니다. 검색을 실행해주세요." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {/* Row 1: Group headers */}
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-200" rowSpan={2}>
                    직원
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-200" colSpan={2}>
                    서비스
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-200" colSpan={2}>
                    제품
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-200" rowSpan={2}>
                    정액권 판매
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-200" rowSpan={2}>
                    합계
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider" rowSpan={2}>
                    엑셀
                  </th>
                </tr>
                {/* Row 2: Sub headers */}
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">판매</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">차감</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">판매</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">차감</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {incentivesData.map((item: any) => {
                  const isPercentType = item.wageType === 'percent';
                  const rate = item.calculationDetails?.rate || 0;

                  const serviceSales = isPercentType ? Math.round(item.sales?.serviceSales || 0) : 0;
                  const serviceDeduction = isPercentType ? Math.round(item.sales?.serviceDeduction || 0) : 0;
                  const productSales = isPercentType ? Math.round(item.sales?.productSales || 0) : 0;
                  const productDeduction = isPercentType ? Math.round(item.sales?.productDeduction || 0) : 0;
                  const membershipSales = isPercentType && rate > 0
                    ? Math.round(((item.sales?.membership || 0) * rate) / 100) : 0;
                  const total = item.wage || 0;

                  return (
                    <tr key={item.designerId} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-100">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">
                        {serviceSales > 0 ? serviceSales.toLocaleString() : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">
                        {serviceDeduction > 0 ? serviceDeduction.toLocaleString() : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">
                        {productSales > 0 ? productSales.toLocaleString() : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">
                        {productDeduction > 0 ? productDeduction.toLocaleString() : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">
                        {membershipSales > 0 ? membershipSales.toLocaleString() : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums font-semibold text-gray-900 border-r border-gray-100">
                        {total.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="download"
                          onClick={() => handleExcelDownload(item.designerId, item.name)}
                        >
                          엑셀
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {incentivesData.length > 0 && (
                  <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-100">합계</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {totals.serviceSales > 0 ? totals.serviceSales.toLocaleString() : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {totals.serviceDeduction > 0 ? totals.serviceDeduction.toLocaleString() : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {totals.productSales > 0 ? totals.productSales.toLocaleString() : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {totals.productDeduction > 0 ? totals.productDeduction.toLocaleString() : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {totals.membershipSales > 0 ? totals.membershipSales.toLocaleString() : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {totals.total.toLocaleString()}
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
