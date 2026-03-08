'use client';

import React, { useState, useEffect } from 'react';
import { GRID_START_HOUR, GRID_END_HOUR } from '@/lib/utils/appointment-utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Z } from '@/lib/constants';

interface RestrictionModalProps {
  isOpen: boolean;
  designerId: number | null;
  designerName: string;
  initialDate: string;
  initialType: 'date' | 'time';
  onClose: () => void;
  onRestrictionsChanged: (restrictions: any[]) => void;
}

export default function RestrictionModal({
  isOpen,
  designerId,
  designerName,
  initialDate,
  initialType,
  onClose,
  onRestrictionsChanged,
}: RestrictionModalProps) {
  const [date, setDate] = useState(initialDate);
  const [type, setType] = useState<'date' | 'time'>(initialType);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingRestriction, setExistingRestriction] = useState<any | null>(null);
  const [loadingExistingRestriction, setLoadingExistingRestriction] = useState(false);
  const [isStartTimeDropdownOpen, setIsStartTimeDropdownOpen] = useState(false);
  const [isEndTimeDropdownOpen, setIsEndTimeDropdownOpen] = useState(false);

  // Reset internal state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDate(initialDate);
      setType(initialType);
      setStartTime('');
      setEndTime('');
      setMemo('');
      setExistingRestriction(null);
    }
  }, [isOpen, initialDate, initialType]);

  // Check existing restriction
  useEffect(() => {
    if (isOpen && designerId && date) {
      const checkExisting = async () => {
        setLoadingExistingRestriction(true);
        try {
          const res = await fetch(`/api/booking-restrictions?designer_id=${designerId}&date=${encodeURIComponent(date)}`);
          const data = await res.json();
          if (res.ok && data.restrictions && data.restrictions.length > 0) {
            const matching = data.restrictions.find((r: any) => {
              if (type === 'date') return r.restriction_type === 'date';
              else return r.restriction_type === 'time';
            });
            setExistingRestriction(matching || data.restrictions[0]);
            if (matching && matching.restriction_type === 'time') {
              setStartTime(matching.start_time?.substring(0, 5) || '');
              setEndTime(matching.end_time?.substring(0, 5) || '');
              setType('time');
            } else if (matching) {
              setType('date');
              setStartTime('');
              setEndTime('');
              setMemo(matching.memo || '');
            }
          } else {
            setExistingRestriction(null);
          }
        } catch (error) {
          console.error('Error fetching existing restriction:', error);
          setExistingRestriction(null);
        } finally {
          setLoadingExistingRestriction(false);
        }
      };
      checkExisting();
    } else if (!isOpen) {
      setExistingRestriction(null);
    }
  }, [isOpen, designerId, date, type]);

  // Click outside dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.time-dropdown-container')) {
        setIsStartTimeDropdownOpen(false);
        setIsEndTimeDropdownOpen(false);
      }
    };
    if (isStartTimeDropdownOpen || isEndTimeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isStartTimeDropdownOpen, isEndTimeDropdownOpen]);

  const handleClose = () => {
    onClose();
  };

  const handleSave = async () => {
    if (!date || !startTime || !endTime) {
      alert('모든 필드를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      if (existingRestriction) {
        // 수정
        const res = await fetch(`/api/booking-restrictions?id=${existingRestriction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            designer_id: designerId,
            restriction_type: 'time',
            restriction_date: date,
            start_time: startTime,
            end_time: endTime,
            memo: memo || null,
          }),
        });
        if (res.ok) {
          alert('예약금지가 수정되었습니다.');
          const restrictionsRes = await fetch(`/api/booking-restrictions?date=${encodeURIComponent(date)}`);
          const restrictionsData = await restrictionsRes.json();
          if (restrictionsRes.ok) {
            onRestrictionsChanged(restrictionsData.restrictions || []);
          }
          onClose();
        } else {
          const data = await res.json();
          alert(data.error || '예약금지 수정에 실패했습니다.');
        }
      } else {
        // 등록
        const res = await fetch('/api/booking-restrictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            designer_id: designerId,
            restriction_type: 'time',
            restriction_date: date,
            start_time: startTime,
            end_time: endTime,
            memo: memo || null,
          }),
        });
        if (res.ok) {
          alert('예약금지가 등록되었습니다.');
          const restrictionsRes = await fetch(`/api/booking-restrictions?date=${encodeURIComponent(date)}`);
          const restrictionsData = await restrictionsRes.json();
          if (restrictionsRes.ok) {
            onRestrictionsChanged(restrictionsData.restrictions || []);
          }
          onClose();
        } else {
          const data = await res.json();
          alert(data.error || '예약금지 등록에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('Error saving restriction:', error);
      alert(existingRestriction ? '예약금지 수정에 실패했습니다.' : '예약금지 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !designerId) return null;

  // Generate 30min interval time options
  const allTimeOptions: string[] = [];
  for (let hour = GRID_START_HOUR; hour < GRID_END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      allTimeOptions.push(timeStr);
    }
  }

  const endTimeOptions = startTime
    ? allTimeOptions.filter((time) => {
        const [sH, sM] = startTime.split(':').map(Number);
        const [tH, tM] = time.split(':').map(Number);
        return tH * 60 + tM > sH * 60 + sM;
      })
    : allTimeOptions;

  const formatTimeForDisplay = (t: string) => {
    const [hourStr, minuteStr] = t.split(':');
    const hour = Number(hourStr);
    const displayHour = hour >= 12 ? (hour === 12 ? 12 : hour - 12) : (hour === 0 ? 12 : hour);
    const period = hour >= 12 ? '오후' : '오전';
    return `${displayHour}:${minuteStr} ${period}`;
  };

  const getDisplayValue = (t: string) => t ? formatTimeForDisplay(t) : '선택하세요';

  return (
    <Modal
      isOpen={isOpen && !!designerId}
      onClose={handleClose}
      title={existingRestriction ? '예약금지 수정' : '예약금지 등록'}
      zIndex={Z.MODAL_BASE}
      maxWidth="max-w-md"
      className="overflow-visible"
      footer={
        <>
          <Button variant="ghost" className="flex-1" onClick={handleClose}>
            취소
          </Button>
          <Button className="flex-1" loading={submitting} onClick={handleSave}>
            {existingRestriction ? '수정' : '등록'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 overflow-visible">
        <Input label="디자이너" value={designerName} disabled />

        <Input
          label="날짜"
          type="date"
          value={date}
          onChange={async (e) => {
            const newDate = e.target.value;
            setDate(newDate);
            // Check for existing restriction when date changes
            if (newDate && designerId) {
              setLoadingExistingRestriction(true);
              try {
                const res = await fetch(`/api/booking-restrictions?designer_id=${designerId}&date=${encodeURIComponent(newDate)}`);
                const data = await res.json();
                if (res.ok && data.restrictions && data.restrictions.length > 0) {
                  const matching = data.restrictions.find((r: any) => {
                    if (type === 'date') return r.restriction_type === 'date';
                    else return r.restriction_type === 'time';
                  });
                  setExistingRestriction(matching || data.restrictions[0]);
                  if (matching && matching.restriction_type === 'time') {
                    setStartTime(matching.start_time?.substring(0, 5) || '');
                    setEndTime(matching.end_time?.substring(0, 5) || '');
                    setType('time');
                  } else if (matching) {
                    setType('date');
                    setStartTime('');
                    setEndTime('');
                    setMemo(matching.memo || '');
                  }
                } else {
                  setExistingRestriction(null);
                  setStartTime('');
                  setEndTime('');
                  setMemo('');
                }
              } catch (error) {
                console.error('Error fetching existing restriction:', error);
                setExistingRestriction(null);
              } finally {
                setLoadingExistingRestriction(false);
              }
            } else {
              setExistingRestriction(null);
            }
          }}
        />

        {loadingExistingRestriction && (
          <div className="text-sm text-gray-500 text-center py-2">확인 중...</div>
        )}

        {/* Time selection dropdowns - kept as custom */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative time-dropdown-container">
            <label className="block text-sm font-medium text-gray-700 mb-2">시작 시간</label>
            <div className="relative">
              <input type="text" readOnly value={getDisplayValue(startTime)}
                onClick={() => { setIsStartTimeDropdownOpen(!isStartTimeDropdownOpen); setIsEndTimeDropdownOpen(false); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent cursor-pointer"
                placeholder="선택하세요" />
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                {isStartTimeDropdownOpen ? 'expand_less' : 'expand_more'}
              </span>
              {isStartTimeDropdownOpen && (
                <div className="absolute z-[100001] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {allTimeOptions.map((time) => (
                    <button key={time} type="button"
                      onClick={() => {
                        setStartTime(time);
                        setIsStartTimeDropdownOpen(false);
                        if (endTime) {
                          const [sH, sM] = time.split(':').map(Number);
                          const [eH, eM] = endTime.split(':').map(Number);
                          if (eH * 60 + eM <= sH * 60 + sM) setEndTime('');
                        }
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${startTime === time ? 'bg-gray-100 font-medium' : ''}`}
                    >
                      {formatTimeForDisplay(time)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="relative time-dropdown-container">
            <label className="block text-sm font-medium text-gray-700 mb-2">종료 시간</label>
            <div className="relative">
              <input type="text" readOnly value={getDisplayValue(endTime)}
                onClick={() => {
                  if (!startTime) { alert('시작 시간을 먼저 선택해주세요.'); return; }
                  setIsEndTimeDropdownOpen(!isEndTimeDropdownOpen);
                  setIsStartTimeDropdownOpen(false);
                }}
                disabled={!startTime}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent ${!startTime ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer'}`}
                placeholder="선택하세요" />
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                {isEndTimeDropdownOpen ? 'expand_less' : 'expand_more'}
              </span>
              {isEndTimeDropdownOpen && startTime && (
                <div className="absolute z-[100001] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {endTimeOptions.length > 0 ? (
                    endTimeOptions.map((time) => (
                      <button key={time} type="button"
                        onClick={() => { setEndTime(time); setIsEndTimeDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${endTime === time ? 'bg-gray-100 font-medium' : ''}`}
                      >
                        {formatTimeForDisplay(time)}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">선택 가능한 시간이 없습니다</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent resize-none"
            placeholder="내용을 입력하세요" />
        </div>
      </div>
    </Modal>
  );
}
