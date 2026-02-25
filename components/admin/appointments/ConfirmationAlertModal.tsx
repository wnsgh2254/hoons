'use client';

import React from 'react';

interface ConfirmationAlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  highlightText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationAlertModal({
  isOpen,
  title,
  message,
  highlightText,
  onConfirm,
  onCancel,
}: ConfirmationAlertModalProps) {
  if (!isOpen) return null;

  // highlightText를 포함한 메시지 렌더링
  const renderMessage = () => {
    if (!highlightText) {
      return <p className="text-sm text-gray-900">{message}</p>;
    }

    const parts = message.split(highlightText);
    return (
      <p className="text-sm text-gray-900">
        {parts[0]}
        <span className="text-red-600 font-semibold">{highlightText}</span>
        {parts[1]}
      </p>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100009] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
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
            onClick={onCancel}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            {renderMessage()}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            예
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            아니오
          </button>
        </div>
      </div>
    </div>
  );
}
