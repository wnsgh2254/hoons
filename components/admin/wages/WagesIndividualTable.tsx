'use client';

import React from 'react';
import { Badge, Button, DataTable, EmptyState } from '@/components/ui';

type DateMode = 'monthly' | 'period';

export default function WagesIndividualTable({ wagesData, dateMode, onViewPayslip, onViewDetail }: {
  wagesData: any;
  dateMode: DateMode;
  onViewPayslip: (data: any) => void;
  onViewDetail: (data: any) => void;
}) {
  if (dateMode === 'monthly' && wagesData.weeks) {
    const allWages: any[] = [];
    let totalWage = 0;

    wagesData.weeks.forEach((weekData: any) => {
      (weekData.data.wages || []).forEach((wage: any) => {
        allWages.push({
          ...wage,
          week: weekData.week,
        });
        totalWage += wage.wage || 0;
      });
    });

    const monthlyColumns = [
      {
        key: 'createdAt',
        header: '등록 일시',
        render: () => {
          const createdAt = new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
          return createdAt;
        },
      },
      {
        key: 'name',
        header: '직원',
        render: (wage: any) => <span className="font-medium">{wage.name}</span>,
      },
      {
        key: 'wageType',
        header: '유형',
        align: 'center' as const,
        render: (wage: any) => (
          <Badge variant={wage.wageType === 'hourly' ? 'info' : 'success'}>
            {wage.wageType === 'hourly' ? '시급' : '인센'}
          </Badge>
        ),
      },
      {
        key: 'period',
        header: '근무 기간',
        render: (wage: any) => `${wage.week.startDate} ~ ${wage.week.endDate}`,
      },
      {
        key: 'wage',
        header: '급여',
        align: 'right' as const,
        render: (wage: any) => (
          <span className="tabular-nums">{Math.round(wage.wage || 0).toLocaleString()}</span>
        ),
      },
      {
        key: 'payslip',
        header: '급여 명세서',
        align: 'center' as const,
        render: (wage: any) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewPayslip({
              designer: wage,
              period: { startDate: wage.week.startDate, endDate: wage.week.endDate },
            })}
          >
            보기
          </Button>
        ),
      },
      {
        key: 'detail',
        header: '상세 내역',
        align: 'center' as const,
        render: (wage: any) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetail({
              designerId: wage.designerId,
              designerName: wage.name,
              startDate: wage.week.startDate,
              endDate: wage.week.endDate,
            })}
          >
            보기
          </Button>
        ),
      },
    ];

    return (
      <div>
        <div className="p-4 border border-gray-200 rounded-t-xl bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-black">급여 명세서</h3>
          <div className="text-sm text-gray-600">
            총 <span className="tabular-nums font-semibold text-black">{allWages.length}</span>건, 총 급여{' '}
            <span className="tabular-nums font-semibold text-black">{totalWage.toLocaleString()}</span>
          </div>
        </div>
        <DataTable
          columns={monthlyColumns}
          data={allWages}
          keyExtractor={(wage: any, index?: number) => `${wage.designerId}-${wage.week.weekNum}-${index}`}
          emptyMessage="해당 기간에 급여 데이터가 없습니다."
          className="rounded-t-none border-t-0"
        />
      </div>
    );
  } else if (dateMode === 'period' && wagesData.data) {
    const totalWage = wagesData.data.wages?.reduce((sum: number, w: any) => sum + (w.wage || 0), 0) || 0;
    const periodStr = `${wagesData.startDate} ~ ${wagesData.endDate}`;

    const periodColumns = [
      {
        key: 'createdAt',
        header: '등록 일시',
        render: () => {
          const createdAt = new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
          return createdAt;
        },
      },
      {
        key: 'name',
        header: '직원',
        render: (wage: any) => <span className="font-medium">{wage.name}</span>,
      },
      {
        key: 'wageType',
        header: '유형',
        align: 'center' as const,
        render: (wage: any) => (
          <Badge variant={wage.wageType === 'hourly' ? 'info' : 'success'}>
            {wage.wageType === 'hourly' ? '시급' : '인센'}
          </Badge>
        ),
      },
      {
        key: 'period',
        header: '근무 기간',
        render: () => periodStr,
      },
      {
        key: 'wage',
        header: '급여',
        align: 'right' as const,
        render: (wage: any) => (
          <span className="tabular-nums">{Math.round(wage.wage || 0).toLocaleString()}</span>
        ),
      },
      {
        key: 'payslip',
        header: '급여 명세서',
        align: 'center' as const,
        render: (wage: any) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewPayslip({
              designer: wage,
              period: { startDate: wagesData.startDate, endDate: wagesData.endDate },
            })}
          >
            보기
          </Button>
        ),
      },
      {
        key: 'detail',
        header: '상세 내역',
        align: 'center' as const,
        render: (wage: any) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetail({
              designerId: wage.designerId,
              designerName: wage.name,
              startDate: wagesData.startDate,
              endDate: wagesData.endDate,
            })}
          >
            보기
          </Button>
        ),
      },
    ];

    return (
      <div>
        <div className="p-4 border border-gray-200 rounded-t-xl bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-black">급여 명세서</h3>
          <div className="text-sm text-gray-600">
            총 <span className="tabular-nums font-semibold text-black">{wagesData.data.wages?.length || 0}</span>건, 총 급여{' '}
            <span className="tabular-nums font-semibold text-black">{totalWage.toLocaleString()}</span>
          </div>
        </div>
        <DataTable
          columns={periodColumns}
          data={wagesData.data.wages || []}
          keyExtractor={(wage: any) => wage.designerId}
          emptyMessage="해당 기간에 급여 데이터가 없습니다."
          className="rounded-t-none border-t-0"
        />
      </div>
    );
  }

  return (
    <EmptyState title="해당 기간에 급여 데이터가 없습니다." />
  );
}
