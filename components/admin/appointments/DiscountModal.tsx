'use client';

import { useState, useEffect } from 'react';
import { formatNumberWithCommas } from '@/lib/utils';
import { addDigits, removeLastDigit, parseAmount } from '@/lib/utils/numeric-input-utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import { Z } from '@/lib/constants';
import NumericKeypad from './NumericKeypad';

type DiscountType = 'percentage' | 'amount' | 'category';

type DiscountItem = {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  discountType?: DiscountType;
  discountValue?: number | string;
};

interface DiscountModalProps {
  isOpen: boolean;
  items: DiscountItem[];
  onClose: () => void;
  onConfirm: (updates: Array<{ itemId: string; discount: number; discountType: DiscountType; discountValue: number | string | null }>) => void;
}

const PERCENTAGE_OPTIONS = [3, 5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 100];

export default function DiscountModal({
  isOpen,
  items,
  onClose,
  onConfirm,
}: DiscountModalProps) {
  const [activeTab, setActiveTab] = useState<DiscountType>('percentage');
  const [percentageValue, setPercentageValue] = useState<number | null>(null);
  const [customPercentage, setCustomPercentage] = useState<string>('');
  const [amountValue, setAmountValue] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [itemsToRemoveDiscount, setItemsToRemoveDiscount] = useState<Set<string>>(new Set()); // 할인 제거 예정 항목
  // 각 항목별 할인 정보 저장 (itemId -> { type: DiscountType, value: number | string })
  const [itemDiscounts, setItemDiscounts] = useState<Map<string, { type: DiscountType; value: number | string }>>(new Map());
  // 금액 입력 시 사용할 선택된 항목들 (항목 선택이 변경되면 초기화)
  const [amountInputSelectedItems, setAmountInputSelectedItems] = useState<Set<string>>(new Set());

  // 모달이 열릴 때 초기화 (기본적으로 아무 항목도 선택되지 않은 상태)
  useEffect(() => {
    if (isOpen && items.length > 0) {
      setSelectedItemIds(new Set()); // 기본적으로 아무 항목도 선택되지 않음
      setItemsToRemoveDiscount(new Set()); // 할인 제거 예정 항목 초기화
      setAmountInputSelectedItems(new Set()); // 금액 입력 시 사용할 선택된 항목들 초기화
      setPercentageValue(null);
      setCustomPercentage('');
      setAmountValue('');
      setActiveTab('percentage');

      // 기존 할인 정보를 itemDiscounts에 저장
      const initialDiscounts = new Map<string, { type: DiscountType; value: number | string }>();
      items.forEach(item => {
        if (item.discountType && item.discountValue !== undefined) {
          initialDiscounts.set(item.id, {
            type: item.discountType,
            value: item.discountValue,
          });
        }
      });
      setItemDiscounts(initialDiscounts);
    }
  }, [isOpen, items]);

  if (!isOpen || items.length === 0) return null;

  const handlePercentageSelect = (percentage: number) => {
    // 선택된 항목들에 할인 정보 저장
    updateItemDiscounts(percentage, 'percentage');
    // 버튼 활성화 상태는 유지하지 않음 (즉시 적용)
  };

  // 선택된 항목들에 할인 정보 업데이트 (다중 선택 지원)
  const updateItemDiscounts = (value: number | string, type: DiscountType, targetItemIds?: Set<string>, shouldClearSelection: boolean = true) => {
    const itemsToUpdate = targetItemIds || selectedItemIds;
    if (itemsToUpdate.size === 0) return;

    setItemDiscounts((prev) => {
      const newMap = new Map(prev);
      // 선택된 모든 항목에 할인 정보 저장
      itemsToUpdate.forEach(itemId => {
        newMap.set(itemId, { type, value });
        // 할인 적용 시 제거 예정 목록에서도 제거 (다시 할인 적용 가능하도록)
        setItemsToRemoveDiscount((prevRemove) => {
          const newRemoveSet = new Set(prevRemove);
          newRemoveSet.delete(itemId);
          return newRemoveSet;
        });
      });
      return newMap;
    });

    // 할인 적용 후 선택된 항목들을 선택 해제 (체크박스를 빈 상태로) - shouldClearSelection이 true일 때만
    if (shouldClearSelection) {
      setSelectedItemIds((prev) => {
        const newSet = new Set(prev);
        itemsToUpdate.forEach(itemId => {
          newSet.delete(itemId);
        });
        return newSet;
      });

      // 금액 입력 시 사용하는 선택된 항목들도 초기화
      if (targetItemIds) {
        setAmountInputSelectedItems((prev) => {
          const newSet = new Set(prev);
          itemsToUpdate.forEach(itemId => {
            newSet.delete(itemId);
          });
          return newSet;
        });
      }
    }
  };

  const handleConfirm = () => {
    // 먼저 현재 선택된 항목들에 입력된 할인 값 적용
    if (selectedItemIds.size > 0) {
      if (activeTab === 'percentage') {
        const percentage = percentageValue || (customPercentage ? Number(customPercentage) : 0);
        if (percentage > 0) {
          updateItemDiscounts(percentage, 'percentage', selectedItemIds, false);
        }
      } else if (activeTab === 'amount') {
        const amount = amountValue ? parseAmount(amountValue) : 0;
        if (amount > 0) {
          const itemsToUpdate = amountInputSelectedItems.size > 0 ? amountInputSelectedItems : selectedItemIds;
          updateItemDiscounts(amount, 'amount', itemsToUpdate, false);
        }
      }
    }

    const updates: Array<{ itemId: string; discount: number; discountType: DiscountType; discountValue: number | string | null }> = [];

    // 할인을 제거할 항목 처리
    itemsToRemoveDiscount.forEach(itemId => {
      updates.push({
        itemId,
        discount: 0,
        discountType: 'percentage' as DiscountType,
        discountValue: null,
      });
    });

    // itemDiscounts에 저장된 모든 할인 정보를 업데이트에 추가
    itemDiscounts.forEach((discountInfo, itemId) => {
      // 제거 예정 항목이면 스킵
      if (itemsToRemoveDiscount.has(itemId)) return;

      const item = items.find(i => i.id === itemId);
      if (!item) return;

      let finalDiscount = 0;
      let discountValue: number | string = discountInfo.value;

      if (discountInfo.type === 'percentage') {
        const percentage = typeof discountInfo.value === 'number' ? discountInfo.value : Number(discountInfo.value);
        if (percentage > 0) {
          finalDiscount = Math.round((item.unitPrice * item.quantity * percentage) / 100);
        }
      } else if (discountInfo.type === 'amount') {
        const amount = typeof discountInfo.value === 'number' ? discountInfo.value : Number(discountInfo.value);
        finalDiscount = amount;
      }

      updates.push({
        itemId,
        discount: finalDiscount,
        discountType: discountInfo.type,
        discountValue,
      });
    });

    // 변경사항이 없으면 경고
    if (updates.length === 0) {
      alert('변경할 사항이 없습니다.');
      return;
    }

    onConfirm(updates);
    // Reset state
    setPercentageValue(null);
    setCustomPercentage('');
    setAmountValue('');
    setSelectedItemIds(new Set());
    setItemsToRemoveDiscount(new Set());
    setAmountInputSelectedItems(new Set());
    onClose();
  };

  const handleCancel = () => {
    setPercentageValue(null);
    setCustomPercentage('');
    setAmountValue('');
    setSelectedItemIds(new Set());
    setItemsToRemoveDiscount(new Set());
    setAmountInputSelectedItems(new Set());
    setItemDiscounts(new Map());
    onClose();
  };

  const getCurrentDiscountDisplay = (item: DiscountItem) => {
    // 할인 제거 예정 항목이면 빈 문자열 반환
    if (itemsToRemoveDiscount.has(item.id)) {
      return '';
    }

    // itemDiscounts에서 할인 정보 가져오기
    const itemDiscount = itemDiscounts.get(item.id);
    if (itemDiscount) {
      if (itemDiscount.type === 'percentage') {
        const value = typeof itemDiscount.value === 'number' ? itemDiscount.value : Number(itemDiscount.value);
        return `${value}%`;
      } else if (itemDiscount.type === 'amount') {
        const value = typeof itemDiscount.value === 'number' ? itemDiscount.value : Number(itemDiscount.value);
        return value.toLocaleString();
      }
    }

    // 기존 할인 정보가 있는 경우 (itemDiscounts에 없을 때)
    if (item.discountType === 'percentage' && item.discountValue !== undefined) {
      return `${item.discountValue}%`;
    } else if (item.discountType === 'amount' && item.discountValue !== undefined) {
      const value = typeof item.discountValue === 'number' ? item.discountValue : Number(item.discountValue);
      return value.toLocaleString();
    }
    return '';
  };

  const hasSelectedDiscount = (item: DiscountItem) => {
    // 할인 제거 예정 항목이면 false 반환 (X 버튼 표시 안 함)
    if (itemsToRemoveDiscount.has(item.id)) {
      return false;
    }

    // itemDiscounts에 할인 정보가 있거나 기존 할인이 있는 경우
    const itemDiscount = itemDiscounts.get(item.id);
    if (itemDiscount) {
      return true;
    }

    return item.discount > 0;
  };

  // 할인이 적용된 항목인지 확인 (체크박스 비활성화용)
  const hasAppliedDiscount = (item: DiscountItem) => {
    // itemDiscounts에 할인 정보가 있거나 기존 할인이 있는 경우
    const itemDiscount = itemDiscounts.get(item.id);
    if (itemDiscount) {
      return true;
    }

    return item.discount > 0;
  };

  const handleToggleItem = (itemId: string) => {
    // 다중 선택 지원
    setSelectedItemIds((prev) => {
      const newSet = new Set(prev);
      const wasSelected = newSet.has(itemId);

      // 항목 선택이 변경되기 전에, 이전에 선택된 항목들에 현재 입력된 값을 적용
      if (prev.size > 0 && !wasSelected) {
        // 새로운 항목을 선택하는 경우에만 이전 항목에 입력 값 적용
        if (activeTab === 'percentage') {
          // % 할인 탭인 경우
          const percentage = percentageValue || (customPercentage ? Number(customPercentage) : 0);
          if (percentage > 0) {
            updateItemDiscounts(percentage, 'percentage', prev, true);
            setPercentageValue(null);
            setCustomPercentage('');
          }
        } else if (activeTab === 'amount') {
          // 금액 할인 탭인 경우
          const amount = amountValue ? parseAmount(amountValue) : 0;
          if (amount > 0) {
            const itemsToUpdate = amountInputSelectedItems.size > 0 ? amountInputSelectedItems : prev;
            updateItemDiscounts(amount, 'amount', itemsToUpdate, true);
          }
          // 금액 입력 필드 완전히 초기화 (clear all)
          setAmountValue('');
          setAmountInputSelectedItems(new Set());
        }
      }

      // 항목 선택 변경
      if (wasSelected) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }

      // 금액 탭일 때는 선택된 항목들을 추적 (금액 입력 시 사용)
      if (activeTab === 'amount') {
        setAmountInputSelectedItems(new Set(newSet));
      }

      return newSet;
    });
  };

  const handleSelectAll = () => {
    // 할인이 적용되지 않은 항목들만 선택/해제
    const selectableItems = items.filter(item => !hasAppliedDiscount(item) || itemsToRemoveDiscount.has(item.id));

    if (selectedItemIds.size === selectableItems.length && selectableItems.length > 0) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(selectableItems.map(item => item.id)));
    }
  };

  const handleRemoveDiscount = (itemId: string) => {
    // 할인 제거 예정 항목에 추가 (확인 버튼 클릭 시 실제로 제거됨)
    setItemsToRemoveDiscount((prev) => {
      const newSet = new Set(prev);
      newSet.add(itemId);
      return newSet;
    });
    // itemDiscounts에서도 제거 (다시 할인 적용 가능하도록)
    setItemDiscounts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });
    // 선택된 항목은 유지 (다시 할인 적용 가능하도록)
    // selectedItemIds에서 제거하지 않음
  };

  const handleAmountNumberClick = (num: string) => {
    setAmountValue((prev) => addDigits(prev, num));
  };

  const handleAmountBackspace = () => {
    setAmountValue((prev) => removeLastDigit(prev));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="할인"
      zIndex={Z.MODAL_DISCOUNT}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex justify-end items-center gap-2 w-full">
          <Button variant="ghost" onClick={handleCancel}>취소</Button>
          <Button onClick={handleConfirm}>확인</Button>
        </div>
      }
    >
      {/* Main Content */}
      <div className="flex gap-6">
        {/* Left: Item Information */}
        <div className="w-64">
          <p className="text-xs text-gray-500 mb-2">* 할인할 항목을 선택해 주세요.</p>
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 w-8">
                    <input
                      type="checkbox"
                      checked={(() => {
                        const selectableItems = items.filter(item => !hasAppliedDiscount(item) || itemsToRemoveDiscount.has(item.id));
                        return selectedItemIds.size === selectableItems.length && selectableItems.length > 0;
                      })()}
                      onChange={handleSelectAll}
                      disabled={items.every(item => hasAppliedDiscount(item) && !itemsToRemoveDiscount.has(item.id))}
                      className="rounded border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">판매 항목</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 w-24">할인</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.has(item.id)}
                        onChange={() => handleToggleItem(item.id)}
                        disabled={hasAppliedDiscount(item) && !itemsToRemoveDiscount.has(item.id)}
                        className="rounded border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-900">{item.name}</td>
                    <td className="py-2 px-3 text-sm text-gray-900 w-24">
                      {hasSelectedDiscount(item) ? (
                        <div className="flex items-center justify-center gap-2">
                          <span>{getCurrentDiscountDisplay(item)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDiscount(item.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">close</span>
                          </button>
                        </div>
                      ) : itemsToRemoveDiscount.has(item.id) ? (
                        ''
                      ) : (
                        ''
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Discount Options */}
        <div className="flex-1">
          <Tabs
            tabs={[
              { key: 'percentage', label: '% 할인' },
              { key: 'amount', label: '금액 할인' },
            ]}
            activeTab={activeTab}
            onTabChange={(key) => {
              const tab = key as DiscountType;
              setActiveTab(tab);
              if (tab === 'amount') {
                setAmountInputSelectedItems(new Set(selectedItemIds));
                setAmountValue('');
              }
            }}
            className="mb-4"
          />

          {/* Tab Content */}
          {activeTab === 'percentage' && (
            <div className="space-y-4">
              {/* Percentage Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {PERCENTAGE_OPTIONS.map((percentage) => (
                  <button
                    key={percentage}
                    type="button"
                    onClick={() => handlePercentageSelect(percentage)}
                    className="px-4 py-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {percentage}%
                  </button>
                ))}
              </div>

              {/* Direct Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">직접 입력</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customPercentage}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setCustomPercentage(value);
                      // 선택된 항목들에 할인 정보 저장 (입력 즉시 적용)
                      if (value && selectedItemIds.size > 0) {
                        updateItemDiscounts(Number(value), 'percentage');
                      }
                    }}
                    placeholder="0"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <span className="text-sm text-gray-700">%</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'amount' && (
            <div className="space-y-4">
              {/* Input Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">직접 입력</label>
                <div className="relative">
                  <input
                    type="text"
                    value={amountValue}
                    readOnly
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9.5 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  {amountValue && (
                    <button
                      type="button"
                      onClick={() => {
                        setAmountValue('');
                        setAmountInputSelectedItems(new Set());
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Numeric Keypad */}
              <NumericKeypad
                onNumberClick={handleAmountNumberClick}
                onBackspace={handleAmountBackspace}
                className="space-y-2"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
