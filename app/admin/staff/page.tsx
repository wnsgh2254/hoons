'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { archiveDemoStaff, DEMO_WORKDAY_END, formatDemoTime, saveDemoStaff, saveDemoWorkingDays, useHoonsDemo } from '@/lib/hoons-booking-demo';
import { HOONS_ADMIN_SHOPS, hoonsAdminStaff, type HoonsAdminStaff } from '@/lib/hoons-staff-preview';
import {
  AdminPageLayout,
  PageHeader,
  StatCard,
  Modal,
  Button,
  Input,
  Select,
  Badge,
  EmptyState,
} from '@/components/ui';
import { sortStaffByRole } from '@/lib/staff-role-order';

const STAFF_ROLE_OPTIONS = [
  { value: 'Director', label: 'Director' },
  { value: 'Senior Designer', label: 'Senior Designer' },
  { value: 'Designer', label: 'Designer' },
  { value: 'Senior Director', label: 'Senior Director' },
  { value: 'Assistant', label: 'Assistant' },
  { value: 'Other', label: 'Other' },
];

const SHOP_OPTIONS = HOONS_ADMIN_SHOPS.map(({ id, name }) => ({ value: id, label: name }));

type StaffForm = {
  name: string;
  english_name: string;
  role: string;
  shop_id: string;
  wage_type: 'percent' | 'hourly';
  percent_rate: string;
  hourly_rate: string;
  instagramLink: string;
};

function staffProfile(form: StaffForm, customRole: string) {
  const location = HOONS_ADMIN_SHOPS.find(({ id }) => String(id) === form.shop_id);
  const role = (form.role === 'Other' ? customRole : form.role).trim();
  const name = form.name.trim();
  if (!name || !role || !location) throw new Error('Enter a name, role and venue.');
  return {
    name,
    englishName: form.english_name.trim() || null,
    role,
    locationId: location.locationKey,
    wageType: form.wage_type,
    percentRate: form.wage_type === 'percent' ? Number(form.percent_rate) : null,
    hourlyRate: form.wage_type === 'hourly' ? Number(form.hourly_rate) : null,
    instagramLink: form.instagramLink.trim(),
  };
}

const PRESET_ROLE_VALUES = STAFF_ROLE_OPTIONS.map((opt) => opt.value).filter((v) => v !== 'Other');

