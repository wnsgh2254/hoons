'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Z } from '@/lib/constants';

interface CustomerProfileSectionProps {
  customer: any;
  onMemoChange?: (memo: string) => void;
}

export default function CustomerProfileSection({
  customer,
  onMemoChange,
}: CustomerProfileSectionProps) {
  const [memo, setMemo] = useState<string>(customer.memo || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftMemo, setDraftMemo] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setMemo(customer.memo || '');
  }, [customer.id, customer.memo]);

  const openModal = () => {
    setDraftMemo(memo);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!customer?.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo: draftMemo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '메모 저장에 실패했습니다.');
      }
      setMemo(draftMemo);
      onMemoChange?.(draftMemo);
      setIsModalOpen(false);
    } catch (err: any) {
      setSaveError(err?.message || '메모 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Customer Name and Type */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-bold text-black">{customer.name || '-'}</h3>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
            {customer.customer_type === 'prepaid' ? '정액권' : '일반'}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          {customer.phone
            ? `/${customer.phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3')}`
            : '-'}
        </p>
      </div>

      {/* Customer Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500 w-20 flex-shrink-0">고객 번호</p>
          <p className="text-sm font-medium text-black">
            {customer.customer_number || customer.id || '-'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500 w-20 flex-shrink-0">담당자</p>
          <p className="text-sm font-medium text-black">{customer.manager_name || '-'}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500 w-20 flex-shrink-0">생일</p>
          <p className="text-sm font-medium text-black">
            {customer.birthday || customer.birth_date || '-'}
          </p>
        </div>
      </div>

      {/* Memo — click to open modal */}
      <button
        type="button"
        onClick={openModal}
        className="w-full min-h-[100px] border border-gray-200 rounded-lg px-3 py-2 text-sm text-left whitespace-pre-wrap text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
      >
        {memo}
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="메모 등록"
        zIndex={Z.MODAL_NESTED}
        maxWidth="max-w-2xl"
      >
        <div className="flex flex-col gap-4">
          <textarea
            value={draftMemo}
            onChange={(e) => setDraftMemo(e.target.value)}
            rows={10}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            autoFocus
          />
          {saveError && (
            <p className="text-xs text-red-600">{saveError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
