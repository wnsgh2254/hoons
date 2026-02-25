'use client';

import React, { useState, useEffect } from 'react';

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
      const res = await fetch(`/api/prepaid?customer_id=${customerId}`);
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

      const res = await fetch(`/api/prepaid?id=${prepaidMemberId}`, {
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
    <div
      className="fixed inset-0 z-[100010] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      style={{ pointerEvents: 'auto', zIndex: 100010 }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-[100011]"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto', zIndex: 100011 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">선불권 회원 수정</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fetching && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-3 py-2 rounded-lg">
              선불권 회원 정보를 불러오는 중...
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Name - Disabled */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름
            </label>
            <input
              type="text"
              value={customerName}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Phone - Disabled */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              전화번호
            </label>
            <input
              type="tel"
              value={customerPhone || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Email - Disabled */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              type="email"
              value={customerEmail || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Points - Enabled */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              포인트 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="선불권 포인트 입력"
            />
          </div>

          {/* Expires At */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
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
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-60 transition-colors"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
