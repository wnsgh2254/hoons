'use client';

import { useState, useEffect } from 'react';
import { formatNumberWithCommas, formatAudNumber, roundToCents } from '@/lib/utils';
import { addDigits, removeLastDigit, parseAmount } from '@/lib/utils/numeric-input-utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import { Z } from '@/lib/constants';
import NumericKeypad from './NumericKeypad';

type DiscountType = 'percentage' | 'amount' | 'category';
type DiscountSlot = 1 | 2;

type DiscountItem = {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  discountType?: DiscountType;
  discountValue?: number | string;
  discountType2?: DiscountType;
  discountValue2?: number | string;
};

type DiscountInfo = { type: DiscountType; value: number | string };

interface DiscountModalProps {
  isOpen: boolean;
  items: DiscountItem[];
  /** Which discount slot to focus when the modal opens (1: 할인1, 2: 할인2) */
  initialSlot?: DiscountSlot;
  onClose: () => void;
  onConfirm: (
    updates: Array<{
      itemId: string;
      discount: number;
      discountType: DiscountType | null;
      discountValue: number | string | null;
      discountType2: DiscountType | null;
      discountValue2: number | string | null;
    }>,
  ) => void;
}

const PERCENTAGE_OPTIONS = [3, 5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 100];

export default function DiscountModal({
  isOpen,
  items,
  initialSlot = 1,
  onClose,
  onConfirm,
}: DiscountModalProps) {
  const [activeSlot, setActiveSlot] = useState<DiscountSlot>(initialSlot);
  const [activeTab, setActiveTab] = useState<DiscountType>('percentage');
  const [percentageValue, setPercentageValue] = useState<number | null>(null);
  const [customPercentage, setCustomPercentage] = useState<string>('');
  const [amountValue, setAmountValue] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  // 할인 제거 예정 항목 (슬롯별)
  const [itemsToRemoveDiscount1, setItemsToRemoveDiscount1] = useState<Set<string>>(new Set());
  const [itemsToRemoveDiscount2, setItemsToRemoveDiscount2] = useState<Set<string>>(new Set());
  // 각 항목별 할인 정보 저장 (슬롯별, itemId -> { type, value })
  const [itemDiscounts1, setItemDiscounts1] = useState<Map<string, DiscountInfo>>(new Map());
  const [itemDiscounts2, setItemDiscounts2] = useState<Map<string, DiscountInfo>>(new Map());
  // 금액 입력 시 사용할 선택된 항목들 (항목 선택이 변경되면 초기화)
  const [amountInputSelectedItems, setAmountInputSelectedItems] = useState<Set<string>>(new Set());

  const itemDiscounts = activeSlot === 1 ? itemDiscounts1 : itemDiscounts2;
  const setItemDiscounts = activeSlot === 1 ? setItemDiscounts1 : setItemDiscounts2;
  const itemsToRemoveDiscount = activeSlot === 1 ? itemsToRemoveDiscount1 : itemsToRemoveDiscount2;
  const setItemsToRemoveDiscount = activeSlot === 1 ? setItemsToRemoveDiscount1 : setItemsToRemoveDiscount2;

  // 모달이 열릴 때 초기화. 할인이 아직 적용되지 않은 항목은 기본적으로 모두 선택된 상태로 시작해서,
  // 직원이 금액/퍼센트를 입력한 후 체크박스를 별도로 다시 체크할 필요가 없도록 한다.
  useEffect(() => {
    if (isOpen && items.length > 0) {
      setActiveSlot(initialSlot);
      setItemsToRemoveDiscount1(new Set());
      setItemsToRemoveDiscount2(new Set());
      setPercentageValue(null);
      setCustomPercentage('');
      setAmountValue('');
      setActiveTab('percentage');

      const defaultSelectable = new Set(
        items
          .filter((item) => !(initialSlot === 1 ? item.discountType && item.discount > 0 : item.discountType2))
          .map((item) => item.id),
      );
      setSelectedItemIds(defaultSelectable);
      setAmountInputSelectedItems(defaultSelectable);

      // 기존 할인 정보를 슬롯별로 itemDiscounts에 저장
      const initialDiscounts1 = new Map<string, DiscountInfo>();
      const initialDiscounts2 = new Map<string, DiscountInfo>();
      items.forEach((item) => {
        if (item.discountType) {
          const value = item.discountValue !== undefined ? item.discountValue : (item.discountType === 'category' ? item.discount : undefined);
          if (value !== undefined) {
            initialDiscounts1.set(item.id, { type: item.discountType, value });
          }
        }
        if (item.discountType2 && item.discountValue2 !== undefined) {
          initialDiscounts2.set(item.id, { type: item.discountType2, value: item.discountValue2 });
        }
      });
      setItemDiscounts1(initialDiscounts1);
      setItemDiscounts2(initialDiscounts2);
    }
  }, [isOpen, items, initialSlot]);

  if (!isOpen || items.length === 0) return null;

  const handlePercentageSelect = (percentage: number) => {
    // 선택된 항목들에 할인 정보 저장. 선택은 유지해서 다른 %를 바로 다시 눌러도 즉시 덮어쓸 수 있도록 한다.
    updateItemDiscounts(percentage, 'percentage', undefined, false);
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

  // baseAmount: 이 할인이 적용되는 기준 금액. 할인2는 할인1이 적용된 이후의 금액을 기준으로 % 할인한다.
  const computeAmountForSlot = (item: DiscountItem, info: DiscountInfo | undefined, baseAmount: number): number => {
    if (!info) return 0;
    if (info.type === 'percentage') {
      const percentage = typeof info.value === 'number' ? info.value : Number(info.value);
      if (!(percentage > 0)) return 0;
      // 할인 후 금액을 먼저 센트 단위로 반올림한 뒤 그 차이를 할인액으로 삼아,
      // 할인1 적용 후 금액에 할인2를 적용하는 중복 할인 시 최종 금액이 기대한 값과 일치하도록 한다.
      const priceAfterDiscount = roundToCents(baseAmount * (1 - percentage / 100));
      return roundToCents(baseAmount - priceAfterDiscount);
    }
    if (info.type === 'amount') {
      const amount = typeof info.value === 'number' ? info.value : Number(info.value);
      return roundToCents(amount);
    }
    // category
    return typeof info.value === 'number' ? info.value : Number(info.value) || 0;
  };

  const handleConfirm = () => {
    // 현재 선택된 항목들에 입력된 할인 값을 로컬 맵에 병합한다.
    // (setState는 비동기라 같은 호출 안에서 itemDiscounts를 다시 읽으면 입력값이 누락된다)
    const effectiveDiscounts1 = new Map(itemDiscounts1);
    const effectiveDiscounts2 = new Map(itemDiscounts2);
    const effectiveRemovals1 = new Set(itemsToRemoveDiscount1);
    const effectiveRemovals2 = new Set(itemsToRemoveDiscount2);

    if (selectedItemIds.size > 0) {
      let pending: { type: DiscountType; value: number; ids: Set<string> } | null = null;
      if (activeTab === 'percentage') {
        const percentage = percentageValue || (customPercentage ? Number(customPercentage) : 0);
        if (percentage > 0) {
          pending = { type: 'percentage', value: percentage, ids: selectedItemIds };
        }
      } else if (activeTab === 'amount') {
        const amount = amountValue ? parseAmount(amountValue) : 0;
        if (amount > 0) {
          const ids = amountInputSelectedItems.size > 0 ? amountInputSelectedItems : selectedItemIds;
          pending = { type: 'amount', value: amount, ids };
        }
      }
      if (pending) {
        const { type, value, ids } = pending;
        const targetDiscounts = activeSlot === 1 ? effectiveDiscounts1 : effectiveDiscounts2;
        const targetRemovals = activeSlot === 1 ? effectiveRemovals1 : effectiveRemovals2;
        ids.forEach((itemId) => {
          targetDiscounts.set(itemId, { type, value });
          targetRemovals.delete(itemId);
        });
      }
    }

    const updates: Array<{
      itemId: string;
      discount: number;
      discountType: DiscountType | null;
      discountValue: number | string | null;
      discountType2: DiscountType | null;
      discountValue2: number | string | null;
    }> = [];

    const touchedItemIds = new Set<string>([
      ...effectiveDiscounts1.keys(),
      ...effectiveDiscounts2.keys(),
      ...effectiveRemovals1,
      ...effectiveRemovals2,
    ]);

    touchedItemIds.forEach((itemId) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const info1 = effectiveRemovals1.has(itemId) ? undefined : effectiveDiscounts1.get(itemId);
      const info2 = effectiveRemovals2.has(itemId) ? undefined : effectiveDiscounts2.get(itemId);

      const baseAmount = item.unitPrice * item.quantity;
      const amount1 = computeAmountForSlot(item, info1, baseAmount);
      const amount2 = computeAmountForSlot(item, info2, baseAmount - amount1);

      updates.push({
        itemId,
        discount: roundToCents(amount1 + amount2),
        discountType: info1 ? info1.type : null,
        discountValue: info1 ? info1.value : null,
        discountType2: info2 ? info2.type : null,
        discountValue2: info2 ? info2.value : null,
      });
    });

    // 변경사항이 없으면 그냥 조용히 닫는다 (팝업으로 재확인을 요구하지 않음)
    if (updates.length === 0) {
      handleCancel();
      return;
    }

    onConfirm(updates);
    // Reset state
    setPercentageValue(null);
    setCustomPercentage('');
    setAmountValue('');
    setSelectedItemIds(new Set());
    setItemsToRemoveDiscount1(new Set());
    setItemsToRemoveDiscount2(new Set());
    setAmountInputSelectedItems(new Set());
    onClose();
  };

  const handleCancel = () => {
    setPercentageValue(null);
    setCustomPercentage('');
    setAmountValue('');
    setSelectedItemIds(new Set());
    setItemsToRemoveDiscount1(new Set());
    setItemsToRemoveDiscount2(new Set());
    setAmountInputSelectedItems(new Set());
    setItemDiscounts1(new Map());
    setItemDiscounts2(new Map());
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
        return formatAudNumber(value);
      }
    }

    // 기존 할인 정보가 있는 경우 (itemDiscounts에 없을 때)
    const discountType = activeSlot === 1 ? item.discountType : item.discountType2;
    const discountValue = activeSlot === 1 ? item.discountValue : item.discountValue2;
    if (discountType === 'percentage' && discountValue !== undefined) {
      return `${discountValue}%`;
    } else if (discountType === 'amount' && discountValue !== undefined) {
      const value = typeof discountValue === 'number' ? discountValue : Number(discountValue);
      return formatAudNumber(value);
    } else if (discountType === 'category' && activeSlot === 1 && item.discount > 0) {
      return formatAudNumber(item.discount);
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

    return activeSlot === 1 ? item.discount > 0 && !!item.discountType : !!item.discountType2;
  };

  // 할인이 적용된 항목인지 확인 (체크박스 비활성화용)
  const hasAppliedDiscount = (item: DiscountItem) => {
    // itemDiscounts에 할인 정보가 있거나 기존 할인이 있는 경우
    const itemDiscount = itemDiscounts.get(item.id);
    if (itemDiscount) {
      return true;
    }

    return activeSlot === 1 ? item.discount > 0 && !!item.discountType : !!item.discountType2;
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
    setAmountValue((prev) => addDigits(prev, num, 1));
  };

  // 금액 할인 빠른 버튼 ($10/$20/$30 등): 즉시 선택된 항목에 적용
  const handleAmountPresetSelect = (amount: number) => {
    const itemsToUpdate = amountInputSelectedItems.size > 0 ? amountInputSelectedItems : selectedItemIds;
    // 선택은 유지해서 다른 금액을 바로 다시 눌러도 즉시 덮어쓸 수 있도록 한다.
    updateItemDiscounts(amount, 'amount', itemsToUpdate, false);
  };

  const handleAmountBackspace = () => {
    setAmountValue((prev) => removeLastDigit(prev, 1));
  };

  const handleSlotChange = (slot: DiscountSlot) => {
    if (slot === activeSlot) return;
    setActiveSlot(slot);
    setPercentageValue(null);
    setCustomPercentage('');
    setAmountValue('');
    setActiveTab('percentage');

    const nextDiscounts = slot === 1 ? itemDiscounts1 : itemDiscounts2;
    const nextRemovals = slot === 1 ? itemsToRemoveDiscount1 : itemsToRemoveDiscount2;
    const defaultSelectable = new Set(
      items
        .filter((item) => {
          if (nextDiscounts.has(item.id) && !nextRemovals.has(item.id)) return false;
          const existingType = slot === 1 ? item.discountType : item.discountType2;
          if (slot === 1 && existingType && item.discount > 0 && !nextRemovals.has(item.id)) return false;
          if (slot === 2 && existingType && !nextRemovals.has(item.id)) return false;
          return true;
        })
        .map((item) => item.id),
    );
    setSelectedItemIds(defaultSelectable);
    setAmountInputSelectedItems(defaultSelectable);
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
      {/* Slot Toggle: 할인 1 / 할인 2 (중복 할인 적용) */}
      <div className="flex gap-2 mb-4">
        {([1, 2] as DiscountSlot[]).map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => handleSlotChange(slot)}
            className={`flex-1 px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
              activeSlot === slot
                ? 'border-black bg-black text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            할인 {slot}
          </button>
        ))}
      </div>

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
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 w-24">할인 {activeSlot}</th>
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
                        // 선택을 해제하면 다음 자릿수 입력(25 → 2 다음 5)이 무시되므로 유지한다
                        updateItemDiscounts(Number(value), 'percentage', undefined, false);
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
                allowDecimal
                className="space-y-2"
                quickAmounts={[10, 20, 30]}
                onQuickAmount={handleAmountPresetSelect}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
