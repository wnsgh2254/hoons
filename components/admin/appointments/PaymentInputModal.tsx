'use client';

import { useState, useEffect } from 'react';

interface PaymentInputModalProps {
  isOpen: boolean;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | null;
  initialAmount?: number;
  onClose: () => void;
  onComplete: (amount: number) => void;
  onAdditionalInput: (amount: number) => void;
}

export default function PaymentInputModal({
  isOpen,
  paymentMethod,
  initialAmount = 0,
  onClose,
  onComplete,
  onAdditionalInput,
}: PaymentInputModalProps) {
  const [inputValue, setInputValue] = useState('0');

  useEffect(() => {
    if (isOpen) {
      // 초기 금액이 있으면 해당 금액을 표시, 없으면 '0' 표시
      if (initialAmount > 0) {
        setInputValue(initialAmount.toLocaleString());
      } else {
        setInputValue('0');
      }
    }
  }, [isOpen, initialAmount]);

  if (!isOpen) return null;

  const handleNumberClick = (num: string) => {
    setInputValue((prev) => {
      const current = prev.replace(/,/g, '').replace(/x/g, '');
      if (current === '0') {
        return num;
      }
      const newValue = (current + num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return newValue;
    });
  };

  const handleBackspace = () => {
    setInputValue((prev) => {
      const current = prev.replace(/,/g, '').replace(/x/g, '');
      if (current.length <= 1) {
        return '0';
      }
      const newValue = current.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return newValue;
    });
  };

  const handleClear = () => {
    setInputValue('0');
  };

  const handleComplete = () => {
    const amount = Number(inputValue.replace(/,/g, '').replace(/x/g, ''));
    if (amount > 0) {
      onComplete(amount);
      onClose();
    }
  };

  const handleAdditionalInput = () => {
    const amount = Number(inputValue.replace(/,/g, '').replace(/x/g, ''));
    if (amount > 0) {
      onAdditionalInput(amount);
      setInputValue('0');
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const getPaymentMethodName = () => {
    switch (paymentMethod) {
      case 'cash':
        return '현금';
      case 'card':
        return '카드';
      case 'bank_transfer':
        return '계좌이체';
      default:
        return '';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100005] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        // 배경 클릭 시 모달만 닫기 (판매 등록 모달은 유지)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">입력</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Input Field */}
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputValue.replace(/,/g, '')}
              readOnly
              className="w-full px-4 pr-12 py-3 text-right text-lg border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
            />
            {inputValue !== '0' && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              >
                <span className="material-symbols-outlined text-xl leading-none">close</span>
              </button>
            )}
          </div>

          {/* Keypad and Action Buttons */}
          <div className="flex gap-4">
            {/* Numeric Keypad */}
            <div className="flex-1 space-y-2">
              {/* Main grid: 1-9 with 000 and 0000 on the right */}
              <div className="grid grid-cols-4 gap-2">
                {/* Left: 1-9 in 3x3 grid */}
                <div className="col-span-3 grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumberClick(num.toString())}
                      className="px-4 py-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium h-12 flex items-center justify-center"
                    >
                      {num}
                    </button>
                  ))}
                </div>
                
                {/* Right: 000 and 0000 stacked vertically */}
                <div className="col-span-1 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleNumberClick('000')}
                    className="px-4 py-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium h-12 flex items-center justify-center"
                  >
                    000
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumberClick('0000')}
                    className="px-4 py-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium h-12 flex items-center justify-center"
                  >
                    0000
                  </button>
                </div>
              </div>
              
              {/* Bottom row: 0, 00, Backspace */}
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleNumberClick('0')}
                    className="px-4 py-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium h-12 flex items-center justify-center"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumberClick('00')}
                    className="px-4 py-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium h-12 flex items-center justify-center"
                  >
                    00
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="px-4 py-3 text-sm border border-gray-200 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors font-medium h-12 flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-xl">backspace</span>
                  </button>
                </div>
                <div className="col-span-1"></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 w-32">
              <button
                type="button"
                onClick={handleComplete}
                className="px-4 py-3 text-sm font-semibold text-white bg-black hover:bg-gray-800 rounded-lg transition-colors"
              >
                계산 완료
              </button>
              <button
                type="button"
                onClick={handleAdditionalInput}
                className="px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 bg-white"
              >
                추가 입력
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 bg-white"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
