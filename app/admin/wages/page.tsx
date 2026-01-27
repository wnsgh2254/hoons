'use client';

import React, { useEffect, useState, useMemo } from 'react';
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

// Comment: Get first day of month
function getFirstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

// Comment: Get last day of month
function getLastDayOfMonth(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

// Comment: Get weeks in a month (1주차부터 일주일씩)
function getWeeksInMonth(year: number, month: number): Array<{ weekNum: number; startDate: string; endDate: string }> {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const weeks: Array<{ weekNum: number; startDate: string; endDate: string }> = [];
  
  // Comment: Find first Monday of the month (or use first day if it's Monday)
  let currentDate = new Date(firstDay);
  const firstDayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Comment: Go back to Monday (or use first day if it's Monday)
  if (firstDayOfWeek === 0) {
    // If Sunday, go to previous Monday
    currentDate.setDate(currentDate.getDate() - 6);
  } else if (firstDayOfWeek !== 1) {
    // If not Monday, go back to Monday
    currentDate.setDate(currentDate.getDate() - (firstDayOfWeek - 1));
  }
  
  let weekNum = 1;
  while (currentDate <= lastDay) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Comment: Only include weeks that overlap with the month
    if (weekEnd >= firstDay) {
      const startDate = weekStart.toISOString().split('T')[0];
      const endDate = weekEnd > lastDay ? lastDay.toISOString().split('T')[0] : weekEnd.toISOString().split('T')[0];
      
      weeks.push({
        weekNum,
        startDate,
        endDate,
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 7);
    weekNum++;
  }
  
  return weeks;
}

type DateMode = 'monthly' | 'period';

export default function WagesPage() {
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
  const [designers, setDesigners] = useState<any[]>([]);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [viewingPayslip, setViewingPayslip] = useState<any>(null);
  const [viewingDetail, setViewingDetail] = useState<any>(null);
  const [viewingIncentives, setViewingIncentives] = useState(false);

  // Comment: Calculate weeks for selected month
  const weeks = useMemo(() => {
    if (dateMode === 'monthly' && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      return getWeeksInMonth(year, month);
    }
    return [];
  }, [dateMode, selectedMonth]);

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

  // Comment: Fetch wages data for all weeks in monthly mode
  useEffect(() => {
    if (!shouldFetch) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        if (dateMode === 'monthly') {
          // Comment: Fetch data for each week
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
          // Comment: Period mode - single fetch
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

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex flex-col">
      <AdminTopNav />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-gray-50/50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-black">급여 명세서</h1>
              <div className="flex gap-2">
                <button 
                  onClick={() => setViewingIncentives(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  직원별 인센티브
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                  급여 명세서 작성
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                  급여 설정
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
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
                    <button
                      onClick={() => handleMonthChange('prev')}
                      className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      &lt;
                    </button>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <button
                      onClick={() => handleMonthChange('next')}
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
                  <select
                    value={selectedDesignerId}
                    onChange={(e) => setSelectedDesignerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                    required
                  >
                    <option value="">직원을 선택하세요</option>
                    {designers.map((designer) => (
                      <option key={designer.id} value={designer.id}>
                        {designer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">search</span>
                  검색
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-500">로딩 중...</div>
            ) : wagesData ? (
              <WagesTable 
                wagesData={wagesData} 
                dateMode={dateMode}
                onViewPayslip={setViewingPayslip}
                onViewDetail={setViewingDetail}
              />
            ) : null}
          </div>
        </div>
      </main>

      {/* Payslip Modal */}
      {viewingPayslip && (
        <PayslipModal
          payslip={viewingPayslip}
          onClose={() => setViewingPayslip(null)}
          onViewDetail={setViewingDetail}
        />
      )}

      {/* Detail History Modal */}
      {viewingDetail && (
        <DetailHistoryModal
          detail={viewingDetail}
          onClose={() => setViewingDetail(null)}
        />
      )}

      {/* Incentives Modal */}
      {viewingIncentives && (
        <IncentivesModal
          onClose={() => setViewingIncentives(false)}
        />
      )}
    </div>
  );
}

// Comment: Wages Table Component
function WagesTable({ wagesData, dateMode, onViewPayslip, onViewDetail }: {
  wagesData: any;
  dateMode: DateMode;
  onViewPayslip: (data: any) => void;
  onViewDetail: (data: any) => void;
}) {
  if (dateMode === 'monthly' && wagesData.weeks) {
    // Comment: Monthly mode - show weeks
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

    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-black">급여 명세서</h3>
          <div className="text-sm text-gray-600">
            총 {allWages.length}건, 총 급여 {totalWage.toLocaleString()}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  등록 일시
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  직원
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  근무 기간
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  급여
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  급여 명세서
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  상세 내역
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allWages.map((wage: any, index: number) => {
                const periodStart = wage.week.startDate;
                const periodEnd = wage.week.endDate;
                const periodStr = `${periodStart} ~ ${periodEnd}`;
                const createdAt = new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <tr key={`${wage.designerId}-${wage.week.weekNum}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{createdAt}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{wage.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{periodStr}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-900">
                      {Math.round(wage.wage || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onViewPayslip({
                          designer: wage,
                          period: { startDate: periodStart, endDate: periodEnd },
                        })}
                        className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                      >
                        보기
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onViewDetail({
                          designerId: wage.designerId,
                          designerName: wage.name,
                          startDate: periodStart,
                          endDate: periodEnd,
                        })}
                        className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  } else if (dateMode === 'period' && wagesData.data) {
    // Comment: Period mode - single period
    const totalWage = wagesData.data.wages?.reduce((sum: number, w: any) => sum + (w.wage || 0), 0) || 0;
    const periodStr = `${wagesData.startDate} ~ ${wagesData.endDate}`;
    
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-black">급여 명세서</h3>
          <div className="text-sm text-gray-600">
            총 {wagesData.data.wages?.length || 0}건, 총 급여 {totalWage.toLocaleString()}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  등록 일시
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  직원
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  근무 기간
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  급여
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  급여 명세서
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  상세 내역
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {wagesData.data.wages?.map((wage: any) => {
                const createdAt = new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <tr key={wage.designerId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{createdAt}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{wage.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{periodStr}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-900">
                      {Math.round(wage.wage || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onViewPayslip({
                          designer: wage,
                          period: { startDate: wagesData.startDate, endDate: wagesData.endDate },
                        })}
                        className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                      >
                        보기
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onViewDetail({
                          designerId: wage.designerId,
                          designerName: wage.name,
                          startDate: wagesData.startDate,
                          endDate: wagesData.endDate,
                        })}
                        className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12 text-gray-500">
      해당 기간에 급여 데이터가 없습니다.
    </div>
  );
}

// Comment: Payslip Modal Component (2nd image)
function PayslipModal({ payslip, onClose, onViewDetail }: {
  payslip: any;
  onClose: () => void;
  onViewDetail: (data: any) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [payslipData, setPayslipData] = useState<any>(null);

  useEffect(() => {
    const fetchPayslipData = async () => {
      try {
        setLoading(true);
        // Comment: Fetch detailed payslip data
        const res = await fetch(
          `/api/wages/calculate?start_date=${payslip.period.startDate}&end_date=${payslip.period.endDate}&designer_id=${payslip.designer.designerId}`
        );
        const data = await res.json();
        setPayslipData(data);
      } catch (error) {
        console.error('Error fetching payslip data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayslipData();
  }, [payslip]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </div>
    );
  }

  const designer = payslip.designer;
  const period = payslip.period;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-black text-white p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">급여 명세서 ({designer.name} 님)</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 text-right text-sm text-gray-600">
            근무 기간: {period.startDate} ~ {period.endDate}
          </div>
          
          {/* 급여 및 공제 항목 */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-black mb-4">급여 및 공제 항목</h3>
            <div className="grid grid-cols-2 gap-4 border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">기본급</span>
                    <span className="text-sm font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">인센티브</span>
                    <span className="text-sm font-medium text-gray-900">
                      {payslipData?.wages?.[0]?.wage?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">식대</span>
                    <span className="text-sm font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">직책 수당</span>
                    <span className="text-sm font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">자격 수당</span>
                    <span className="text-sm font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">초과 근무 수당</span>
                    <span className="text-sm font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">휴일 근무 수당</span>
                    <span className="text-sm font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">연차 수당</span>
                    <span className="text-sm font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">기타 수당1</span>
                    <span className="text-sm font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">기타 수당2</span>
                    <span className="text-sm font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">기타 수당3</span>
                    <span className="text-sm font-medium text-gray-900">-</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">제품 사용</span>
                    <span className="text-sm font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">지각</span>
                    <span className="text-sm font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">조퇴</span>
                    <span className="text-sm font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">결근</span>
                    <span className="text-sm font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">기타 공제1</span>
                    <span className="text-sm font-medium text-gray-900">-</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t-2 border-gray-300 bg-gray-100 p-4 mt-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-gray-900">급여 합계</span>
                <span className="text-sm font-bold text-gray-900">
                  {payslipData?.wages?.[0]?.wage?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-gray-900">공제 합계</span>
                <span className="text-sm font-bold text-gray-900">0</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-gray-900">실지급액 (급여 합계 - 공제 합계)</span>
                <span className="text-sm font-bold text-gray-900">
                  {payslipData?.wages?.[0]?.wage?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-gray-900">가지급금</span>
                <span className="text-sm font-bold text-gray-900">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-bold text-gray-900">차감 지급 금액 (실지급액 - 가지급금)</span>
                <span className="text-sm font-bold text-gray-900">
                  {payslipData?.wages?.[0]?.wage?.toLocaleString() || '0'}
                </span>
              </div>
            </div>
          </div>

          {/* 인센티브 내역 */}
          <div>
            <h3 className="text-lg font-bold text-black mb-4">인센티브 내역</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">항목</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">판매</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">차감</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">합계</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 font-medium">서비스</td>
                    <td className="px-4 py-3 text-center">
                      {payslipData?.wages?.[0]?.sales?.service?.toLocaleString() || '0'}
                    </td>
                    <td className="px-4 py-3 text-center">0</td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {payslipData?.wages?.[0]?.sales?.service?.toLocaleString() || '0'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">제품</td>
                    <td className="px-4 py-3 text-center">
                      {payslipData?.wages?.[0]?.sales?.product?.toLocaleString() || '0'}
                    </td>
                    <td className="px-4 py-3 text-center">0</td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {payslipData?.wages?.[0]?.sales?.product?.toLocaleString() || '0'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">정액권 판매</td>
                    <td className="px-4 py-3 text-center">-</td>
                    <td className="px-4 py-3 text-center">-</td>
                    <td className="px-4 py-3 text-center font-semibold">-</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">티켓 판매</td>
                    <td className="px-4 py-3 text-center">-</td>
                    <td className="px-4 py-3 text-center">-</td>
                    <td className="px-4 py-3 text-center font-semibold">-</td>
                  </tr>
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td className="px-4 py-3 font-bold">합계</td>
                    <td className="px-4 py-3 text-center font-bold">
                      {((payslipData?.wages?.[0]?.sales?.service || 0) + (payslipData?.wages?.[0]?.sales?.product || 0)).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center font-bold">0</td>
                    <td className="px-4 py-3 text-center font-bold">
                      {payslipData?.wages?.[0]?.wage?.toLocaleString() || '0'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => {
                onClose();
                onViewDetail({
                  designerId: payslip.designer.designerId,
                  designerName: payslip.designer.name,
                  startDate: period.startDate,
                  endDate: period.endDate,
                });
              }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              상세 내역 보기
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Comment: Detail History Modal Component (3rd image)
function DetailHistoryModal({ detail, onClose }: {
  detail: { designerId: number; designerName: string; startDate: string; endDate: string };
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [designer, setDesigner] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'service' | 'product' | 'membership'>('service');

  useEffect(() => {
    const fetchDetailData = async () => {
      try {
        setLoading(true);
        
        // Comment: Fetch sales history using new API
        const res = await fetch(
          `/api/wages/sales-history?start_date=${detail.startDate}&end_date=${detail.endDate}&designer_id=${detail.designerId}`
        );
        const data = await res.json();

        if (res.ok) {
          setSalesHistory(data.salesHistory || []);
          setDesigner(data.designer);
        } else {
          console.error('Error fetching sales history:', data.error);
        }
      } catch (error) {
        console.error('Error fetching detail data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetailData();
  }, [detail]);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${month}-${day}`;
  };

  // Comment: Separate service sales and prepaid deductions
  const serviceSales = salesHistory.filter((h: any) => !h.isPrepaidDeduction);
  const prepaidDeductions = salesHistory.filter((h: any) => h.isPrepaidDeduction);
  
  // Comment: Calculate totals
  const serviceSalesTotal = serviceSales.reduce((sum: number, h: any) => sum + (h.incentive || 0), 0);
  const prepaidDeductionsTotal = prepaidDeductions.reduce((sum: number, h: any) => sum + (h.incentive || 0), 0);
  const totalIncentive = serviceSalesTotal + prepaidDeductionsTotal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-white p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-black">{detail.designerName}</h2>
            <div className="text-sm text-gray-600 mt-1">
              {detail.startDate} ~ {detail.endDate}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              엑셀 다운로드
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex gap-1 px-4">
          <button
            onClick={() => setActiveTab('service')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'service'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            서비스 판매/차감
          </button>
          <button
            onClick={() => setActiveTab('product')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'product'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            제품 판매/차감
          </button>
          <button
            onClick={() => setActiveTab('membership')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'membership'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            회원권 판매
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">로딩 중...</div>
            </div>
          ) : (
            <div className="p-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">날짜</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">고객명</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">서비스명</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">단가</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">수량</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">금액 (할인)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">결제 방법</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">결제금액</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">공제 후</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">지급률</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">인센티브</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeTab === 'service' && (
                    <>
                      {/* Service Sales */}
                      {serviceSales.map((item: any) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(item.date)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.customerName}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.serviceName}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">{item.unitPrice.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">
                            {item.amount.toLocaleString()}{item.discount > 0 ? ` (${Math.round((item.discount / item.amount) * 100)}%)` : ''}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">{item.paymentMethod}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">{item.paymentAmount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">{item.afterDeduction.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">{item.incentiveRate}%</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900 font-semibold">
                            {Math.round(item.incentive).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {/* Prepaid Deductions */}
                      {prepaidDeductions.map((item: any) => (
                        <tr key={item.id} className="hover:bg-gray-50 bg-yellow-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(item.date)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.customerName}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.serviceName}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">{item.unitPrice.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">{item.amount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">{item.paymentMethod}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">{item.paymentAmount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">{item.afterDeduction.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">{item.incentiveRate}%</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900 font-semibold">
                            {Math.round(item.incentive).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {/* Totals */}
                      {salesHistory.length > 0 && (
                        <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                          <td colSpan={8} className="px-4 py-3 text-sm text-right text-gray-900">합계</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">
                            {(serviceSales.reduce((sum: number, h: any) => sum + (h.afterDeduction || 0), 0) + 
                              prepaidDeductions.reduce((sum: number, h: any) => sum + (h.afterDeduction || 0), 0)).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">-</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">
                            {Math.round(totalIncentive).toLocaleString()}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                  {activeTab === 'product' && (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                        제품 판매 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                  {activeTab === 'membership' && (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                        회원권 판매 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Comment: Incentives Modal Component
function IncentivesModal({ onClose }: { onClose: () => void }) {
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

  const handleSearch = async () => {
    if (dateMode === 'monthly' && !selectedMonth) {
      alert('월을 선택해주세요.');
      return;
    }
    if (dateMode === 'period' && (!startDate || !endDate)) {
      alert('시작 날짜와 종료 날짜를 선택해주세요.');
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

      // Comment: Fetch wages data for all designers or selected designer
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

  // Comment: Calculate totals (with rate applied)
  const totals = useMemo(() => {
    return incentivesData.reduce((acc, item) => {
      const rate = item.calculationDetails?.rate || 0;
      const isPercentType = item.wageType === 'percent';
      
      // Comment: Calculate incentive amounts by applying rate
      const serviceSalesAmount = item.sales?.service || 0;
      const serviceDeductionAmount = item.sales?.membershipDeduction || 0;
      const productSalesAmount = item.sales?.product || 0;
      const membershipSalesAmount = item.sales?.membership || 0;
      const ticketSalesAmount = item.sales?.ticket || 0;
      
      if (isPercentType && rate > 0) {
        acc.serviceSales += Math.round((serviceSalesAmount * rate) / 100);
        acc.serviceDeduction += Math.round((serviceDeductionAmount * rate) / 100);
        acc.productSales += Math.round((productSalesAmount * rate) / 100);
        acc.membershipSales += Math.round((membershipSalesAmount * rate) / 100);
        acc.ticketSales += Math.round((ticketSalesAmount * rate) / 100);
      }
      
      acc.total += item.wage || 0;
      return acc;
    }, {
      serviceSales: 0,
      serviceDeduction: 0,
      productSales: 0,
      productDeduction: 0,
      membershipSales: 0,
      ticketSales: 0,
      total: 0,
    });
  }, [incentivesData]);

  const handleExcelDownload = async (designerId: number, designerName: string) => {
    // Comment: TODO: Implement Excel download functionality
    alert(`${designerName}님의 인센티브 엑셀 다운로드 기능은 준비 중입니다.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-white p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-black">직원별 인센티브</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 items-end">
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
                <button
                  onClick={() => handleMonthChange('prev')}
                  className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  &lt;
                </button>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <button
                  onClick={() => handleMonthChange('next')}
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
              <select
                value={selectedDesignerId}
                onChange={(e) => setSelectedDesignerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="">전체</option>
                {designers.map((designer) => (
                  <option key={designer.id} value={designer.id}>
                    {designer.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">search</span>
              검색
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">로딩 중...</div>
            </div>
          ) : incentivesData.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">데이터가 없습니다. 검색을 실행해주세요.</div>
            </div>
          ) : (
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                        직원
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" colSpan={2}>
                        서비스
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" colSpan={2}>
                        제품
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                        정액권 판매
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                        티켓 판매
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                        합계
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        엑셀
                      </th>
                    </tr>
                    <tr>
                      <th className="border-r border-gray-200"></th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-200">판매</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-200">차감</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-200">판매</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-200">차감</th>
                      <th className="border-r border-gray-200"></th>
                      <th className="border-r border-gray-200"></th>
                      <th className="border-r border-gray-200"></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {incentivesData.map((item: any) => {
                      // Comment: Get rate from calculationDetails (only for percent type)
                      const rate = item.calculationDetails?.rate || 0;
                      const isPercentType = item.wageType === 'percent';
                      
                      // Comment: Calculate incentive amounts by applying rate to sales amounts
                      const serviceSalesAmount = item.sales?.service || 0;
                      const serviceDeductionAmount = item.sales?.membershipDeduction || 0;
                      const productSalesAmount = item.sales?.product || 0;
                      const productDeductionAmount = 0; // Comment: Product deduction not available in current API
                      const membershipSalesAmount = item.sales?.membership || 0;
                      const ticketSalesAmount = item.sales?.ticket || 0;
                      
                      // Comment: Apply rate to calculate incentives (only for percent type)
                      const serviceSales = isPercentType && rate > 0 
                        ? Math.round((serviceSalesAmount * rate) / 100) 
                        : 0;
                      const serviceDeduction = isPercentType && rate > 0 
                        ? Math.round((serviceDeductionAmount * rate) / 100) 
                        : 0;
                      const productSales = isPercentType && rate > 0 
                        ? Math.round((productSalesAmount * rate) / 100) 
                        : 0;
                      const productDeduction = 0; // Comment: Product deduction not available in current API
                      const membershipSales = isPercentType && rate > 0 
                        ? Math.round((membershipSalesAmount * rate) / 100) 
                        : 0;
                      const ticketSales = isPercentType && rate > 0 
                        ? Math.round((ticketSalesAmount * rate) / 100) 
                        : 0;
                      const total = item.wage || 0;

                      return (
                        <tr key={item.designerId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">{item.name}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200">
                            {serviceSales > 0 ? serviceSales.toLocaleString() : ''}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200">
                            {serviceDeduction > 0 ? serviceDeduction.toLocaleString() : ''}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200">
                            {productSales > 0 ? productSales.toLocaleString() : ''}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200">
                            {productDeduction > 0 ? productDeduction.toLocaleString() : ''}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200">
                            {membershipSales > 0 ? membershipSales.toLocaleString() : ''}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200">
                            {ticketSales > 0 ? ticketSales.toLocaleString() : ''}
                          </td>
                          <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900 border-r border-gray-200">
                            {total.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleExcelDownload(item.designerId, item.name)}
                              className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                            >
                              엑셀
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Totals Row */}
                    {incentivesData.length > 0 && (
                      <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">합계</td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200">
                          {totals.serviceSales > 0 ? totals.serviceSales.toLocaleString() : ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200">
                          {totals.serviceDeduction > 0 ? totals.serviceDeduction.toLocaleString() : ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200">
                          {totals.productSales > 0 ? totals.productSales.toLocaleString() : ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200">
                          {totals.productDeduction > 0 ? totals.productDeduction.toLocaleString() : ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200">
                          {totals.membershipSales > 0 ? totals.membershipSales.toLocaleString() : ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200">
                          {totals.ticketSales > 0 ? totals.ticketSales.toLocaleString() : ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200">
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
        </div>
      </div>
    </div>
  );
}
