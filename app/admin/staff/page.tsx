'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { Designer } from '@/lib/types';
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

const PRESET_ROLE_VALUES = STAFF_ROLE_OPTIONS.map((opt) => opt.value).filter((v) => v !== 'Other');

export default function StaffManagementPage() {
  const [staffMembers, setStaffMembers] = useState<Designer[]>([]);
  const [stats, setStats] = useState({ totalStaff: 0 });
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<any[]>([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showManageServiceModal, setShowManageServiceModal] = useState(false);
  const [showViewScheduleModal, setShowViewScheduleModal] = useState(false);
  const [selectedDesigner, setSelectedDesigner] = useState<Designer | null>(null);
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

  // Fetch staff data from API (single call with stats included)
  useEffect(() => {
    let isMounted = true;
    const fetchStaffData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('include_stats', 'true');

        const res = await fetch(`/api/staff?${params.toString()}`);
        const data = await res.json();

        if (isMounted) {
          if (data.staff) setStaffMembers(data.staff);
          if (data.shops) setShops(data.shops);
          if (data.stats) {
            setStats({
              totalStaff: data.stats.totalStaff || 0,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching staff data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStaffData();
    return () => {
      isMounted = false;
    };
  }, []);

  const sortedStaff = sortStaffByRole(staffMembers);

  // Format wage display - use DB wage_type value
  const formatWage = (member: Designer) => {
    if (member.wage_type === 'percent') {
      return `${member.percent_rate || 0}%`;
    } else if (member.wage_type === 'hourly') {
      return `$${member.hourly_rate || 0}/hr`;
    }
    // Fallback if wage_type is null or unknown
    return '-';
  };

  // Format wage type for display - use DB wage_type value directly
  const formatWageType = (member: Designer) => {
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

  // Format role with venue (except for Director)
  const formatRoleWithVenue = (member: Designer) => {
    if (member.role === 'Director' || member.role === 'director') {
      return member.role;
    }
    const shopName = (member as any).shop_name;
    if (shopName) {
      return `${member.role} - ${shopName}`;
    }
    return member.role;
  };

  const canViewRate = userRole === 'director';


  return (
    <AdminPageLayout>
      <PageHeader
        title="직원 관리"
        actions={
          <Button
            icon="add"
            onClick={() => setShowAddStaffModal(true)}
            className="shadow-md hover:shadow-lg bg-linear-to-r from-black to-gray-600"
          >
            직원 추가
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="전체 직원 수"
          value={loading ? '...' : stats.totalStaff}
          icon="badge"
        />
      </div>

      {loading ? (
        <EmptyState title="Loading staff data..." />
      ) : sortedStaff.length === 0 ? (
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
                      {wageType === 'COMMISSION'
                        ? (member as any).sales
                          ? `AU$${((member as any).sales || 0).toLocaleString()}`
                          : '-'
                        : '-'}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-gray-200"></div>
                  <div className="flex flex-col text-right">
                    <span className="text-gray-500 text-xs">Est. Pay</span>
                    <span className="font-bold text-black">
                      {wageType === 'COMMISSION' && (member as any).sales && member.percent_rate
                        ? `AU$${Math.round(((member as any).sales * (member.percent_rate / 100)) || 0).toLocaleString()}`
                        : '-'}
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

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={showAddStaffModal}
        shops={shops}
        onClose={() => setShowAddStaffModal(false)}
        onSuccess={() => {
          setShowAddStaffModal(false);
          // Refresh staff data
          window.location.reload();
        }}
      />

      {/* Manage Service Modal */}
      {selectedDesigner && (
        <ManageServiceModal
          isOpen={showManageServiceModal}
          designer={selectedDesigner}
          canViewRate={canViewRate}
          onClose={() => {
            setShowManageServiceModal(false);
            setSelectedDesigner(null);
          }}
        />
      )}

      {/* View Schedule Modal */}
      {selectedDesigner && (
        <ViewScheduleModal
          isOpen={showViewScheduleModal}
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
function AddStaffModal({ isOpen, shops, onClose, onSuccess }: { isOpen: boolean; shops: any[]; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    english_name: '',
    role: '',
    shop_id: '',
    wage_type: 'percent' as 'percent' | 'hourly',
    percent_rate: '',
    hourly_rate: '',
    instagramLink: '',
  });
  const [customRole, setCustomRole] = useState('');
  const [loading, setLoading] = useState(false);

  const shopOptions = shops.map((shop) => ({
    value: shop.id,
    label: shop.name,
  }));

  const wageTypeOptions = [
    { value: 'percent', label: 'Commission (Percent)' },
    { value: 'hourly', label: 'Hourly' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate role is selected
    if (!formData.role || formData.role === '') {
      alert('Please select a role');
      setLoading(false);
      return;
    }
    if (formData.role === 'Other' && !customRole.trim()) {
      alert('Please enter a custom role');
      setLoading(false);
      return;
    }

    const resolvedRole = formData.role === 'Other' ? customRole.trim() : formData.role.trim();

    try {
      const requestBody = {
        name: formData.name.trim(),
        // Comment: English display name for public-facing pages
        english_name: formData.english_name.trim() || null,
        role: resolvedRole,
        shop_id: formData.shop_id ? Number(formData.shop_id) : null,
        wage_type: formData.wage_type,
        percent_rate: formData.wage_type === 'percent' ? Number(formData.percent_rate) : null,
        hourly_rate: formData.wage_type === 'hourly' ? Number(formData.hourly_rate) : null,
        // Comment: Optional Instagram profile URL
        instagramLink: formData.instagramLink.trim() || null,
        is_active: true,
      };

      console.log('Submitting staff data:', requestBody); // Debug log

      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (response.ok) {
        console.log('Staff added successfully:', responseData); // Debug log
        onSuccess();
      } else {
        console.error('Error response:', responseData); // Debug log
        alert(responseData.error || 'Failed to add staff member');
      }
    } catch (error) {
      console.error('Error adding staff:', error);
      alert('Failed to add staff member');
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
        {(formData.role === 'Other' ? customRole : formData.role).toLowerCase().includes('director') ? (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Venue (Shop)</label>
            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500">
              모든 매장 <span className="text-xs text-gray-400 ml-1">(요일별 매장은 예약 자원에서 설정)</span>
            </div>
          </div>
        ) : (
          <Select
            label="Venue (Shop)"
            value={formData.shop_id}
            onChange={(e) => setFormData({ ...formData, shop_id: e.target.value })}
            options={shopOptions}
            placeholder="Select Venue"
          />
        )}
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
  designer: Designer;
  canViewRate: boolean;
  onClose: () => void;
}) {
  const initialRoleIsPreset = PRESET_ROLE_VALUES.includes(designer.role);
  const [formData, setFormData] = useState({
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
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Fetch shops
    fetch('/api/staff')
      .then((res) => res.json())
      .then((data) => {
        if (data.shops) setShops(data.shops);
      })
      .catch(console.error);
  }, []);

  const shopOptions = shops.map((shop) => ({
    value: shop.id,
    label: shop.name,
  }));

  const wageTypeOptions = [
    { value: 'percent', label: 'Commission (Percent)' },
    { value: 'hourly', label: 'Hourly' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (formData.role === 'Other' && !customRole.trim()) {
      alert('Please enter a custom role');
      setLoading(false);
      return;
    }

    const resolvedRole = formData.role === 'Other' ? customRole.trim() : formData.role.trim();

    try {
      const requestBody = {
        name: formData.name.trim(),
        // Comment: English display name for public-facing pages
        english_name: formData.english_name.trim() || null,
        role: resolvedRole,
        shop_id: formData.shop_id ? Number(formData.shop_id) : null,
        wage_type: formData.wage_type,
        percent_rate: formData.wage_type === 'percent' ? Number(formData.percent_rate) : null,
        hourly_rate: formData.wage_type === 'hourly' ? Number(formData.hourly_rate) : null,
        // Comment: Optional Instagram profile URL
        instagramLink: formData.instagramLink.trim() || null,
        is_active: true,
      };

      const response = await fetch(`/api/staff?id=${designer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (response.ok) {
        alert('Designer updated successfully');
        window.location.reload();
      } else {
        alert(responseData.error || 'Failed to update designer');
      }
    } catch (error) {
      console.error('Error updating designer:', error);
      alert('Failed to update designer');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${designer.name}? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/staff/${designer.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Designer deleted successfully');
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete designer');
      }
    } catch (error) {
      console.error('Error deleting designer:', error);
      alert('Failed to delete designer');
    } finally {
      setDeleting(false);
    }
  };

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
        {(formData.role === 'Other' ? customRole : formData.role).toLowerCase().includes('director') ? (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Venue (Shop)</label>
            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500">
              모든 매장 <span className="text-xs text-gray-400 ml-1">(요일별 매장은 예약 자원에서 설정)</span>
            </div>
          </div>
        ) : (
          <Select
            label="Venue (Shop)"
            value={formData.shop_id}
            onChange={(e) => setFormData({ ...formData, shop_id: e.target.value })}
            options={shopOptions}
            placeholder="Select Venue"
          />
        )}
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
function ViewScheduleModal({ isOpen, designer, onClose }: { isOpen: boolean; designer: Designer; onClose: () => void }) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingDays, setWorkingDays] = useState<Set<number>>(new Set());

  const weekdays = [
    { day: 0, name: '일요일', label: 'Sun' },
    { day: 1, name: '월요일', label: 'Mon' },
    { day: 2, name: '화요일', label: 'Tue' },
    { day: 3, name: '수요일', label: 'Wed' },
    { day: 4, name: '목요일', label: 'Thu' },
    { day: 5, name: '금요일', label: 'Fri' },
    { day: 6, name: '토요일', label: 'Sat' },
  ];

  // Comment: Default working hours - same for all working days
  const DEFAULT_START_TIME = '10:00:00';
  const DEFAULT_END_TIME = '19:00:00';
  const SATURDAY_START_TIME = '09:00:00';
  const SATURDAY_END_TIME = '17:00:00';

  // Comment: Load schedules for this designer
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/designer-schedules?designer_id=${designer.id}`);
        const data = await res.json();
        if (res.ok) {
          setSchedules(data.schedules || []);
          // Comment: Set working days based on existing schedules
          const workingDaysSet = new Set<number>();
          (data.schedules || []).forEach((s: any) => {
            if (!s.effective_to) {
              workingDaysSet.add(s.weekday);
            }
          });
          setWorkingDays(workingDaysSet);
        }
      } catch (error) {
        console.error('Error fetching schedules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [designer.id]);

  // Comment: Toggle working day
  const handleToggleDay = (weekday: number) => {
    const newWorkingDays = new Set(workingDays);
    if (newWorkingDays.has(weekday)) {
      newWorkingDays.delete(weekday);
    } else {
      newWorkingDays.add(weekday);
    }
    setWorkingDays(newWorkingDays);
  };

  // Comment: Save all schedules
  const handleSave = async () => {
    setSaving(true);
    try {
      // Comment: Get current schedules to know which ones to delete
      const currentSchedules = schedules.filter((s) => !s.effective_to);
      const currentWorkingDays = new Set(currentSchedules.map((s) => s.weekday));

      // Comment: Delete schedules for days that are no longer working days
      const daysToDelete = Array.from(currentWorkingDays).filter((day) => !workingDays.has(day));
      for (const day of daysToDelete) {
        const schedule = currentSchedules.find((s) => s.weekday === day);
        if (schedule?.id) {
          await fetch(`/api/designer-schedules?id=${schedule.id}`, {
            method: 'DELETE',
          });
        }
      }

      // Comment: Create or update schedules for working days
      const daysToSave = Array.from(workingDays);
      for (const day of daysToSave) {
        const isSaturday = day === 6;
        const startTime = isSaturday ? SATURDAY_START_TIME : DEFAULT_START_TIME;
        const endTime = isSaturday ? SATURDAY_END_TIME : DEFAULT_END_TIME;

        const body = {
          designer_id: designer.id,
          shop_id: designer.shop_id,
          weekday: day,
          start_time: startTime,
          end_time: endTime,
        };

        await fetch('/api/designer-schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      // Comment: Reload schedules
      const res = await fetch(`/api/designer-schedules?designer_id=${designer.id}`);
      const data = await res.json();
      if (res.ok) {
        setSchedules(data.schedules || []);
        alert('정기 휴일 설정이 저장되었습니다.');
      }
    } catch (error: any) {
      console.error('Error saving schedules:', error);
      alert(error.message || '스케줄 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // Comment: Format time from DB format (HH:MM:SS) to display format (HH:MM)
  const formatTime = (time: string | null) => {
    if (!time) return '';
    return time.substring(0, 5); // HH:MM
  };

  // Comment: Get schedule for a specific weekday
  const getScheduleForDay = (weekday: number) => {
    return schedules.find((s) => s.weekday === weekday && !s.effective_to);
  };

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
      {loading ? (
        <EmptyState title="스케줄을 불러오는 중..." />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            출근하는 요일을 선택하세요. 출근하는 요일은 기본 근무시간(월-금: 10:00-19:00, 토: 09:00-17:00)으로 자동 설정됩니다.
          </p>
          <div className="space-y-2">
            {weekdays.map(({ day, name, label }) => {
              const isWorking = workingDays.has(day);
              const schedule = getScheduleForDay(day);
              const isSaturday = day === 6;
              const defaultTime = isSaturday ? '09:00-17:00' : '10:00-19:00';

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
                            출근 ({defaultTime})
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 font-medium">휴일</span>
                        )}
                      </div>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
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
      )}
    </Modal>
  );
}
