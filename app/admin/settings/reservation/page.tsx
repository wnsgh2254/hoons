'use client';

import { useState, useEffect } from 'react';
import {
  AdminPageLayout,
  PageHeader,
  Tabs,
  DataTable,
  Modal,
  Input,
  Select,
  Button,
  IconButton,
  Toggle,
  FormAlert,
} from '@/components/ui';
import { Z } from '@/lib/constants';
import { useBusinessHours, invalidateBusinessHoursCache } from '@/hooks/useBusinessHours';
import { useBookingItems, invalidateBookingItemsCache } from '@/hooks/useBookingItems';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BusinessHour {
  id: number;
  shopId: number | null;
  startTime: string;
  endTime: string;
  days: string[];
}

interface BookingResource {
  id: number;
  name: string;
  linkedStaff: string;
  isLinked: boolean;
  isActive: boolean;
  shopId: number | null;
  schedules: BusinessHour[];
}

type ShopOption = { id: number; name: string };

interface BookingItem {
  id: number;
  name: string;
  durationHours: number;
  durationMinutes: number;
  isActive: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_DAYS = ['월', '화', '수', '목', '금', '토', '일'];

const TIME_OPTIONS = (() => {
  const opts: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      opts.push({ value: time, label: time });
    }
  }
  return opts;
})();

const MINUTE_OPTIONS = [0, 10, 20, 30, 40, 50].map((m) => ({
  value: m,
  label: String(m).padStart(2, '0'),
}));

const TABS = [
  { key: 'hours', label: '영업 시간' },
  { key: 'resources', label: '예약 자원' },
  { key: 'items', label: '예약 항목' },
];

// ─── Mock Data ───────────────────────────────────────────────────────────────

// Weekday number (0=Sun) to Korean day name
const WEEKDAY_TO_KOREAN: Record<number, string> = {
  0: '일', 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토',
};
const KOREAN_TO_WEEKDAY: Record<string, number> = {
  '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6,
};


// ─── Helper ──────────────────────────────────────────────────────────────────