export default function StaffManagementPage() {
  const demo = useHoonsDemo();
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showManageServiceModal, setShowManageServiceModal] = useState(false);
  const [showViewScheduleModal, setShowViewScheduleModal] = useState(false);
  const [selectedDesigner, setSelectedDesigner] = useState<HoonsAdminStaff | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Get current month in Sydney timezone (format: 'YYYY-MM')
  const getCurrentMonth = () => {
    const sydneyTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
    const year = sydneyTime.getFullYear();
    const month = String(sydneyTime.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Get month name for display (e.g., 'Oct' for October)
  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  const currentMonth = getCurrentMonth();
  const currentMonthName = getMonthName(currentMonth);

  // Comment: Load admin session to determine role for rate visibility
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated && data.user?.role) {
          setUserRole((data.user.role as string).toLowerCase());
        }
      } catch (error) {
        console.error('Error fetching session for staff page:', error);
      }
    };
    fetchSession();
  }, []);

  const sortedStaff = sortStaffByRole(hoonsAdminStaff(demo).filter(({ is_active }) => is_active));

  // Format wage display - use DB wage_type value
  const formatWage = (member: HoonsAdminStaff) => {
    if (member.wage_type === 'percent') {
      return `${member.percent_rate || 0}%`;
    } else if (member.wage_type === 'hourly') {
      return `$${member.hourly_rate || 0}/hr`;
    }
    // Fallback if wage_type is null or unknown
    return '-';
  };

  // Format wage type for display - use DB wage_type value directly
  const formatWageType = (member: HoonsAdminStaff) => {
    // Use DB wage_type value directly: 'percent' -> 'COMMISSION', 'hourly' -> 'HOURLY'
    // DB has 'percent' or 'hourly', display as uppercase
    if (member.wage_type === 'percent') {
      return 'COMMISSION';
    } else if (member.wage_type === 'hourly') {
      return 'HOURLY';
    }
    // Fallback if wage_type is null or unknown
    return 'UNKNOWN';
  };

  function formatRoleWithVenue(member: HoonsAdminStaff) {
    return member.shop_name ? `${member.role} - ${member.shop_name}` : member.role;
  }

  const canViewRate = userRole === 'director';


  return (
    <AdminPageLayout>
      <PageHeader
        title="직원 관리"
        subtitle="HOONS 예약 화면에 연결된 예시 직원입니다."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/settings/locations#admin-transfers" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium">
              지점 이동 데모
            </Link>
            <Button
              icon="add"
              onClick={() => setShowAddStaffModal(true)}
              className="shadow-md hover:shadow-lg bg-linear-to-r from-black to-gray-600"
            >
              직원 추가
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="전체 직원 수"
          value={sortedStaff.length}
          icon="badge"
        />
      </div>

      {sortedStaff.length === 0 ? (
        <EmptyState icon="group_off" title="No staff members found." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedStaff.map((member) => {
            const wageType = formatWageType(member);
            const wageRate = formatWage(member);
            return (
              <div key={member.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                <div className="p-5.5 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-black">{member.name}</h3>
                    <p className="text-xs text-gray-500 font-medium">{formatRoleWithVenue(member)}</p>
                  </div>
                  {/* Don't show pay type badge for Director */}
                  {member.role !== 'Director' && member.role !== 'director' && (
                    <Badge
                      variant={wageType === 'COMMISSION' ? 'default' : 'default'}
                      size="sm"
                      className={
                        wageType === 'COMMISSION'
                          ? 'bg-black text-white text-[9px] font-bold tracking-wider rounded'
                          : 'bg-gray-200 text-gray-600 text-[9px] font-bold tracking-wider rounded'
                      }
                    >
                      {wageType}
                    </Badge>
                  )}
                </div>
                <div className="px-5.5 py-4 bg-gray-50 border-t border-b border-gray-100 flex justify-between items-center text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-xs">Rate</span>
                    <span className="font-bold text-black">
                      {canViewRate ? wageRate : '-'}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-gray-200"></div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-xs">{wageType === 'COMMISSION' ? `Sales (${currentMonthName})` : `Hours (${currentMonthName})`}</span>
                    <span className="font-bold text-black">
                      -
                    </span>
                  </div>
                  <div className="h-8 w-px bg-gray-200"></div>
                  <div className="flex flex-col text-right">
                    <span className="text-gray-500 text-xs">Est. Pay</span>
                    <span className="font-bold text-black">
                      -
                    </span>
                  </div>
                </div>
                <div className="p-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedDesigner(member);
                      setShowManageServiceModal(true);
                    }}
                  >
                    Manage Designer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedDesigner(member);
                      setShowViewScheduleModal(true);
                    }}
                  >
                    View Schedule
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddStaffModal && (
        <AddStaffModal isOpen onClose={() => setShowAddStaffModal(false)} />
      )}

      {selectedDesigner && showManageServiceModal && (
        <ManageServiceModal
          isOpen
          designer={selectedDesigner}
          canViewRate={canViewRate}
          onClose={() => {
            setShowManageServiceModal(false);
            setSelectedDesigner(null);
          }}
        />
      )}

      {selectedDesigner && showViewScheduleModal && (
        <ViewScheduleModal
          isOpen
          designer={selectedDesigner}
          onClose={() => {
            setShowViewScheduleModal(false);
            setSelectedDesigner(null);
          }}
        />
      )}
    </AdminPageLayout>
  );
}

