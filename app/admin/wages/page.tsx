'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useStaff } from '@/hooks/useStaff';
import { getSydneyToday } from '@/lib/utils/appointment-utils';
import {
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getWeeksInMonth,
} from '@/lib/utils/wage-utils';
import {
  AdminPageLayout,
  PageHeader,
  Button,
  Select,
  Input,
  Tabs,
} from '@/components/ui';

import WagesOverview from '@/components/admin/wages/WagesOverview';
import WagesIndividualTable from '@/components/admin/wages/WagesIndividualTable';
import PayslipModal from '@/components/admin/wages/PayslipModal';
import DetailHistoryModal from '@/components/admin/wages/DetailHistoryModal';
import IncentivesModal from '@/components/admin/wages/IncentivesModal';
import PayslipCreateModal from '@/components/admin/wages/PayslipCreateModal';

type DateMode = 'monthly' | 'period';

export default function WagesPage() {
  const [activeMainTab, setActiveMainTab] = useState<'overview' | 'individual'>('overview');
  const [viewingIncentives, setViewingIncentives] = useState(false);
  const [isPayslipCreateModalOpen, setIsPayslipCreateModalOpen] = useState(false);
  const { staff: designers } = useStaff();

  return (
    <AdminPageLayout>
      <PageHeader
        title="급여 관리"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setViewingIncentives(true)}>
              직원별 인센티브
            </Button>
            <Button variant="outline" onClick={() => setIsPayslipCreateModalOpen(true)}>
              급여 명세서 작성
            </Button>
            <Link
              href="/admin/wages/settings"
              className="px-4 py-2.5 bg-transparent text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors inline-flex items-center justify-center"
            >
              급여 설정
            </Link>
          </div>
        }
      />

      <Tabs
        tabs={[
          { key: 'overview', label: '전체 보기' },
          { key: 'individual', label: '개인 명세서' },
        ]}
        activeTab={activeMainTab}
        onTabChange={(key) => setActiveMainTab(key as 'overview' | 'individual')}
      />

      {activeMainTab === 'overview' ? (
        <WagesOverview />
      ) : (
        <WagesIndividualView designers={designers} />
      )}

      {viewingIncentives && (
        <IncentivesModal onClose={() => setViewingIncentives(false)} />
      )}

      {isPayslipCreateModalOpen && (
        <PayslipCreateModal
          designers={designers}
          onClose={() => setIsPayslipCreateModalOpen(false)}
          getSydneyToday={getSydneyToday}
          getLastDayOfMonth={getLastDayOfMonth}
        />
      )}
    </AdminPageLayout>
  );
}

function WagesIndividualView({ designers }: { designers: ReturnType<typeof useStaff>['staff'] }) {
  const [dateMode, setDateMode] = useState<DateMode>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [wagesData, setWagesData] = useState<any>(null);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [viewingPayslip, setViewingPayslip] = useState<any>(null);
  const [viewingDetail, setViewingDetail] = useState<any>(null);

  const weeks = useMemo(() => {
    if (dateMode === 'monthly' && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      return getWeeksInMonth(year, month);
    }
    return [];
  }, [dateMode, selectedMonth]);

  const handleSearch = () => {
    if (dateMode === 'monthly' && !selectedMonth) {
      alert('월을 선택해주세요.');
      return;
    }
    if (dateMode === 'period' && (!startDate || !endDate)) {
      alert('시작 날짜와 종료 날짜를 선택해주세요.');
      return;
    }
    if (!selectedDesignerId) {
      alert('직원을 선택해주세요.');
      return;
    }
    setShouldFetch(true);
  };

  useEffect(() => {
    if (!shouldFetch) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        if (dateMode === 'monthly') {
          const weekDataPromises = weeks.map(async (week) => {
            const params = new URLSearchParams();
            params.append('start_date', week.startDate);
            params.append('end_date', week.endDate);
            if (selectedDesignerId) {
              params.append('designer_id', selectedDesignerId);
            }

            const res = await fetch(`/api/wages/calculate?${params.toString()}`);
            if (!res.ok) {
              throw new Error('Failed to fetch wages data');
            }
            const data = await res.json();
            return { week, data };
          });

          const weekResults = await Promise.all(weekDataPromises);
          setWagesData({ weeks: weekResults, mode: 'monthly' });
        } else {
          const params = new URLSearchParams();
          params.append('start_date', startDate);
          params.append('end_date', endDate);
          if (selectedDesignerId) {
            params.append('designer_id', selectedDesignerId);
          }

          const res = await fetch(`/api/wages/calculate?${params.toString()}`);
          if (!res.ok) {
            throw new Error('Failed to fetch wages data');
          }
          const data = await res.json();
          setWagesData({ data, mode: 'period', startDate, endDate });
        }
      } catch (error) {
        console.error('Error fetching wages data:', error);
        setWagesData(null);
      } finally {
        setLoading(false);
        setShouldFetch(false);
      }
    };

    fetchData();
  }, [shouldFetch, dateMode, selectedMonth, startDate, endDate, selectedDesignerId, weeks]);

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

  const designerOptions = designers.map((designer) => ({
    value: String(designer.id),
    label: designer.name,
  }));

  return (
    <>
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
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
              placeholder="직원을 선택하세요"
              required
            />
          </div>

          <Button icon="search" size="sm" onClick={handleSearch}>
            검색
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-11.5 text-gray-500">로딩 중...</div>
      ) : wagesData ? (
        <WagesIndividualTable
          wagesData={wagesData}
          dateMode={dateMode}
          onViewPayslip={setViewingPayslip}
          onViewDetail={setViewingDetail}
        />
      ) : null}

      {viewingPayslip && (
        <PayslipModal
          payslip={viewingPayslip}
          onClose={() => setViewingPayslip(null)}
          onViewDetail={setViewingDetail}
        />
      )}

      {viewingDetail && (
        <DetailHistoryModal
          detail={viewingDetail}
          onClose={() => setViewingDetail(null)}
        />
      )}

    </>
  );
}
