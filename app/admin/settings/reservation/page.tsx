'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { invalidateStaffCache } from '@/hooks/useStaff';
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
  Badge,
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
  /** Shop IDs this designer is allowed at (primary + designer_shops) */
  allowedShopIds: number[];
  role: string;
}

type ShopOption = { id: number; name: string };

interface BookingItem {
  id: number;
  name: string;
  durationHours: number;
  durationMinutes: number;
  startingPrice: number;
  /** Shown on customer booking page */
  memo: string;
  isActive: boolean;
}

interface AdminBookingModalService {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
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
  { key: 'booking-modal', label: '예약 등록 모달' },
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

function formatAud(price: number): string {
  const n = Number.isFinite(price) ? price : 0;
  return `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  businessHours = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<BusinessHour, 'id'>) => void;
  onDelete?: () => void;
  initial?: BusinessHour;
  title: string;
  shops?: ShopOption[];
  showShopSelector?: boolean;
  /** Business hours for constraining time selection */
  businessHours?: { shopId: number | null; startTime: string; endTime: string; days: string[] }[];
}) {
  const [shopId, setShopId] = useState<number | null>(initial?.shopId ?? (shops?.[0]?.id ?? null));
  const [startTime, setStartTime] = useState(initial?.startTime || '07:00');
  const [endTime, setEndTime] = useState(initial?.endTime || '22:00');
  const [days, setDays] = useState<string[]>(initial?.days || [...ALL_DAYS]);
  const [error, setError] = useState<string | null>(null);

  // Comment: Filter TIME_OPTIONS to business hours range for selected shop
  const filteredTimeOptions = useMemo(() => {
    if (businessHours.length === 0) return TIME_OPTIONS;
    // Find business hours that match the selected shop (or have null shopId = all shops)
    const matching = businessHours.filter(
      (bh) => bh.shopId === null || bh.shopId === shopId,
    );
    if (matching.length === 0) return TIME_OPTIONS;
    // Use widest range: earliest start, latest end
    let earliest = '23:30';
    let latest = '00:00';
    for (const bh of matching) {
      if (bh.startTime < earliest) earliest = bh.startTime;
      if (bh.endTime > latest) latest = bh.endTime;
    }
    return TIME_OPTIONS.filter((opt) => opt.value >= earliest && opt.value <= latest);
  }, [businessHours, shopId]);

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
          options={filteredTimeOptions}
        />
        <Select
          label="종료시간"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          options={filteredTimeOptions}
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
  const [editingHour, setEditingHour] = useState<BusinessHour | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const shopNameMap = Object.fromEntries((shops || []).map((s) => [s.id, s.name]));

  const hours = useMemo(
    () =>
      apiHours.map((h) => ({
        id: h.id,
        shopId: h.shop_id,
        startTime: h.start_time,
        endTime: h.end_time,
        days: h.days,
      })),
    [apiHours],
  );

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
  onDelete,
  initial,
  title,
  shops,
  staffList,
  saveInProgress = false,
  deleteInProgress = false,
  businessHours = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<BookingResource, 'id'>) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  initial?: BookingResource;
  title: string;
  shops: ShopOption[];
  staffList: { id: number; name: string }[];
  /** When true, save/cancel reflect an async save (edit flow). */
  saveInProgress?: boolean;
  /** When true, delete/cancel reflect an async delete (edit flow). */
  deleteInProgress?: boolean;
  /** Business hours for filtering time options */
  businessHours?: { shopId: number | null; startTime: string; endTime: string; days: string[] }[];
}) {
  const [isLinked, setIsLinked] = useState(initial?.isLinked ?? true);
  const initialLinkedStaffId = useMemo(() => {
    const matched = staffList.find((s) => s.name === (initial?.linkedStaff || ''));
    return matched ? String(matched.id) : '';
  }, [initial?.linkedStaff, staffList]);
  const [linkedStaff, setLinkedStaff] = useState(initial?.linkedStaff || '');
  const [linkedStaffId, setLinkedStaffId] = useState(initialLinkedStaffId);
  const [name, setName] = useState(initial?.name || '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [shopId, setShopId] = useState<number | null>(initial?.shopId ?? (shops[0]?.id ?? null));
  const [useSameAsShop, setUseSameAsShop] = useState(false);
  const [schedules, setSchedules] = useState<BusinessHour[]>(initial?.schedules || []);
  const [editingSchedule, setEditingSchedule] = useState<BusinessHour | null>(null);
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comment: Filter shops to only those the designer is allowed at (directors see all)
  const isDirector = String(initial?.role || '').toLowerCase().includes('director');
  const allowedShops = isDirector || !initial?.allowedShopIds?.length
    ? shops
    : shops.filter((s) => initial.allowedShopIds.includes(s.id));
  const showShopSelector = allowedShops.length > 1;

  const handleSave = () => {
    if (saveInProgress) return;
    if (!name.trim()) {
      setError('자원명을 입력해주세요.');
      return;
    }
    onSave({
      name,
      linkedStaff: isLinked ? linkedStaff : '',
      isLinked,
      isActive,
      shopId,
      schedules,
      allowedShopIds: initial?.allowedShopIds ?? [],
      role: initial?.role ?? '',
    });
  };

  useEffect(() => {
    setLinkedStaff(initial?.linkedStaff || '');
    setLinkedStaffId(initialLinkedStaffId);
  }, [initial?.linkedStaff, initialLinkedStaffId]);

  const scheduleColumns = [
    { key: 'startTime', header: '시작시간', align: 'center' as const, render: (item: BusinessHour) => item.startTime },
    { key: 'endTime', header: '종료시간', align: 'center' as const, render: (item: BusinessHour) => item.endTime },
    { key: 'days', header: '요일', align: 'center' as const, render: (item: BusinessHour) => item.days.join(', ') },
    {
      key: 'shop',
      header: '지점',
      align: 'center' as const,
      render: (item: BusinessHour) =>
        shops.length > 0
          ? (shops.find((s) => s.id === item.shopId)?.name ?? '—')
          : '—',
    },
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
          <Button loading={saveInProgress} disabled={deleteInProgress} onClick={handleSave} className="flex-1">
            저장
          </Button>
          {onDelete && (
            <Button variant="danger" loading={deleteInProgress} disabled={saveInProgress} onClick={onDelete} className="flex-1">
              삭제
            </Button>
          )}
          <Button variant="outline" disabled={saveInProgress || deleteInProgress} onClick={onClose} className="flex-1">
            취소
          </Button>
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
                value={linkedStaffId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  const selected = staffList.find((s) => String(s.id) === nextId);
                  const selectedName = selected?.name || '';
                  setLinkedStaffId(nextId);
                  setLinkedStaff(selectedName);
                  if (!name.trim()) setName(selectedName);
                }}
                options={staffList.map((s) => ({ value: String(s.id), label: s.name }))}
                placeholder="직원을 선택하세요"
              />
            </div>
          )}
        </div>

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
          shops={allowedShops}
          showShopSelector={showShopSelector}
          businessHours={businessHours}
          initial={{ id: 0, shopId: allowedShops.length === 1 ? allowedShops[0].id : shopId, startTime: '10:00', endTime: '19:00', days: [] }}
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
          shops={allowedShops}
          showShopSelector={showShopSelector}
          businessHours={businessHours}
        />
      )}
    </Modal>
  );
}

function BookingResourcesTab({ shops }: { shops: ShopOption[] }) {
  const { hours: rawBusinessHours } = useBusinessHours();
  const businessHoursForModal = useMemo(() =>
    rawBusinessHours.map((bh) => ({
      shopId: bh.shop_id,
      startTime: bh.start_time?.slice(0, 5) || '00:00',
      endTime: bh.end_time?.slice(0, 5) || '23:30',
      days: bh.days || [],
    })),
    [rawBusinessHours],
  );
  const [resources, setResources] = useState<BookingResource[]>([]);
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [editingResource, setEditingResource] = useState<BookingResource | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [resourceSavePending, setResourceSavePending] = useState(false);
  const [resourceDeletePending, setResourceDeletePending] = useState(false);

  const shopNameMap = Object.fromEntries((shops || []).map((s) => [s.id, s.name]));
  const filteredResources = showInactive ? resources : resources.filter((r) => r.isActive);

  // Comment: Fetch staff, their schedules, and weekday venue defaults together
  const fetchResources = async () => {
    setLoading(true);
    try {
      const [staffRes, schedulesRes, defaultsRes, designersRes] = await Promise.all([
        fetch('/api/staff?include_inactive=true'),
        fetch('/api/designer-schedules?all=true'),
        fetch('/api/designer-weekday-defaults'),
        fetch('/api/designers'),
      ]);
      const staffData = await staffRes.json();
      const schedulesData = await schedulesRes.json();
      const defaultsData = await defaultsRes.json();
      const designersData = await designersRes.json();

      const staff: any[] = staffData.staff || [];
      // Comment: Map designer id → { shop_ids_at, role } for allowed shop filtering
      const designerInfoMap = new Map<number, { shopIdsAt: number[]; role: string }>();
      for (const d of designersData.designers || []) {
        designerInfoMap.set(d.id, { shopIdsAt: d.shop_ids_at || [], role: d.role || '' });
      }
      const allSchedules: any[] = schedulesData.schedules || [];
      const allDefaults: { designer_id: number; weekday: number; shop_id: number }[] =
        defaultsData.defaults || [];

      setStaffList(staff.map((s: any) => ({ id: s.id, name: s.name })));

      // Comment: Build lookup: "designerId:weekday" → default shop_id
      const defaultsMap = new Map<string, number>();
      for (const d of allDefaults) {
        defaultsMap.set(`${Number(d.designer_id)}:${Number(d.weekday)}`, Number(d.shop_id));
      }

      // Group schedules by designer_id
      const schedulesByDesigner = new Map<number, any[]>();
      for (const s of allSchedules) {
        const list = schedulesByDesigner.get(s.designer_id) || [];
        list.push(s);
        schedulesByDesigner.set(s.designer_id, list);
      }

      const mapped: BookingResource[] = staff.map((member: any) => {
        const rawSchedules = schedulesByDesigner.get(member.id) || [];

        // Comment: Group by (start_time, end_time, resolved_shop_id) so multi-venue blocks split by venue
        const timeGroups = new Map<
          string,
          { id: number; shopId: number | null; startTime: string; endTime: string; days: string[] }
        >();
        for (const s of rawSchedules) {
          const st = s.start_time?.slice(0, 5) || '00:00';
          const et = s.end_time?.slice(0, 5) || '00:00';
          // Comment: Prefer weekday default venue; fall back to schedule's own shop_id; then designer's home shop
          const shopId =
            defaultsMap.get(`${member.id}:${s.weekday}`) ??
            (s.shop_id != null ? Number(s.shop_id) : null) ??
            (member.shop_id != null ? Number(member.shop_id) : null);
          const key = `${st}-${et}-${shopId ?? 'null'}`;
          const existing = timeGroups.get(key);
          const dayName = WEEKDAY_TO_KOREAN[s.weekday] || '';
          if (existing) {
            if (dayName && !existing.days.includes(dayName)) {
              existing.days.push(dayName);
            }
          } else {
            timeGroups.set(key, { id: s.id, shopId, startTime: st, endTime: et, days: dayName ? [dayName] : [] });
          }
        }

        const sortedSchedules: BusinessHour[] = Array.from(timeGroups.values()).map((g) => ({
          id: g.id,
          shopId: g.shopId,
          startTime: g.startTime,
          endTime: g.endTime,
          days: g.days.sort((a, b) => (KOREAN_TO_WEEKDAY[a] ?? 99) - (KOREAN_TO_WEEKDAY[b] ?? 99)),
        }));

        const info = designerInfoMap.get(member.id);
        return {
          id: member.id,
          name: member.name,
          linkedStaff: member.name,
          isLinked: true,
          isActive: member.is_active ?? true,
          shopId: member.shop_id ?? null,
          schedules: sortedSchedules,
          allowedShopIds: info?.shopIdsAt ?? (member.shop_id != null ? [member.shop_id] : []),
          role: info?.role ?? member.role ?? '',
        };
      }).filter((resource) => resource.schedules.length > 0);

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
    if (data.isLinked && data.linkedStaff) {
      const duplicated = resources.some(
        (r) => r.isLinked && r.linkedStaff === data.linkedStaff,
      );
      if (duplicated) {
        alert('이미 등록된 직원입니다. 추가하지 말고 기존 자원을 수정해주세요.');
        return;
      }
    }

    setResources((prev) => [...prev, { ...data, id: getNextId() }]);
    setIsAdding(false);
  };

  const handleUpdate = async (data: Omit<BookingResource, 'id'>) => {
    if (!editingResource) return;
    setResourceSavePending(true);
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

      // Expand new schedules to individual (weekday, shop_id, start_time, end_time) entries
      const newEntries: { weekday: number; shop_id: number | null; start_time: string; end_time: string }[] = [];
      for (const sched of data.schedules) {
        for (const day of sched.days) {
          const weekday = KOREAN_TO_WEEKDAY[day];
          if (weekday !== undefined) {
            newEntries.push({
              weekday,
              shop_id: sched.shopId ?? null,
              start_time: sched.startTime + ':00',
              end_time: sched.endTime + ':00',
            });
          }
        }
      }

      const activeCurrent = currentSchedules.filter((cs) => !cs.effective_to);

      const deleteIds: number[] = [];
      for (const cs of activeCurrent) {
        const match = newEntries.find(
          (ne) =>
            ne.weekday === cs.weekday &&
            ne.start_time === cs.start_time &&
            ne.end_time === cs.end_time &&
            (ne.shop_id == null || cs.shop_id == null || ne.shop_id === cs.shop_id),
        );
        if (!match) deleteIds.push(cs.id);
      }

      const entriesToAdd: typeof newEntries = [];
      for (const ne of newEntries) {
        const match = activeCurrent.find(
          (cs) =>
            cs.weekday === ne.weekday &&
            cs.start_time === ne.start_time &&
            cs.end_time === ne.end_time &&
            (ne.shop_id == null || cs.shop_id == null || cs.shop_id === ne.shop_id),
        );
        if (!match) entriesToAdd.push(ne);
      }

      if (deleteIds.length > 0 || entriesToAdd.length > 0) {
        await fetch('/api/designer-schedules/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            designer_id: editingResource.id,
            shop_id: data.shopId ?? undefined,
            delete_ids: deleteIds,
            entries: entriesToAdd,
          }),
        });
      }

      // Comment: Save weekday venue defaults derived from each schedule block's shopId
      const weekdayDefaultRows: { weekday: number; shop_id: number }[] = [];
      for (const sched of data.schedules) {
        if (sched.shopId == null) continue;
        for (const day of sched.days) {
          const weekday = KOREAN_TO_WEEKDAY[day];
          if (weekday !== undefined) {
            weekdayDefaultRows.push({ weekday, shop_id: sched.shopId });
          }
        }
      }
      if (weekdayDefaultRows.length > 0) {
        // Comment: Silently ignore errors for single-venue designers (API returns {skipped:true})
        await fetch('/api/designer-weekday-defaults', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ designer_id: editingResource.id, rows: weekdayDefaultRows }),
        }).catch((e) => console.warn('weekday defaults save skipped:', e));
      }

      invalidateStaffCache();
      // Refetch all resources
      fetchResources();
    } catch (err) {
      console.error('Error updating resource:', err);
    } finally {
      setResourceSavePending(false);
      setEditingResource(null);
    }
  };

  const handleDelete = async () => {
    if (!editingResource) return;
    const ok = window.confirm('해당 예약 자원을 삭제하시겠습니까? 사용/미사용 상태와 관계없이 목록에서 제거됩니다.');
    if (!ok) return;

    setResourceDeletePending(true);
    try {
      // Remove reservation schedules only, keep staff member in designers table.
      const currentRes = await fetch(`/api/designer-schedules?designer_id=${editingResource.id}`);
      const currentData = await currentRes.json();
      const currentSchedules: any[] = (currentData.schedules || []).filter((s: any) => !s.effective_to);
      const deleteIds = currentSchedules.map((s: any) => s.id);

      if (deleteIds.length > 0) {
        const syncRes = await fetch('/api/designer-schedules/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            designer_id: editingResource.id,
            delete_ids: deleteIds,
            entries: [],
          }),
        });
        if (!syncRes.ok) {
          const errorData = await syncRes.json().catch(() => ({}));
          throw new Error(errorData?.error || '예약 자원 삭제에 실패했습니다.');
        }
      }

      setResources((prev) => prev.filter((r) => r.id !== editingResource.id));
      invalidateStaffCache();
      fetchResources();
    } catch (err) {
      console.error('Error deleting resource:', err);
      alert(err instanceof Error ? err.message : '예약 자원 삭제에 실패했습니다.');
    } finally {
      setResourceDeletePending(false);
      setEditingResource(null);
    }
  };

  const columns = [
    {
      key: 'name',
      header: '자원명',
      align: 'center' as const,
      render: (item: BookingResource) => (
        <div className="inline-flex items-center gap-2">
          <span className={!item.isActive ? 'text-gray-400 font-medium' : ''}>{item.name}</span>
          {!item.isActive && (
            <Badge variant="default" size="sm" className="bg-gray-200 text-gray-700">
              미사용
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'linkedStaff',
      header: '연결 직원',
      align: 'center' as const,
      render: (item: BookingResource) => (
        <span className={!item.isActive ? 'text-gray-400' : ''}>{item.linkedStaff || '-'}</span>
      ),
    },
    {
      key: 'schedules',
      header: '예약 가능 시간',
      align: 'left' as const,
      render: (item: BookingResource) => (
        <div className={`space-y-0.5 ${!item.isActive ? 'opacity-60' : ''}`}>
          {item.schedules.map((s) => (
            <div key={s.id} className="text-sm flex items-center gap-2">
              <span>{s.startTime} ~ {s.endTime} {s.days.join(', ')}</span>
              {shopNameMap[s.shopId ?? 0] ? (
                <Badge size="sm">{shopNameMap[s.shopId ?? 0]}</Badge>
              ) : null}
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
        <Button
          variant="outline"
          size="sm"
          className={!item.isActive ? 'border-gray-200 text-gray-400' : ''}
          onClick={() => setEditingResource(item)}
        >
          수정
        </Button>
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
          businessHours={businessHoursForModal}
        />
      )}

      {editingResource && (
        <ResourceModal
          isOpen
          onClose={() => {
            if (!resourceSavePending && !resourceDeletePending) setEditingResource(null);
          }}
          onSave={handleUpdate}
          onDelete={handleDelete}
          initial={editingResource}
          title="자원 수정"
          shops={shops}
          staffList={staffList}
          saveInProgress={resourceSavePending}
          deleteInProgress={resourceDeletePending}
          businessHours={businessHoursForModal}
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
  const [startingPriceInput, setStartingPriceInput] = useState('');
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  // Comment: Avoid depending on `initial` object identity (prevents reset loops when parent re-renders)
  const initialSnapshot = initial
    ? `${initial.id}|${initial.name}|${initial.startingPrice}|${initial.durationHours}|${initial.durationMinutes}|${initial.memo ?? ''}|${initial.isActive}`
    : '';

  useEffect(() => {
    if (!isOpen) return;
    setName(initial?.name || '');
    setDurationHours(initial?.durationHours ?? 1);
    setDurationMinutes(initial?.durationMinutes ?? 0);
    const p = initial != null ? Number(initial.startingPrice) : NaN;
    setStartingPriceInput(Number.isFinite(p) && p > 0 ? String(p) : '');
    setMemo(initial?.memo ?? '');
    setIsActive(initial?.isActive ?? true);
    setError(null);
  }, [isOpen, initialSnapshot]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('항목명을 입력해주세요.');
      return;
    }
    const raw = startingPriceInput.trim().replace(/,/g, '');
    const price = raw === '' ? 0 : Number(raw);
    if (raw !== '' && (Number.isNaN(price) || price < 0)) {
      setError('시작 금액을 올바르게 입력해주세요.');
      return;
    }
    onSave({
      name,
      durationHours,
      durationMinutes,
      startingPrice: price,
      memo: memo.trim(),
      isActive,
    });
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
          <p className="block text-sm font-medium text-gray-700 mb-2">시작 금액</p>
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-black focus-within:border-transparent">
            <span className="text-sm font-medium text-gray-600 select-none" aria-hidden>
              $
            </span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={startingPriceInput}
              onChange={(e) => setStartingPriceInput(e.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              placeholder="예: 120.00"
              aria-label="시작 금액 (달러)"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">고객 예약 시 총액·보증금(20%) 계산에 사용됩니다 (AUD).</p>
        </div>

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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            메모 (고객 예약 화면에 표시, 선택)
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="예: 포함 내용, 준비물, 안내 문구 등"
          />
          <p className="mt-1 text-xs text-gray-500">
            손님이 예약 시 서비스 카드 아래에 짧게 보입니다.
          </p>
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
  const prevApiItemsSigRef = useRef<string | null>(null);

  // Sync API data to local state only when payload meaningfully changes (avoids setState loops)
  useEffect(() => {
    const sig = JSON.stringify(
      apiItems.map((i) => ({
        id: i.id,
        name: i.name,
        duration_hours: i.duration_hours,
        duration_minutes: i.duration_minutes,
        starting_price: i.starting_price,
        memo: i.memo,
        is_active: i.is_active,
      })),
    );
    if (sig === prevApiItemsSigRef.current) return;
    prevApiItemsSigRef.current = sig;
    setItems(
      apiItems.map((item) => ({
        id: item.id,
        name: item.name,
        durationHours: item.duration_hours,
        durationMinutes: item.duration_minutes,
        startingPrice: Number(item.starting_price ?? 0),
        memo: typeof item.memo === 'string' ? item.memo : '',
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
          starting_price: data.startingPrice,
          memo: data.memo.trim() || null,
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
          starting_price: data.startingPrice,
          memo: data.memo.trim() || null,
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
      key: 'startingPrice',
      header: '시작 금액',
      align: 'center' as const,
      render: (item: BookingItem) => (
        <span className={!item.isActive ? 'text-gray-400' : ''}>{formatAud(item.startingPrice)}</span>
      ),
    },
    {
      key: 'duration',
      header: '소요시간',
      align: 'center' as const,
      render: (item: BookingItem) => formatDuration(item.durationHours, item.durationMinutes),
    },
    {
      key: 'memo',
      header: '메모',
      align: 'center' as const,
      render: (item: BookingItem) => (
        <span
          className={`max-w-[200px] truncate inline-block ${!item.isActive ? 'text-gray-400' : 'text-gray-700'}`}
          title={item.memo || undefined}
        >
          {item.memo?.trim() ? item.memo.trim() : '—'}
        </span>
      ),
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

function BookingModalServicesTab() {
  const [modalServices, setModalServices] = useState<AdminBookingModalService[]>([]);
  const [modalServicesLoading, setModalServicesLoading] = useState(false);
  const [creatingService, setCreatingService] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<number | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [editingService, setEditingService] = useState<AdminBookingModalService | null>(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editingSaving, setEditingSaving] = useState(false);

  const fetchModalServices = async () => {
    setModalServicesLoading(true);
    try {
      const res = await fetch('/api/booking-modal-services');
      const data = await res.json();
      if (!res.ok) return;
      const services = Array.isArray(data.services) ? data.services : [];
      setModalServices(
        services.map((s: any) => ({
          id: Number(s.id),
          name: String(s.name || ''),
          isActive: s.is_active !== false,
          sortOrder: Number(s.sort_order || 0),
        })),
      );
    } catch (err) {
      console.error('Error loading admin booking modal services:', err);
    } finally {
      setModalServicesLoading(false);
    }
  };

  useEffect(() => {
    fetchModalServices();
  }, []);

  const handleAddService = async () => {
    if (!newServiceName.trim()) return;
    setCreatingService(true);
    try {
      const res = await fetch('/api/booking-modal-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newServiceName.trim(),
          is_active: true,
          sort_order: modalServices.length,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '서비스 추가에 실패했습니다.');
      }
      setNewServiceName('');
      await fetchModalServices();
    } catch (err) {
      console.error('Error creating booking modal service:', err);
    } finally {
      setCreatingService(false);
    }
  };

  const handleRemoveService = async (id: number) => {
    const shouldDelete = window.confirm('해당 항목을 삭제하시겠습니까?');
    if (!shouldDelete) return;
    setDeletingServiceId(id);
    try {
      await fetch(`/api/booking-modal-services?id=${id}`, { method: 'DELETE' });
      await fetchModalServices();
    } catch (err) {
      console.error('Error deleting booking modal service:', err);
    } finally {
      setDeletingServiceId(null);
    }
  };

  const handleOpenEdit = (service: AdminBookingModalService) => {
    setEditingService(service);
    setEditServiceName(service.name);
  };

  const handleSaveEdit = async () => {
    if (!editingService || !editServiceName.trim()) return;
    setEditingSaving(true);
    try {
      await fetch('/api/booking-modal-services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingService.id,
          name: editServiceName.trim(),
          is_active: true,
          sort_order: editingService.sortOrder,
        }),
      });
      setEditingService(null);
      await fetchModalServices();
    } catch (err) {
      console.error('Error updating booking modal service:', err);
    } finally {
      setEditingSaving(false);
    }
  };

  const handleDeleteFromEdit = async () => {
    if (!editingService) return;
    const shouldDelete = window.confirm('해당 항목을 삭제하시겠습니까?');
    if (!shouldDelete) return;
    setEditingSaving(true);
    try {
      await fetch(`/api/booking-modal-services?id=${editingService.id}`, { method: 'DELETE' });
      setEditingService(null);
      await fetchModalServices();
    } catch (err) {
      console.error('Error deleting booking modal service from edit modal:', err);
    } finally {
      setEditingSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="px-2 pb-2 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-black">예약 등록 모달</h3>
        <div className="flex items-center gap-2">
          <Input
            value={newServiceName}
            onChange={(e) => setNewServiceName(e.target.value)}
            placeholder="서비스명"
            wrapperClassName="w-44"
            disabled={creatingService || modalServicesLoading}
          />
          <Button
            loading={creatingService}
            disabled={modalServicesLoading || !newServiceName.trim()}
            onClick={handleAddService}
          >
            {creatingService ? '추가중...' : '추가'}
          </Button>
        </div>
      </div>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
          <div className="col-span-9">서비스</div>
          <div className="col-span-3 text-center">관리</div>
        </div>
        {modalServicesLoading ? (
          <div className="px-4 py-6 text-sm text-gray-500">서비스 목록 불러오는 중...</div>
        ) : modalServices.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500">표시할 서비스가 없습니다.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {modalServices.map((service) => (
              <div key={service.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center text-sm">
                <div className="col-span-9 text-gray-900">{service.name}</div>
                <div className="col-span-3 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={creatingService || editingSaving || deletingServiceId != null}
                    onClick={() => handleOpenEdit(service)}
                  >
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={deletingServiceId === service.id}
                    disabled={creatingService || editingSaving || (deletingServiceId != null && deletingServiceId !== service.id)}
                    onClick={() => handleRemoveService(service.id)}
                  >
                    {deletingServiceId === service.id ? '삭제중...' : '삭제'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500">
        * 여기서 추가/제거한 항목이 `admin/appointments`의 예약 등록 모달 `서비스` 목록에 표시됩니다.
      </p>

      {editingService && (
        <Modal
          isOpen
          onClose={() => {
            if (!editingSaving) setEditingService(null);
          }}
          title="예약 등록 모달 항목 수정"
          zIndex={Z.MODAL_PRIMARY}
          footer={
            <>
              <Button loading={editingSaving} onClick={handleSaveEdit}>
                {editingSaving ? '저장중...' : '저장'}
              </Button>
              <Button variant="danger" loading={editingSaving} disabled={editingSaving} onClick={handleDeleteFromEdit}>
                {editingSaving ? '진행중...' : '삭제'}
              </Button>
              <Button variant="outline" disabled={editingSaving} onClick={() => setEditingService(null)}>
                취소
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="서비스명"
              value={editServiceName}
              onChange={(e) => setEditServiceName(e.target.value)}
              placeholder="서비스명을 입력하세요"
            />
          </div>
        </Modal>
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
        {activeTab === 'booking-modal' && <BookingModalServicesTab />}
      </div>
    </AdminPageLayout>
  );
}
