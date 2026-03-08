'use client';

import { useState, useEffect } from 'react';
import { SERVICE_PICKER_CATEGORY_ORDER, getServiceCategoryForPicker } from '@/lib/utils/appointment-utils';
import { useServices } from '@/hooks/useServices';
import { useBookingItems } from '@/hooks/useBookingItems';
import { Button, Modal, Tabs } from '@/components/ui';
import { Z } from '@/lib/constants';

// DB에 한국어로 저장된 카테고리를 영어로 정규화
const CATEGORY_NORMALIZE_MAP: Record<string, string> = {
  '커트': 'Cut',
  '드라이': 'Dry',
  '펌': 'Perm',
  '매직': 'Magic',
  '열펌': 'Hot Perm',
  '핫펌': 'Hot Perm',
  '염색': 'Color',
  '크리닉': 'Clinic',
  '클리닉': 'Clinic',
  '패키지': 'Package',
  '기타': 'Others',
};

function normalizeCategory(cat: string): string {
  return CATEGORY_NORMALIZE_MAP[cat] || cat;
}

export type SelectedBookingItem = {
  id: number;
  name: string;
  durationMinutes: number;
  type: 'service' | 'booking_item';
};

type PickerTab = 'service' | 'booking_item';

interface BookingItemPickerModalProps {
  isOpen: boolean;
  initialTab: PickerTab;
  onClose: () => void;
  onSelect: (items: SelectedBookingItem[]) => void;
}

