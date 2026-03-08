'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Modal, Button, Input, Select } from '@/components/ui';

function computePeriodEnd(
  startDate: string,
  getSydneyToday: () => string,
  getLastDayOfMonth: (year: number, month: number) => string
): string {
  if (!startDate || startDate.length < 10) return '';
  const [y, m] = startDate.split('-').map(Number);
  const today = getSydneyToday();
  const [ty, tm] = today.split('-').map(Number);
  const lastDay = getLastDayOfMonth(y, m);
  if (y === ty && m === tm) return today;
  return lastDay;
}

function parseNumber(s: string): number {
  const n = parseInt(s.replace(/,/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}

export default function PayslipCreateModal({
  designers,
  onClose,
  getSydneyToday,
  getLastDayOfMonth,
}: {
  designers: any[];
  onClose: () => void;
  getSydneyToday: () => string;
  getLastDayOfMonth: (year: number, month: number) => string;
}) {
  const today = getSydneyToday();
  const [periodStart, setPeriodStart] = useState<string>(() => {
    const [y, m] = today.split('-').map(Number);
    return `${y}-${String(m).padStart(2, '0')}-01`;
  });
  const periodEnd = useMemo(
    () => computePeriodEnd(periodStart, getSydneyToday, getLastDayOfMonth),
    [periodStart, getSydneyToday, getLastDayOfMonth]
  );
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>('');
  const [basePay, setBasePay] = useState<string>('');
  const [incentive, setIncentive] = useState<string>('');
  const [advancePay, setAdvancePay] = useState<string>('');
  const [loadingIncentive, setLoadingIncentive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [incentiveBreakdown, setIncentiveBreakdown] = useState<{
    serviceSales: number;
    serviceDeduction: number;
    productSales: number;
    productDeduction: number;
    hourlyPay: number;
  } | null>(null);

  const basePayNum = parseNumber(basePay);
  const incentiveNum = parseNumber(incentive);
  const salaryTotal = basePayNum + incentiveNum;
  const deductionTotal = 0;
  const actualPay = salaryTotal - deductionTotal;
  const advancePayNum = parseNumber(advancePay);
  const netPay = actualPay - advancePayNum;

  const incentiveSum = incentiveBreakdown
    ? (incentiveBreakdown.serviceSales - incentiveBreakdown.serviceDeduction) +
      (incentiveBreakdown.productSales - incentiveBreakdown.productDeduction) +
      incentiveBreakdown.hourlyPay
    : 0;

  useEffect(() => {
    if (!selectedDesignerId || !periodStart || !periodEnd) return;
    const fetchIncentive = async () => {
      setLoadingIncentive(true);
      setIncentiveBreakdown(null);
      try {
        const res = await fetch(
          `/api/wages/calculate?start_date=${periodStart}&end_date=${periodEnd}&designer_id=${selectedDesignerId}`
        );
        const data = await res.json();
        if (res.ok && data.wages?.[0]) {
          const w = data.wages[0];
          const s = w.sales || {};
          setIncentive(String(Math.round(w.wage || 0)));
          setIncentiveBreakdown({
            serviceSales: Number(s.serviceSales ?? 0),
            serviceDeduction: Number(s.serviceDeduction ?? 0),
            productSales: Number(s.productSales ?? 0),
            productDeduction: Number(s.productDeduction ?? 0),
            hourlyPay: Number(s.hourlyPay ?? 0),
          });
        }
      } catch (err) {
        console.error('Error fetching incentive:', err);
      } finally {
        setLoadingIncentive(false);
      }
    };
    fetchIncentive();
  }, [selectedDesignerId, periodStart, periodEnd]);

  const handleSave = () => {
    setErrorMessage('');
    if (!selectedDesignerId) {
      setErrorMessage('직원을 선택해주세요.');
      return;
    }
    setErrorMessage('저장 기능은 백엔드 연동 후 적용됩니다.');
  };

  const handleSaveAndContinue = () => {
    handleSave();
    setSelectedDesignerId('');
    setBasePay('');
    setIncentive('');
    setIncentiveBreakdown(null);
    setAdvancePay('');
  };

  const designerOptions = designers.map((d) => ({
    value: String(d.id),
    label: d.name,
  }));

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="급여 명세서 작성"
      maxWidth="max-w-2xl"
      scrollable
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSaveAndContinue}>
            저장 후 계속
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Error message */}
        {errorMessage && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{errorMessage}</p>
        )}

        {/* Period & designer selection */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">근무 기간</span>
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-auto"
            />
            <span className="text-gray-400">~</span>
            <Input
              type="date"
              value={periodEnd}
              readOnly
              className="w-auto bg-gray-50 text-gray-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">직원</span>
            <Select
              value={selectedDesignerId}
              onChange={(e) => setSelectedDesignerId(e.target.value)}
              options={designerOptions}
              placeholder="선택"
              className="min-w-[140px]"
            />
            <Button variant="outline" size="sm" onClick={() => setSelectedDesignerId('')}>
              다시 선택
            </Button>
          </div>
        </div>

        {/* Salary & Deduction section */}
        <div>
          <h3 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">settings</span>
            급여 및 공제 항목
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">급여 항목</div>
              <div className="space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-gray-700">기본급</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={basePay}
                    onChange={(e) => setBasePay(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-28 text-right tabular-nums"
                  />
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-gray-700">인센티브</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={incentive}
                    onChange={(e) => setIncentive(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-28 text-right tabular-nums"
                  />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
                <span className="text-sm font-bold text-gray-900">급여 합계</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">{salaryTotal.toLocaleString()}</span>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">공제 항목</div>
              <div className="text-sm text-gray-500">해당 없음</div>
              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
                <span className="text-sm font-bold text-gray-900">공제 합계</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">0</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">실지급액 (급여 합계 - 공제 합계)</span>
              <span className="font-bold text-black tabular-nums">{actualPay.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center gap-2 text-sm">
              <span className="text-gray-700">가지급금</span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={advancePay}
                onChange={(e) => setAdvancePay(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-28 text-right tabular-nums"
              />
            </div>
            <div className="flex justify-between text-sm pt-2 border-t-2 border-gray-300">
              <span className="font-bold text-gray-900">차감 지급 금액 (실지급액 - 가지급금)</span>
              <span className="font-bold text-black tabular-nums">{netPay.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Incentive breakdown */}
        <div>
          <h3 className="text-sm font-bold text-black mb-3">인센티브 내역</h3>
          {loadingIncentive ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  {/* Row 1: Group headers */}
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th colSpan={2} className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-200">
                      서비스
                    </th>
                    <th colSpan={2} className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-200">
                      제품
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-200">
                      시급
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">
                      합계
                    </th>
                  </tr>
                  {/* Row 2: Sub headers */}
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">판매</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">차감</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">판매</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">차감</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200"></th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {incentiveBreakdown ? incentiveBreakdown.serviceSales.toLocaleString() : '0'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {incentiveBreakdown ? incentiveBreakdown.serviceDeduction.toLocaleString() : '0'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {incentiveBreakdown ? incentiveBreakdown.productSales.toLocaleString() : '0'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {incentiveBreakdown ? incentiveBreakdown.productDeduction.toLocaleString() : '0'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {incentiveBreakdown ? incentiveBreakdown.hourlyPay.toLocaleString() : '0'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                      {Math.round(incentiveSum).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
