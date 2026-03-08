'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Z } from '@/lib/constants';

interface SalesClassificationModalProps {
  isOpen: boolean;
  currentClassification: string;
  onClose: () => void;
  onConfirm: (classification: string | null) => void;
}

const SALES_CLASSIFICATIONS = [
  { value: '신규', label: '신규' },
  { value: '소개', label: '소개' },
  { value: '지정', label: '지정' },
  { value: '대체', label: '대체' },
  { value: '미지정', label: '미지정' },
  { value: '미등록', label: '미등록' },
];

export default function SalesClassificationModal({
  isOpen,
  currentClassification,
  onClose,
  onConfirm,
}: SalesClassificationModalProps) {
  const [selectedClassification, setSelectedClassification] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedClassification(currentClassification || null);
    }
  }, [isOpen, currentClassification]);

  const handleClassificationSelect = (classification: string) => {
    onConfirm(classification);
    onClose();
  };

  const handleDelete = () => {
    onConfirm(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="영업 구분"
      zIndex={Z.MODAL_CLASSIFY}
      footer={
        <>
          <Button variant="secondary" size="lg" className="flex-1" onClick={handleDelete}>
            삭제
          </Button>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>
            취소
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {SALES_CLASSIFICATIONS.map((classification) => (
          <button
            key={classification.value}
            type="button"
            onClick={() => handleClassificationSelect(classification.value)}
            className={`px-4 py-3 text-sm font-medium border rounded-lg transition-colors ${
              selectedClassification === classification.value
                ? 'border-black bg-black text-white'
                : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
            }`}
          >
            {classification.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
