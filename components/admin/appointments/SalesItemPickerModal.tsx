'use client';

import { useState, useEffect } from 'react';
import { SERVICE_PICKER_CATEGORY_ORDER, getServiceCategoryForPicker } from '@/lib/utils/appointment-utils';

type SalesItemType = 'service' | 'product' | 'prepaid';

// 카테고리 이름 한국어 매핑
const CATEGORY_NAME_MAP: Record<string, string> = {
  'Cut': '커트',
  'Dry': '드라이',
  'Perm': '펌',
  'Magic': '매직',
  'Hot Perm': '열펌',
  'Color': '염색',
  'Clinic': '크리닉',
  'Package': '패키지',
  'Others': '기타',
};

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
}: SalesItemPickerModalProps) {
  const [activeTab, setActiveTab] = useState<SalesItemType>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedManager, setSelectedManager] = useState<string>('태훈원장');
  const [services, setServices] = useState<Array<{ id: number; name: string; price: number; duration_minutes?: number | null }>>([]);
  const [loading, setLoading] = useState(false);
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

  // 서비스 데이터 로드
  useEffect(() => {
    if (isOpen && activeTab === 'service') {
      setLoading(true);
      setSelectedCategory(null);
      fetch('/api/services')
        .then((res) => res.json())
        .then((data) => {
          if (data.services) {
            setServices(data.services || []);
          }
        })
        .catch((error) => {
          console.error('Error fetching services:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setServices([]);
    }
  }, [isOpen, activeTab]);

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
      onClose();
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
      // 모든 항목을 배열로 한 번에 전달
      onSelect(itemsWithManager);
      // 모든 항목을 추가한 후 모달 닫기
      onClose();
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
      onClose();
    } else {
      // 서비스/제품이 아닌 경우는 이미 handleItemSelect에서 처리됨
      onClose();
    }
  };

  const renderServiceTab = () => {
    // 카테고리별로 서비스 그룹화
    const servicesByCategory: Record<string, Array<{ id: number; name: string; price: number; duration_minutes?: number | null }>> = {};
    
    services.forEach((service) => {
      const category = getServiceCategoryForPicker(service.name);
      if (!servicesByCategory[category]) {
        servicesByCategory[category] = [];
      }
      servicesByCategory[category].push(service);
    });

    // 카테고리 목록 생성 (카드 버전 포함)
    const categories: Array<{ key: string; label: string }> = [];
    SERVICE_PICKER_CATEGORY_ORDER.forEach((cat) => {
      if (servicesByCategory[cat] && servicesByCategory[cat].length > 0) {
        const koreanName = CATEGORY_NAME_MAP[cat] || cat;
        categories.push({ key: cat, label: koreanName });
        // 카드 버전도 추가 (카드 서비스가 있는 경우)
        const cardServices = services.filter((s) => 
          getServiceCategoryForPicker(s.name) === cat && s.name.toLowerCase().includes('(card)')
        );
        if (cardServices.length > 0) {
          categories.push({ key: `${cat}(카드)`, label: `${koreanName}(카드)` });
        }
      }
    });

    const currentCategoryKey = selectedCategory?.replace('(카드)', '') || '';
    const isCardCategory = selectedCategory?.includes('(카드)') || false;
    const currentItems = selectedCategory
      ? (servicesByCategory[currentCategoryKey] || []).filter((service) => {
          const hasCard = service.name.toLowerCase().includes('(card)');
          return isCardCategory ? hasCard : !hasCard;
        })
      : [];

    return (
      <div className="flex gap-6 h-[500px]">
        {/* Left: Category Selection */}
        <div className="w-64 border-r border-gray-200 pr-6">
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
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                {CATEGORY_NAME_MAP[currentCategoryKey] || currentCategoryKey}
              </h3>
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
        <div className="w-64 border-l border-gray-200 pl-6">
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
    // 더미 제품 데이터 (실제로는 API에서 가져와야 함)
    const allProducts = [
      { id: 8, category: '키마', code: '8', name: 'IV무코타트리트먼트', price: 7000, stock: 7 },
      { id: 7, category: '키마', code: '7', name: 'IV무코타샴푸', price: 8000, stock: 8 },
      { id: 6, category: '키마', code: '6', name: '스프레이', price: 3000, stock: 8 },
      { id: 5, category: '키마', code: '5', name: '테라코타 에센스', price: 6000, stock: 0 },
      { id: 4, category: '키마', code: '4', name: '왁스', price: 4500, stock: 6 },
      { id: 37, category: '아윤채', code: '37', name: '아윤채 왁스', price: 5000, stock: 9 },
      { id: 364, category: '아윤채', code: '364', name: '에어리베일 리브인 폼', price: 5500, stock: 9 },
      { id: 363, category: '시세이도', code: '363', name: '컬러 샴푸 바이올렛', price: 0, stock: 9 },
      { id: 362, category: '시세이도', code: '362', name: '컬러 샴푸 블루', price: 0, stock: 9 },
      { id: 36, category: '아윤채', code: '36', name: '아윤채스프레이 300ml', price: 3500, stock: 7 },
    ];

    // 제품 분류 목록 추출
    const productCategories = ['전체', ...Array.from(new Set(allProducts.map((p) => p.category)))];

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

    return (
      <div className="flex gap-6 h-[500px]">
        {/* Left: Product List */}
        <div className="flex-1">
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="제품 코드 / 이름 / 바코드"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <span className="material-symbols-outlined text-lg">search</span>
              </button>
              <select
                value={selectedProductCategory}
                onChange={(e) => setSelectedProductCategory(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              >
                {productCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
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
                    <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
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
        <div className="w-64 border-l border-gray-200 pl-6">
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
    // 500불, 1000불 정액권 기본 정보
    const prepaidInfo: Record<string, { salesPrice: number; accumulatedAmount: number }> = {
      '500불': { salesPrice: 50000, accumulatedAmount: 60000 },
      '1000불': { salesPrice: 100000, accumulatedAmount: 130000 },
    };

    return (
      <div className="flex gap-6 h-[500px]">
        {/* Left: Prepaid List */}
        <div className="w-64 border-r border-gray-200 pr-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">정액권 목록</h3>
          <div className="space-y-2">
            {['500불', '1000불', '맞춤 정액권'].map((prepaid) => (
              <button
                key={prepaid}
                type="button"
                onClick={() => {
                  setSelectedPrepaid(prepaid);
                  if (prepaid === '500불' || prepaid === '1000불') {
                    const info = prepaidInfo[prepaid];
                    setCustomPrice(info.salesPrice.toString());
                    setAccumulatedAmount(info.accumulatedAmount.toString());
                  } else {
                    setCustomPrice('');
                    setAccumulatedAmount('');
                  }
                }}
                className={`w-full px-4 py-3 text-sm border rounded-lg text-center transition-colors ${
                  selectedPrepaid === prepaid
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                }`}
              >
                {prepaid}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Prepaid Info */}
        <div className="flex-1">
          {selectedPrepaid ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">{selectedPrepaid}</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">판매가</label>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">적립 금액</label>
                <input
                  type="number"
                  value={accumulatedAmount}
                  onChange={(e) => setAccumulatedAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">유효기간</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={validityPeriod || ''}
                    onChange={(e) => setValidityPeriod(e.target.value ? Number(e.target.value) : null)}
                    disabled={isUnlimited}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100"
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
    <div
      className="fixed inset-0 z-[100005] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">판매 항목 선택</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-2 px-6">
            {(['service', 'product', 'prepaid'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedCategory(null);
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
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'service' && '서비스'}
                {tab === 'product' && '제품'}
                {tab === 'prepaid' && '정액권'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'service' && renderServiceTab()}
          {activeTab === 'product' && renderProductTab()}
          {activeTab === 'prepaid' && renderPrepaidTab()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">담당자 선택</label>
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent bg-white"
            >
              <option>태훈원장</option>
              <option>winter 선생님</option>
              <option>여정선생님</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-lg text-xs md:text-sm font-semibold text-white bg-black hover:bg-gray-800"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
