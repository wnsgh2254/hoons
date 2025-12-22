'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { Designer } from '@/lib/types';

export default function StaffManagementPage() {
  const [filter, setFilter] = useState('All Staff');
  const [staffMembers, setStaffMembers] = useState<Designer[]>([]);
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalStaff: 0, activeStaff: 0, estimatedPayroll: 0, totalHours: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [shops, setShops] = useState<any[]>([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showManageServiceModal, setShowManageServiceModal] = useState(false);
  const [showViewScheduleModal, setShowViewScheduleModal] = useState(false);
  const [selectedDesigner, setSelectedDesigner] = useState<Designer | null>(null);

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

  // Fetch staff data from API
  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        setLoading(true);
        const role = filter === 'All Staff' ? '' : filter;
        const params = new URLSearchParams();
        if (role) params.append('role', role);
        
        const [staffRes, statsRes, workLogsRes] = await Promise.all([
          fetch(`/api/staff?${params.toString()}`),
          fetch('/api/staff?type=stats'),
          fetch('/api/staff?type=worklogs'),
        ]);

        const staffData = await staffRes.json();
        const statsData = await statsRes.json();
        const workLogsData = await workLogsRes.json();

        if (staffData.staff) setStaffMembers(staffData.staff);
        if (staffData.shops) setShops(staffData.shops);
        if (statsData.stats) {
          setStats({
            totalStaff: statsData.stats.totalStaff || 0,
            activeStaff: statsData.stats.activeStaff || 0,
            estimatedPayroll: 0,
            totalHours: 0,
          });
        }
        if (workLogsData.workLogs) {
          const transformedLogs = workLogsData.workLogs.map((log: any) => ({
            staff: log.designer?.name || log.staff?.name || 'Unknown',
            date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            checkIn: log.check_in ? new Date(`2000-01-01T${log.check_in}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A',
            checkOut: log.check_out ? new Date(`2000-01-01T${log.check_out}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A',
            total: log.total_hours ? `${Math.floor(log.total_hours)}h ${Math.round((log.total_hours % 1) * 60)}m` : 'N/A',
            status: log.status === 'verified' ? 'Verified' : 'Pending',
          }));
          setWorkLogs(transformedLogs);
        }
      } catch (error) {
        console.error('Error fetching staff data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffData();
  }, [filter]);

  // Filter staff by search query
  const filteredStaff = staffMembers
    .filter((member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Sort order: Director -> Manager -> Designer -> Others
      const getRoleOrder = (role: string) => {
        const roleLower = role.toLowerCase();
        if (roleLower.includes('director')) return 1;
        if (roleLower.includes('manager')) return 2;
        if (roleLower.includes('designer') || roleLower.includes('stylist')) return 3;
        return 4;
      };
      
      const orderA = getRoleOrder(a.role);
      const orderB = getRoleOrder(b.role);
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // If same role order, sort by name
      return a.name.localeCompare(b.name);
    });

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

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex">
      <aside className="w-64 shrink-0 flex flex-col justify-between bg-white border-r border-gray-200 h-full overflow-y-auto hidden md:flex">
        <div className="flex flex-col gap-8 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-black flex items-center justify-center rounded-full size-10 text-white">
              <span className="material-symbols-outlined">content_cut</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-wider text-black">HAEYOOM</h1>
              <p className="text-xs text-gray-500 font-medium tracking-widest">SEOUL • SYDNEY</p>
            </div>
          </div>
          <nav className="flex flex-col gap-2">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
            <Link
              href="/admin/sales"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">monitoring</span>
              <span className="text-sm font-medium">Sales Overview</span>
            </Link>
            <Link
              href="/admin/appointments"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">calendar_month</span>
              <span className="text-sm font-medium">Appointments</span>
            </Link>
            <Link
              href="/admin/staff"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black text-white shadow-lg shadow-black/20"
            >
              <span className="material-symbols-outlined">groups</span>
              <span className="text-sm font-medium">Staff</span>
            </Link>
            <Link
              href="/admin/inventory"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">inventory_2</span>
              <span className="text-sm font-medium">Inventory</span>
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">settings</span>
              <span className="text-sm font-medium">Settings</span>
            </Link>
          </nav>
        </div>
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="size-10 rounded-full bg-cover bg-center grayscale"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAjhD0WmE9CSsv_JWqCz325cTf4HM2m39YT5VSu09Lc2YQqci2GEmubVTLNi3mhaSzXeI1aOETFfv9VpKUOwV_LoiTkw5FBCVBNCznsSmppHNQiAWcQrAE7cw73i0kzJkDOrZHBn-rVhTR-sBvQ9yPTejyv271gCTallJe0gM8N5_cOiuGK0ZhmDcFdRyL97zFu_5tj-DgObrIlkZqquHTlK8OeBJB297gGVKfjJWl_e8t3cnmO4nqHfGDOJjhwTSHFyyB9M083o3dh')",
              }}
            />
            <div className="flex flex-col">
              <p className="text-sm font-medium text-black">Sarah Kim</p>
              <p className="text-xs text-gray-500">Manager</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <header className="h-16 flex items-center justify-between px-6 md:px-10 py-4 bg-white border-b border-gray-100 z-10">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Dashboard</span>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-black">Staff Management</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">search</span>
              <input
                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-full text-sm focus:ring-1 focus:ring-black w-64 placeholder-gray-400"
                placeholder="Search staff..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="flex items-center justify-center size-8 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
            <button className="flex items-center justify-center size-8 rounded-full hover:bg-gray-100 text-gray-500 md:hidden transition-colors">
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-gray-50/50">
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-black">Staff Management</h2>
                <p className="text-gray-500 text-sm">Manage stylists, track hours, and process payroll.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                  {['All Staff', 'Stylists', 'Assistants'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        filter === f
                          ? 'bg-gray-100 text-black font-semibold'
                          : 'text-gray-500 hover:text-black hover:bg-gray-50'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setShowAddStaffModal(true)}
                  className="flex items-center gap-2 bg-linear-to-r from-black to-gray-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Add Staff
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Staff</p>
                  <h3 className="text-2xl font-bold text-black mt-1">{loading ? '...' : stats.totalStaff}</h3>
                </div>
                <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <span className="material-symbols-outlined">badge</span>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Currently Active</p>
                  <h3 className="text-2xl font-bold text-black mt-1">{loading ? '...' : stats.activeStaff}</h3>
                </div>
                <div className="size-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Est. Payroll (Oct)</p>
                  <h3 className="text-2xl font-bold text-black mt-1">{loading ? '...' : `AU$${stats.estimatedPayroll.toLocaleString()}`}</h3>
                </div>
                <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <span className="material-symbols-outlined">payments</span>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Hours</p>
                  <h3 className="text-2xl font-bold text-black mt-1">{loading ? '...' : `${stats.totalHours}h`}</h3>
                </div>
                <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <span className="material-symbols-outlined">schedule</span>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading staff data...</div>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">No staff members found.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStaff.map((member) => {
                  const wageType = formatWageType(member);
                  const wageRate = formatWage(member);
                  return (
                    <div key={member.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                      <div className="p-6 flex items-start justify-between">
                        <div className="flex gap-4">
                          <div className="size-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shadow-sm">
                            <span className="material-symbols-outlined text-2xl">person</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-black">{member.name}</h3>
                            <p className="text-xs text-gray-500 font-medium">{formatRoleWithVenue(member)}</p>
                          </div>
                        </div>
                        {/* Don't show pay type badge for Director */}
                        {member.role !== 'Director' && member.role !== 'director' && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider whitespace-nowrap ${
                              wageType === 'COMMISSION' ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {wageType}
                          </span>
                        )}
                      </div>
                      <div className="px-6 py-4 bg-gray-50 border-t border-b border-gray-100 flex justify-between items-center text-sm">
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs">Rate</span>
                          <span className="font-bold text-black">{wageRate}</span>
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
                        <button 
                          onClick={() => {
                            setSelectedDesigner(member);
                            setShowManageServiceModal(true);
                          }}
                          className="flex-1 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-black"
                        >
                          Manage Designer
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedDesigner(member);
                            setShowViewScheduleModal(true);
                          }}
                          className="flex-1 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-black"
                        >
                          View Schedule
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <AddStaffModal
          shops={shops}
          onClose={() => setShowAddStaffModal(false)}
          onSuccess={() => {
            setShowAddStaffModal(false);
            // Refresh staff data
            window.location.reload();
          }}
        />
      )}

      {/* Manage Service Modal */}
      {showManageServiceModal && selectedDesigner && (
        <ManageServiceModal
          designer={selectedDesigner}
          onClose={() => {
            setShowManageServiceModal(false);
            setSelectedDesigner(null);
          }}
        />
      )}

      {/* View Schedule Modal */}
      {showViewScheduleModal && selectedDesigner && (
        <ViewScheduleModal
          designer={selectedDesigner}
          onClose={() => {
            setShowViewScheduleModal(false);
            setSelectedDesigner(null);
          }}
        />
      )}
    </div>
  );
}

