'use client';

import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { Z } from '@/lib/constants';
import { pickWinningTimeOffRow, type VenueTimeOffRow } from '@/lib/designer-venue-time-off';

export type HolidayModalShopOption = { id: number; name: string };

interface HolidaySettingModalProps {
  isOpen: boolean;
  initialDesignerId: number | null;
  initialDesignerName: string;
  allDesigners: any[];
  shops: HolidayModalShopOption[];
  /** Default venue row when opening (e.g. current schedule filter) */
  defaultTargetShopId: number | null;
  selectedDate: string;
  onClose: () => void;
  /** Called after a successful save so the parent can re-fetch all availability */
  onAvailableDesignerIdsChange: () => void;
}

function timeOffAppliesToVenue(to: { shop_id?: number | null }, venueId: number | null): boolean {
  if (venueId == null) return true;
  const sid = to.shop_id;
  return sid == null || Number(sid) === Number(venueId);
}

/** Format a Date as YYYY-MM-DD in local timezone (avoids UTC shift issues). */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function expandDateRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  // Comment: Parse as local dates by splitting the string (avoid UTC midnight shift)
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const current = new Date(start);
  while (current <= end) {
    dates.push(toLocalDateStr(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** Overlapping venue 임의/특근 rows for dateStr; winner = latest created_at then highest id (same as designer-schedules API). */
function winningVenueTimeOffOnDate(venueRows: any[], dateStr: string): any | null {
  const overlapping = venueRows.filter(
    (to: any) =>
      (to.reason === '임의 휴일' || to.reason === '특별 근무일') &&
      dateStr >= String(to.start_date).slice(0, 10) &&
      dateStr <= String(to.end_date).slice(0, 10),
  );
  if (overlapping.length === 0) return null;
  return pickWinningTimeOffRow(overlapping as VenueTimeOffRow[]);
}

/** Dates where the winning row for that day matches targetReason (not merely “any row covers the day”). */
function datesWhereWinningReason(
  venueRows: any[],
  targetReason: '임의 휴일' | '특별 근무일',
): string[] {
  const applicable = venueRows.filter(
    (to: any) => to.reason === '임의 휴일' || to.reason === '특별 근무일',
  );
  const allDates = new Set<string>();
  for (const to of applicable) {
    expandDateRange(to.start_date, to.end_date).forEach((d) => allDates.add(d));
  }
  const out: string[] = [];
  for (const d of allDates) {
    const w = winningVenueTimeOffOnDate(applicable, d);
    if (w?.reason === targetReason) out.push(d);
  }
  return Array.from(new Set(out)).sort();
}

export default function HolidaySettingModal({
  isOpen,
  initialDesignerId,
  allDesigners,
  shops,
  defaultTargetShopId,
  onClose,
  onAvailableDesignerIdsChange,
}: HolidaySettingModalProps) {
  const [designerId, setDesignerId] = useState<number | null>(initialDesignerId);
  const [holidayType, setHolidayType] = useState<'holiday' | 'special'>('holiday');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [pendingRemoveTimeOffIds, setPendingRemoveTimeOffIds] = useState<number[]>([]);
  const [regularSchedule, setRegularSchedule] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState<boolean>(false);
  const [allDesignerTimeOffs, setAllDesignerTimeOffs] = useState<any[]>([]);
  const [targetShopId, setTargetShopId] = useState<number | null>(null);

  const shopSelectOptions = useMemo(
    () => shops.map((s) => ({ value: String(s.id), label: s.name })),
    [shops],
  );

  // Comment: Sync props before paint so the fetch effect never runs with a stale designerId (fixes intermittent empty schedule).
  useLayoutEffect(() => {
    if (!isOpen) return;
    setDesignerId(initialDesignerId);
    setHolidayType('holiday');
    setCurrentMonth(new Date());
    setPendingRemoveTimeOffIds([]);
    setTargetShopId(
      defaultTargetShopId != null &&
        Number.isFinite(Number(defaultTargetShopId)) &&
        Number(defaultTargetShopId) > 0
        ? Number(defaultTargetShopId)
        : shops[0]?.id ?? null,
    );
  }, [isOpen, initialDesignerId, defaultTargetShopId, shops]);

  // Comment: Load weekday schedule + venue time-offs together; ignore stale responses when designer or open state changes.
  // When designerId is null ("전체"), fetch ALL time-off records so we can show dates where all designers have 임의 휴일.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setScheduleLoading(true);

    void (async () => {
      try {
        if (designerId === null) {
          // "전체" mode: fetch all designers' time-off records (no designer_id filter)
          const timeOffRes = await fetch('/api/designer-time-off');
          const timeOffData = await timeOffRes.json();
          if (cancelled) return;
          setRegularSchedule([]);
          if (timeOffRes.ok) {
            const raw = (timeOffData.timeOffs || []).filter(
              (to: any) => to.reason === '임의 휴일' || to.reason === '특별 근무일',
            );
            setAllDesignerTimeOffs(raw);
          } else {
            setAllDesignerTimeOffs([]);
          }
        } else {
          const [scheduleRes, timeOffRes] = await Promise.all([
            fetch(`/api/designer-schedules?designer_id=${designerId}`),
            fetch(`/api/designer-time-off?designer_id=${designerId}`),
          ]);
          const [scheduleData, timeOffData] = await Promise.all([scheduleRes.json(), timeOffRes.json()]);
          if (cancelled) return;
          setRegularSchedule(scheduleRes.ok ? scheduleData.schedules || [] : []);
          if (timeOffRes.ok) {
            const raw = (timeOffData.timeOffs || []).filter(
              (to: any) => to.reason === '임의 휴일' || to.reason === '특별 근무일',
            );
            setAllDesignerTimeOffs(raw);
          } else {
            setAllDesignerTimeOffs([]);
          }
        }
      } catch (error) {
        console.error('Error fetching holiday data:', error);
        if (!cancelled) {
          setRegularSchedule([]);
          setAllDesignerTimeOffs([]);
        }
      } finally {
        if (!cancelled) {
          setScheduleLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, designerId]);

  const existingTimeOffsForVenue = useMemo(() => {
    if (targetShopId === null) return [];
    return allDesignerTimeOffs.filter(
      (to: any) =>
        (to.reason === '임의 휴일' || to.reason === '특별 근무일') &&
        timeOffAppliesToVenue(to, targetShopId),
    );
  }, [allDesignerTimeOffs, targetShopId]);

  const visibleTimeOffsForVenue = useMemo(
    () => existingTimeOffsForVenue.filter((to: any) => !pendingRemoveTimeOffIds.includes(Number(to.id))),
    [existingTimeOffsForVenue, pendingRemoveTimeOffIds],
  );

  // Comment: Designers belonging to the selected shop (Directors always included, non-directors by home shop)
  const designersForShop = useMemo(() => {
    if (targetShopId === null) return allDesigners;
    return allDesigners.filter((d) => {
      if (String(d.role || '').toLowerCase().includes('director')) return true;
      return d.shop_id != null && Number(d.shop_id) === Number(targetShopId);
    });
  }, [allDesigners, targetShopId]);

  // Comment: For "전체" mode, find dates where ALL shop designers have 임의 휴일 for the selected venue
  const allDesignerHolidayDates = useMemo(() => {
    if (designerId !== null || targetShopId === null || designersForShop.length === 0) return [];
    const venueTimeOffs = existingTimeOffsForVenue.filter(
      (to: any) => to.reason === '임의 휴일',
    );
    // Expand each record into individual dates, grouped by designer
    const dateDesignerMap = new Map<string, Set<number>>();
    for (const to of venueTimeOffs) {
      const dates = expandDateRange(
        String(to.start_date).slice(0, 10),
        String(to.end_date).slice(0, 10),
      );
      for (const d of dates) {
        if (!dateDesignerMap.has(d)) dateDesignerMap.set(d, new Set());
        dateDesignerMap.get(d)!.add(Number(to.designer_id));
      }
    }
    // Return dates where all shop designers have 임의 휴일
    const result: string[] = [];
    for (const [dateStr, designers] of dateDesignerMap) {
      if (designers.size >= designersForShop.length) {
        result.push(dateStr);
      }
    }
    return result.sort();
  }, [designerId, targetShopId, existingTimeOffsForVenue, designersForShop]);

  // Comment: Re-populate selectedDates when type, venue, or designer changes — winner per day (latest row) must match current type
  useEffect(() => {
    if (!isOpen || targetShopId === null) return;
    if (designerId === null) {
      // "전체" mode: show dates where all designers have 임의 휴일
      setSelectedDates(allDesignerHolidayDates);
    } else {
      const targetReason = holidayType === 'holiday' ? '임의 휴일' : '특별 근무일';
      setSelectedDates(datesWhereWinningReason(existingTimeOffsForVenue, targetReason));
    }
  }, [isOpen, designerId, targetShopId, existingTimeOffsForVenue, holidayType, allDesignerHolidayDates]);

  useEffect(() => {
    if (!isOpen) {
      setRegularSchedule([]);
      setScheduleLoading(false);
      setAllDesignerTimeOffs([]);
      setSelectedDates([]);
      setPendingRemoveTimeOffIds([]);
    }
  }, [isOpen]);

  const baselineDates = useMemo(() => {
    if (designerId === null) {
      return holidayType === 'holiday' ? allDesignerHolidayDates : [];
    }
    const targetReason = holidayType === 'holiday' ? '임의 휴일' : '특별 근무일';
    return datesWhereWinningReason(existingTimeOffsForVenue, targetReason);
  }, [designerId, holidayType, allDesignerHolidayDates, existingTimeOffsForVenue]);

  const hasPendingChanges = useMemo(() => {
    const selected = new Set(selectedDates);
    const baseline = new Set(baselineDates);
    const hasAddedDates = selectedDates.some((date) => !baseline.has(date));
    const hasRemovedDates = baselineDates.some((date) => !selected.has(date));
    return hasAddedDates || hasRemovedDates || pendingRemoveTimeOffIds.length > 0;
  }, [selectedDates, baselineDates, pendingRemoveTimeOffIds]);

  const getWinningRemovalIdsForDate = useCallback(
    (dateStr: string, reason: '임의 휴일' | '특별 근무일') => {
      if (designerId === null) {
        return designersForShop
          .map((designer) => {
            const designerRows = existingTimeOffsForVenue.filter(
              (to: any) => Number(to.designer_id) === Number(designer.id),
            );
            const winning = winningVenueTimeOffOnDate(designerRows, dateStr);
            return winning?.reason === reason ? Number(winning.id) : null;
          })
          .filter((id): id is number => id != null);
      }

      const winning = winningVenueTimeOffOnDate(existingTimeOffsForVenue, dateStr);
      return winning?.reason === reason ? [Number(winning.id)] : [];
    },
    [designerId, designersForShop, existingTimeOffsForVenue],
  );

  /** Handle calendar cell click with type-aware logic */
  const handleDateClick = useCallback(
    (dateStr: string, existingTimeOff: any, isRegularHoliday: boolean, isExistingSpecial: boolean, isExistingHoliday: boolean) => {
      if (holidayType === 'holiday') {
        // Comment: 임의 휴일 모드 — 정기 휴일과 특별 근무일은 클릭 불가
        if (isRegularHoliday || isExistingSpecial) return;
        if (isExistingHoliday && existingTimeOff) {
          // Comment: Existing arbitrary holidays are removed only when Save is clicked.
          const removeIds = getWinningRemovalIdsForDate(dateStr, '임의 휴일');
          setPendingRemoveTimeOffIds((prev) => Array.from(new Set([...prev, ...removeIds])));
          setSelectedDates((prev) => prev.filter((x) => x !== dateStr));
          return;
        }
      } else {
        // Comment: 특별 근무일 모드 — 모든 날짜 선택 가능
        if (isExistingSpecial && existingTimeOff) {
          // Comment: Existing special workdays are removed only when Save is clicked.
          const removeIds = getWinningRemovalIdsForDate(dateStr, '특별 근무일');
          setPendingRemoveTimeOffIds((prev) => Array.from(new Set([...prev, ...removeIds])));
          setSelectedDates((prev) => prev.filter((x) => x !== dateStr));
          return;
        }
        if (isExistingHoliday && existingTimeOff) {
          // Comment: Switching holiday -> special workday is also applied on Save.
          const removeIds = getWinningRemovalIdsForDate(dateStr, '임의 휴일');
          setPendingRemoveTimeOffIds((prev) => Array.from(new Set([...prev, ...removeIds])));
        }
      }
      // Toggle selection
      setSelectedDates((prev) =>
        prev.includes(dateStr) ? prev.filter((x) => x !== dateStr) : [...prev, dateStr],
      );
    },
    [holidayType, getWinningRemovalIdsForDate],
  );

  const handleSave = async () => {
    if (!designerId && holidayType === 'special') {
      alert('특별 근무일은 전체 디자이너에 대해 설정할 수 없습니다. 디자이너를 선택해주세요.');
      return;
    }
    if (!hasPendingChanges) {
      alert('변경된 날짜가 없습니다.');
      return;
    }
    if (targetShopId === null || !Number.isFinite(Number(targetShopId))) {
      alert('적용 매장(지점)을 선택해주세요. Director 등은 지점별로 휴일·특근을 나눌 수 있습니다.');
      return;
    }
    setSubmitting(true);
    try {
      if (pendingRemoveTimeOffIds.length > 0) {
        const deleteResults = await Promise.all(
          pendingRemoveTimeOffIds.map((id) =>
            fetch(`/api/designer-time-off/${id}`, { method: 'DELETE' }),
          ),
        );
        const failedDelete = deleteResults.find((res) => !res.ok);
        if (failedDelete) {
          const errData = await failedDelete.json().catch(() => ({}));
          throw new Error(errData?.error || '기존 휴일 해제에 실패했습니다.');
        }
      }

      if (!designerId && holidayType === 'holiday') {
        // Only create records for newly added dates (skip dates already fully covered)
        const newDates = selectedDates.filter((d) => !allDesignerHolidayDates.includes(d));
        if (newDates.length > 0) {
          const rows = newDates.flatMap((date) =>
            designersForShop.map((designer) => ({
              designer_id: designer.id,
              shop_id: targetShopId,
              start_date: date,
              end_date: date,
              reason: '임의 휴일',
            })),
          );
          const bulkRes = await fetch('/api/designer-time-off', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows }),
          });
          if (!bulkRes.ok) {
            const errData = await bulkRes.json().catch(() => ({}));
            throw new Error(errData?.error || '휴무 등록에 실패했습니다.');
          }
        }
      } else if (designerId) {
        const newDates = selectedDates.filter((d) => !baselineDates.includes(d));
        const rows = newDates.map((date) => ({
          designer_id: designerId,
          shop_id: targetShopId,
          start_date: date,
          end_date: date,
          reason: holidayType === 'holiday' ? '임의 휴일' : '특별 근무일',
        }));
        if (rows.length > 0) {
          const bulkRes = await fetch('/api/designer-time-off', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows }),
          });
          if (!bulkRes.ok) {
            const errData = await bulkRes.json().catch(() => ({}));
            throw new Error(errData?.error || '휴무 등록에 실패했습니다.');
          }
        }
      }
      alert('설정이 완료되었습니다.');
      // Comment: Notify parent to re-fetch ALL shops' availability (covers any targetShopId)
      onAvailableDesignerIdsChange();
      onClose();
    } catch (error) {
      console.error('Error setting holidays:', error);
      alert('설정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const designerOptions = [
    { value: 'all', label: '전체' },
    ...allDesigners.map((d) => ({ value: String(d.id), label: d.name })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="임의 휴일 및 특근 설정"
      zIndex={Z.MODAL_PRIMARY}
      maxWidth="max-w-2xl"
      scrollable
    >
      <div className="space-y-4">
        <Select
          label="디자이너"
          options={designerOptions}
          value={designerId !== null ? String(designerId) : 'all'}
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'all') {
              setDesignerId(null);
              if (holidayType === 'special') setHolidayType('holiday');
            } else {
              const id = Number(value);
              const d = allDesigners.find((x) => x.id === id);
              if (d) {
                setDesignerId(id);
                // Comment: Auto-set shop for single-venue designers (non-directors)
                const isDir = String(d.role || '').toLowerCase().includes('director');
                const shopIds: number[] = d.shop_ids_at ?? (d.shop_id != null ? [d.shop_id] : []);
                if (!isDir && shopIds.length === 1) {
                  setTargetShopId(shopIds[0]);
                }
              }
            }
            setSelectedDates([]);
          }}
        />

        {(() => {
          // Comment: Show shop selector only for "전체" or director-role designers
          const selectedDesigner = designerId != null
            ? allDesigners.find((d) => d.id === designerId)
            : null;
          const isDirector =
            designerId === null || // "전체" selected
            (selectedDesigner &&
              String(selectedDesigner.role || '').toLowerCase().includes('director'));

          if (isDirector && shops.length > 0) {
            return (
              <>
                <Select
                  label="적용 매장 (지점)"
                  options={shopSelectOptions}
                  value={targetShopId != null ? String(targetShopId) : ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTargetShopId(v ? Number(v) : null);
                  }}
                />
                <p className="text-xs text-gray-500 -mt-2">
                  Director는 모든 지점 예약 화면에 나오지만, 여기서 고른 지점에서만 임의 휴일·특별 근무일이 적용됩니다.
                </p>
              </>
            );
          }
          return null;
        })()}

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">유형</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="holiday"
                checked={holidayType === 'holiday'}
                onChange={(e) => setHolidayType(e.target.value as 'holiday' | 'special')}
                className="w-3.5 h-3.5"
              />
              <span className="text-sm text-gray-700">임의 휴일</span>
            </label>
            <label
              className={`flex items-center gap-2 ${!designerId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input
                type="radio"
                value="special"
                checked={holidayType === 'special'}
                onChange={(e) => setHolidayType(e.target.value as 'holiday' | 'special')}
                disabled={!designerId}
                className={`w-3.5 h-3.5 ${!designerId ? 'cursor-not-allowed' : ''}`}
              />
              <span className="text-sm text-gray-700">특별 근무일</span>
            </label>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          {!designerId && holidayType === 'special' ? (
            <div className="text-center py-7.5 text-sm text-gray-500">
              특별 근무일은 전체 디자이너에 대해 설정할 수 없습니다. 디자이너를 선택해주세요.
            </div>
          ) : shops.length === 0 ? (
            <div className="text-center py-7.5 text-sm text-gray-500">매장 목록이 없습니다.</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => {
                    const prev = new Date(currentMonth);
                    prev.setMonth(prev.getMonth() - 1);
                    setCurrentMonth(prev);
                  }}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <h3 className="text-sm font-medium text-black">
                  {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Date(currentMonth);
                    next.setMonth(next.getMonth() + 1);
                    setCurrentMonth(next);
                  }}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-gray-700 uppercase tracking-wider py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const year = currentMonth.getFullYear();
                  const month = currentMonth.getMonth();
                  const firstDay = new Date(year, month, 1);
                  const startD = new Date(firstDay);
                  startD.setDate(startD.getDate() - firstDay.getDay());
                  const days: Date[] = [];
                  for (let i = 0; i < 42; i++) {
                    const d = new Date(startD);
                    d.setDate(startD.getDate() + i);
                    days.push(d);
                  }
                  return days.map((d, index) => {
                    const dateStr = toLocalDateStr(d);
                    const isCurrentMonth = d.getMonth() === month;
                    const isSelected = selectedDates.includes(dateStr);
                    const isToday = dateStr === toLocalDateStr(new Date());

                    if (scheduleLoading) {
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            if (!isCurrentMonth) return;
                            setSelectedDates((prev) =>
                              prev.includes(dateStr) ? prev.filter((x) => x !== dateStr) : [...prev, dateStr],
                            );
                          }}
                          disabled={!isCurrentMonth}
                          className={`relative aspect-square text-xs rounded-lg transition-colors ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'} ${isSelected ? (holidayType === 'holiday' ? 'border-2 border-red-500 bg-white text-gray-900' : 'bg-blue-500 text-white') : 'hover:bg-gray-100'}`}
                        >
                          {isToday && isCurrentMonth && (
                            <span className="pointer-events-none absolute top-0.5 right-0.5 size-1.5 rounded-full bg-sky-500" aria-hidden />
                          )}
                          {d.getDate()}
                        </button>
                      );
                    }

                    // Comment: "전체" mode — simplified: just toggle date selection, show red border for selected
                    if (designerId === null) {
                      const showTodayDot = isToday && isCurrentMonth;
                      const existingHolidayIds = getWinningRemovalIdsForDate(dateStr, '임의 휴일');
                      const hasPendingRemoval = existingHolidayIds.some((id) => pendingRemoveTimeOffIds.includes(id));
                      const displayClass = isSelected
                        ? 'border-2 border-red-500 bg-white text-gray-900'
                        : 'hover:bg-gray-100';
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            if (!isCurrentMonth) return;
                            if (isSelected && allDesignerHolidayDates.includes(dateStr)) {
                              setPendingRemoveTimeOffIds((prev) =>
                                Array.from(new Set([...prev, ...existingHolidayIds])),
                              );
                              setSelectedDates((prev) => prev.filter((x) => x !== dateStr));
                              return;
                            }
                            if (!isSelected && allDesignerHolidayDates.includes(dateStr) && hasPendingRemoval) {
                              setPendingRemoveTimeOffIds((prev) =>
                                prev.filter((id) => !existingHolidayIds.includes(id)),
                              );
                              setSelectedDates((prev) => [...prev, dateStr]);
                              return;
                            }
                            setSelectedDates((prev) =>
                              prev.includes(dateStr) ? prev.filter((x) => x !== dateStr) : [...prev, dateStr],
                            );
                          }}
                          disabled={!isCurrentMonth}
                          className={`relative aspect-square text-xs rounded-lg transition-colors ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'} ${displayClass}`}
                        >
                          {showTodayDot && (
                            <span className="pointer-events-none absolute top-0.5 right-0.5 size-1.5 rounded-full bg-sky-500" aria-hidden />
                          )}
                          {d.getDate()}
                        </button>
                      );
                    }

                    const weekday = d.getDay();
                    const hasRegularSchedule =
                      regularSchedule.some((s: any) => s.weekday === weekday && !s.effective_to);
                    const isRegularHoliday = isCurrentMonth && !hasRegularSchedule;

                    const rawExistingTimeOff = winningVenueTimeOffOnDate(existingTimeOffsForVenue, dateStr);
                    const isPendingRemoval =
                      rawExistingTimeOff?.id != null &&
                      pendingRemoveTimeOffIds.includes(Number(rawExistingTimeOff.id));
                    const existingTimeOff = isPendingRemoval
                      ? null
                      : winningVenueTimeOffOnDate(visibleTimeOffsForVenue, dateStr);
                    const isExistingHoliday = existingTimeOff?.reason === '임의 휴일';
                    const isExistingSpecial = existingTimeOff?.reason === '특별 근무일';
                    const isNewlySelectedHoliday = isSelected && holidayType === 'holiday';
                    const isNewlySelectedSpecial = isSelected && holidayType === 'special';

                    let displayClass = '';
                    if (isExistingSpecial || isNewlySelectedSpecial) {
                      displayClass = 'bg-blue-500 text-white';
                    } else if (isExistingHoliday || isNewlySelectedHoliday) {
                      displayClass = 'border-2 border-red-500 bg-white text-gray-900';
                    } else if (isRegularHoliday) {
                      displayClass = 'bg-red-500 text-white';
                    } else {
                      displayClass = 'hover:bg-gray-100';
                    }

                    // Comment: "Today" = small corner dot (blue border looked like 특별 근무일 in the legend)
                    const showTodayDot = isToday && isCurrentMonth;

                    // Comment: Determine if this cell should be disabled based on type mode
                    const isDisabledCell =
                      !isCurrentMonth ||
                      (holidayType === 'holiday' && (isRegularHoliday || isExistingSpecial));

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          if (!isCurrentMonth) return;
                          if (isPendingRemoval && rawExistingTimeOff?.id != null) {
                            setPendingRemoveTimeOffIds((prev) =>
                              prev.filter((id) => id !== Number(rawExistingTimeOff.id)),
                            );
                            setSelectedDates((prev) =>
                              prev.includes(dateStr) ? prev : [...prev, dateStr],
                            );
                            return;
                          }
                          handleDateClick(dateStr, existingTimeOff, isRegularHoliday, isExistingSpecial, isExistingHoliday);
                        }}
                        disabled={!isCurrentMonth}
                        className={`relative aspect-square text-xs rounded-lg transition-colors ${!isCurrentMonth ? 'text-gray-300' : ''} ${isDisabledCell ? 'opacity-40 cursor-not-allowed' : 'text-gray-900'} ${displayClass}`}
                      >
                        {showTodayDot && (
                          <span
                            className="pointer-events-none absolute top-0.5 right-0.5 size-1.5 rounded-full bg-sky-500"
                            aria-hidden
                          />
                        )}
                        {d.getDate()}
                      </button>
                    );
                  });
                })()}
              </div>
              <div className="mt-4 flex flex-col gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-gray-700">정기 휴일</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-red-500" />
                  <span className="text-gray-700">임의 휴일 (선택 지점)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-gray-700">특별 근무일 (선택 지점)</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                *날짜 변경은 저장하기를 눌렀을 때 한 번에 적용됩니다. 셀 우측 상단의 작은 파란 점은 오늘 날짜입니다.
              </p>
            </>
          )}
        </div>
        <Button
          loading={submitting}
          disabled={
            !hasPendingChanges ||
            (!designerId && holidayType === 'special') ||
            targetShopId === null
          }
          onClick={handleSave}
          className="w-full"
        >
          저장하기
        </Button>
      </div>
    </Modal>
  );
}
