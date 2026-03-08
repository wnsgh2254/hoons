'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Button } from '@/components/ui';

export default function PayslipModal({ payslip, onClose, onViewDetail }: {
  payslip: any;
  onClose: () => void;
  onViewDetail: (data: any) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [payslipData, setPayslipData] = useState<any>(null);

  useEffect(() => {
    const fetchPayslipData = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/wages/calculate?start_date=${payslip.period.startDate}&end_date=${payslip.period.endDate}&designer_id=${payslip.designer.designerId}`
        );
        const data = await res.json();
        setPayslipData(data);
      } catch (error) {
        console.error('Error fetching payslip data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayslipData();
  }, [payslip]);

  const designer = payslip.designer;
  const period = payslip.period;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`급여 명세서 (${designer.name} 님)`}
      maxWidth="max-w-2xl"
      scrollable
      footer={
        <>
          <Button
            onClick={() => {
              onClose();
              onViewDetail({
                designerId: payslip.designer.designerId,
                designerName: payslip.designer.name,
                startDate: period.startDate,
                endDate: period.endDate,
              });
            }}
          >
            상세 내역 보기
          </Button>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="text-gray-500 text-center py-7.5">로딩 중...</div>
      ) : (
        <div className="space-y-6">
          {/* Period info bar */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">근무 기간</span>
            <span className="text-sm font-semibold text-black tabular-nums">{period.startDate} ~ {period.endDate}</span>
          </div>

          {/* Salary & Deduction */}
          <div>
            <h3 className="text-sm font-bold text-black mb-3">급여 및 공제 항목</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">급여 항목</div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">기본급</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">인센티브</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">
                      {payslipData?.wages?.[0]?.wage?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">식대</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">직책 수당</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">자격 수당</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">초과 근무 수당</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">휴일 근무 수당</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">연차 수당</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">기타 수당1</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">기타 수당2</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">기타 수당3</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">-</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">공제 항목</div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">제품 사용</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">지각</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">조퇴</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">결근</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">기타 공제1</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">-</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary totals */}
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-gray-900">급여 합계</span>
                <span className="font-bold text-gray-900 tabular-nums">
                  {payslipData?.wages?.[0]?.wage?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-gray-900">공제 합계</span>
                <span className="font-bold text-gray-900 tabular-nums">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-gray-900">실지급액 (급여 합계 - 공제 합계)</span>
                <span className="font-bold text-gray-900 tabular-nums">
                  {payslipData?.wages?.[0]?.wage?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-gray-900">가지급금</span>
                <span className="font-bold text-gray-900 tabular-nums">-</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t-2 border-gray-300">
                <span className="font-bold text-gray-900">차감 지급 금액 (실지급액 - 가지급금)</span>
                <span className="font-bold text-black tabular-nums">
                  {payslipData?.wages?.[0]?.wage?.toLocaleString() || '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Incentive breakdown */}
          <div>
            <h3 className="text-sm font-bold text-black mb-3">인센티브 내역</h3>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-200">항목</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-200">판매</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-200">차감</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">합계</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900 border-r border-gray-100">서비스</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {Math.round(payslipData?.wages?.[0]?.sales?.serviceSales || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {Math.round(payslipData?.wages?.[0]?.sales?.serviceDeduction || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                      {Math.round((payslipData?.wages?.[0]?.sales?.serviceSales || 0) - (payslipData?.wages?.[0]?.sales?.serviceDeduction || 0)).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900 border-r border-gray-100">제품</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {Math.round(payslipData?.wages?.[0]?.sales?.productSales || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {Math.round(payslipData?.wages?.[0]?.sales?.productDeduction || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                      {Math.round((payslipData?.wages?.[0]?.sales?.productSales || 0) - (payslipData?.wages?.[0]?.sales?.productDeduction || 0)).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900 border-r border-gray-100">정액권 판매</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 border-r border-gray-100">-</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 border-r border-gray-100">-</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">-</td>
                  </tr>
                  <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                    <td className="px-4 py-3 text-gray-900 border-r border-gray-100">합계</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {Math.round((payslipData?.wages?.[0]?.sales?.serviceSales || 0) + (payslipData?.wages?.[0]?.sales?.productSales || 0)).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 border-r border-gray-100">
                      {Math.round((payslipData?.wages?.[0]?.sales?.serviceDeduction || 0) + (payslipData?.wages?.[0]?.sales?.productDeduction || 0)).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                      {payslipData?.wages?.[0]?.wage?.toLocaleString() || '0'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
