'use client';

import React from 'react';
import { formatAudNumber } from '@/lib/utils';
import { Button, Input } from '@/components/ui';

type DateMode = 'daily' | 'period';

// Comment: Shared date filter bar used across sales tabs and the sales analysis page
export function DateFilterBar({
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

// Comment: Shared staff sales row block (판매 / 회원권 차감 / 디파짓 / 합계)
export function StaffSalesRowBlock({
  staff,
  nameLabel,
}: {
  staff: any;
  nameLabel: string;
}) {
  const depositServiceAmount = staff.deposit?.service?.amount ?? 0;
  const salesServiceNet = staff.sales.service.amount - depositServiceAmount;
  const salesSubtotalNet = staff.sales.subtotal - depositServiceAmount;
  const salesTotalNet = staff.sales.total - depositServiceAmount;
  const grandTotal =
    staff.total.subtotal + (staff.sales.membership?.amount ?? 0);

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50/50">
        <td className="px-4 py-2 font-medium" rowSpan={4}>
          {nameLabel}
        </td>
        <td className="px-4 py-2 font-medium">판매</td>
        <td className="px-4 py-2 text-center tabular-nums">{staff.sales.service.quantity}</td>
        <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(salesServiceNet)}</td>
        <td className="px-4 py-2 text-center tabular-nums">{staff.sales.product.quantity}</td>
        <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(staff.sales.product.amount)}</td>
        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(salesSubtotalNet)}</td>
        <td className="px-4 py-2 text-center tabular-nums">{staff.sales.membership.quantity}</td>
        <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(staff.sales.membership.amount)}</td>
        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(salesTotalNet)}</td>
      </tr>
      <tr className="border-b border-gray-100 hover:bg-gray-50/50">
        <td className="px-4 py-2 font-medium !border-l !border-gray-200">회원권 차감</td>
        <td className="px-4 py-2 text-center tabular-nums">{staff.membershipDeduction.service.quantity}</td>
        <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(staff.membershipDeduction.service.amount)}</td>
        <td className="px-4 py-2 text-center tabular-nums">{staff.membershipDeduction.product?.quantity ?? 0}</td>
        <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(staff.membershipDeduction.product?.amount ?? 0)}</td>
        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(staff.membershipDeduction.subtotal)}</td>
        <td className="px-4 py-2 text-center"></td>
        <td className="px-4 py-2 text-center"></td>
        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(staff.membershipDeduction.subtotal)}</td>
      </tr>
      <tr className="border-b border-gray-100 hover:bg-gray-50/50">
        <td className="px-4 py-2 font-medium !border-l !border-gray-200">디파짓</td>
        <td className="px-4 py-2 text-center tabular-nums"></td>
        <td className="px-4 py-2 text-center tabular-nums">{formatAudNumber(depositServiceAmount)}</td>
        <td className="px-4 py-2 text-center tabular-nums"></td>
        <td className="px-4 py-2 text-center tabular-nums"></td>
        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(depositServiceAmount)}</td>
        <td className="px-4 py-2 text-center tabular-nums"></td>
        <td className="px-4 py-2 text-center tabular-nums"></td>
        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(depositServiceAmount)}</td>
      </tr>
      <tr className="bg-yellow-50 border-b-2 border-yellow-200">
        <td className="px-4 py-2 font-bold !border-l !border-gray-200">합계</td>
        <td className="px-4 py-2 text-center"></td>
        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(staff.total.service.amount)}</td>
        <td className="px-4 py-2 text-center"></td>
        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(staff.total.product.amount)}</td>
        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(staff.total.subtotal)}</td>
        <td className="px-4 py-2 text-center tabular-nums">{staff.sales.membership.quantity}</td>
        <td className="px-4 py-2 text-center font-semibold tabular-nums">{formatAudNumber(staff.sales.membership.amount)}</td>
        <td className="px-4 py-2 text-center font-bold tabular-nums">{formatAudNumber(grandTotal)}</td>
      </tr>
    </>
  );
}

export function emptyStaffPaymentDetails() {
  return {
    cash: { service: 0, product: 0, membership: 0, total: 0 },
    card: { service: 0, product: 0, membership: 0, total: 0 },
    bank_transfer: { service: 0, product: 0, membership: 0, total: 0 },
    prepaid_pass: { service: 0, product: 0, membership: 0, total: 0 },
    deposit: { service: 0, product: 0, membership: 0, total: 0 },
    columnTotals: { service: 0, product: 0, membership: 0, total: 0 },
  };
}

function mergeStaffPaymentDetails(target: any, source: any) {
  if (!source) return;
  (['cash', 'card', 'bank_transfer', 'prepaid_pass', 'deposit', 'columnTotals'] as const).forEach(
    (key) => {
      const src = source[key];
      if (!src) return;
      target[key].service += Number(src.service || 0);
      target[key].product += Number(src.product || 0);
      target[key].membership += Number(src.membership || 0);
      target[key].total += Number(src.total || 0);
    },
  );
}