// Add Staff Modal Component
function AddStaffModal({ shops, onClose, onSuccess }: { shops: any[]; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    shop_id: '',
    wage_type: 'percent' as 'percent' | 'hourly',
    percent_rate: '',
    hourly_rate: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate role is selected
    if (!formData.role || formData.role === '') {
      alert('Please select a role');
      setLoading(false);
      return;
    }

    try {
      const requestBody = {
        name: formData.name.trim(),
        role: formData.role.trim(),
        shop_id: formData.shop_id ? Number(formData.shop_id) : null,
        wage_type: formData.wage_type,
        percent_rate: formData.wage_type === 'percent' ? Number(formData.percent_rate) : null,
        hourly_rate: formData.wage_type === 'hourly' ? Number(formData.hourly_rate) : null,
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-black">Add Staff Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="">Select Role</option>
              <option value="Director">Director</option>
              <option value="Manager">Manager</option>
              <option value="Designer">Designer</option>
              <option value="Senior Director">Senior Director</option>
              <option value="Top Stylist">Top Stylist</option>
              <option value="Stylist">Stylist</option>
              <option value="Assistant">Assistant</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue (Shop)</label>
            <select
              value={formData.shop_id}
              onChange={(e) => setFormData({ ...formData, shop_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="">Select Venue</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wage Type</label>
            <select
              required
              value={formData.wage_type}
              onChange={(e) => setFormData({ ...formData, wage_type: e.target.value as 'percent' | 'hourly' })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="percent">Commission (Percent)</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>
          {formData.wage_type === 'percent' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
              <input
                type="number"
                required
                min="0"
                max="100"
                step="0.1"
                value={formData.percent_rate}
                onChange={(e) => setFormData({ ...formData, percent_rate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-black font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Manage Designer Modal Component
function ManageServiceModal({ designer, onClose }: { designer: Designer; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: designer.name,
    role: designer.role,
    shop_id: designer.shop_id?.toString() || '',
    wage_type: designer.wage_type,
    percent_rate: designer.percent_rate?.toString() || '',
    hourly_rate: designer.hourly_rate?.toString() || '',
  });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const requestBody = {
        name: formData.name.trim(),
        role: formData.role.trim(),
        shop_id: formData.shop_id ? Number(formData.shop_id) : null,
        wage_type: formData.wage_type,
        percent_rate: formData.wage_type === 'percent' ? Number(formData.percent_rate) : null,
        hourly_rate: formData.wage_type === 'hourly' ? Number(formData.hourly_rate) : null,
        is_active: true,
      };

      const response = await fetch(`/api/staff/${designer.id}`, {
        method: 'PUT',
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-black">Manage Designer - {designer.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="">Select Role</option>
              <option value="Director">Director</option>
              <option value="Manager">Manager</option>
              <option value="Designer">Designer</option>
              <option value="Senior Director">Senior Director</option>
              <option value="Top Stylist">Top Stylist</option>
              <option value="Stylist">Stylist</option>
              <option value="Assistant">Assistant</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue (Shop)</label>
            <select
              value={formData.shop_id}
              onChange={(e) => setFormData({ ...formData, shop_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="">Select Venue</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wage Type</label>
            <select
              required
              value={formData.wage_type}
              onChange={(e) => setFormData({ ...formData, wage_type: e.target.value as 'percent' | 'hourly' })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="percent">Commission (Percent)</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>
          {formData.wage_type === 'percent' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
              <input
                type="number"
                required
                min="0"
                max="100"
                step="0.1"
                value={formData.percent_rate}
                onChange={(e) => setFormData({ ...formData, percent_rate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          )}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Designer'}
            </button>
            <div className="flex-1"></div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-black font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Designer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Schedule Modal Component
function ViewScheduleModal({ designer, onClose }: { designer: Designer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-black">Schedule - {designer.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6">
          <p className="text-gray-600">Schedule view functionality will be implemented here.</p>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


