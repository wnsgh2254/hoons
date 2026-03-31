'use client';

import { useState, useEffect } from 'react';
import { SERVICE_PICKER_CATEGORY_ORDER, getServiceCategoryForPicker } from '@/lib/utils/appointment-utils';
import { useServices } from '@/hooks/useServices';
import { useInventory } from '@/hooks/useInventory';
import { usePrepaidTemplates } from '@/hooks/usePrepaidTemplates';
import { Button, Input, Modal, Select, Tabs } from '@/components/ui';
import { Z } from '@/lib/constants';
import type { SalesItemType } from '@/lib/types';

// DB에 한국어로 저장된 카테고리를 영어로 정규화 (역매핑)
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

interface SalesItemPickerModalProps {
  isOpen: boolean;
  activeTab: SalesItemType;
  onClose: () => void;
  onSelect: (item: {
    id: number;
    name: string;
    price: number;
    type: SalesItemType;
    manager?: string;
  } | Array<{
    id: number;
    name: string;
    price: number;
    type: SalesItemType;
    manager?: string;
  }>) => void;
  title?: string;
}

type SelectedItem = {
  id: number;
  name: string;
  price: number;
  type: SalesItemType;
  manager?: string;
};

export default function SalesItemPickerModal({
  isOpen,
  activeTab: initialTab,
  onClose,
  onSelect,
  title = '판매 항목 선택',
}: SalesItemPickerModalProps) {
  const [activeTab, setActiveTab] = useState<SalesItemType>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'card' | 'cash'>('card');
  const [selectedManager, setSelectedManager] = useState<string>('태훈원장');
  const { services, loading } = useServices({ enabled: isOpen && activeTab === 'service' });
  const { items: inventoryItems, brands: inventoryBrands, loading: inventoryLoading } = useInventory({ enabled: isOpen && activeTab === 'product' });
  const { templates: prepaidTemplates } = usePrepaidTemplates();
  // 선택한 항목 목록 (서비스/제품 탭에서 사용)
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  // 제품 관련 state
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('전체');
  // 정액권 관련 state
  const [selectedPrepaid, setSelectedPrepaid] = useState<string | null>(null);
  const [customPrice, setCustomPrice] = useState('');
  const [accumulatedAmount, setAccumulatedAmount] = useState('');
  const [validityPeriod, setValidityPeriod] = useState<number | null>(null);
  const [validityUnit, setValidityUnit] = useState<'month' | 'day'>('month');
  const [isUnlimited, setIsUnlimited] = useState(false);

  // activeTab이 변경되면 초기화
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedCategory(null);
      setSelectedPaymentType('card');
      setSelectedPrepaid(null);
      setCustomPrice('');
      setAccumulatedAmount('');
      setValidityPeriod(null);
      setValidityUnit('month');
      setIsUnlimited(false);
      setSelectedItems([]);
      setProductSearchTerm('');
      setSelectedProductCategory('전체');
    }
  }, [isOpen, initialTab]);


  if (!isOpen) return null;

  const handleItemSelect = (item: { id: number; name: string; price: number }) => {
    // 서비스 또는 제품 탭인 경우 선택 목록에 추가 (중복 체크)
    if (activeTab === 'service' || activeTab === 'product') {
      const newItem: SelectedItem = {
        id: item.id,
        name: item.name,
        price: item.price,
        type: activeTab,
        manager: selectedManager,
      };
      // 이미 선택된 항목인지 확인
      const isAlreadySelected = selectedItems.some((selected) => selected.id === item.id);
      if (!isAlreadySelected) {
        setSelectedItems((prev) => [...prev, newItem]);
      }
    } else {
      // 서비스/제품이 아닌 경우 즉시 선택하고 닫기
      onSelect({
        id: item.id,
        name: item.name,
        price: item.price,
        type: activeTab,
        manager: selectedManager,
      });
      // Parent onSelect closes the modal; avoid onClose here (would run before batched state updates).
    }
  };

  const handleRemoveItem = (itemId: number) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleConfirm = () => {
    // 서비스 또는 제품 탭인 경우 선택한 모든 항목을 한 번에 전달 (현재 선택된 담당자로 업데이트)
    if ((activeTab === 'service' || activeTab === 'product') && selectedItems.length > 0) {
      const itemsWithManager = selectedItems.map((item) => ({
        ...item,
        manager: selectedManager,
      }));
      // 모든 항목을 배열로 한 번에 전달 (parent onSelect closes modal)
      onSelect(itemsWithManager);
    } else if (activeTab === 'prepaid' && selectedPrepaid && customPrice) {
      // 정액권 탭인 경우 선택한 정액권 정보를 전달
      const prepaidItem = {
        id: Date.now(), // 임시 ID 생성
        name: selectedPrepaid,
        price: Number(customPrice) || 0,
        type: 'prepaid' as const,
        manager: selectedManager,
      };
      onSelect(prepaidItem);
    } else {
      // 서비스/제품이 아닌 경우는 이미 handleItemSelect에서 처리됨
      onClose();
    }
  };

  const renderServiceTab = () => {
    // 카테고리별로 서비스 그룹화 (DB category 우선, fallback으로 이름 파싱)
    const servicesByCategory: Record<string, Array<{ id: number; name: string; price: number; duration_minutes?: number | null }>> = {};

    services.forEach((service) => {
      const category = normalizeCategory(service.category || getServiceCategoryForPicker(service.name));
      if (!servicesByCategory[category]) {
        servicesByCategory[category] = [];
      }
      servicesByCategory[category].push({ id: service.id, name: service.name, price: service.price ?? 0, duration_minutes: service.duration_minutes });
    });

    // 카테고리 목록 동적 생성 (서비스 데이터에서 추출, 기본 순서 유지 + 새 카테고리 추가)
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
          {loading ? (
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
          {loading ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-500">
              로딩 중...
            </div>
          ) : selectedCategory ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  {selectedCategory}
                </h3>
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
                    const isSelected = selectedItems.some((selected) => selected.id === item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleItemSelect({ id: item.id, name: displayName, price: item.price })}
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
        <div className="w-64 border-l border-gray-200 pl-5.5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {activeTab === 'service' ? '서비스' : activeTab === 'product' ? '제품' : '정액권'}
          </h3>
          {selectedItems.length === 0 ? (
            <div className="text-sm text-gray-500">선택한 항목이 없습니다</div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">선택한 항목</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="py-2 px-3 text-sm text-gray-900">{item.name}</td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
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
      </div>
    );
  };

  const renderProductTab = () => {
    // Show only products marked as retail-sale enabled
    const allProducts = inventoryItems
      .filter((item) => item.for_retail === true)
      .map((item) => ({
      id: item.id,
      category: item.brand || item.category || '기타',
      code: item.sku || String(item.id),
      name: item.name,
      price: item.price,
      stock: item.stock,
      }));

    // 제품 분류 목록 추출 (브랜드 목록 우선 사용)
    const brandNames = inventoryBrands.map((b) => b.name);
    const productCategories = ['전체', ...(brandNames.length > 0
      ? brandNames
      : Array.from(new Set(allProducts.map((p) => p.category))))];

    // 필터링된 제품 목록
    const filteredProducts = allProducts.filter((product) => {
      // 검색어 필터
      const matchesSearch =
        !productSearchTerm ||
        product.code.includes(productSearchTerm) ||
        product.name.includes(productSearchTerm) ||
        product.category.includes(productSearchTerm);

      // 분류 필터
      const matchesCategory = selectedProductCategory === '전체' || product.category === selectedProductCategory;

      return matchesSearch && matchesCategory;
    });

    if (inventoryLoading) {
      return (
        <div className="flex items-center justify-center h-[500px] text-sm text-gray-500">
          로딩 중...
        </div>
      );
    }

    return (
      <div className="flex gap-6 h-[500px]">
        {/* Left: Product List */}
        <div className="flex-1">
          <div className="mb-4">
            <div className="flex gap-2">
              <Input
                placeholder="제품 코드 / 이름 / 바코드"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                wrapperClassName="flex-1"
              />
              <Select
                value={selectedProductCategory}
                onChange={(e) => setSelectedProductCategory(e.target.value)}
                options={productCategories.map((cat) => ({ value: cat, label: cat }))}
                className="w-auto"
              />
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">제품 분류</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">제품코드</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">제품명 / 규격</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">판매가</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">현 재고</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-7.5 text-center text-sm text-gray-500">
                      제품 목록이 없습니다
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const isSelected = selectedItems.some((selected) => selected.id === product.id);
                    return (
                      <tr
                        key={product.id}
                        onClick={() => handleItemSelect({ id: product.id, name: product.name, price: product.price })}
                        className={`border-t border-gray-100 cursor-pointer transition-colors ${
                          isSelected ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="py-3 px-4 text-sm text-gray-900">{product.category}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{product.code}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{product.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{product.price.toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{product.stock}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Selected Items */}
        <div className="w-64 border-l border-gray-200 pl-5.5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">제품</h3>
          {selectedItems.length === 0 ? (
            <div className="text-sm text-gray-500">선택한 항목이 없습니다</div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">선택한 항목</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="py-2 px-3 text-sm text-gray-900">{item.name}</td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
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
      </div>
    );
  };

  const renderPrepaidTab = () => {
    // 서비스 및 제품 설정 페이지에서 관리하는 정액권 템플릿 사용
    const activeTemplates = prepaidTemplates.filter((t) => t.isActive);
    const prepaidOptions = [
      ...activeTemplates.map((t) => ({ key: t.name, label: t.name, salePrice: t.salePrice, accumulatedAmount: t.accumulationAmount })),
      { key: '맞춤 정액권', label: '맞춤 정액권', salePrice: 0, accumulatedAmount: 0 },
    ];

    return (
      <div className="flex gap-6 h-[500px]">
        {/* Left: Prepaid List */}
        <div className="w-64 border-r border-gray-200 pr-5.5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">정액권 목록</h3>
          <div className="space-y-2">
            {prepaidOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setSelectedPrepaid(option.key);
                  if (option.key !== '맞춤 정액권') {
                    setCustomPrice(option.salePrice.toString());
                    setAccumulatedAmount(option.accumulatedAmount.toString());
                  } else {
                    setCustomPrice('');
                    setAccumulatedAmount('');
                  }
                }}
                className={`w-full px-4 py-3 text-sm border rounded-lg text-center transition-colors ${
                  selectedPrepaid === option.key
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Prepaid Info */}
        <div className="flex-1">
          {selectedPrepaid ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">{selectedPrepaid}</h3>
              <Input
                label="판매가"
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
              />
              <Input
                label="적립 금액"
                type="number"
                value={accumulatedAmount}
                onChange={(e) => setAccumulatedAmount(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">유효기간</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={validityPeriod || ''}
                    onChange={(e) => setValidityPeriod(e.target.value ? Number(e.target.value) : null)}
                    disabled={isUnlimited}
                    wrapperClassName="flex-1"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setValidityUnit('month')}
                      className={`px-3 py-2 text-sm border rounded-lg ${
                        validityUnit === 'month'
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      월
                    </button>
                    <button
                      type="button"
                      onClick={() => setValidityUnit('day')}
                      className={`px-3 py-2 text-sm border rounded-lg ${
                        validityUnit === 'day'
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      일
                    </button>
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={isUnlimited}
                    onChange={(e) => setIsUnlimited(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-xs text-gray-700">무제한</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-500">
              정액권을 선택하세요
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      zIndex={Z.MODAL_SALES_SUB}
      maxWidth="max-w-5xl"
      className="max-h-[90vh] flex flex-col overflow-hidden"
      bodyClassName="flex-1 flex flex-col min-h-0 overflow-hidden p-0"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">담당자 선택</label>
            <Select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              options={[
                { value: '태훈원장', label: '태훈원장' },
                { value: 'winter 선생님', label: 'winter 선생님' },
                { value: '여정선생님', label: '여정선생님' },
              ]}
              className="w-auto"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="md" onClick={onClose}>
              취소
            </Button>
            <Button size="md" onClick={handleConfirm}>
              확인
            </Button>
          </div>
        </div>
      }
    >
      {/* Tabs */}
      <Tabs
          tabs={[
            { key: 'service', label: '서비스' },
            { key: 'product', label: '제품' },
            { key: 'prepaid', label: '정액권' },
          ]}
          activeTab={activeTab}
          onTabChange={(key) => {
            setActiveTab(key as SalesItemType);
            setSelectedCategory(null);
            setSelectedPaymentType('card');
            setSelectedPrepaid(null);
            setCustomPrice('');
            setAccumulatedAmount('');
            setValidityPeriod(null);
            setValidityUnit('month');
            setIsUnlimited(false);
            setSelectedItems([]);
            setProductSearchTerm('');
            setSelectedProductCategory('전체');
          }}
          className="px-5.5"
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5.5 min-h-0">
          {activeTab === 'service' && renderServiceTab()}
          {activeTab === 'product' && renderProductTab()}
          {activeTab === 'prepaid' && renderPrepaidTab()}
        </div>

    </Modal>
  );
}
