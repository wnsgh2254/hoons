'use client';

import { useEffect, useState } from 'react';

// Comment: Format time string "HH:mm:ss" or "HH:mm" to "HH:mm"
function formatTime(t: string | null | undefined): string {
  if (!t) return '-';
  const part = t.slice(0, 5);
  return part || '-';
}

// Comment: Compute total minutes from clock_in and clock_out (time strings HH:mm or HH:mm:ss)
// Same time (e.g. both clicked at once) => 0 minutes; otherwise end - start (no overnight wrap)
function computedTotalMinutes(clockIn: string | null | undefined, clockOut: string | null | undefined): number | null {
  if (!clockIn || !clockOut) return null;
  const [h1, m1] = clockIn.split(':').map(Number);
  const [h2, m2] = clockOut.split(':').map(Number);
  const start = (h1 ?? 0) * 60 + (m1 ?? 0);
  const end = (h2 ?? 0) * 60 + (m2 ?? 0);
  if (end <= start) return 0; // same time => 0 hours
  return end - start;
}

// Comment: Format minutes as "N시간 M분"
function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

interface AttendanceModalProps {
  designerId: number;
  designerName: string;
  workDate: string; // YYYY-MM-DD
  onClose: () => void;
}

interface AttendanceRow {
  id?: number;
  designer_id: number;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  manual_total_minutes: number | null;
}

export default function AttendanceModal({
  designerId,
  designerName,
  workDate,
  onClose,
}: AttendanceModalProps) {
  const [attendance, setAttendance] = useState<AttendanceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'clock_in' | 'clock_out' | 'manual' | null>(null);
  const [manualHours, setManualHours] = useState<string>('');
  const [manualMinutes, setManualMinutes] = useState<string>('');

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/staff-attendance?designer_id=${designerId}&date=${encodeURIComponent(workDate)}`
      );
      const data = await res.json();
      if (res.ok && data.attendance) {
        setAttendance(data.attendance);
        const total = data.attendance.manual_total_minutes;
        if (total != null && Number.isFinite(total)) {
          const t = Math.max(0, Math.floor(total));
          setManualHours(String(Math.floor(t / 60)));
          setManualMinutes(String(t % 60));
        } else {
          setManualHours('');
          setManualMinutes('');
        }
      } else {
        setAttendance(null);
        setManualHours('');
        setManualMinutes('');
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [designerId, workDate]);

  const computed = attendance
    ? computedTotalMinutes(attendance.clock_in, attendance.clock_out)
    : null;
  const displayTotalMinutes =
    attendance?.manual_total_minutes != null
      ? attendance.manual_total_minutes
      : computed;
  const displayTotalText =
    displayTotalMinutes != null ? formatMinutes(displayTotalMinutes) : '-';

  const handleClockIn = async () => {
    setActionLoading('clock_in');
    try {
      const res = await fetch('/api/staff-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designer_id: designerId,
          work_date: workDate,
          action: 'clock_in',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAttendance(data.attendance ?? null);
      } else {
        alert(data.error || '출근 기록에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('출근 기록에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClockOut = async () => {
    setActionLoading('clock_out');
    try {
      const res = await fetch('/api/staff-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designer_id: designerId,
          work_date: workDate,
          action: 'clock_out',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAttendance(data.attendance ?? null);
      } else {
        alert(data.error || '퇴근 기록에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('퇴근 기록에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveManualTotal = async () => {
    const hoursStr = manualHours.trim();
    const minutesStr = manualMinutes.trim();
    if (hoursStr === '' && minutesStr === '') {
      return saveManualTotalMinutes(null);
    }
    const h = hoursStr === '' ? 0 : parseInt(hoursStr, 10);
    const m = minutesStr === '' ? 0 : parseInt(minutesStr, 10);
    if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || m < 0 || m >= 60) {
      alert('시간은 0 이상, 분은 0~59 사이로 입력해주세요.');
      return;
    }
    const totalMinutes = h * 60 + m;
    return saveManualTotalMinutes(totalMinutes);
  };

  const saveManualTotalMinutes = async (value: number | null) => {
    setActionLoading('manual');
    try {
      const res = await fetch('/api/staff-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designer_id: designerId,
          work_date: workDate,
          action: 'set_manual_total',
          manual_total_minutes: value,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAttendance(data.attendance ?? null);
      } else {
        alert(data.error || '총 근무 시간 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('총 근무 시간 저장에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const dateLabel = workDate
    ? new Date(workDate + 'T12:00:00').toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      })
    : '';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100001] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">출/퇴근 관리</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <p className="text-sm font-medium text-gray-700">{designerName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{dateLabel} ({workDate})</p>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : (
            <>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClockIn}
                  disabled={actionLoading !== null}
                  className="flex-1 px-4 py-3 rounded-lg bg-green-600 text-white font-medium text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'clock_in' ? '저장 중...' : '출근'}
                </button>
                <button
                  type="button"
                  onClick={handleClockOut}
                  disabled={actionLoading !== null}
                  className="flex-1 px-4 py-3 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'clock_out' ? '저장 중...' : '퇴근'}
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">출근 시간</span>
                  <span className="font-medium text-right">
                    {formatTime(attendance?.clock_in ?? null)}
                  </span>
                  <span className="text-gray-500">퇴근 시간</span>
                  <span className="font-medium text-right">
                    {formatTime(attendance?.clock_out ?? null)}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-500">총 근무 시간</span>
                    <span className="font-bold text-black">{displayTotalText}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  총 근무 시간 직접 입력
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      value={manualHours}
                      onChange={(e) => setManualHours(e.target.value)}
                      className="w-16 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent text-center"
                    />
                    <span className="text-sm text-gray-600">시간</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      step={1}
                      placeholder="0"
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(e.target.value)}
                      className="w-16 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent text-center"
                    />
                    <span className="text-sm text-gray-600">분</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveManualTotal}
                    disabled={actionLoading !== null}
                    className="px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {actionLoading === 'manual' ? '저장 중...' : '적용'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  빈칸이면 출근/퇴근 시간으로 자동 계산됩니다. 시간·분 입력 후 적용하세요.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
