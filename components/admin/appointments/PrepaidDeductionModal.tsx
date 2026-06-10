'use client';

import { useState, useEffect } from 'react';
import { formatAudNumber, roundToCents } from '@/lib/utils';
import { addDigits, removeLastDigit, parseAmount } from '@/lib/utils/numeric-input-utils';
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
  /** Comment: Customer whose prepaid balance will be deducted */
  customerId: number | null;
  /** Comment: Customer on the sale (service recipient) */
  saleCustomerId?: number | null;
  saleCustomerName?: string | null;
  onPrepaidCustomerChange?: (customer: { id: number; name: string }) => void;
  initialAmount?: number;
  selectedItemId?: string | null;
  onClose: () => void;
  onComplete: (amount: number) => void;
  onBalanceLoaded?: (balance: number) => void;
}

export default function PrepaidDeductionModal({
  isOpen,
  customerId,
  saleCustomerId = null,
  saleCustomerName = null,
  onPrepaidCustomerChange,
  initialAmount = 0,
  selectedItemId = null,
  onClose,
  onComplete,
  onBalanceLoaded,
}: PrepaidDeductionModalProps) {
  const [inputValue, setInputValue] = useState('0');
  const [prepaidPasses, setPrepaidPasses] = useState<PrepaidPass[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPrepaidPass, setSelectedPrepaidPass] = useState<PrepaidPass | null>(null);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerSearchResults, setOwnerSearchResults] = useState<Array<{ id: number; name: string }>>([]);
  const [isOwnerSearching, setIsOwnerSearching] = useState(false);
  const [showOwnerSearch, setShowOwnerSearch] = useState(false);
  const [prepaidOwnerName, setPrepaidOwnerName] = useState('');

  useEffect(() => {
    if (isOpen && customerId) {
      setInputValue(initialAmount > 0 ? formatAudNumber(initialAmount) : '0');
      fetchPrepaidPasses();
    }
  }, [isOpen, customerId, initialAmount]);

  useEffect(() => {
    if (!isOpen) {
      setShowOwnerSearch(false);
      setOwnerSearch('');
      setOwnerSearchResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !showOwnerSearch) return;
    const q = ownerSearch.trim();
    if (!q) {
      setOwnerSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsOwnerSearching(true);
        const res = await fetch(`/api/customers/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.customers)) {
          setOwnerSearchResults(
            data.customers.map((c: any) => ({
              id: Number(c.id),
              name: String(c.name || ''),
            })),
          );
        } else {
          setOwnerSearchResults([]);
        }
      } catch {
        setOwnerSearchResults([]);
      } finally {
        setIsOwnerSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [isOpen, showOwnerSearch, ownerSearch]);

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
        const ownerLabel =
          data.member?.name ||
          mapped[0]?.name ||
          saleCustomerName ||
          '';
        if (ownerLabel) setPrepaidOwnerName(ownerLabel);
        const totalBalance = mapped.reduce(
          (sum: number, pass: PrepaidPass) => sum + Number(pass.points || 0),
          0,
        );
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

  const handleSelectPrepaidOwner = (customer: { id: number; name: string }) => {
    onPrepaidCustomerChange?.(customer);
    setPrepaidOwnerName(customer.name);
    setShowOwnerSearch(false);
    setOwnerSearch('');
    setOwnerSearchResults([]);
  };

  if (!isOpen) return null;

  const handleNumberClick = (num: string) => {
    setInputValue((prev) => addDigits(prev, num, 2));
  };

  const handleBackspace = () => {
    setInputValue((prev) => removeLastDigit(prev, 2));
  };

  const handleClear = () => setInputValue('0');

  const getNumericValue = (): number => roundToCents(parseAmount(inputValue));

  const totalPrepaidBalance = prepaidPasses.reduce(
    (sum, pass) => sum + Number(pass.points || 0),
    0,
  );

  const handleComplete = () => {
    if (loading) {
      alert('정액권 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    const amount = getNumericValue();
    if (amount <= 0) {
      alert('차감 금액을 입력해 주세요.');
      return;
    }
    if (prepaidPasses.length === 0 || totalPrepaidBalance <= 0) {
      alert('사용 가능한 정액권이 없습니다.');
      return;
    }
    if (amount > totalPrepaidBalance) {
      alert('정액권 잔액이 부족합니다.');
      return;
    }
    onComplete(amount);
    onClose();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}.`;
  };

  const usingAnotherCustomersPrepaid =
    saleCustomerId != null &&
    customerId != null &&
    Number(saleCustomerId) !== Number(customerId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="정액권 차감"
      zIndex={Z.MODAL_NESTED}
      maxWidth="max-w-[95vw] md:max-w-4xl"
    >
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-700">
            정액권 소유:{' '}
            <span className="font-semibold text-black">{prepaidOwnerName || saleCustomerName || '-'}</span>
          </p>
          {onPrepaidCustomerChange && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowOwnerSearch((prev) => !prev)}
            >
              {showOwnerSearch ? '검색 닫기' : '다른 고객 정액권'}
            </Button>
          )}
        </div>
        {usingAnotherCustomersPrepaid && saleCustomerName && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            판매 고객({saleCustomerName})의 시술에 {prepaidOwnerName || '다른 고객'}님 정액권이 차감됩니다.
          </p>
        )}
        {showOwnerSearch && onPrepaidCustomerChange && (
          <div className="relative border border-gray-200 rounded-lg p-3 bg-gray-50">
            <input
              type="text"
              value={ownerSearch}
              onChange={(e) => setOwnerSearch(e.target.value)}
              placeholder="정액권 소유 고객 검색"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
            />
            {isOwnerSearching && (
              <p className="text-xs text-gray-500 mt-2">검색 중...</p>
            )}
            {!isOwnerSearching && ownerSearch.trim() && ownerSearchResults.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">검색 결과가 없습니다.</p>
            )}
            {ownerSearchResults.length > 0 && (
              <ul className="mt-2 max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-lg divide-y">
                {ownerSearchResults.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() => handleSelectPrepaidOwner(c)}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        {/* Left: Prepaid Pass List */}
        <div className="w-full md:w-80 md:flex-shrink-0">
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px]">
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
                      <td className="py-3 px-4 text-sm text-gray-900">{formatAudNumber(pass.points)}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{formatDate(pass.expires_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Input and Keypad */}
        <div className="flex-1 min-w-0">
          <div className="relative flex items-center mb-4">
            <input
              type="text"
              value={inputValue.replace(/,/g, '')}
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

          <div className="flex flex-col gap-3 md:flex-row md:gap-4">
            <NumericKeypad
              onNumberClick={handleNumberClick}
              onBackspace={handleBackspace}
              allowDecimal
              className="flex-1 space-y-2"
            />

            <div className="grid grid-cols-2 gap-2 md:flex md:flex-col md:gap-2 md:w-32">
              <Button size="lg" className="w-full" onClick={handleComplete} disabled={loading}>확인</Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={onClose}>취소</Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