function formatDuration(hours: number, minutes: number): string {
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} 시간`);
  if (minutes > 0) parts.push(`${minutes} 분`);
  return parts.join(' ') || '0 분';
}

let nextId = 100;
function getNextId() {
  return ++nextId;
}

// ─── BusinessHour Modal ──────────────────────────────────────────────────────

function BusinessHourModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initial,
  title,
  shops,
  showShopSelector = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<BusinessHour, 'id'>) => void;
  onDelete?: () => void;
  initial?: BusinessHour;
  title: string;
  shops?: ShopOption[];
  showShopSelector?: boolean;
}) {
  const [shopId, setShopId] = useState<number | null>(initial?.shopId ?? (shops?.[0]?.id ?? null));
  const [startTime, setStartTime] = useState(initial?.startTime || '07:00');
  const [endTime, setEndTime] = useState(initial?.endTime || '22:00');
  const [days, setDays] = useState<string[]>(initial?.days || [...ALL_DAYS]);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (day: string) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const handleSave = () => {
    if (days.length === 0) {
      setError('요일을 하나 이상 선택해주세요.');
      return;
    }
    if (showShopSelector && !shopId) {
      setError('매장을 선택해주세요.');
      return;
    }
    onSave({ shopId: showShopSelector ? shopId : (initial?.shopId ?? null), startTime, endTime, days });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      zIndex={Z.MODAL_PICKER}
      footer={
        <>
          <Button onClick={handleSave} className="flex-1">저장</Button>
          {onDelete && (
            <Button variant="danger" onClick={onDelete} className="flex-1">삭제</Button>
          )}
          <Button variant="outline" onClick={onClose} className="flex-1">취소</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <FormAlert message={error} variant="error" />}
        {showShopSelector && shops && shops.length > 0 && (
          <Select
            label="매장"
            value={shopId ?? ''}
            onChange={(e) => setShopId(Number(e.target.value))}
            options={shops.map((s) => ({ value: s.id, label: s.name }))}
          />
        )}
        <Select
          label="시작시간"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          options={TIME_OPTIONS}
        />
        <Select
          label="종료시간"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          options={TIME_OPTIONS}
        />
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">요일</p>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  days.includes(day)
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Tab 1: Business Hours ───────────────────────────────────────────────────

function BusinessHoursTab({ shops }: { shops: ShopOption[] }) {
  const { hours: apiHours, loading: apiLoading, refetch } = useBusinessHours({});
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [editingHour, setEditingHour] = useState<BusinessHour | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const shopNameMap = Object.fromEntries((shops || []).map((s) => [s.id, s.name]));

  // Sync API data to local state
  useEffect(() => {
    setHours(
      apiHours.map((h) => ({
        id: h.id,
        shopId: h.shop_id,
        startTime: h.start_time,
        endTime: h.end_time,
        days: h.days,
      })),
    );
  }, [apiHours]);

  const handleAdd = async (data: Omit<BusinessHour, 'id'>) => {
    try {
      const res = await fetch('/api/business-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: data.shopId,
          start_time: data.startTime,
          end_time: data.endTime,
          days: data.days,
        }),
      });
      if (res.ok) {
        invalidateBusinessHoursCache();
        refetch();
      }
    } catch (err) {
      console.error('Error adding business hour:', err);
    }
    setIsAdding(false);
  };

  const handleUpdate = async (data: Omit<BusinessHour, 'id'>) => {
    if (!editingHour) return;
    try {
      const res = await fetch('/api/business-hours', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingHour.id,
          shop_id: data.shopId,
          start_time: data.startTime,
          end_time: data.endTime,
          days: data.days,
        }),
      });
      if (res.ok) {
        invalidateBusinessHoursCache();
        refetch();
      }
    } catch (err) {
      console.error('Error updating business hour:', err);
    }
    setEditingHour(null);
  };

  const handleDelete = async () => {
    if (!editingHour) return;
    try {
      const res = await fetch(`/api/business-hours?id=${editingHour.id}`, { method: 'DELETE' });
      if (res.ok) {
        invalidateBusinessHoursCache();
        refetch();
      }
    } catch (err) {
      console.error('Error deleting business hour:', err);
    }
    setEditingHour(null);
  };

  const columns = [
    {
      key: 'shop',
      header: '매장',
      align: 'center' as const,
      render: (item: BusinessHour) => shopNameMap[item.shopId ?? 0] || '-',
    },
    { key: 'startTime', header: '시작시간', align: 'center' as const, render: (item: BusinessHour) => item.startTime },
    { key: 'endTime', header: '종료시간', align: 'center' as const, render: (item: BusinessHour) => item.endTime },
    { key: 'days', header: '요일', align: 'center' as const, render: (item: BusinessHour) => item.days.join(', ') },
    {
      key: 'actions',
      header: '',
      align: 'center' as const,
      render: (item: BusinessHour) => (
        <Button variant="outline" size="sm" onClick={() => setEditingHour(item)}>수정</Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="px-2 pb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-black">영업 시간</h3>
          <Button icon="add" size="sm" onClick={() => setIsAdding(true)}>추가</Button>
        </div>
        <DataTable columns={columns} data={hours} keyExtractor={(h) => h.id} emptyMessage="등록된 영업시간이 없습니다." />
      </div>

      <div className="text-sm text-gray-500 space-y-1">
        <p>* <span className="text-red-500 font-medium">정기휴일</span>은 별도 설정할 필요 없이 <span className="text-blue-600 underline">요일 선택에서 제외</span>하면 됩니다.</p>
        <p>* 점심 시간 예약을 받지 않으려면 영업시간을 <span className="text-red-500 font-medium">점심 시간</span> 이전/이후로 나누어 등록하면 됩니다.</p>
      </div>

      {isAdding && (
        <BusinessHourModal
          isOpen
          onClose={() => setIsAdding(false)}
          onSave={handleAdd}
          title="영업시간 추가"
          shops={shops}
          showShopSelector
        />
      )}

      {editingHour && (
        <BusinessHourModal
          isOpen
          onClose={() => setEditingHour(null)}
          onSave={handleUpdate}
          onDelete={handleDelete}
          initial={editingHour}
          title="영업시간 수정"
          shops={shops}
          showShopSelector
        />
      )}
    </div>
  );
}

// ─── Tab 2: Booking Resources ────────────────────────────────────────────────

function ResourceModal({
  isOpen,
  onClose,
  onSave,
  initial,
  title,
  shops,
  staffList,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<BookingResource, 'id'>) => void;
  initial?: BookingResource;
  title: string;
  shops: ShopOption[];
  staffList: { id: number; name: string }[];
}) {
  const [isLinked, setIsLinked] = useState(initial?.isLinked ?? true);
  const [linkedStaff, setLinkedStaff] = useState(initial?.linkedStaff || '');
  const [name, setName] = useState(initial?.name || '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [shopId, setShopId] = useState<number | null>(initial?.shopId ?? (shops[0]?.id ?? null));
  const [useSameAsShop, setUseSameAsShop] = useState(false);
  const [schedules, setSchedules] = useState<BusinessHour[]>(initial?.schedules || []);
  const [editingSchedule, setEditingSchedule] = useState<BusinessHour | null>(null);
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError('자원명을 입력해주세요.');
      return;
    }
    onSave({ name, linkedStaff: isLinked ? linkedStaff : '', isLinked, isActive, shopId, schedules });
  };

  const scheduleColumns = [
    { key: 'startTime', header: '시작시간', align: 'center' as const, render: (item: BusinessHour) => item.startTime },
    { key: 'endTime', header: '종료시간', align: 'center' as const, render: (item: BusinessHour) => item.endTime },
    { key: 'days', header: '요일', align: 'center' as const, render: (item: BusinessHour) => item.days.join(', ') },
    {
      key: 'actions',
      header: '',
      align: 'center' as const,
      render: (item: BusinessHour) => (
        <Button variant="outline" size="sm" onClick={() => setEditingSchedule(item)}>수정</Button>
      ),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-2xl"
      scrollable
      zIndex={Z.MODAL_PRIMARY}
      footer={
        <>
          <Button onClick={handleSave} className="flex-1">저장</Button>
          <Button variant="outline" onClick={onClose} className="flex-1">취소</Button>
        </>
      }
    >
      <div className="space-y-6">
        {error && <FormAlert message={error} variant="error" />}

        {/* 직원 연결 */}
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">
            직원 연결 <span className="text-red-500">*</span>
          </p>
          <div className="flex gap-0 border border-gray-200 rounded-lg overflow-hidden w-fit">
            <button
              type="button"
              onClick={() => setIsLinked(true)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                isLinked ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              연결
            </button>
            <button
              type="button"
              onClick={() => setIsLinked(false)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                !isLinked ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              연결 안함
            </button>
          </div>
          {isLinked && (
            <div className="mt-3">
              <Select
                value={linkedStaff}
                onChange={(e) => {
                  setLinkedStaff(e.target.value);
                  if (!name.trim()) setName(e.target.value);
                }}
                options={staffList.map((s) => ({ value: s.name, label: s.name }))}
                placeholder="직원을 선택하세요"
              />
            </div>
          )}
        </div>

        {/* 매장 */}
        {shops.length > 0 && (
          <Select
            label="매장 (Venue)"
            value={shopId ?? ''}
            onChange={(e) => setShopId(Number(e.target.value))}
            options={shops.map((s) => ({ value: s.id, label: s.name }))}
          />
        )}

        {/* 자원명 */}
        <Input
          label="자원명"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="자원명을 입력하세요"
          required
        />

        {/* 상태 */}
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">상태</p>
          <Toggle checked={isActive} onChange={setIsActive} label="사용" />
        </div>

        {/* 예약 가능 시간 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">예약 가능 시간</p>
            {!useSameAsShop && (
              <Button icon="add" size="sm" onClick={() => setIsAddingSchedule(true)}>추가</Button>
            )}
          </div>
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useSameAsShop}
              onChange={(e) => setUseSameAsShop(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">매장 영업 시간과 동일</span>
          </label>
          {!useSameAsShop && (
            <DataTable
              columns={scheduleColumns}
              data={schedules}
              keyExtractor={(s) => s.id}
              emptyMessage="등록된 시간이 없습니다."
            />
          )}
        </div>
      </div>

      {/* Schedule sub-modals */}
      {isAddingSchedule && (
        <BusinessHourModal
          isOpen
          onClose={() => setIsAddingSchedule(false)}
          onSave={(data) => {
            setSchedules((prev) => [...prev, { ...data, id: getNextId() }]);
            setIsAddingSchedule(false);
          }}
          title="시간 추가"
        />
      )}
      {editingSchedule && (
        <BusinessHourModal
          isOpen
          onClose={() => setEditingSchedule(null)}
          onSave={(data) => {
            setSchedules((prev) =>
              prev.map((s) => (s.id === editingSchedule.id ? { ...data, id: s.id } : s)),
            );
            setEditingSchedule(null);
          }}
          onDelete={() => {
            setSchedules((prev) => prev.filter((s) => s.id !== editingSchedule.id));
            setEditingSchedule(null);
          }}
          initial={editingSchedule}
          title="시간 수정"
        />
      )}
    </Modal>
  );
}

function BookingResourcesTab({ shops }: { shops: ShopOption[] }) {
  const [resources, setResources] = useState<BookingResource[]>([]);
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [editingResource, setEditingResource] = useState<BookingResource | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const shopNameMap = Object.fromEntries((shops || []).map((s) => [s.id, s.name]));
  const filteredResources = showInactive ? resources : resources.filter((r) => r.isActive);

  // Fetch staff + schedules from API
  const fetchResources = async () => {
    setLoading(true);
    try {
      const [staffRes, schedulesRes] = await Promise.all([
        fetch('/api/staff'),
        fetch('/api/designer-schedules?all=true'),
      ]);
      const staffData = await staffRes.json();
      const schedulesData = await schedulesRes.json();

      const staff: any[] = staffData.staff || [];
      const allSchedules: any[] = schedulesData.schedules || [];

      setStaffList(staff.map((s: any) => ({ id: s.id, name: s.name })));

      // Group schedules by designer_id, then by (start_time, end_time)
      const schedulesByDesigner = new Map<number, any[]>();
      for (const s of allSchedules) {
        const list = schedulesByDesigner.get(s.designer_id) || [];
        list.push(s);
        schedulesByDesigner.set(s.designer_id, list);
      }

      const mapped: BookingResource[] = staff.map((member: any) => {
        const rawSchedules = schedulesByDesigner.get(member.id) || [];

        // Group by (start_time, end_time) to create schedule entries with days arrays
        const timeGroups = new Map<string, { id: number; startTime: string; endTime: string; days: string[] }>();
        for (const s of rawSchedules) {
          const st = s.start_time?.slice(0, 5) || '00:00'; // "10:00:00" → "10:00"
          const et = s.end_time?.slice(0, 5) || '00:00';
          const key = `${st}-${et}`;
          const existing = timeGroups.get(key);
          const dayName = WEEKDAY_TO_KOREAN[s.weekday] || '';
          if (existing) {
            if (dayName && !existing.days.includes(dayName)) {
              existing.days.push(dayName);
            }
          } else {
            timeGroups.set(key, { id: s.id, startTime: st, endTime: et, days: dayName ? [dayName] : [] });
          }
        }

        // Sort days in Korean weekday order
        const sortedSchedules: BusinessHour[] = Array.from(timeGroups.values()).map((g) => ({
          id: g.id,
          shopId: null,
          startTime: g.startTime,
          endTime: g.endTime,
          days: g.days.sort((a, b) => (KOREAN_TO_WEEKDAY[a] ?? 99) - (KOREAN_TO_WEEKDAY[b] ?? 99)),
        }));

        return {
          id: member.id,
          name: member.name,
          linkedStaff: member.name,
          isLinked: true,
          isActive: member.is_active ?? true,
          shopId: member.shop_id ?? null,
          schedules: sortedSchedules,
        };
      });

      setResources(mapped);
    } catch (err) {
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleAdd = (data: Omit<BookingResource, 'id'>) => {
    setResources((prev) => [...prev, { ...data, id: getNextId() }]);
    setIsAdding(false);
  };

  const handleUpdate = async (data: Omit<BookingResource, 'id'>) => {
    if (!editingResource) return;
    try {
      // Update shop_id via staff API
      await fetch(`/api/staff?id=${editingResource.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: data.shopId,
          is_active: data.isActive,
        }),
      });

      // Update schedules via designer-schedules API
      // Get current DB schedules for this designer
      const currentRes = await fetch(`/api/designer-schedules?designer_id=${editingResource.id}`);
      const currentData = await currentRes.json();
      const currentSchedules: any[] = currentData.schedules || [];

      // Expand new schedules to individual (weekday, start_time, end_time) entries
      const newEntries: { weekday: number; start_time: string; end_time: string }[] = [];
      for (const sched of data.schedules) {
        for (const day of sched.days) {
          const weekday = KOREAN_TO_WEEKDAY[day];
          if (weekday !== undefined) {
            newEntries.push({
              weekday,
              start_time: sched.startTime + ':00',
              end_time: sched.endTime + ':00',
            });
          }
        }
      }

      // Delete schedules that no longer exist
      const activeCurrentIds = currentSchedules
        .filter((cs) => !cs.effective_to)
        .map((cs) => cs.id);

      for (const cs of currentSchedules.filter((cs) => !cs.effective_to)) {
        const match = newEntries.find(
          (ne) => ne.weekday === cs.weekday && ne.start_time === cs.start_time && ne.end_time === cs.end_time,
        );
        if (!match) {
          await fetch(`/api/designer-schedules?id=${cs.id}`, { method: 'DELETE' });
        }
      }

      // Add new schedules that don't exist yet
      for (const ne of newEntries) {
        const match = currentSchedules.find(
          (cs) => !cs.effective_to && cs.weekday === ne.weekday && cs.start_time === ne.start_time && cs.end_time === ne.end_time,
        );
        if (!match) {
          await fetch('/api/designer-schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              designer_id: editingResource.id,
              weekday: ne.weekday,
              start_time: ne.start_time,
              end_time: ne.end_time,
            }),
          });
        }
      }

      // Refetch all resources
      fetchResources();
    } catch (err) {
      console.error('Error updating resource:', err);
    }
    setEditingResource(null);
  };

  const columns = [
    {
      key: 'name',
      header: '자원명',
      align: 'center' as const,
      render: (item: BookingResource) => (
        <span className={!item.isActive ? 'text-gray-400' : ''}>{item.name}</span>
      ),
    },
    {
      key: 'linkedStaff',
      header: '연결 직원',
      align: 'center' as const,
      render: (item: BookingResource) => item.linkedStaff || '-',
    },
    {
      key: 'shop',
      header: '매장',
      align: 'center' as const,
      render: (item: BookingResource) => shopNameMap[item.shopId ?? 0] || '-',
    },
    {
      key: 'schedules',
      header: '예약 가능 시간',
      align: 'center' as const,
      render: (item: BookingResource) => (
        <div className="space-y-0.5">
          {item.schedules.map((s) => (
            <div key={s.id} className="text-sm">
              {s.startTime} ~ {s.endTime} {s.days.join(', ')}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '수정',
      align: 'center' as const,
      render: (item: BookingResource) => (
        <Button variant="outline" size="sm" onClick={() => setEditingResource(item)}>수정</Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="px-2 pb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-black">예약 자원</h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">미사용보기</span>
            </label>
            <Button icon="add" size="sm" onClick={() => setIsAdding(true)}>자원 등록</Button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filteredResources}
          keyExtractor={(r) => r.id}
          emptyMessage="등록된 예약 자원이 없습니다."
          draggable
          onReorder={(reordered) => {
            const reorderedIds = reordered.map((r) => r.id);
            const rest = resources.filter((r) => !reorderedIds.includes(r.id));
            setResources([...reordered, ...rest]);
          }}
        />
      </div>

      <p className="text-sm text-red-500">* 순서를 변경하려면 항목을 드래그 하세요.</p>

      {isAdding && (
        <ResourceModal
          isOpen
          onClose={() => setIsAdding(false)}
          onSave={handleAdd}
          title="자원 등록"
          shops={shops}
          staffList={staffList}
        />
      )}

      {editingResource && (
        <ResourceModal
          isOpen
          onClose={() => setEditingResource(null)}
          onSave={handleUpdate}
          initial={editingResource}
          title="자원 수정"
          shops={shops}
          staffList={staffList}
        />
      )}
    </div>
  );
}

// ─── Tab 3: Booking Items ────────────────────────────────────────────────────

function BookingItemModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initial,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<BookingItem, 'id'>) => void;
  onDelete?: () => void;
  initial?: BookingItem;
  title: string;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [durationHours, setDurationHours] = useState(initial?.durationHours ?? 1);
  const [durationMinutes, setDurationMinutes] = useState(initial?.durationMinutes ?? 0);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError('항목명을 입력해주세요.');
      return;
    }
    onSave({ name, durationHours, durationMinutes, isActive });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      zIndex={Z.MODAL_PRIMARY}
      footer={
        <>
          <Button onClick={handleSave} className="flex-1">저장</Button>
          {onDelete && (
            <Button variant="danger" onClick={onDelete} className="flex-1">삭제</Button>
          )}
          <Button variant="outline" onClick={onClose} className="flex-1">취소</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <FormAlert message={error} variant="error" />}

        <Input
          label="항목명"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="항목명을 입력하세요"
          required
        />

        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">소요시간</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={23}
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              wrapperClassName="w-20"
            />
            <span className="text-sm text-gray-600">시간</span>
            <Select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              options={MINUTE_OPTIONS}
              wrapperClassName="w-24"
            />
            <span className="text-sm text-gray-600">분</span>
          </div>
        </div>

        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">상태</p>
          <Toggle checked={isActive} onChange={setIsActive} label="사용" />
        </div>
      </div>
    </Modal>
  );
}

