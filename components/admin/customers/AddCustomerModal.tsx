'use client';

import { useAppointmentRequest } from '@/lib/appointment-request';

import { useState, useEffect } from 'react';
import { useStaff } from '@/hooks/useStaff';
import Modal from '@/components/ui/Modal';
import FormAlert from '@/components/ui/FormAlert';
import { Z } from '@/lib/constants';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customer?: { id: number; name: string; phone: string }) => void;
}

export default function AddCustomerModal({
  isOpen,
  onClose,
  onSuccess,
}: AddCustomerModalProps) {
  const request = useAppointmentRequest();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedDesignerId, setAssignedDesignerId] = useState<number | null>(null);
  const { staff: designers } = useStaff({ onlyActive: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comment: Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setPhone('');
      setAssignedDesignerId(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('고객명을 입력해주세요.');
      return;
    }

    if (!phone.trim()) {
      setError('휴대폰번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await request('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: name.trim(), 
          phone: phone.trim(),
          assigned_designer_id: assignedDesignerId || null,
        }),
      });

      const raw = await res.text();
      let data: { error?: string; existingCustomerName?: string; customer?: { id: number; name: string; phone: string } } =
        {};
      if (raw.trim()) {
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          setError('서버 응답을 해석할 수 없습니다.');
          return;
        }
      }

      if (res.ok) {
        if (onSuccess) {
          onSuccess(data.customer ? { id: data.customer.id, name: data.customer.name, phone: data.customer.phone } : undefined);
        }
        onClose();
      } else {
        let msg = data.error || '고객 등록에 실패했습니다.';
        if (res.status === 409 && data.existingCustomerName) {
          msg = `${msg} (등록명: ${String(data.existingCustomerName).trim()})`;
        }
        setError(msg);
      }
    } catch {
      setError('고객 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="고객등록"
      zIndex={Z.MODAL_ADD_CUST}
      maxWidth="max-w-md"
      scrollable
      footer={
        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
          >
            취소
          </button>
          <button
            type="submit"
            form="add-customer-form"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      }
    >
      <form id="add-customer-form" onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-lg ring-2 ring-red-500/30" role="alert" aria-live="assertive">
            <FormAlert message={error} variant="error" />
          </div>
        ) : null}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            고객명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            휴대폰 번호 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="숫자만 입력해 주세요"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            담당자
          </label>
          <select
            value={assignedDesignerId || ''}
            onChange={(e) => setAssignedDesignerId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value="">선택 안 함</option>
            {designers.map((designer) => (
              <option key={designer.id} value={designer.id}>
                {designer.name}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
