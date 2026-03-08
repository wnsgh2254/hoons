'use client';

import { useState, useEffect } from 'react';
import { useStaff } from '@/hooks/useStaff';

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
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: name.trim(), 
          phone: phone.trim(),
          assigned_designer_id: assignedDesignerId || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (onSuccess) {
          onSuccess(data.customer ? { id: data.customer.id, name: data.customer.name, phone: data.customer.phone } : undefined);
        }
        onClose();
      } else {
        setError(data.error || '고객 등록에 실패했습니다.');
      }
    } catch (error) {
      setError('고객 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100011] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="bg-black text-white p-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-xl font-bold">고객등록</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5.5 space-y-4">
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
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