// Add Staff Modal Component
function AddStaffModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState<StaffForm>({
    name: '',
    english_name: '',
    role: '',
    shop_id: '',
    wage_type: 'percent',
    percent_rate: '',
    hourly_rate: '',
    instagramLink: '',
  });
  const [customRole, setCustomRole] = useState('');
  const [loading, setLoading] = useState(false);

  const wageTypeOptions = [
    { value: 'percent', label: 'Commission (Percent)' },
    { value: 'hourly', label: 'Hourly' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await saveDemoStaff(staffProfile(formData, customRole));
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add staff member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Staff Member"
      maxWidth="max-w-2xl"
      scrollable
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            loading={loading}
            onClick={() => {
              const form = document.getElementById('add-staff-form') as HTMLFormElement;
              form?.requestSubmit();
            }}
          >
            {loading ? 'Adding...' : 'Add Staff'}
          </Button>
        </>
      }
    >
      <form id="add-staff-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Korean Name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <Input
          label="English Name"
          type="text"
          placeholder="e.g. Yoonhoon"
          value={formData.english_name}
          onChange={(e) => setFormData({ ...formData, english_name: e.target.value })}
        />
        <Select
          label="Role"
          required
          value={formData.role}
          onChange={(e) => {
            const nextRole = e.target.value;
            setFormData({ ...formData, role: nextRole });
            if (nextRole !== 'Other') setCustomRole('');
          }}
          options={STAFF_ROLE_OPTIONS}
          placeholder="Select Role"
        />
        {formData.role === 'Other' && (
          <Input
            label="Custom Role"
            type="text"
            required
            placeholder="Enter role name"
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
          />
        )}
        <Select
          label="Venue (Shop)"
          required
          value={formData.shop_id}
          onChange={(e) => setFormData({ ...formData, shop_id: e.target.value })}
          options={SHOP_OPTIONS}
          placeholder="Select Venue"
        />
        <Select
          label="Wage Type"
          required
          value={formData.wage_type}
          onChange={(e) => setFormData({ ...formData, wage_type: e.target.value as 'percent' | 'hourly' })}
          options={wageTypeOptions}
        />
        <Input
          label="Instagram URL"
          type="url"
          placeholder="https://www.instagram.com/username"
          value={formData.instagramLink}
          onChange={(e) => setFormData({ ...formData, instagramLink: e.target.value })}
        />
        {formData.wage_type === 'percent' ? (
          <Input
            label="Commission Rate (%)"
            type="number"
            required
            min={0}
            max={100}
            step={0.1}
            value={formData.percent_rate}
            onChange={(e) => setFormData({ ...formData, percent_rate: e.target.value })}
          />
        ) : (
          <Input
            label="Hourly Rate ($)"
            type="number"
            required
            min={0}
            step={0.01}
            value={formData.hourly_rate}
            onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
          />
        )}
      </form>
    </Modal>
  );
}

// Manage Designer Modal Component
function ManageServiceModal({
  isOpen,
  designer,
  canViewRate,
  onClose,
}: {
  isOpen: boolean;
  designer: HoonsAdminStaff;
  canViewRate: boolean;
  onClose: () => void;
}) {
  const initialRoleIsPreset = PRESET_ROLE_VALUES.includes(designer.role);
  const [formData, setFormData] = useState<StaffForm>({
    name: designer.name,
    english_name: designer.english_name || '',
    role: initialRoleIsPreset ? designer.role : 'Other',
    shop_id: designer.shop_id?.toString() || '',
    wage_type: designer.wage_type,
    percent_rate: designer.percent_rate?.toString() || '',
    hourly_rate: designer.hourly_rate?.toString() || '',
    instagramLink: designer.instagramLink || '',
  });
  const [customRole, setCustomRole] = useState(initialRoleIsPreset ? '' : designer.role);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const wageTypeOptions = [
    { value: 'percent', label: 'Commission (Percent)' },
    { value: 'hourly', label: 'Hourly' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveDemoStaff(staffProfile(formData, customRole), designer.staffKey);
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update designer');
    } finally {
      setLoading(false);
    }
  };

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete ${designer.name} from the demo staff?`)) return;

    setDeleting(true);
    try {
      await archiveDemoStaff(designer.staffKey);
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete designer');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Designer - ${designer.name}`}
      maxWidth="max-w-2xl"
      scrollable
      footer={
        <>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>
            {deleting ? 'Deleting...' : 'Delete Designer'}
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={loading}
            onClick={() => {
              const form = document.getElementById('manage-staff-form') as HTMLFormElement;
              form?.requestSubmit();
            }}
          >
            {loading ? 'Updating...' : 'Update Designer'}
          </Button>
        </>
      }
    >
      <form id="manage-staff-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Korean Name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <Input
          label="English Name"
          type="text"
          value={formData.english_name}
          onChange={(e) => setFormData({ ...formData, english_name: e.target.value })}
        />
        <Select
          label="Role"
          required
          value={formData.role}
          onChange={(e) => {
            const nextRole = e.target.value;
            setFormData({ ...formData, role: nextRole });
            if (nextRole !== 'Other') setCustomRole('');
          }}
          options={STAFF_ROLE_OPTIONS}
          placeholder="Select Role"
        />
        {formData.role === 'Other' && (
          <Input
            label="Custom Role"
            type="text"
            required
            placeholder="Enter role name"
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
          />
        )}
        <Select
          label="Venue (Shop)"
          required
          value={formData.shop_id}
          onChange={(e) => setFormData({ ...formData, shop_id: e.target.value })}
          options={SHOP_OPTIONS}
          placeholder="Select Venue"
        />
        <Input
          label="Instagram URL"
          type="url"
          value={formData.instagramLink}
          onChange={(e) => setFormData({ ...formData, instagramLink: e.target.value })}
        />
        {canViewRate && (
          <>
            <Select
              label="Wage Type"
              required
              value={formData.wage_type}
              onChange={(e) => setFormData({ ...formData, wage_type: e.target.value as 'percent' | 'hourly' })}
              options={wageTypeOptions}
            />
            {formData.wage_type === 'percent' ? (
              <Input
                label="Commission Rate (%)"
                type="number"
                required
                min={0}
                max={100}
                step={0.1}
                value={formData.percent_rate}
                onChange={(e) => setFormData({ ...formData, percent_rate: e.target.value })}
              />
            ) : (
              <Input
                label="Hourly Rate ($)"
                type="number"
                required
                min={0}
                step={0.01}
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
              />
            )}
          </>
        )}
      </form>
    </Modal>
  );
}

