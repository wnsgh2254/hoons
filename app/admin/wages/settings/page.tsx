'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminTopNav from '@/components/AdminTopNav';

// Comment: Per-employee salary settings row. Product is always 10%. Service/hourly depend on wage_type.
type EmployeeSalaryRow = {
  id: number;
  name: string;
  wageType: 'percent' | 'hourly';
  serviceSalePct: number;
  serviceDeductionPct: number;
  hourlyRate: number | null;
  productSalePct: number;
  productDeductionPct: number;
};

const PRODUCT_RATE = 10;

// Comment: Accept both snake_case (API) and camelCase so wage_type is never missed
function toEmployeeRow(s: {
  id: number;
  name: string;
  wage_type?: string | null;
  wageType?: string | null;
  percent_rate?: number | null;
  percentRate?: number | null;
  hourly_rate?: number | null;
  hourlyRate?: number | null;
  product_sale_pct?: number | null;
  productSalePct?: number | null;
  product_deduction_pct?: number | null;
  productDeductionPct?: number | null;
}): EmployeeSalaryRow {
  const rawWageType = s.wage_type ?? s.wageType;
  const wageType = rawWageType === 'hourly' ? 'hourly' : 'percent';
  const productSale = s.product_sale_pct ?? s.productSalePct ?? PRODUCT_RATE;
  const productDeduction = s.product_deduction_pct ?? s.productDeductionPct ?? PRODUCT_RATE;
  const productSalePct = Number(productSale) || PRODUCT_RATE;
  const productDeductionPct = Number(productDeduction) || PRODUCT_RATE;

  if (wageType === 'hourly') {
    const hourlyRaw = s.hourly_rate ?? s.hourlyRate;
    const hourly = hourlyRaw != null ? Number(hourlyRaw) : null;
    return {
      id: s.id,
      name: s.name,
      wageType: 'hourly',
      serviceSalePct: 0,
      serviceDeductionPct: 0,
      hourlyRate: hourly,
      productSalePct,
      productDeductionPct,
    };
  }
  const rateRaw = s.percent_rate ?? s.percentRate;
  const rate = rateRaw != null ? Number(rateRaw) : 10;
  return {
    id: s.id,
    name: s.name,
    wageType: 'percent',
    serviceSalePct: rate,
    serviceDeductionPct: rate,
    hourlyRate: null,
    productSalePct,
    productDeductionPct,
  };
}

