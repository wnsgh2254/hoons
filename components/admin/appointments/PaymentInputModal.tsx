'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Z } from '@/lib/constants';
import { formatAudNumber, roundToCents } from '@/lib/utils';
import { addDigits, removeLastDigit, parseAmount } from '@/lib/utils/numeric-input-utils';
import NumericKeypad from './NumericKeypad';

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
      setInputValue(initialAmount > 0 ? formatAudNumber(initialAmount) : '0');
    }
  }, [isOpen, initialAmount]);

  const handleNumberClick = (num: string) => {
    setInputValue((prev) => addDigits(prev, num, 2));
  };

  const handleBackspace = () => {
    setInputValue((prev) => removeLastDigit(prev, 2));
  };

  const handleClear = () => {
    setInputValue('0');
  };

  const handleComplete = () => {
    const amount = roundToCents(parseAmount(inputValue));
    if (amount > 0) {
      onComplete(amount);
      onClose();
    }
  };

  const handleAdditionalInput = () => {
    const amount = roundToCents(parseAmount(inputValue));
    if (amount > 0) {
      onAdditionalInput(amount);
      setInputValue('0');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="입력"
      zIndex={Z.MODAL_SALES_SUB}
    >
      <div className="space-y-4">
        {/* Input Field */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputValue.replace(/,/g, '')}
            readOnly
            className="w-full px-4 pr-11.5 py-3 text-right text-lg border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
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
          <NumericKeypad
            onNumberClick={handleNumberClick}
            onBackspace={handleBackspace}
            allowDecimal
            className="flex-1 space-y-2"
          />

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 w-32">
            <Button variant="primary" size="lg" onClick={handleComplete}>
              계산 완료
            </Button>
            <Button variant="ghost" size="lg" onClick={handleAdditionalInput}>
              추가 입력
            </Button>
            <Button variant="ghost" size="lg" onClick={onClose}>
              취소
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