// Comment: Payment-method breakdown per staff (same layout as 전체 매출)
export function StaffPaymentDetailsRowBlock({
  staff,
  nameLabel,
}: {
  staff: any;
  nameLabel: string;
}) {
  const pd = staff.paymentDetails || emptyStaffPaymentDetails();
  const rows: Array<{ label: string; bucket: any; bold?: boolean }> = [
    { label: '현금', bucket: pd.cash },
    { label: '카드', bucket: pd.card },
    { label: '계좌 이체', bucket: pd.bank_transfer },
    { label: '정액권', bucket: pd.prepaid_pass },
    { label: '디파짓', bucket: pd.deposit },
    { label: '합계', bucket: pd.columnTotals, bold: true },
  ];

  return (
    <>
      {rows.map((row, index) => (
        <tr
          key={`${nameLabel}-${row.label}`}
          className={
            row.bold
              ? 'bg-gray-50 border-t-2 border-gray-300'
              : 'border-b border-gray-100 hover:bg-gray-50/50'
          }
        >
          {index === 0 ? (
            <td className="px-4 py-2 font-medium" rowSpan={rows.length}>
              {nameLabel}
            </td>
          ) : null}
          <td
            className={`px-4 py-2 ${row.bold ? 'font-bold' : 'font-medium'} ${
              index > 0 ? '!border-l !border-gray-200' : ''
            }`}
          >
            {row.label}
          </td>
          <td className={`px-4 py-2 text-center tabular-nums ${row.bold ? 'font-semibold' : ''}`}>
            {formatAudNumber(row.bucket?.service ?? 0)}
          </td>
          <td className={`px-4 py-2 text-center tabular-nums ${row.bold ? 'font-semibold' : ''}`}>
            {formatAudNumber(row.bucket?.product ?? 0)}
          </td>
          <td className={`px-4 py-2 text-center tabular-nums ${row.bold ? 'font-semibold' : ''}`}>
            {formatAudNumber(row.bucket?.membership ?? 0)}
          </td>
          <td
            className={`px-4 py-2 text-center tabular-nums ${
              row.bold ? 'font-bold' : 'font-semibold'
            }`}
          >
            {formatAudNumber(row.bucket?.total ?? 0)}
          </td>
        </tr>
      ))}
    </>
  );
}

export function aggregateStaffSales(staffList: any[]) {
  const aggregated = {
    sales: {
      service: { quantity: 0, amount: 0 },
      product: { quantity: 0, amount: 0 },
      membership: { quantity: 0, amount: 0 },
      subtotal: 0,
      total: 0,
    },
    membershipDeduction: {
      service: { quantity: 0, amount: 0 },
      product: { quantity: 0, amount: 0 },
      subtotal: 0,
    },
    total: {
      service: { amount: 0 },
      product: { amount: 0 },
      subtotal: 0,
    },
    deposit: {
      service: { amount: 0 },
    },
    paymentDetails: emptyStaffPaymentDetails(),
  };

  staffList.forEach((staff) => {
    aggregated.sales.service.quantity += staff.sales.service.quantity;
    aggregated.sales.service.amount += staff.sales.service.amount;
    aggregated.sales.product.quantity += staff.sales.product.quantity;
    aggregated.sales.product.amount += staff.sales.product.amount;
    aggregated.sales.membership.quantity += staff.sales.membership.quantity;
    aggregated.sales.membership.amount += staff.sales.membership.amount;
    aggregated.membershipDeduction.service.quantity += staff.membershipDeduction.service.quantity;
    aggregated.membershipDeduction.service.amount += staff.membershipDeduction.service.amount;
    aggregated.membershipDeduction.product.quantity += staff.membershipDeduction.product?.quantity ?? 0;
    aggregated.membershipDeduction.product.amount += staff.membershipDeduction.product?.amount ?? 0;
    aggregated.total.service.amount += staff.total.service.amount;
    aggregated.total.product.amount += staff.total.product.amount;
    aggregated.deposit.service.amount += staff.deposit?.service?.amount ?? 0;
    mergeStaffPaymentDetails(aggregated.paymentDetails, staff.paymentDetails);
  });

  aggregated.sales.subtotal =
    aggregated.sales.service.amount + aggregated.sales.product.amount;
  aggregated.sales.total =
    aggregated.sales.subtotal + aggregated.sales.membership.amount;
  aggregated.membershipDeduction.subtotal =
    aggregated.membershipDeduction.service.amount +
    aggregated.membershipDeduction.product.amount;
  aggregated.total.subtotal =
    aggregated.total.service.amount + aggregated.total.product.amount;

  return aggregated;
}
