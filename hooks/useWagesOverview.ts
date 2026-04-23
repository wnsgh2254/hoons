'use client';

import { useState, useCallback } from 'react';
import type { OverviewResponse } from '@/types/wages';

interface UseWagesOverviewOptions {
  dateMode: 'monthly' | 'period';
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  wageTypeFilter: 'all' | 'hourly' | 'percent';
  designerId: string;
  shopId: string;
}

export function useWagesOverview({
  dateMode,
  year,
  month,
  startDate,
  endDate,
  wageTypeFilter,
  designerId,
  shopId,
}: UseWagesOverviewOptions) {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (dateMode === 'monthly') {
        params.append('year', String(year));
        params.append('month', String(month));
      } else {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
      }
      if (wageTypeFilter !== 'all') {
        params.append('wage_type_filter', wageTypeFilter);
      }
      if (designerId) {
        params.append('designer_id', designerId);
      }
      if (shopId) {
        params.append('shop_id', shopId);
      }
      const res = await fetch(`/api/wages/overview?${params.toString()}`);
      if (!res.ok) {
        throw new Error('급여 데이터 조회에 실패했습니다.');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('Error fetching wages overview:', err);
      setError(err.message || '오류가 발생했습니다.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateMode, year, month, startDate, endDate, wageTypeFilter, designerId, shopId]);

  const toggleSettlement = useCallback(
    async (
      designerId: number,
      weekNum: number,
      weekStartDate: string,
      weekEndDate: string,
      newValue: boolean
    ) => {
      // Optimistic update
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          employees: prev.employees.map((emp) => {
            if (emp.designerId !== designerId) return emp;
            return {
              ...emp,
              weeks: emp.weeks.map((w) => {
                if (w.weekNum !== weekNum) return w;
                return { ...w, isSettled: newValue };
              }),
            };
          }),
        };
      });

      try {
        const res = await fetch('/api/wages/settlement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            designer_id: designerId,
            week_start_date: weekStartDate,
            week_end_date: weekEndDate,
            year,
            month,
            week_num: weekNum,
            is_settled: newValue,
          }),
        });

        if (!res.ok) {
          throw new Error('정산 상태 업데이트 실패');
        }
      } catch (err) {
        console.error('Error toggling settlement:', err);
        // Revert on failure
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            employees: prev.employees.map((emp) => {
              if (emp.designerId !== designerId) return emp;
              return {
                ...emp,
                weeks: emp.weeks.map((w) => {
                  if (w.weekNum !== weekNum) return w;
                  return { ...w, isSettled: !newValue };
                }),
              };
            }),
          };
        });
      }
    },
    [year, month]
  );

  return { data, loading, error, refetch: fetchData, toggleSettlement };
}