export default function BookingItemPickerModal({
  isOpen,
  initialTab,
  onClose,
  onSelect,
}: BookingItemPickerModalProps) {
  const [activeTab, setActiveTab] = useState<PickerTab>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'card' | 'cash'>('card');
  const [selectedItems, setSelectedItems] = useState<SelectedBookingItem[]>([]);

  const { services, loading: servicesLoading } = useServices({ enabled: isOpen && activeTab === 'service' });
  const { items: bookingItems, loading: bookingItemsLoading } = useBookingItems({ enabled: isOpen && activeTab === 'booking_item', activeOnly: true });

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedCategory(null);
      setSelectedPaymentType('card');
      setSelectedItems([]);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleItemSelect = (item: SelectedBookingItem) => {
    const isAlreadySelected = selectedItems.some(
      (s) => s.id === item.id && s.type === item.type,
    );
    if (!isAlreadySelected) {
      setSelectedItems((prev) => [...prev, item]);
    }
  };

  const handleRemoveItem = (id: number, type: string) => {
    setSelectedItems((prev) => prev.filter((item) => !(item.id === id && item.type === type)));
  };

  const handleConfirm = () => {
    if (selectedItems.length > 0) {
      onSelect(selectedItems);
    }
    onClose();
  };

  // ─── Service Tab ────────────────────────────────────────────────────────────

  const renderServiceTab = () => {
    const servicesByCategory: Record<string, Array<{ id: number; name: string; price: number; duration_minutes?: number | null }>> = {};

    services.forEach((service) => {
      const category = normalizeCategory(service.category || getServiceCategoryForPicker(service.name));
      if (!servicesByCategory[category]) {
        servicesByCategory[category] = [];
      }
      servicesByCategory[category].push({
        id: service.id,
        name: service.name,
        price: service.price ?? 0,
        duration_minutes: service.duration_minutes,
      });
    });

    const allCategoryKeys = new Set(Object.keys(servicesByCategory));
    const orderedCategoryKeys = [
      ...SERVICE_PICKER_CATEGORY_ORDER.filter((cat) => allCategoryKeys.has(cat)),
      ...Array.from(allCategoryKeys).filter((cat) => !SERVICE_PICKER_CATEGORY_ORDER.includes(cat)),
    ];

    const categories: Array<{ key: string; label: string }> = [];
    orderedCategoryKeys.forEach((cat) => {
      if (servicesByCategory[cat] && servicesByCategory[cat].length > 0) {
        categories.push({ key: cat, label: cat });
      }
    });

    const currentItems = selectedCategory
      ? (servicesByCategory[selectedCategory] || []).filter((service) => {
          const isCard = service.name.toLowerCase().includes('(card)');
          return selectedPaymentType === 'card' ? isCard : !isCard;
        })
      : [];

    return (
      <div className="flex gap-6 h-[500px]">
        {/* Left: Category Selection */}
        <div className="w-64 border-r border-gray-200 pr-5.5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">분류</h3>
          {servicesLoading ? (
            <div className="text-sm text-gray-500">로딩 중...</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[450px]">
              {categories.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setSelectedCategory(category.key)}
                  className={`px-4 py-3 text-sm border rounded-lg text-center transition-colors ${
                    selectedCategory === category.key
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Middle: Item Selection */}
        <div className="flex-1">
          {servicesLoading ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-500">로딩 중...</div>
          ) : selectedCategory ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">{selectedCategory}</h3>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentType('card')}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                      selectedPaymentType === 'card'
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    카드
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentType('cash')}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                      selectedPaymentType === 'cash'
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    현금
                  </button>
                </div>
              </div>
              {currentItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[450px]">
                  {currentItems.map((item) => {
                    const displayName = item.name.replace(/\s*\(card\)\s*/gi, '').replace(/\s*\(cash\)\s*/gi, '').trim();
                    const duration = item.duration_minutes ? ` · ${item.duration_minutes}분` : '';
                    const isSelected = selectedItems.some((s) => s.id === item.id && s.type === 'service');
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          handleItemSelect({
                            id: item.id,
                            name: displayName,
                            durationMinutes: item.duration_minutes || 0,
                            type: 'service',
                          })
                        }
                        className={`px-4 py-3 text-sm border rounded-lg text-left transition-colors ${
                          isSelected
                            ? 'border-black bg-gray-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{displayName}{duration}</div>
                        <div className="text-xs text-gray-500 mt-1">{item.price.toLocaleString()}</div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-500">
                  해당 카테고리에 항목이 없습니다
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-500">
              카테고리를 선택하세요
            </div>
          )}
        </div>

        {/* Right: Selected Items */}
        {renderSelectedPanel()}
      </div>
    );
  };

  // ─── Booking Items Tab ──────────────────────────────────────────────────────

  const renderBookingItemsTab = () => {
    return (
      <div className="flex gap-6 h-[500px]">
        {/* Left: Booking Items List */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">예약 항목</h3>
          {bookingItemsLoading ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-500">로딩 중...</div>
          ) : bookingItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[450px]">
              {bookingItems.map((item) => {
                const totalMinutes = item.duration_hours * 60 + item.duration_minutes;
                const durationLabel = formatDuration(totalMinutes);
                const isSelected = selectedItems.some((s) => s.id === item.id && s.type === 'booking_item');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      handleItemSelect({
                        id: item.id,
                        name: item.name,
                        durationMinutes: totalMinutes,
                        type: 'booking_item',
                      })
                    }
                    className={`px-4 py-3 text-sm border rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{durationLabel}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-500">
              등록된 예약 항목이 없습니다
            </div>
          )}
        </div>

        {/* Right: Selected Items */}
        {renderSelectedPanel()}
      </div>
    );
  };

  // ─── Shared Selected Items Panel ────────────────────────────────────────────

  const renderSelectedPanel = () => (
    <div className="w-64 border-l border-gray-200 pl-5.5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">선택한 항목</h3>
      {selectedItems.length === 0 ? (
        <div className="text-sm text-gray-500">선택한 항목이 없습니다</div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">항목명</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-700">삭제</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.map((item) => (
                <tr key={`${item.type}-${item.id}`} className="border-t border-gray-100">
                  <td className="py-2 px-3">
                    <div className="text-sm text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{formatDuration(item.durationMinutes)}</div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id, item.type)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="예약 항목 선택"
      zIndex={Z.MODAL_PICKER}
      maxWidth="max-w-5xl"
      className="max-h-[90vh] flex flex-col overflow-hidden"
      bodyClassName="flex-1 flex flex-col min-h-0 overflow-hidden p-0"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button onClick={handleConfirm}>확인</Button>
        </div>
      }
    >
      <Tabs
        tabs={[
          { key: 'service', label: '서비스' },
          { key: 'booking_item', label: '예약 항목' },
        ]}
        activeTab={activeTab}
        onTabChange={(key) => {
          setActiveTab(key as PickerTab);
          setSelectedCategory(null);
          setSelectedPaymentType('card');
          // Keep selected items across tab changes
        }}
        className="px-5.5"
      />

      <div className="flex-1 overflow-y-auto p-5.5 min-h-0">
        {activeTab === 'service' && renderServiceTab()}
        {activeTab === 'booking_item' && renderBookingItemsTab()}
      </div>
    </Modal>
  );
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}시간`);
  if (minutes > 0) parts.push(`${minutes}분`);
  return parts.join(' ') || '0분';
}
