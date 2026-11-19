'use client';

import { useAppointmentRequest } from '@/lib/appointment-request';
import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import FormAlert from '@/components/ui/FormAlert';
import { Z } from '@/lib/constants';

interface EditPrepaidMemberModalProps {
  isOpen: boolean;
  customerId: number;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  currentPoints: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPrepaidMemberModal({
  isOpen,
  customerId,
  customerName,
  customerPhone,
  customerEmail,
  currentPoints,
  onClose,
  onSuccess,
}: EditPrepaidMemberModalProps) {
  const request = useAppointmentRequest();
  const [points, setPoints] = useState<string>(String(currentPoints));
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepaidMemberId, setPrepaidMemberId] = useState<number | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPoints(String(currentPoints));
      setError(null);
      setPrepaidMemberId(null);
      setExpiresAt('');
      setIsActive(true);
      // Fetch prepaid member by customer_id
      fetchPrepaidMember();
    }
  }, [isOpen, customerId, currentPoints]);

  const fetchPrepaidMember = async () => {
    try {
      setFetching(true);
      setError(null);
      const res = await request(`/api/prepaid?customer_id=${customerId}`);
      const data = await res.json();

      if (res.ok && data.member) {
        setPrepaidMemberId(data.member.id);
        setPoints(String(data.member.points || 0));
        setExpiresAt(data.member.expires_at ? data.member.expires_at.split('T')[0] : '');
        setIsActive(data.member.is_active ?? true);
        setError(null);
      } else {
        // If no prepaid member exists, don't show error immediately - allow user to see the form
        setPrepaidMemberId(null);
      }
    } catch (error: any) {
      console.error('Error fetching prepaid member:', error);
      setPrepaidMemberId(null);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Number(points) < 0) {
      setError('정액제 포인트는 0 이상이어야 합니다.');
      return;
    }

    if (!prepaidMemberId) {
      setError('선불권 회원 정보를 찾을 수 없습니다. 먼저 선불권 회원으로 등록해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await request(`/api/prepaid?id=${prepaidMemberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerName.trim(),
          phone: customerPhone?.trim() || null,
          email: customerEmail?.trim() || null,
          points: Number(points) || 0,
          expiresAt: expiresAt || null,
          isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '포인트 수정에 실패했습니다.');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.message || '포인트 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="선불권 회원 수정"
      zIndex={Z.MODAL_EDIT_PP}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {fetching && (
          <FormAlert variant="info" message="선불권 회원 정보를 불러오는 중..." />
        )}
        {error && (
          <FormAlert variant="error" message={error} />
        )}

        {/* Name - Disabled */}
        <Input label="이름" type="text" value={customerName} disabled />

        {/* Phone - Disabled */}
        <Input label="전화번호" type="tel" value={customerPhone || ''} disabled />

        {/* Email - Disabled */}
        <Input label="이메일" type="email" value={customerEmail || ''} disabled />

        {/* Points - Enabled */}
        <Input
          label="포인트 *"
          type="number"
          required
          min="0"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="선불권 포인트 입력"
        />

        {/* Expires At */}
        <div>
          <Input
            label="Expires At"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">만료일을 선택하세요 (선택사항).</p>
        </div>

        {/* Active Checkbox */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" className="flex-1" loading={loading}>
            저장
          </Button>
        </div>
      </form>
    </Modal>
  );
}
