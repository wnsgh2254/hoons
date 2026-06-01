'use client';

import { useState, type ReactNode } from 'react';
import SalesDetailModal from '@/components/admin/appointments/SalesDetailModal';
import SalesRegistrationModal from '@/components/admin/appointments/SalesRegistrationModal';
import { AlertModal } from '@/components/ui';
import { Z } from '@/lib/constants';
import type { SalesDetailData } from '@/lib/types';
import { mapSaleRecordToDetailData } from '@/lib/sales-detail-mapper';

type SalesRegistrationCustomer = {
  id: number;
  name: string;
  phone?: string | null;
  points?: number;
  prepaid_balance?: number;
};

interface UseSalesDetailActionsOptions {
  /** Called after a successful edit or delete so the caller can refresh its list/detail state. */
  onRefresh?: () => void | Promise<void>;
}

interface UseSalesDetailActionsReturn {
  /** Open the 판매 상세 modal with the given data. */
  openDetail: (data: SalesDetailData) => void;
  /** Close the 판매 상세 modal programmatically (rarely needed — detail modal handles its own close). */
  closeDetail: () => void;
  /** Render once inside the page tree; contains Detail, Delete Alert, and Registration modals. */
  modals: ReactNode;
}

export function useSalesDetailActions({
  onRefresh,
}: UseSalesDetailActionsOptions = {}): UseSalesDetailActionsReturn {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<SalesDetailData | null>(null);

  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [registrationCustomer, setRegistrationCustomer] = useState<SalesRegistrationCustomer | null>(null);
  const [editingData, setEditingData] = useState<SalesDetailData | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const openDetail = (data: SalesDetailData) => {
    setDetailData(data);
    setIsDetailOpen(true);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setDetailData(null);
  };

  const resetRegistration = () => {
    setIsRegistrationOpen(false);
    setRegistrationCustomer(null);
    setEditingData(null);
    setEditingId(null);
  };

  const handleEdit = () => {
    if (!detailData) return;
    const current = detailData;
    closeDetail();
    setRegistrationCustomer({
      id: current.customer_id,
      name: current.customer_name,
      phone: null,
    });
    setEditingData(current);
    setEditingId(current.id);
    setIsRegistrationOpen(true);
  };

  const handleDelete = () => {
    if (!detailData) return;
    setDeletingId(detailData.id);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      const response = await fetch(`/api/sales/${deletingId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '판매 삭제에 실패했습니다.');
      }
      setIsDeleteAlertOpen(false);
      setDeletingId(null);
      closeDetail();
      await onRefresh?.();
    } catch (error: any) {
      console.error('판매 삭제 오류:', error);
      alert(error.message || '판매 삭제 중 오류가 발생했습니다.');
      setIsDeleteAlertOpen(false);
    }
  };

  const modals = (
    <>
      <SalesDetailModal
        isOpen={isDetailOpen}
        salesData={detailData}
        onClose={closeDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <AlertModal
        isOpen={isDeleteAlertOpen}
        title="판매 삭제"
        message="이 판매 내역을 삭제하시겠습니까? 예약은 유지되며 판매 등록 전 상태로 돌아갑니다. 삭제된 판매는 감사 로그에만 남습니다."
        highlightText="복구할 수 없습니다"
        variant="confirm"
        zIndex={Z.MODAL_ALERT_TOP}
        onConfirm={confirmDelete}
        onClose={() => {
          setIsDeleteAlertOpen(false);
          setDeletingId(null);
        }}
      />

      <SalesRegistrationModal
        isOpen={isRegistrationOpen}
        customer={registrationCustomer}
        initialData={editingData}
        editSaleId={editingId}
        shopId={editingData?.shop_id ?? null}
        bookingId={editingData?.booking_id ?? null}
        bookingDepositPaid={editingData?.booking_deposit_paid ?? 0}
        onClose={resetRegistration}
        onComplete={async () => {
          resetRegistration();
          await onRefresh?.();
        }}
        onEditComplete={async (saleId) => {
          try {
            const res = await fetch(`/api/sales/${saleId}`);
            const data = await res.json();
            if (!res.ok || !data.sale) {
              throw new Error(data.error || '판매를 불러오지 못했습니다.');
            }
            setDetailData(mapSaleRecordToDetailData(data.sale));
            setIsDetailOpen(true);
            await onRefresh?.();
          } catch (e: any) {
            console.error(e);
            alert(e?.message || '수정된 판매를 표시하지 못했습니다.');
          }
        }}
      />
    </>
  );

  return { openDetail, closeDetail, modals };
}
