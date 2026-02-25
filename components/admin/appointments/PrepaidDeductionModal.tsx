'use client';

import { useState, useEffect } from 'react';

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
}

export default function PrepaidDeductionModal({
  isOpen,
  customerId,
  initialAmount = 0,
  selectedItemId = null,
  onClose,
  onComplete,
  onAdditionalInput,
}: PrepaidDeductionModalProps) {
  const [inputValue, setInputValue] = useState('0');
  const [prepaidPasses, setPrepaidPasses] = useState<PrepaidPass[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPrepaidPass, setSelectedPrepaidPass] = useState<PrepaidPass | null>(null);

  useEffect(() => {
    if (isOpen && customerId) {
      // 초기 금액이 있으면 해당 금액을 표시, 없으면 '0' 표시
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
      
      if (res.ok && data.member) {
        // 단일 정액권 회원 정보를 배열로 변환
        setPrepaidPasses([{
          id: data.member.id,
          name: data.member.name || '정액권',
          points: Number(data.member.points || 0),
          expires_at: data.member.expires_at,
          is_active: data.member.is_active ?? true,
        }]);
      } else {
        setPrepaidPasses([]);
      }
    } catch (error) {
      console.error('Error fetching prepaid passes:', error);
      setPrepaidPasses([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatNumber = (value: string): string => {
    const cleaned = value.replace(/,/g, '');
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleNumberClick = (num: string) => {
    setInputValue((prev) => {
      const current = prev.replace(/,/g, '');
      if (current === '0') {
        return num;
      }
      return formatNumber(current + num);
    });
  };

  const handleBackspace = () => {
    setInputValue((prev) => {
      const current = prev.replace(/,/g, '');
      if (current.length <= 1) {
        return '0';
      }
      return formatNumber(current.slice(0, -1));
    });
  };

  const handleClear = () => {
    setInputValue('0');
  };

  const getNumericValue = (): number => {
    return Number(inputValue.replace(/,/g, ''));
  };

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

  const handleCancel = () => {
    onClose();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}.`;
  };

  return (
    <div 
      className="fixed inset-0 z-[100008] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{ pointerEvents: 'auto', zIndex: 100008 }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto', zIndex: 100009 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">정액권 차감</h2>
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
                        <td colSpan={3} className="py-8 text-center text-sm text-gray-500">
                          로딩 중...
                        </td>
                      </tr>
                    ) : prepaidPasses.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-sm text-gray-500">
                          내역이 없습니다
                        </td>
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
                  className="w-full px-4 pr-12 py-3 text-right text-lg border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
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
      </div>
    </div>
  );
}
