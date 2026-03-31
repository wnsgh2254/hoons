'use client';

import { useState, useEffect } from 'react';
import { formatNumberWithCommas } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Z } from '@/lib/constants';
import NumericKeypad from './NumericKeypad';

interface PrepaidPass {
  id: number;
  name: string;
  points: number;
  expires_at: string | null;
  is_active: boolean;
}

interface PrepaidDeductionModalProps {
  isOpen: boolean;
  customerId: number | null;
  initialAmount?: number;
  selectedItemId?: string | null;
  onClose: () => void;
  onComplete: (amount: number) => void;
  onAdditionalInput: (amount: number) => void;
  onBalanceLoaded?: (balance: number) => void;
}

export default function PrepaidDeductionModal({
  isOpen,
  customerId,
  initialAmount = 0,
  selectedItemId = null,
  onClose,
  onComplete,
  onAdditionalInput,
  onBalanceLoaded,
}: PrepaidDeductionModalProps) {
  const [inputValue, setInputValue] = useState('0');
  const [prepaidPasses, setPrepaidPasses] = useState<PrepaidPass[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPrepaidPass, setSelectedPrepaidPass] = useState<PrepaidPass | null>(null);

  useEffect(() => {
    if (isOpen && customerId) {
      if (initialAmount > 0) {
        setInputValue(initialAmount.toLocaleString());
      } else {
        setInputValue('0');
      }
      fetchPrepaidPasses();
    }
  }, [isOpen, customerId, initialAmount]);

  const fetchPrepaidPasses = async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/prepaid?customer_id=${customerId}`);
      const data = await res.json();

      if (res.ok) {
        const source = Array.isArray(data.usableMembers)
          ? data.usableMembers
          : data.member
            ? [data.member]
            : [];
        const mapped = source.map((m: any) => ({
            id: m.id,
            name: m.name || '정액권',
            points: Number(m.points || 0),
            expires_at: m.expires_at || null,
            is_active: m.is_active ?? true,
          }));
        setPrepaidPasses(mapped);
        const totalBalance = mapped.reduce((sum, pass) => sum + Number(pass.points || 0), 0);
        onBalanceLoaded?.(totalBalance);
      } else {
        setPrepaidPasses([]);
        onBalanceLoaded?.(0);
      }
    } catch (error) {
      console.error('Error fetching prepaid passes:', error);
      setPrepaidPasses([]);
      onBalanceLoaded?.(0);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatNumber = formatNumberWithCommas;

  const handleNumberClick = (num: string) => {
    setInputValue((prev) => {
      const current = prev.replace(/,/g, '');
      if (current === '0') return num;
      return formatNumber(current + num);
    });
  };

  const handleBackspace = () => {
    setInputValue((prev) => {
      const current = prev.replace(/,/g, '');
      if (current.length <= 1) return '0';
      return formatNumber(current.slice(0, -1));
    });
  };

  const handleClear = () => setInputValue('0');

  const getNumericValue = (): number => Number(inputValue.replace(/,/g, ''));

  const handleComplete = () => {
    const amount = getNumericValue();
    if (amount > 0) {
      onComplete(amount);
      onClose();
    }
  };

  const handleAdditionalInput = () => {
    const amount = getNumericValue();
    if (amount > 0) {
      onAdditionalInput(amount);
      setInputValue('0');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}.`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="정액권 차감"
      zIndex={Z.MODAL_NESTED}
      maxWidth="max-w-4xl"
    >
      <div className="flex gap-6">
        {/* Left: Prepaid Pass List */}
        <div className="w-80 flex-shrink-0">
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">정액권</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">잔액</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">만료일</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="py-7.5 text-center text-sm text-gray-500">로딩 중...</td>
                  </tr>
                ) : prepaidPasses.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-7.5 text-center text-sm text-gray-500">내역이 없습니다</td>
                  </tr>
                ) : (
                  prepaidPasses.map((pass) => (
                    <tr
                      key={pass.id}
                      className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedPrepaidPass?.id === pass.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedPrepaidPass(pass)}
                    >
                      <td className="py-3 px-4 text-sm text-gray-900">{pass.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{pass.points.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{formatDate(pass.expires_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Input and Keypad */}
        <div className="flex-1">
          {/* Input Field */}
          <div className="relative flex items-center mb-4">
            <input
              type="text"
              value={formatNumber(inputValue.replace(/,/g, ''))}
              readOnly
              className="w-full px-4 pr-11.5 py-3 text-right text-lg border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
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
            <NumericKeypad
              onNumberClick={handleNumberClick}
              onBackspace={handleBackspace}
              className="flex-1 space-y-2"
            />

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 w-32">
              <Button size="lg" onClick={handleComplete}>확인</Button>
              <Button variant="ghost" size="lg" onClick={handleAdditionalInput}>추가 입력</Button>
              <Button variant="ghost" size="lg" onClick={onClose}>취소</Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
