'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import AlertModal from '@/components/ui/AlertModal';
import { Z } from '@/lib/constants';

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

export default function HolidaySettingModal({
  isOpen,
  initialDesignerId,
  initialDesignerName,
  allDesigners,
  shops,
  defaultTargetShopId,
  selectedDate,
  onClose,
  onAvailableDesignerIdsChange,
}: HolidaySettingModalProps) {
  const [designerId, setDesignerId] = useState<number | null>(initialDesignerId);
  const [designerName, setDesignerName] = useState<string>(initialDesignerName);
  const [holidayType, setHolidayType] = useState<'holiday' | 'special'>('holiday');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [removeConfirm, setRemoveConfirm] = useState<{ timeOffId: number; reason: string; dateStr: string } | null>(null);
  const [regularSchedule, setRegularSchedule] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState<boolean>(false);
  const [allDesignerTimeOffs, setAllDesignerTimeOffs] = useState<any[]>([]);
  const [targetShopId, setTargetShopId] = useState<number | null>(null);

  const shopSelectOptions = useMemo(
    () => shops.map((s) => ({ value: String(s.id), label: s.name })),
    [shops],
  );

  useEffect(() => {
    if (!isOpen) return;
    setDesignerId(initialDesignerId);
    setDesignerName(initialDesignerName);
    setHolidayType('holiday');
    setCurrentMonth(new Date());
    setTargetShopId(
      defaultTargetShopId != null && Number.isFinite(Number(defaultTargetShopId))
        ? Number(defaultTargetShopId)
        : shops[0]?.id ?? null,
    );
  }, [isOpen, initialDesignerId, initialDesignerName, defaultTargetShopId, shops]);

  useEffect(() => {
    if (!isOpen) return;
    if (designerId !== null) {
      const fetchData = async () => {
        setScheduleLoading(true);
        try {
          const scheduleRes = await fetch(`/api/designer-schedules?designer_id=${designerId}`);
          const scheduleData = await scheduleRes.json();
          if (scheduleRes.ok) {
            setRegularSchedule(scheduleData.schedules || []);
          }
          const timeOffRes = await fetch(`/api/designer-time-off?designer_id=${designerId}`);
          const timeOffData = await timeOffRes.json();
          if (timeOffRes.ok) {
            const raw = (timeOffData.timeOffs || []).filter(
              (to: any) => to.reason === '임의 휴일' || to.reason === '특별 근무일',
            );
            setAllDesignerTimeOffs(raw);
          } else {
            setAllDesignerTimeOffs([]);
          }
        } catch (error) {
          console.error('Error fetching holiday data:', error);
          setRegularSchedule([]);
          setAllDesignerTimeOffs([]);
        } finally {
          setScheduleLoading(false);
        }
      };
      void fetchData();
    } else {
      setRegularSchedule([]);
      setScheduleLoading(false);
      setAllDesignerTimeOffs([]);
      setSelectedDates([]);
    }
  }, [isOpen, designerId]);

  const existingTimeOffsForVenue = useMemo(() => {
    if (designerId === null || targetShopId === null) return [];
    return allDesignerTimeOffs.filter(
      (to: any) =>
        (to.reason === '임의 휴일' || to.reason === '특별 근무일') &&
        timeOffAppliesToVenue(to, targetShopId),
    );
  }, [allDesignerTimeOffs, designerId, targetShopId]);

  // Comment: Re-populate selectedDates when type, venue, or designer changes — only show dates for the current type
  useEffect(() => {
    if (!isOpen || designerId === null || targetShopId === null) return;
    const targetReason = holidayType === 'holiday' ? '임의 휴일' : '특별 근무일';
    const dates: string[] = [];
    existingTimeOffsForVenue.forEach((to: any) => {
      if (to.reason === targetReason) {
        dates.push(...expandDateRange(to.start_date, to.end_date));
      }
    });
    setSelectedDates(Array.from(new Set(dates)));
  }, [isOpen, designerId, targetShopId, existingTimeOffsForVenue, holidayType]);

  useEffect(() => {
    if (!isOpen) {
      setRegularSchedule([]);
      setScheduleLoading(false);
      setAllDesignerTimeOffs([]);
      setSelectedDates([]);
    }
  }, [isOpen]);

  const handleRemoveTimeOff = useCallback(async () => {
    if (!removeConfirm) return;
    try {
      const res = await fetch(`/api/designer-time-off/${removeConfirm.timeOffId}`, { method: 'DELETE' });
      if (res.ok) {
        // Comment: Remove from local state so calendar updates immediately
        setAllDesignerTimeOffs((prev) => prev.filter((to: any) => to.id !== removeConfirm.timeOffId));
        onAvailableDesignerIdsChange();
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error removing time off:', error);
      alert('삭제에 실패했습니다.');
    } finally {
      setRemoveConfirm(null);
    }
  }, [removeConfirm, onAvailableDesignerIdsChange]);

  /** Handle calendar cell click with type-aware logic */
  const handleDateClick = useCallback(
    (dateStr: string, existingTimeOff: any, isRegularHoliday: boolean, isExistingSpecial: boolean, isExistingHoliday: boolean) => {
      if (holidayType === 'holiday') {
        // Comment: 임의 휴일 모드 — 정기 휴일과 특별 근무일은 클릭 불가
        if (isRegularHoliday || isExistingSpecial) return;
        if (isExistingHoliday && existingTimeOff) {
          // Confirm removal of existing 임의 휴일
          setRemoveConfirm({
            timeOffId: existingTimeOff.id,
            reason: '임의 휴일',
            dateStr,
          });
          return;
        }
      } else {
        // Comment: 특별 근무일 모드 — 모든 날짜 선택 가능
        if (isExistingSpecial && existingTimeOff) {
          // Confirm removal of existing 특별 근무일
          setRemoveConfirm({
            timeOffId: existingTimeOff.id,
            reason: '특별 근무일',
            dateStr,
          });
          return;
        }
        if (isExistingHoliday && existingTimeOff) {
          // Confirm removal of existing 임의 휴일 (to allow special workday)
          setRemoveConfirm({
            timeOffId: existingTimeOff.id,
            reason: '임의 휴일 해제',
            dateStr,
          });
          return;
        }
      }
      // Toggle selection
      setSelectedDates((prev) =>
        prev.includes(dateStr) ? prev.filter((x) => x !== dateStr) : [...prev, dateStr],
      );
    },
    [holidayType],
  );

  const handleSave = async () => {
    if (!designerId && holidayType === 'special') {
      alert('특별 근무일은 전체 디자이너에 대해 설정할 수 없습니다. 디자이너를 선택해주세요.');
      return;
    }
    if (selectedDates.length === 0) {
      alert('날짜를 선택해주세요.');
      return;
    }
    if (targetShopId === null || !Number.isFinite(Number(targetShopId))) {
      alert('적용 매장(지점)을 선택해주세요. Director 등은 지점별로 휴일·특근을 나눌 수 있습니다.');
      return;
    }
    setSubmitting(true);
    try {
      if (!designerId && holidayType === 'holiday') {
        const promises = selectedDates.flatMap((date) =>
          allDesigners.map((designer) =>
            fetch('/api/designer-time-off', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                designer_id: designer.id,
                shop_id: targetShopId,
                start_date: date,
                end_date: date,
                reason: '임의 휴일',
              }),
            }),
          ),
        );
        await Promise.all(promises);
      } else if (designerId) {
        const promises = selectedDates.map((date) =>
          fetch('/api/designer-time-off', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              designer_id: designerId,
              shop_id: targetShopId,
              start_date: date,
              end_date: date,
              reason: holidayType === 'holiday' ? '임의 휴일' : '특별 근무일',
            }),
          }),
        );
        await Promise.all(promises);
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
              setDesignerName('전체');
              if (holidayType === 'special') setHolidayType('holiday');
            } else {
              const id = Number(value);
              const d = allDesigners.find((x) => x.id === id);
              if (d) {
                setDesignerId(id);
                setDesignerName(d.name);
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
          // Comment: Show shop selector only for "전체" or multi-venue designers (directors)
          const selectedDesigner = designerId != null
            ? allDesigners.find((d) => d.id === designerId)
            : null;
          const isMultiVenue =
            designerId === null || // "전체" selected
            (selectedDesigner &&
              ((selectedDesigner.shop_ids_at?.length ?? 0) >= 2 ||
                String(selectedDesigner.role || '').toLowerCase().includes('director')));

          if (isMultiVenue && shops.length > 0) {
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
                          className={`aspect-square text-xs rounded-lg transition-colors ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'} ${isSelected ? (holidayType === 'holiday' ? 'border-2 border-red-500 bg-white text-gray-900' : 'bg-blue-500 text-white') : 'hover:bg-gray-100'} ${isToday && !isSelected ? 'border-2 border-blue-500' : ''}`}
                        >
                          {d.getDate()}
                        </button>
                      );
                    }

                    const weekday = d.getDay();
                    const hasRegularSchedule =
                      designerId !== null
                        ? regularSchedule.some((s: any) => s.weekday === weekday && !s.effective_to)
                        : false;
                    const isRegularHoliday = isCurrentMonth && !hasRegularSchedule && designerId !== null;

                    const existingTimeOff = existingTimeOffsForVenue.find((to: any) => {
                      const start = new Date(to.start_date);
                      const end = new Date(to.end_date);
                      const current = new Date(dateStr);
                      return current >= start && current <= end;
                    });
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

                    const showTodayBorder =
                      isToday &&
                      !isSelected &&
                      !isRegularHoliday &&
                      !isExistingHoliday &&
                      !isExistingSpecial;

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
                          handleDateClick(dateStr, existingTimeOff, isRegularHoliday, isExistingSpecial, isExistingHoliday);
                        }}
                        disabled={!isCurrentMonth}
                        className={`aspect-square text-xs rounded-lg transition-colors ${!isCurrentMonth ? 'text-gray-300' : ''} ${isDisabledCell ? 'opacity-40 cursor-not-allowed' : 'text-gray-900'} ${displayClass} ${showTodayBorder ? 'border-2 border-blue-500' : ''}`}
                      >
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
              <p className="text-xs text-gray-500 mt-4">*날짜를 선택하면 등록/수정이 가능합니다.</p>
            </>
          )}
        </div>
        <Button
          loading={submitting}
          disabled={
            selectedDates.length === 0 ||
            (!designerId && holidayType === 'special') ||
            targetShopId === null
          }
          onClick={handleSave}
          className="w-full"
        >
          저장하기
        </Button>
      </div>

      {/* Confirm removal of existing time-off */}
      <AlertModal
        isOpen={removeConfirm !== null}
        title="알림"
        message={
          removeConfirm
            ? removeConfirm.reason === '임의 휴일'
              ? `${designerName}의 임의 휴일을 근무일로 변경 하시겠습니까?`
              : removeConfirm.reason === '임의 휴일 해제'
                ? `자원 임의 휴일은 특별 근무일로 지정할 수 없습니다. 선택된 날짜를 임의 휴일에서 제외 하시겠습니까?`
                : `${designerName}의 특별 근무일을 휴일로 변경 하시겠습니까?`
            : ''
        }
        variant="confirm"
        onConfirm={handleRemoveTimeOff}
        onClose={() => setRemoveConfirm(null)}
        zIndex={Z.MODAL_ALERT}
      />
    </Modal>
  );
}
