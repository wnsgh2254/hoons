'use client';

import { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Z } from '@/lib/constants';
import { formatAudAmount, formatAudNumber, roundToCents } from '@/lib/utils';
import { addDigits, removeLastDigit, parseAmount } from '@/lib/utils/numeric-input-utils';
import NumericKeypad from './NumericKeypad';

interface PaymentInputModalProps {
  isOpen: boolean;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | null;
  initialAmount?: number;
  /** Remaining balance this payment can cover (for change preview on cash). */
  amountDue?: number;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}

const CASH_QUICK_AMOUNTS = [20, 50, 100];

export default function PaymentInputModal({
  isOpen,
  paymentMethod,
  initialAmount = 0,
  amountDue = 0,
  onClose,
  onConfirm,
}: PaymentInputModalProps) {
  const [inputValue, setInputValue] = useState('0');

  useEffect(() => {
    if (isOpen) {
      setInputValue(initialAmount > 0 ? formatAudNumber(initialAmount) : '0');
    }
  }, [isOpen, initialAmount]);

  const parsedAmount = useMemo(() => roundToCents(parseAmount(inputValue)), [inputValue]);
  const due = Math.max(0, roundToCents(amountDue));
  const isCash = paymentMethod === 'cash';
  const changeDue =
    isCash && parsedAmount > due ? roundToCents(parsedAmount - due) : 0;

  const handleNumberClick = (num: string) => {
    setInputValue((prev) => addDigits(prev, num, 2));
  };

  const handleBackspace = () => {
    setInputValue((prev) => removeLastDigit(prev, 2));
  };

  const handleClear = () => {
    setInputValue('0');
  };

  const handleQuickAmount = (amount: number) => {
    setInputValue(formatAudNumber(amount));
  };

  const handleConfirm = () => {
    if (parsedAmount > 0) {
      onConfirm(parsedAmount);
      onClose();
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
        {isCash && due > 0 && (
          <p className="text-sm text-gray-600 text-right">
            받을 금액 {formatAudAmount(due)}
          </p>
        )}

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

        {isCash && changeDue > 0 && (
          <div className="flex justify-between items-center px-1 py-2 rounded-lg bg-amber-50 border border-amber-200">
            <span className="text-sm font-medium text-amber-900">거스름돈</span>
            <span className="text-sm font-semibold text-amber-900">
              {formatAudAmount(changeDue)}
            </span>
          </div>
        )}

        {isCash && (
          <div className="flex gap-2">
            {CASH_QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleQuickAmount(amount)}
                className="flex-1 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg bg-white text-gray-800 hover:bg-gray-50 transition-colors"
              >
                ${amount}
              </button>
            ))}
          </div>
        )}

        {/* Keypad and Action Buttons */}
        <div className="flex gap-4">
          <NumericKeypad
            onNumberClick={handleNumberClick}
            onBackspace={handleBackspace}
            allowDecimal
            className="flex-1 space-y-2"
          />

          <div className="flex flex-col gap-2 w-32">
            <Button variant="primary" size="lg" onClick={handleConfirm}>
              확인
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