// View Schedule Modal Component
function ViewScheduleModal({ isOpen, designer, onClose }: { isOpen: boolean; designer: HoonsAdminStaff; onClose: () => void }) {
  const [workingDays, setWorkingDays] = useState(() => new Set(designer.workingDays));
  const [saving, setSaving] = useState(false);

  const weekdays = [
    { day: 0, name: '일요일', label: 'Sun' },
    { day: 1, name: '월요일', label: 'Mon' },
    { day: 2, name: '화요일', label: 'Tue' },
    { day: 3, name: '수요일', label: 'Wed' },
    { day: 4, name: '목요일', label: 'Thu' },
    { day: 5, name: '금요일', label: 'Fri' },
    { day: 6, name: '토요일', label: 'Sat' },
  ];

  const workHours = `${formatDemoTime(designer.start)}–${formatDemoTime(DEMO_WORKDAY_END)}`;

  function handleToggleDay(weekday: number) {
    setWorkingDays((current) => {
      const next = new Set(current);
      if (next.has(weekday)) next.delete(weekday);
      else next.add(weekday);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveDemoWorkingDays(designer.staffKey, Array.from(workingDays));
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : '스케줄 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`정기 휴일 설정 - ${designer.name}`}
      maxWidth="max-w-2xl"
      scrollable
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" loading={saving} onClick={handleSave}>
            {saving ? '저장 중...' : '저장하기'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          출근하는 요일을 선택하세요. 데모 근무시간은 {workHours}입니다.
        </p>
        <div className="space-y-2">
          {weekdays.map(({ day, name, label }) => {
            const isWorking = workingDays.has(day);

            return (
              <div
                key={day}
                className={`border rounded-lg p-4 transition-colors ${
                  isWorking ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-20">
                      <span className="text-sm font-semibold text-gray-900">{name}</span>
                      <span className="text-xs text-gray-500 ml-2">({label})</span>
                    </div>
                    <div className="flex-1">
                      {isWorking ? (
                        <span className="text-sm text-gray-900 font-medium">
                          출근 ({workHours})
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 font-medium">휴일</span>
                      )}
                    </div>
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      aria-label={name}
                      checked={isWorking}
                      onChange={() => handleToggleDay(day)}
                      className="w-5 h-5 rounded border-gray-300 text-black focus:ring-2 focus:ring-black"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
