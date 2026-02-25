'use client';

import React, { useState, useEffect } from 'react';

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

  if (!isOpen) return null;

  const handleClassificationSelect = (classification: string) => {
    // 옵션 선택 시 바로 적용하고 모달 닫기
    onConfirm(classification);
    onClose();
  };

  const handleDelete = () => {
    onConfirm(null);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100007] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">영업 구분</h2>
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
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            type="button"
            onClick={handleDelete}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            삭제
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
