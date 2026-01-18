'use client';

import React, { useEffect, useState } from 'react';
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

type DateMode = 'daily' | 'period';

export default function WagesPage() {
  const [dateMode, setDateMode] = useState<DateMode>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(getSydneyToday());
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [wagesData, setWagesData] = useState<any>(null);
  const [designers, setDesigners] = useState<any[]>([]);
  const [shouldFetch, setShouldFetch] = useState(false);

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
    if (dateMode === 'daily' && !selectedDate) {
      alert('날짜를 선택해주세요.');
      return;
    }
    if (dateMode === 'period' && (!startDate || !endDate)) {
      alert('시작 날짜와 종료 날짜를 선택해주세요.');
      return;
    }
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

        const res = await fetch(`/api/wages/calculate?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to fetch wages data');
        }
        const data = await res.json();
        setWagesData(data);
      } catch (error) {
        console.error('Error fetching wages data:', error);
        setWagesData(null);
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

  const totalWage = wagesData?.wages?.reduce((sum: number, w: any) => sum + w.wage, 0) || 0;

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex flex-col">
      <AdminTopNav />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-white">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-black mb-8">직원 급여 관리</h1>

            {/* Filters */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex gap-4">
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDateChange('prev')}
                      className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      &lt;
                    </button>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <button
                      onClick={() => handleDateChange('next')}
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
                    <option value="">전체 직원</option>
                    {designers.map((designer) => (
                      <option key={designer.id} value={designer.id}>
                        {designer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">search</span>
                  검색
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : wagesData?.wages && wagesData.wages.length > 0 ? (
              <div className="flex flex-col gap-6">
                {/* Summary Card */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-bold text-black">급여 요약</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">기간</div>
                        <div className="text-lg font-semibold text-black">
                          {wagesData.period.startDate === wagesData.period.endDate
                            ? wagesData.period.startDate
                            : `${wagesData.period.startDate} ~ ${wagesData.period.endDate}`}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">직원 수</div>
                        <div className="text-lg font-semibold text-black">
                          {wagesData.wages.length}명
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">총 급여</div>
                        <div className="text-lg font-semibold text-black">
                          ${totalWage.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wages Table */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-bold text-black">직원별 급여</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">직원명</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">급여 유형</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">매출 합계</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">계산 상세</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">급여</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wagesData.wages.map((wage: any) => (
                          <tr key={wage.designerId} className="border-b border-gray-100">
                            <td className="px-4 py-3 font-medium">{wage.name}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                {wage.wageType === 'percent' ? '커미션' : '시급'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              ${wage.sales.total.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-gray-600">
                              {wage.calculationDetails.type === 'commission' ? (
                                <>
                                  매출: ${wage.calculationDetails.totalSales.toLocaleString()} ×{' '}
                                  {wage.calculationDetails.rate}%
                                </>
                              ) : (
                                <>
                                  근무시간: {wage.calculationDetails.workingHours.toFixed(1)}시간 ×{' '}
                                  ${wage.calculationDetails.hourlyRate}/시간
                                </>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold">
                              ${wage.wage.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 border-t-2 border-gray-300">
                          <td className="px-4 py-3 font-bold" colSpan={4}>
                            합계
                          </td>
                          <td className="px-4 py-3 text-center font-bold">
                            ${totalWage.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sales Breakdown */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-bold text-black">매출 상세</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">직원명</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">서비스</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">제품</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">정액권 판매</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">회원권 차감</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">합계</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wagesData.wages.map((wage: any) => (
                          <tr key={wage.designerId} className="border-b border-gray-100">
                            <td className="px-4 py-3 font-medium">{wage.name}</td>
                            <td className="px-4 py-3 text-center">
                              ${wage.sales.service.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              ${wage.sales.product.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              ${wage.sales.membership.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              ${wage.sales.membershipDeduction.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold">
                              ${wage.sales.total.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : wagesData?.wages && wagesData.wages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                해당 기간에 급여 데이터가 없습니다.
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
