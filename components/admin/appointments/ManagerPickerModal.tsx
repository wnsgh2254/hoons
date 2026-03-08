'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Z } from '@/lib/constants';
import { useStaff } from '@/hooks/useStaff';

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
  const { staff, loading } = useStaff({ onlyActive: true, enabled: isOpen });
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [allowMultipleSelection, setAllowMultipleSelection] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedManager(currentManager || '');
    }
  }, [isOpen, currentManager]);

  const handleConfirm = () => {
    onConfirm(selectedManager);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="담당자 선택"
      zIndex={Z.MODAL_NESTED}
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" size="lg" onClick={handleConfirm}>
            확인
          </Button>
        </>
      }
    >
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
        <div className="flex items-center justify-center py-7.5">
          <div className="text-sm text-gray-500">로딩 중...</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectedManager('')}
            className={`px-4 py-3 text-sm font-medium border rounded-lg transition-colors ${
              selectedManager === ''
                ? 'border-black bg-black text-white'
                : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
            }`}
          >
            선택 안함
          </button>

          {staff.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedManager(s.name)}
              className={`px-4 py-3 text-sm font-medium border rounded-lg transition-colors ${
                selectedManager === s.name
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
