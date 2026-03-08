'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AdminPageLayout,
  PageHeader,
  Badge,
  Button,
  Modal,
} from '@/components/ui';

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
  weeklyDeduction: number;
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
  weekly_deduction?: number | null;
  weeklyDeduction?: number | null;
}): EmployeeSalaryRow {
  const rawWageType = s.wage_type ?? s.wageType;
  const wageType = rawWageType === 'hourly' ? 'hourly' : 'percent';
  const productSale = s.product_sale_pct ?? s.productSalePct ?? PRODUCT_RATE;
  const productDeduction = s.product_deduction_pct ?? s.productDeductionPct ?? PRODUCT_RATE;
  const productSalePct = Number(productSale) || PRODUCT_RATE;
  const productDeductionPct = Number(productDeduction) || PRODUCT_RATE;
  const weeklyDeduction = Number(s.weekly_deduction ?? s.weeklyDeduction ?? 0);

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
      weeklyDeduction,
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
    weeklyDeduction,
  };
}

export default function SalarySettingsPage() {
  const [designers, setDesigners] = useState<
    {
      id: number;
      name: string;
      role?: string | null;
      shop_id?: number | null;
      wage_type?: string | null;
      percent_rate?: number | null;
      hourly_rate?: number | null;
      product_sale_pct?: number | null;
      product_deduction_pct?: number | null;
      weekly_deduction?: number | null;
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
          weekly_deduction: s.weekly_deduction,
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
          weekly_deduction: editDraft.weeklyDeduction ?? 0,
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

  const thGroup =
    'px-3 py-2 text-center text-xs font-bold text-gray-800 whitespace-nowrap border-r border-gray-200 bg-gray-100';
  const thSub =
    'px-3 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200 bg-gray-50';
  const tdBase =
    'px-3 py-2.5 text-center text-sm text-gray-900 border-r border-gray-100 tabular-nums';

  return (
    <AdminPageLayout>
      <PageHeader
        title="급여 설정"
        actions={
          <Link
            href="/admin/wages"
            className="px-4 py-2.5 bg-transparent text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors inline-flex items-center justify-center"
          >
            급여 관리
          </Link>
        }
      />

      {loading ? (
        <div className="py-11.5 text-center text-gray-500">로딩 중...</div>
      ) : (
        <>
          {/* Incentive calculation settings */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm font-bold text-black mb-3">인센티브 계산 방식</p>
            <p className="text-sm font-medium text-gray-700 mb-4">매출액 기준</p>
            <div className="flex items-center justify-between py-2 border-t border-gray-200">
              <span className="text-sm text-gray-700">직원 매출에 매출 이동 포함</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {includeSalesTransfer ? '적용함' : '적용 안함'}
                </span>
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

          {/* Per-employee salary settings — single unified table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-bold text-black">직원별 급여 설정</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {/* Row 1: Group headers */}
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th
                      rowSpan={2}
                      className="px-3 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200 bg-gray-100"
                    >
                      이름
                    </th>
                    <th
                      rowSpan={2}
                      className={thGroup}
                    >
                      유형
                    </th>
                    <th colSpan={2} className={thGroup}>
                      서비스
                    </th>
                    <th rowSpan={2} className={thGroup}>
                      시급
                    </th>
                    <th colSpan={2} className={thGroup}>
                      제품
                    </th>
                    <th rowSpan={2} className={thGroup}>
                      주간 공제
                    </th>
                    <th
                      rowSpan={2}
                      className="px-3 py-2 text-center text-xs font-bold text-gray-800 whitespace-nowrap bg-gray-100"
                    >
                      수정
                    </th>
                  </tr>
                  {/* Row 2: Sub-headers */}
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className={thSub}>판매</th>
                    <th className={thSub}>차감</th>
                    <th className={thSub}>판매</th>
                    <th className={thSub}>차감</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-900 whitespace-nowrap border-r border-gray-100">
                        {emp.name}
                      </td>
                      <td className="px-2 py-2.5 text-center border-r border-gray-100">
                        <Badge variant={emp.wageType === 'hourly' ? 'info' : 'success'}>
                          {emp.wageType === 'hourly' ? '시급' : '인센'}
                        </Badge>
                      </td>
                      <td className={tdBase}>
                        {emp.wageType === 'percent' && emp.serviceSalePct > 0
                          ? `${emp.serviceSalePct}%`
                          : '-'}
                      </td>
                      <td className={tdBase}>
                        {emp.wageType === 'percent' && emp.serviceDeductionPct > 0
                          ? `${emp.serviceDeductionPct}%`
                          : '-'}
                      </td>
                      <td className={tdBase}>
                        {emp.wageType === 'hourly' && emp.hourlyRate != null
                          ? `$${emp.hourlyRate}`
                          : '-'}
                      </td>
                      <td className={tdBase}>{PRODUCT_RATE}%</td>
                      <td className={tdBase}>{PRODUCT_RATE}%</td>
                      <td className={tdBase}>
                        {emp.weeklyDeduction > 0 ? `$${emp.weeklyDeduction}` : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="edit"
                          onClick={() => openEditModal(emp)}
                        >
                          수정
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Edit modal */}
      <Modal
        isOpen={!!editingEmployee && !!editDraft}
        onClose={closeEditModal}
        title={editingEmployee ? `${editingEmployee.name} — 급여 설정 수정` : ''}
        maxWidth="max-w-lg"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={closeEditModal}>
              취소
            </Button>
            <Button loading={saving} onClick={handleSaveIncentive}>
              저장
            </Button>
          </div>
        }
      >
        {editDraft && (
          <div className="space-y-5">
            {/* Incentive rates table */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">인센티브 지급률</p>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th colSpan={2} className={thGroup}>서비스</th>
                      <th rowSpan={2} className={thGroup}>시급</th>
                      <th colSpan={2} className="px-3 py-2 text-center text-xs font-bold text-gray-800 whitespace-nowrap bg-gray-100">제품</th>
                    </tr>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className={thSub}>판매</th>
                      <th className={thSub}>차감</th>
                      <th className={thSub}>판매</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap bg-gray-50">차감</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-2.5 border-r border-gray-100">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editDraft.serviceSalePct ?? ''}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            updateDraft({ serviceSalePct: val, serviceDeductionPct: val });
                          }}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-center text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                      </td>
                      <td className="px-3 py-2.5 border-r border-gray-100">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editDraft.serviceDeductionPct ?? ''}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            updateDraft({ serviceSalePct: val, serviceDeductionPct: val });
                          }}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-center text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                      </td>
                      <td className="px-3 py-2.5 border-r border-gray-100">
                        <input
                          type="number"
                          min={0}
                          value={editDraft.hourlyRate ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateDraft({ hourlyRate: v === '' ? null : Number(v) || 0 });
                          }}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-center text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                      </td>
                      <td className="px-3 py-2.5 border-r border-gray-100 text-center text-sm text-gray-500 bg-gray-50">
                        {PRODUCT_RATE}%
                      </td>
                      <td className="px-3 py-2.5 text-center text-sm text-gray-500 bg-gray-50">
                        {PRODUCT_RATE}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Weekly deduction */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                주간 공제 (캐쉬웨이지 차감액)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  min={0}
                  value={editDraft.weeklyDeduction ?? 0}
                  onChange={(e) =>
                    updateDraft({ weeklyDeduction: Number(e.target.value) || 0 })
                  }
                  className="w-32 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AdminPageLayout>
  );
}
