'use client';

import React from 'react';

interface ErrorAlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export default function ErrorAlertModal({
  isOpen,
  title,
  message,
  onClose,
}: ErrorAlertModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100009] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-900">{message}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