function BookingItemsTab() {
  const { items: apiItems, loading: apiLoading, refetch } = useBookingItems({});
  const [items, setItems] = useState<BookingItem[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [editingItem, setEditingItem] = useState<BookingItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Sync API data to local state
  useEffect(() => {
    setItems(
      apiItems.map((item) => ({
        id: item.id,
        name: item.name,
        durationHours: item.duration_hours,
        durationMinutes: item.duration_minutes,
        isActive: item.is_active,
      })),
    );
  }, [apiItems]);

  const filteredItems = showInactive ? items : items.filter((i) => i.isActive);

  const handleAdd = async (data: Omit<BookingItem, 'id'>) => {
    try {
      const res = await fetch('/api/booking-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          duration_hours: data.durationHours,
          duration_minutes: data.durationMinutes,
          is_active: data.isActive,
          sort_order: items.length,
        }),
      });
      if (res.ok) {
        invalidateBookingItemsCache();
        refetch();
      }
    } catch (err) {
      console.error('Error adding booking item:', err);
    }
    setIsAdding(false);
  };

  const handleUpdate = async (data: Omit<BookingItem, 'id'>) => {
    if (!editingItem) return;
    try {
      const res = await fetch('/api/booking-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          name: data.name,
          duration_hours: data.durationHours,
          duration_minutes: data.durationMinutes,
          is_active: data.isActive,
        }),
      });
      if (res.ok) {
        invalidateBookingItemsCache();
        refetch();
      }
    } catch (err) {
      console.error('Error updating booking item:', err);
    }
    setEditingItem(null);
  };

  const handleDelete = async () => {
    if (!editingItem) return;
    try {
      const res = await fetch(`/api/booking-items?id=${editingItem.id}`, { method: 'DELETE' });
      if (res.ok) {
        invalidateBookingItemsCache();
        refetch();
      }
    } catch (err) {
      console.error('Error deleting booking item:', err);
    }
    setEditingItem(null);
  };

  const columns = [
    {
      key: 'name',
      header: '항목명',
      align: 'center' as const,
      render: (item: BookingItem) => (
        <span className={!item.isActive ? 'text-gray-400' : ''}>{item.name}</span>
      ),
    },
    {
      key: 'duration',
      header: '소요시간',
      align: 'center' as const,
      render: (item: BookingItem) => formatDuration(item.durationHours, item.durationMinutes),
    },
    {
      key: 'actions',
      header: '수정',
      align: 'center' as const,
      render: (item: BookingItem) => (
        <Button variant="outline" size="sm" onClick={() => setEditingItem(item)}>수정</Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="px-2 pb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-black">예약 항목</h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">미사용보기</span>
            </label>
            <Button icon="add" size="sm" onClick={() => setIsAdding(true)}>항목 등록</Button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filteredItems}
          keyExtractor={(i) => i.id}
          emptyMessage="등록된 예약 항목이 없습니다."
          draggable
          onReorder={(reordered) => {
            const reorderedIds = reordered.map((i) => i.id);
            const rest = items.filter((i) => !reorderedIds.includes(i.id));
            setItems([...reordered, ...rest]);
          }}
        />
      </div>

      <p className="text-sm text-red-500">* 순서를 변경하려면 항목을 드래그 하세요.</p>

      {isAdding && (
        <BookingItemModal
          isOpen
          onClose={() => setIsAdding(false)}
          onSave={handleAdd}
          title="항목 등록"
        />
      )}

      {editingItem && (
        <BookingItemModal
          isOpen
          onClose={() => setEditingItem(null)}
          onSave={handleUpdate}
          onDelete={handleDelete}
          initial={editingItem}
          title="항목 수정"
        />
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ReservationSettingsPage() {
  const [activeTab, setActiveTab] = useState('hours');
  const [shops, setShops] = useState<ShopOption[]>([]);

  useEffect(() => {
    fetch('/api/shops')
      .then((res) => res.json())
      .then((data) => setShops(data.shops || []))
      .catch((err) => console.error('Error loading shops:', err));
  }, []);

  return (
    <AdminPageLayout>
      <PageHeader title="예약 설정" />
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="mt-1">
        {activeTab === 'hours' && <BusinessHoursTab shops={shops} />}
        {activeTab === 'resources' && <BookingResourcesTab shops={shops} />}
        {activeTab === 'items' && <BookingItemsTab />}
      </div>
    </AdminPageLayout>
  );
}