export default function SalarySettingsPage() {
  const [designers, setDesigners] = useState<
    {
      id: number;
      name: string;
      role?: string | null;
      shop_id?: number | null;
      percent_rate?: number | null;
      hourly_rate?: number | null;
      product_sale_pct?: number | null;
      product_deduction_pct?: number | null;
    }[]
  >([]);
  const [employees, setEmployees] = useState<EmployeeSalaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [includeSalesTransfer, setIncludeSalesTransfer] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeSalaryRow | null>(null);
  const [editDraft, setEditDraft] = useState<EmployeeSalaryRow | null>(null);

  const fetchStaff = React.useCallback(async () => {
    try {
      const res = await fetch('/api/staff');
      const data = await res.json();
      if (data.staff) {
        const list = data.staff.map((s: any) => ({
          id: s.id,
          name: s.name,
          role: s.role,
          shop_id: s.shop_id,
          wage_type: s.wage_type,
          percent_rate: s.percent_rate,
          hourly_rate: s.hourly_rate,
          product_sale_pct: s.product_sale_pct,
          product_deduction_pct: s.product_deduction_pct,
        }));
        setDesigners(list);
        setEmployees(list.map(toEmployeeRow));
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const updateEmployee = (id: number, updates: Partial<EmployeeSalaryRow>) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const openEditModal = (emp: EmployeeSalaryRow) => {
    setEditingEmployee({ ...emp });
    setEditDraft({ ...emp });
  };
  const closeEditModal = () => {
    setEditingEmployee(null);
    setEditDraft(null);
  };
  const handleSaveIncentive = async () => {
    if (!editingEmployee || !editDraft) {
      closeEditModal();
      return;
    }
    const designer = designers.find((d) => d.id === editingEmployee.id);
    const wage_type = editDraft.wageType;
    const percent_rate = wage_type === 'percent' ? editDraft.serviceSalePct : null;
    const hourly_rate = wage_type === 'hourly' ? editDraft.hourlyRate : null;
    const product_sale_pct = editDraft.productSalePct ?? PRODUCT_RATE;
    const product_deduction_pct = editDraft.productDeductionPct ?? PRODUCT_RATE;

    setSaving(true);
    try {
      const res = await fetch(`/api/staff?id=${editingEmployee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: designer?.name ?? editingEmployee.name,
          role: designer?.role ?? 'designer',
          shop_id: designer?.shop_id ?? null,
          wage_type,
          percent_rate,
          hourly_rate,
          product_sale_pct,
          product_deduction_pct,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || '저장에 실패했습니다.');
        return;
      }
      await fetchStaff();
      alert('저장되었습니다.');
      closeEditModal();
    } catch (e) {
      console.error(e);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };
  const updateDraft = (updates: Partial<EmployeeSalaryRow>) => {
    if (editDraft) setEditDraft({ ...editDraft, ...updates });
  };

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex flex-col">
      <AdminTopNav />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-white">
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-black">급여 설정</h2>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/admin/wages"
                  className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-900 transition-colors inline-block"
                >
                  급여 명세서
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-gray-500">로딩 중...</div>
            ) : (
              <>
                {/* Incentive calculation method & Application settings */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <p className="text-sm font-semibold text-gray-900 mb-3">인센티브 계산 방식</p>
                  <p className="text-sm font-medium text-gray-700 mb-4">매출액 기준</p>
                  <div className="flex items-center justify-between py-2 border-t border-gray-200">
                    <span className="text-sm text-gray-700">직원 매출에 매출 이동 포함</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{includeSalesTransfer ? '적용함' : '적용 안함'}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={includeSalesTransfer}
                        onClick={() => setIncludeSalesTransfer((v) => !v)}
                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 ${
                          includeSalesTransfer ? 'bg-black' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition ${
                            includeSalesTransfer ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Per-employee salary settings - all employees listed */}
                <div className="space-y-6">
                  {employees.map((emp) => (
                    <div
                      key={emp.id}
                      className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <p className="text-base font-bold text-black">{emp.name}</p>
                      </div>
                      <div className="overflow-x-auto p-4">
                        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden bg-white">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-200" colSpan={2}>
                                서비스
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-200">
                                시급
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-200" colSpan={2}>
                                제품
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                                수정
                              </th>
                            </tr>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-3 py-1 text-center text-xs text-gray-600 border-r border-gray-200">판매</th>
                              <th className="px-3 py-1 text-center text-xs text-gray-600 border-r border-gray-200">차감</th>
                              <th className="px-3 py-1 text-center text-xs text-gray-600 border-r border-gray-200" />
                              <th className="px-3 py-1 text-center text-xs text-gray-600 border-r border-gray-200">판매</th>
                              <th className="px-3 py-1 text-center text-xs text-gray-600 border-r border-gray-200">차감</th>
                              <th className="px-3 py-1 text-center text-xs text-gray-600" />
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-2 border-r border-gray-200 text-center text-gray-900">
                                {emp.wageType === 'percent' && emp.serviceSalePct != null && emp.serviceSalePct > 0
                                  ? `${emp.serviceSalePct}%`
                                  : '-'}
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200 text-center text-gray-900">
                                {emp.wageType === 'percent' && emp.serviceDeductionPct != null && emp.serviceDeductionPct > 0
                                  ? `${emp.serviceDeductionPct}%`
                                  : '-'}
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200 text-center text-gray-900">
                                {emp.wageType === 'hourly' && emp.hourlyRate != null ? `${emp.hourlyRate}` : '-'}
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200 text-center text-gray-900">
                                {PRODUCT_RATE}%
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200 text-center text-gray-900">
                                {PRODUCT_RATE}%
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(emp)}
                                  className="text-gray-700 text-xs font-medium hover:text-black hover:underline"
                                >
                                  수정
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Incentive rate edit modal */}
      {editingEmployee && editDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-200">
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-b border-gray-200">
              <h3 className="text-lg font-bold text-black">인센티브 지급률 수정</h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-700 p-1"
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm font-semibold text-gray-900 mb-3">인센티브 지급률</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-200" colSpan={2}>
                        서비스
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-200">
                        시급
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-200" colSpan={2}>
                        제품
                      </th>
                    </tr>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-1 text-center text-xs text-gray-600 border-r border-gray-200">판매</th>
                      <th className="px-3 py-1 text-center text-xs text-gray-600 border-r border-gray-200">차감</th>
                      <th className="px-3 py-1 text-center text-xs text-gray-600 border-r border-gray-200" />
                      <th className="px-3 py-1 text-center text-xs text-gray-600 border-r border-gray-200">판매</th>
                      <th className="px-3 py-1 text-center text-xs text-gray-600 border-r border-gray-200">차감</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editDraft.serviceSalePct ?? ''}
                          onChange={(e) =>
                            updateDraft({
                              serviceSalePct: Number(e.target.value) || 0,
                            })
                          }
                          className="w-14 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editDraft.serviceDeductionPct ?? ''}
                          onChange={(e) =>
                            updateDraft({
                              serviceDeductionPct: Number(e.target.value) || 0,
                            })
                          }
                          className="w-14 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <input
                          type="number"
                          min={0}
                          value={editDraft.hourlyRate ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateDraft({
                              hourlyRate: v === '' ? null : Number(v) || 0,
                            });
                          }}
                          className="w-14 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-center text-gray-600 bg-gray-50">
                        {PRODUCT_RATE}%
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-center text-gray-600 bg-gray-50">
                        {PRODUCT_RATE}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveIncentive}
                  disabled={saving}
                  className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? '저장 중…' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
