'use client';

import React, { useState, useEffect } from 'react';

interface ManagerPickerModalProps {
  isOpen: boolean;
  currentManager: string;
  onClose: () => void;
  onConfirm: (manager: string) => void;
}

export default function ManagerPickerModal({
  isOpen,
  currentManager,
  onClose,
  onConfirm,
}: ManagerPickerModalProps) {
  const [staffMembers, setStaffMembers] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [allowMultipleSelection, setAllowMultipleSelection] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedManager(currentManager || '');
      // 직원 목록 가져오기
      const fetchStaff = async () => {
        setLoading(true);
        try {
          const res = await fetch('/api/staff');
          const data = await res.json();
          if (res.ok && data.staff) {
            // 활성 직원만 필터링
            const activeStaff = data.staff
              .filter((s: any) => s.is_active)
              .map((s: any) => ({ id: s.id, name: s.name }));
            setStaffMembers(activeStaff);
          }
        } catch (error) {
          console.error('Error fetching staff:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchStaff();
    }
  }, [isOpen, currentManager]);

  if (!isOpen) return null;

  const handleManagerSelect = (manager: string) => {
    setSelectedManager(manager);
  };

  const handleConfirm = () => {
    onConfirm(selectedManager);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100008] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleCancel}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-[100009]"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">담당자 선택</h2>
          <button
            type="button"
            onClick={handleCancel}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Multiple Selection Checkbox */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowMultipleSelection}
                onChange={(e) => setAllowMultipleSelection(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">복수 선택 / 직원 매출 조정</span>
            </label>
          </div>

          {/* Manager Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">로딩 중...</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* 선택 안함 버튼 */}
              <button
                type="button"
                onClick={() => handleManagerSelect('')}
                className={`px-4 py-3 text-sm font-medium border rounded-lg transition-colors ${
                  selectedManager === ''
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                }`}
              >
                선택 안함
              </button>

              {/* 직원 목록 */}
              {staffMembers.map((staff) => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => handleManagerSelect(staff.name)}
                  className={`px-4 py-3 text-sm font-medium border rounded-lg transition-colors ${
                    selectedManager === staff.name
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {staff.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-3 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
