'use client';

import { useState, useEffect, useCallback } from 'react';
import { invalidateServicesCache } from '@/hooks/useServices';
import { useInventory, invalidateInventoryCache } from '@/hooks/useInventory';
import { usePrepaidTemplates } from '@/hooks/usePrepaidTemplates';
import type { PrepaidPassTemplate } from '@/hooks/usePrepaidTemplates';
import type { InventoryItem, InventoryBrand, InventoryProductCategory } from '@/hooks/useInventory';
import {
  AdminPageLayout,
  PageHeader,
  Tabs,
  DataTable,
  Modal,
  Input,
  Select,
  Button,
  Badge,
  Toggle,
  FormAlert,
} from '@/components/ui';
import { Z } from '@/lib/constants';
import { useHoonsDemo } from '@/lib/hoons-booking-demo';
import { fetchHoonsServicePreview } from '@/lib/hoons-service-preview';
import {
  resolveInitialProductBrand,
  resolveInitialProductCategory,
  resolveInventoryBrand,
  resolveInventoryProductCategory,
} from '@/lib/inventory-product-fields';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServiceItem {
  id: number;
  name: string;
  price: number;
  duration_minutes: number;
  description?: string | null;
  is_active: boolean;
  shop_id: number | null;
  category: string | null;
  visible_to: 'customer' | 'admin' | 'both';
  created_at: string;
}

// PrepaidPassTemplate, InventoryItem, InventoryBrand are imported from hooks

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_TABS = [
  { key: 'services', label: '서비스' },
  { key: 'designerServices', label: '직원별 서비스' },
  { key: 'prepaid', label: '정액권' },
  { key: 'products', label: '제품' },
  { key: 'productCategories', label: '제품분류' },
  { key: 'productInventoryCategories', label: '제품카테고리' },
];

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, m) => m).map((m) => ({
  value: m,
  label: String(m).padStart(2, '0'),
}));

const ITEMS_PER_PAGE = 10;

// ─── Service Category Helpers ───────────────────────────────────────────────

const CATEGORY_ORDER = ['Cut', 'Dry', 'Perm', 'Magic', 'Hot Perm', 'Color', 'Clinic', 'Package', 'Others'];

function getServiceCategory(name: string): string {
  const cleanName = name.replace(/\s*\(card\)\s*/gi, '').replace(/\s*\(cash\)\s*/gi, '').trim();
  const lowerName = cleanName.toLowerCase();

  if (lowerName.includes('- perm') && !lowerName.includes('hot perm') && !lowerName.includes('magic')) return 'Perm';
  if (lowerName.includes('- magic')) return 'Magic';
  if (lowerName.includes('- hot perm')) return 'Hot Perm';
  if (lowerName.includes('- color')) return 'Color';
  if (lowerName.includes('- clinic')) return 'Clinic';
  if (lowerName.includes('- package')) return 'Package';

  if (lowerName.includes('package') || (lowerName.includes('design addition') && !lowerName.includes('-'))) return 'Package';
  if (lowerName.includes('mucota') || lowerName.includes('ahyunchae') || lowerName.includes('keratin') || lowerName.includes('scalp') || lowerName.includes('sleek') || lowerName.includes('clinic')) return 'Clinic';
  if (lowerName.includes('color') || lowerName.includes('bleach') || lowerName.includes('toning')) return 'Color';
  if (lowerName.includes('special perm') || lowerName.includes('setting perm') || lowerName.includes('design setting perm')) return 'Hot Perm';
  if (lowerName.includes('magic') || lowerName.includes('iron perm') || lowerName.includes('iron root')) return 'Magic';
  if (lowerName.includes('perm') && !lowerName.includes('magic') && !lowerName.includes('special') && !lowerName.includes('setting')) return 'Perm';
  if (lowerName.includes('styling') || lowerName.includes('shampoo') || lowerName.includes('dry')) return 'Dry';

  if (lowerName.includes('cut') ||
      (lowerName.includes('length addition') && !lowerName.includes('-')) ||
      lowerName.includes('hair extension') ||
      (lowerName.includes('director level') && !lowerName.includes('-')) ||
      (lowerName.includes('manager level') && !lowerName.includes('-')) ||
      lowerName.includes('kids cut') ||
      lowerName.includes('bangs cut')) {
    return 'Cut';
  }

  return 'Others';
}

function getServiceDisplayName(name: string): string {
  return name.replace(/\s*\(card\)\s*/gi, '').replace(/\s*\(cash\)\s*/gi, '').trim();
}

function isCardService(name: string): boolean {
  return name.toLowerCase().includes('(card)');
}

function isCashService(name: string): boolean {
  return name.toLowerCase().includes('(cash)');
}

function resolveCategory(service: ServiceItem): string {
  const cat = service.category || getServiceCategory(service.name);
  return cat === 'Other' ? 'Others' : cat;
}

// Mock data removed - now using real API via useInventory and usePrepaidTemplates hooks

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} 시간`);
  if (m > 0) parts.push(`${m} 분`);
  return parts.join(' ') || '0 분';
}

// ─── ServiceCategoryModal ────────────────────────────────────────────────────

function ServiceCategoryModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initial,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string }) => void;
  onDelete?: () => void;
  initial?: { name: string };
  title: string;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError('분류명을 입력해주세요.');
      return;
    }
    onSave({ name: name.trim() });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      zIndex={Z.MODAL_PRIMARY}
      footer={
        <>
          <Button onClick={handleSave} className="flex-1">저장</Button>
          {onDelete && <Button variant="danger" onClick={onDelete} className="flex-1">삭제</Button>}
          <Button variant="outline" onClick={onClose} className="flex-1">취소</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <FormAlert message={error} variant="error" />}
        <Input label="분류명" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
    </Modal>
  );
}

// ─── ServiceItemModal ────────────────────────────────────────────────────────

function ServiceItemModal({
  isOpen,
  onClose,
  onSaved,
  onDelete,
  initial,
  title,
  defaultCategory,
  categoryOptions,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onDelete?: () => void;
  initial?: ServiceItem;
  title: string;
  defaultCategory: string;
  categoryOptions?: string[];
}) {
  // Parse initial values
  const initialDisplayName = initial ? getServiceDisplayName(initial.name) : '';
  const initialType: 'card' | 'cash' = initial && isCashService(initial.name) ? 'cash' : 'card';

  const [category, setCategory] = useState(initial ? resolveCategory(initial) : defaultCategory);
  const [name, setName] = useState(initialDisplayName);
  const [serviceType, setServiceType] = useState<'card' | 'cash'>(initialType);
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [durationHours, setDurationHours] = useState(initial ? Math.floor(initial.duration_minutes / 60) : 0);
  const [durationMins, setDurationMins] = useState(initial ? initial.duration_minutes % 60 : 0);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('서비스명을 입력해주세요.');
      return;
    }
    setLoading(true);
    setError(null);

    const serviceName = `${name.trim()} (${serviceType})`;
    const visibleTo = serviceType === 'card' ? 'both' : 'admin';
    const durationMinutes = durationHours * 60 + durationMins;

    try {
      if (initial) {
        // Update
        const res = await fetchHoonsServicePreview(`/api/services/${initial.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: serviceName,
            price,
            duration_minutes: durationMinutes,
            is_active: isActive,
            visible_to: visibleTo,
            category,
            description: description.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '서비스 수정에 실패했습니다.');
      } else {
        // Create
        const res = await fetchHoonsServicePreview('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: serviceName,
            price,
            duration_minutes: durationMinutes,
            shop_id: null,
            is_active: isActive,
            category,
            visible_to: visibleTo,
            description: description.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '서비스 생성에 실패했습니다.');
      }
      invalidateServicesCache();
      await onSaved();
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      zIndex={Z.MODAL_PRIMARY}
      scrollable
      footer={
        <>
          <Button onClick={handleSave} loading={loading} className="flex-1">
            {loading ? '저장 중...' : '저장'}
          </Button>
          {onDelete && <Button variant="danger" onClick={onDelete} className="flex-1">삭제</Button>}
          <Button variant="outline" onClick={onClose} className="flex-1">취소</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <FormAlert message={error} variant="error" />}
        <Select
          label="분류"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={(categoryOptions || CATEGORY_ORDER).map((c) => ({ value: c, label: c }))}
          required
        />
        <Input label="서비스명" value={name} onChange={(e) => setName(e.target.value)} required />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">시술 유형</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="serviceType"
                value="card"
                checked={serviceType === 'card'}
                onChange={() => setServiceType('card')}
                className="w-4 h-4 text-black border-gray-300 focus:ring-black"
              />
              <span className="text-sm">카드</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="serviceType"
                value="cash"
                checked={serviceType === 'cash'}
                onChange={() => setServiceType('cash')}
                className="w-4 h-4 text-black border-gray-300 focus:ring-black"
              />
              <span className="text-sm">현금</span>
            </label>
          </div>
        </div>
        <Input label="금액 (AUD)" type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(Number(e.target.value))} required />
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">소요시간 <span className="text-red-500">*</span></p>
          <div className="flex items-center gap-2">
            <Input type="number" min={0} max={23} value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} wrapperClassName="w-20" />
            <span className="text-sm text-gray-600">시간</span>
            <Select value={durationMins} onChange={(e) => setDurationMins(Number(e.target.value))} options={MINUTE_OPTIONS} wrapperClassName="w-24" />
            <span className="text-sm text-gray-600">분</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            설명 (고객 예약 페이지, 선택)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="짧은 시술 설명"
          />
        </div>
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">상태</p>
          <Toggle checked={isActive} onChange={setIsActive} label="사용" />
        </div>
      </div>
    </Modal>
  );
}

// ─── Tab 1: 서비스 ────────────────────────────────────────────────────────────

function ServicesTab() {
  const { catalog } = useHoonsDemo();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(CATEGORY_ORDER);
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORY_ORDER[0]);
  const [showInactiveServices, setShowInactiveServices] = useState(false);

  // Category CRUD
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);

  // Service CRUD
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  // Fetch both services and category order from DB in one pass
  const fetchServices = useCallback(async (): Promise<string[]> => {
    let nextCategoryNames: string[] = [];
    try {
      setLoading(true);
      setFetchError(null);
      const [servicesRes, categoriesRes] = await Promise.all([
        fetchHoonsServicePreview('/api/services'),
        fetchHoonsServicePreview('/api/services/categories'),
      ]);
      const servicesData = await servicesRes.json();
      const categoriesData = await categoriesRes.json();

      if (!servicesRes.ok) throw new Error(servicesData.error || '서비스 목록을 불러오지 못했습니다.');
      const servicesList = servicesData.services || [];
      setServices(servicesList);

      const serviceCategories = new Set<string>(servicesList.map((s: ServiceItem) => resolveCategory(s)));

      // Load DB-persisted category order; fall back to CATEGORY_ORDER if DB list is empty
      if (categoriesRes.ok && Array.isArray(categoriesData.categories)) {
        const dbNames = (categoriesData.categories as Array<{ name: string }>).map((c) => c.name);
        const base = dbNames.length > 0 ? dbNames : [...CATEGORY_ORDER];
        const extra = Array.from(serviceCategories).filter((c) => !base.includes(c));
        nextCategoryNames = [...base, ...extra];
        setCategories(nextCategoryNames);
      }
    } catch (err: any) {
      setFetchError(err.message);
      setServices([]);
    } finally {
      setLoading(false);
    }
    return nextCategoryNames;
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices, catalog]);

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    const cat = resolveCategory(service);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {} as Record<string, ServiceItem[]>);

  // Category list with counts (include custom categories even if not in CATEGORY_ORDER)
  const categoryList = categories.map((cat) => ({
    name: cat,
    count: (servicesByCategory[cat] || []).length,
  }));

  // Filtered services for selected category — sort by DB sort_order first, then fall back to card/name
  const categoryServices = servicesByCategory[selectedCategory] || [];
  const filteredServices = (showInactiveServices ? categoryServices : categoryServices.filter((s) => s.is_active))
    .sort((a, b) => {
      const aOrder = (a as any).sort_order ?? 0;
      const bOrder = (b as any).sort_order ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      // Secondary: card before cash, then alphabetical
      const aIsCard = isCardService(a.name);
      const bIsCard = isCardService(b.name);
      if (aIsCard && !bIsCard) return -1;
      if (!aIsCard && bIsCard) return 1;
      return a.name.localeCompare(b.name);
    });

  // Category handlers
  const handleAddCategory = async (data: { name: string }) => {
    if (categories.includes(data.name)) return;
    try {
      const response = await fetchHoonsServicePreview('/api/services/categories', {
        method: 'PATCH',
        body: JSON.stringify({ items: [...categories, data.name].map((name) => ({ name })) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await fetchServices();
      setSelectedCategory(data.name);
      setIsAddingCategory(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : '분류를 추가하지 못했습니다.');
    }
  };
  const handleUpdateCategory = async (data: { name: string }) => {
    if (!editingCategoryName) return;
    const oldName = editingCategoryName;
    const newName = data.name.trim();
    if (!newName) return;
    if (oldName === newName) {
      setEditingCategoryName(null);
      return;
    }
    try {
      const res = await fetchHoonsServicePreview('/api/services/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ renameFrom: oldName, renameTo: newName }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || '분류명 변경에 실패했습니다.');
      invalidateServicesCache();
      await fetchServices();
      if (selectedCategory === oldName) setSelectedCategory(newName);
      setEditingCategoryName(null);
    } catch (err: any) {
      alert(err.message || '분류명 변경에 실패했습니다.');
    }
  };
  const handleDeleteCategory = async () => {
    if (!editingCategoryName) return;
    if (!confirm(`분류 "${editingCategoryName}"을(를) 삭제할까요? 해당 분류의 서비스는 "Others"로 옮겨집니다.`)) return;
    const name = editingCategoryName;
    try {
      const res = await fetchHoonsServicePreview(`/api/services/categories?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || '분류 삭제에 실패했습니다.');
      invalidateServicesCache();
      const namesAfter = await fetchServices();
      if (selectedCategory === name) {
        const remaining = namesAfter.filter((c) => c !== name);
        setSelectedCategory(remaining[0] || '');
      }
      setEditingCategoryName(null);
    } catch (err: any) {
      alert(err.message || '분류 삭제에 실패했습니다.');
    }
  };

  // Service delete
  const handleDeleteService = async () => {
    if (!editingService) return;
    if (!confirm('이 서비스를 삭제하시겠습니까?')) return;
    try {
      const res = await fetchHoonsServicePreview(`/api/services/${editingService.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '서비스 삭제에 실패했습니다.');
      invalidateServicesCache();
      await fetchServices();
      setEditingService(null);
    } catch (err: any) {
      alert(err.message || '서비스 삭제에 실패했습니다.');
    }
  };

  const categoryColumns = [
    {
      key: 'name',
      header: '서비스 분류',
      align: 'left' as const,
      render: (item: { name: string; count: number }) => (
        <div className="flex items-center justify-between">
          <span className={selectedCategory === item.name ? 'font-bold text-black' : ''}>{item.name}</span>
          <span className="text-xs text-gray-400">{item.count}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'center' as const,
      render: (item: { name: string; count: number }) => (
        <Button variant="outline" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEditingCategoryName(item.name); }}>수정</Button>
      ),
    },
  ];

  const serviceColumns = [
    {
      key: 'name',
      header: '서비스',
      render: (item: ServiceItem) => {
        const displayName = getServiceDisplayName(item.name);
        const card = isCardService(item.name);
        const cash = isCashService(item.name);
        return (
          <div className="flex items-center gap-2">
            <span className={!item.is_active ? 'text-gray-400' : 'text-sm font-medium text-black'}>{displayName}</span>
            {card && <Badge variant="info">카드</Badge>}
            {cash && <Badge variant="success">현금</Badge>}
          </div>
        );
      },
    },
    {
      key: 'price',
      header: '금액 (AUD)',
      align: 'center' as const,
      render: (item: ServiceItem) => formatPrice(item.price),
    },
    {
      key: 'duration',
      header: '소요시간',
      align: 'center' as const,
      render: (item: ServiceItem) => formatDuration(item.duration_minutes),
    },
    {
      key: 'actions',
      header: '수정',
      align: 'center' as const,
      render: (item: ServiceItem) => (
        <Button variant="outline" size="sm" onClick={() => setEditingService(item)}>수정</Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="text-center py-11.5">
        <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin" />
        <p className="text-gray-500 text-sm mt-4">서비스 불러오는 중...</p>
      </div>
    );
  }

  if (fetchError) {
    return <FormAlert message={fetchError} variant="error" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Left panel: Categories */}
        <div className="w-full sm:w-1/3">
          <div className="px-2 pb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-black">서비스 분류</h3>
            <Button icon="add" size="sm" onClick={() => setIsAddingCategory(true)}>분류 등록</Button>
          </div>
          <DataTable
            columns={categoryColumns}
            data={categoryList}
            keyExtractor={(c) => c.name}
            onRowClick={(c) => setSelectedCategory(c.name)}
            emptyMessage="등록된 분류가 없습니다."
            draggable
            onReorder={async (reordered) => {
              const names = reordered.map((c) => c.name);
              const prev = [...categories];
              setCategories(names);
              try {
                const res = await fetchHoonsServicePreview('/api/services/categories', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    items: names.map((name, i) => ({ name, sort_order: i + 1 })),
                  }),
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(body.error || '분류 순서 저장에 실패했습니다.');
                invalidateServicesCache();
                await fetchServices();
              } catch (err: any) {
                setCategories(prev);
                alert(err.message || '분류 순서 저장에 실패했습니다.');
              }
            }}
          />
        </div>

        {/* Right panel: Services */}
        <div className="w-full sm:w-2/3">
          <div className="px-2 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-black">&gt; {selectedCategory}</h3>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showInactiveServices} onChange={(e) => setShowInactiveServices(e.target.checked)} className="rounded border-gray-300" />
                <span className="text-xs text-gray-600">미사용보기</span>
              </label>
            </div>
            <Button icon="add" size="sm" onClick={() => setIsAddingService(true)}>서비스 등록</Button>
          </div>
          <DataTable
            columns={serviceColumns}
            data={filteredServices}
            keyExtractor={(s) => s.id}
            emptyMessage="등록된 서비스가 없습니다."
            draggable
            onReorder={async (reordered) => {
              const prev = services.map((s) => ({ ...s }));
              setServices((prior) => {
                const updated = [...prior];
                reordered.forEach((item, i) => {
                  const idx = updated.findIndex((s) => s.id === item.id);
                  if (idx !== -1) (updated[idx] as ServiceItem & { sort_order?: number }).sort_order = i + 1;
                });
                return updated;
              });
              try {
                const res = await fetchHoonsServicePreview('/api/services/reorder', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    items: reordered.map((s, i) => ({ id: s.id, sort_order: i + 1 })),
                  }),
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(body.error || '서비스 순서 저장에 실패했습니다.');
                invalidateServicesCache();
                await fetchServices();
              } catch (err: any) {
                setServices(prev);
                alert(err.message || '서비스 순서 저장에 실패했습니다.');
              }
            }}
          />
        </div>
      </div>

      <p className="text-sm text-red-500">* 순서를 변경하려면 항목을 드래그 하세요.</p>

      {/* Category modals */}
      {isAddingCategory && (
        <ServiceCategoryModal isOpen onClose={() => setIsAddingCategory(false)} onSave={handleAddCategory} title="분류 등록" />
      )}
      {editingCategoryName && (
        <ServiceCategoryModal isOpen onClose={() => setEditingCategoryName(null)} onSave={handleUpdateCategory} onDelete={handleDeleteCategory} initial={{ name: editingCategoryName }} title="분류 수정" />
      )}

      {/* Service modals */}
      {isAddingService && (
        <ServiceItemModal
          isOpen
          onClose={() => setIsAddingService(false)}
          onSaved={async () => { await fetchServices(); setIsAddingService(false); }}
          title="서비스 등록"
          defaultCategory={selectedCategory}
          categoryOptions={categories}
        />
      )}
      {editingService && (
        <ServiceItemModal
          isOpen
          onClose={() => setEditingService(null)}
          onSaved={async () => { await fetchServices(); setEditingService(null); }}
          onDelete={handleDeleteService}
          initial={editingService}
          title="서비스 수정"
          defaultCategory={selectedCategory}
          categoryOptions={categories}
        />
      )}
    </div>
  );
}

// ─── Tab 2: 직원별 서비스 ──────────────────────────────────────────────────────

interface DesignerServiceRow {
  id: number;
  designer_id: number;
  service_id: number;
  price: number;
  duration_minutes: number | null;
  is_active: boolean;
  notes: string | null;
  services: { id: number; name: string; category: string | null; description: string | null } | null;
}

interface StaffMember {
  id: number;
  name: string;
  english_name: string | null;
  role: string;
  is_active: boolean;
}

const CUSTOM_CATEGORY_VALUE = '__custom__';

// Comment: Derive a normalized category label from a designer_service row
// Returns the actual service name for custom entries (category === 'Custom')
function getRowCategoryLabel(row: DesignerServiceRow): string {
  const cat = row.services?.category ?? '';
  if (cat === 'Custom') {
    // Comment: Custom entries display their actual service name
    return row.services?.name
      ? row.services.name.replace(/\s*\(card\)\s*/gi, '').replace(/\s*\(cash\)\s*/gi, '').trim()
      : '직접 입력';
  }
  if (cat) return cat === 'Other' ? 'Others' : cat;
  if (row.services?.name) {
    const derived = getServiceCategory(row.services.name);
    return derived === 'Other' ? 'Others' : derived;
  }
  return '-';
}

// Comment: Returns true if the row is a custom (직접 입력) entry
function isCustomRow(row: DesignerServiceRow): boolean {
  return row.services?.category === 'Custom';
}

function DesignerServiceModal({
  isOpen,
  onClose,
  onSaved,
  onDelete,
  initial,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: () => void;
  initial?: DesignerServiceRow;
  title: string;
}) {
  // Comment: Use string so the field starts empty (placeholder "0") instead of pre-filled 0
  const [price, setPrice] = useState<string>(initial?.price ? String(initial.price) : '');
  const [durationHours, setDurationHours] = useState<number>(
    initial?.duration_minutes != null ? Math.floor(initial.duration_minutes / 60) : 0
  );
  const [durationMins, setDurationMins] = useState<number>(
    initial?.duration_minutes != null ? initial.duration_minutes % 60 : 0
  );
  const [isActive, setIsActive] = useState<boolean>(initial?.is_active ?? true);
  const [notes, setNotes] = useState<string>(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const categoryLabel = initial ? getRowCategoryLabel(initial) : '';
  const isCustom = initial ? isCustomRow(initial) : false;
  const [customName, setCustomName] = useState<string>(isCustom ? categoryLabel : '');

  const handleSave = async () => {
    const priceNum = Number(price);
    if (!price || priceNum <= 0) { setError('금액을 입력해주세요.'); return; }
    const durationTotal = durationHours * 60 + durationMins;
    if (durationTotal <= 0) { setError('소요시간을 입력해주세요.'); return; }
    setLoading(true);
    setError(null);
    try {
      if (initial) {
        // Comment: For custom entries, also update the service name if changed
        if (isCustom && customName.trim() && customName.trim() !== categoryLabel) {
          await fetchHoonsServicePreview(`/api/services/${initial.service_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: customName.trim() }),
          });
        }
        const res = await fetchHoonsServicePreview('/api/designer-services', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: initial.id, price: priceNum, duration_minutes: durationTotal, is_active: isActive, notes: notes.trim() || null }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || '수정 실패'); }
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} zIndex={Z.MODAL_PICKER} scrollable
      footer={
        <>
          <Button onClick={handleSave} loading={loading} className="flex-1">저장</Button>
          {onDelete && <Button variant="danger" onClick={onDelete} className="flex-1">삭제</Button>}
          <Button variant="outline" onClick={onClose} className="flex-1">취소</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <FormAlert message={error} variant="error" />}
        {isCustom ? (
          <Input
            label="항목명"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            required
          />
        ) : categoryLabel && (
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <span className="font-medium">{categoryLabel}</span>
          </div>
        )}
        <Input label="금액 (AUD) *" type="number" min={0} step={0.01}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0"
        />
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">소요시간 <span className="text-red-500">*</span></p>
          <div className="flex items-center gap-2">
            <Input type="number" min={0} max={23} value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))} wrapperClassName="w-20" />
            <span className="text-sm text-gray-600">시간</span>
            <Select value={durationMins} onChange={(e) => setDurationMins(Number(e.target.value))}
              options={MINUTE_OPTIONS} wrapperClassName="w-24" />
            <span className="text-sm text-gray-600">분</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="예약 화면에서 손님에게 표시되는 짧은 설명"
            className="w-full border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">상태</p>
          <Toggle checked={isActive} onChange={setIsActive} label="사용" />
        </div>
      </div>
    </Modal>
  );
}

function AddDesignerServiceModal({
  isOpen,
  onClose,
  onSaved,
  designerId,
  existingRows,
  serviceOptions,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  designerId: number;
  existingRows: DesignerServiceRow[];
  serviceOptions: ServiceItem[];
}) {
  const existingIds = new Set(existingRows.map((row) => row.service_id));
  const availableServices = serviceOptions.filter((item) =>
    item.is_active && item.category !== 'Custom' && !existingIds.has(item.id),
  );
  const selectOptions = [
    ...availableServices.map((item) => ({ value: String(item.id), label: getServiceDisplayName(item.name) })),
    { value: CUSTOM_CATEGORY_VALUE, label: '✏️ 직접 입력' },
  ];
  const firstService = availableServices[0];
  const [selectedService, setSelectedService] = useState(
    firstService ? String(firstService.id) : CUSTOM_CATEGORY_VALUE,
  );
  const [customName, setCustomName] = useState<string>('');
  // Comment: Use string so the field starts empty (placeholder "0") instead of pre-filled 0
  const [price, setPrice] = useState(firstService ? String(firstService.price) : '');
  const [durationHours, setDurationHours] = useState(Math.floor((firstService?.duration_minutes ?? 0) / 60));
  const [durationMins, setDurationMins] = useState((firstService?.duration_minutes ?? 0) % 60);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isCustom = selectedService === CUSTOM_CATEGORY_VALUE;

  const handleSave = async () => {
    if (isCustom && !customName.trim()) { setError('항목명을 입력해주세요.'); return; }
    const priceNum = Number(price);
    if (!price || priceNum <= 0) { setError('금액을 입력해주세요.'); return; }
    const durationTotal = durationHours * 60 + durationMins;
    if (durationTotal <= 0) { setError('소요시간을 입력해주세요.'); return; }
    setLoading(true);
    setError(null);

    try {
      let serviceId: number;

      if (isCustom) {
        // Comment: Create a new service entry for the custom name (visible_to: admin only)
        const svcRes = await fetchHoonsServicePreview('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: customName.trim(),
            price: 0,
            duration_minutes: durationTotal,
            is_active: true,
            category: 'Custom',
            visible_to: 'admin',
          }),
        });
        const svcData = await svcRes.json();
        if (!svcRes.ok) throw new Error(svcData.error || '서비스 생성 실패');
        serviceId = svcData.service?.id ?? svcData.id;
      } else {
        const selected = availableServices.find((item) => String(item.id) === selectedService);
        if (!selected) throw new Error('서비스를 선택해 주세요.');
        serviceId = selected.id;
      }

      const res = await fetchHoonsServicePreview('/api/designer-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designer_id: designerId,
          service_id: serviceId,
          price: priceNum,
          duration_minutes: durationTotal,
          is_active: true,
          notes: notes.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || '등록 실패');
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="서비스 등록" zIndex={Z.MODAL_PICKER} scrollable
      footer={
        <>
          <Button onClick={handleSave} loading={loading} className="flex-1">저장</Button>
          <Button variant="outline" onClick={onClose} className="flex-1">취소</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <FormAlert message={error} variant="error" />}
        <Select
          label="서비스"
          value={selectedService}
          onChange={(event) => {
            const id = event.target.value;
            const selected = availableServices.find((item) => String(item.id) === id);
            setSelectedService(id);
            setCustomName('');
            setPrice(selected ? String(selected.price) : '');
            setDurationHours(Math.floor((selected?.duration_minutes ?? 0) / 60));
            setDurationMins((selected?.duration_minutes ?? 0) % 60);
          }}
          options={selectOptions}
          required
        />
        {isCustom && (
          <Input
            label="항목명"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="예: 드라이 프리미엄, 두피 클리닉 등"
            required
          />
        )}
        <Input label="금액 (AUD) *" type="number" min={0} step={0.01}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0"
        />
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">소요시간 <span className="text-red-500">*</span></p>
          <div className="flex items-center gap-2">
            <Input type="number" min={0} max={23} value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))} wrapperClassName="w-20" />
            <span className="text-sm text-gray-600">시간</span>
            <Select value={durationMins} onChange={(e) => setDurationMins(Number(e.target.value))}
              options={MINUTE_OPTIONS} wrapperClassName="w-24" />
            <span className="text-sm text-gray-600">분</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="예약 화면에서 손님에게 표시되는 짧은 설명"
            className="w-full border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
      </div>
    </Modal>
  );
}

function DesignerServicesTab() {
  const demo = useHoonsDemo();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [designerServices, setDesignerServices] = useState<DesignerServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDesignerId, setSelectedDesignerId] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingRow, setEditingRow] = useState<DesignerServiceRow | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, servicesRes, dsRes] = await Promise.all([
        fetchHoonsServicePreview('/api/staff'),
        fetchHoonsServicePreview('/api/services'),
        fetchHoonsServicePreview('/api/designer-services'),
      ]);
      const staffData = await staffRes.json();
      const servicesData = await servicesRes.json();
      const dsData = await dsRes.json();
      const staffList: StaffMember[] = (staffData.staff || []);
      setStaff(staffList);
      setServices(servicesData.services || []);
      setDesignerServices(dsData.designerServices || []);
      setSelectedDesignerId((current) =>
        staffList.some(({ id }) => id === current) ? current : staffList[0]?.id ?? null,
      );
    } catch (err) {
      console.error('Error fetching designer services data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll, demo]);

  const selectedDesigner = staff.find((s) => s.id === selectedDesignerId) ?? null;
  const rowsForDesigner = designerServices.filter((ds) => ds.designer_id === selectedDesignerId);
  const filteredRows = showInactive ? rowsForDesigner : rowsForDesigner.filter((r) => r.is_active);

  const handleDelete = async (row: DesignerServiceRow) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;
    try {
      const res = await fetchHoonsServicePreview(`/api/designer-services?id=${row.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setDesignerServices((prev) => prev.filter((r) => r.id !== row.id));
      setEditingRow(null);
    } catch (err: any) {
      alert(err.message || '삭제에 실패했습니다.');
    }
  };

  const columns = [
    {
      key: 'name',
      header: '항목명',
      render: (item: DesignerServiceRow) => (
        <div className="flex items-center gap-2">
          <span className={!item.is_active ? 'text-gray-400' : 'font-medium text-black'}>
            {item.services ? getServiceDisplayName(item.services.name) : getRowCategoryLabel(item)}
          </span>
          {!item.is_active && <Badge variant="default">미사용</Badge>}
        </div>
      ),
    },
    {
      key: 'price',
      header: '시작 금액',
      align: 'center' as const,
      render: (item: DesignerServiceRow) => formatPrice(item.price),
    },
    {
      key: 'duration',
      header: '소요시간',
      align: 'center' as const,
      render: (item: DesignerServiceRow) =>
        item.duration_minutes != null ? formatDuration(item.duration_minutes) : '-',
    },
    {
      key: 'notes',
      header: '메모',
      align: 'center' as const,
      render: (item: DesignerServiceRow) => item.notes ?? '-',
    },
    {
      key: 'actions',
      header: '수정',
      align: 'center' as const,
      render: (item: DesignerServiceRow) => (
        <Button variant="outline" size="sm" onClick={() => setEditingRow(item)}>수정</Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="text-center py-11.5">
        <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin" />
        <p className="text-gray-500 text-sm mt-4">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6">
      {/* Left: Staff list */}
      <div className="w-full sm:w-1/3 shrink-0">
        <div className="px-2 pb-4">
          <h3 className="text-lg font-bold text-black">직원 목록</h3>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {staff.map((member) => {
            const count = designerServices.filter((ds) => ds.designer_id === member.id && ds.is_active).length;
            const isSelected = selectedDesignerId === member.id;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedDesignerId(member.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left border-b border-gray-100 last:border-b-0 transition-colors ${
                  isSelected ? 'bg-black text-white' : 'hover:bg-gray-50'
                }`}
              >
                <div>
                  <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-black'}`}>
                    {member.name}
                    {member.english_name && (
                      <span className={`ml-1.5 text-xs font-normal ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                        {member.english_name}
                      </span>
                    )}
                  </p>
                  <p className={`text-xs mt-0.5 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>{member.role}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-white text-black' : 'bg-gray-100 text-gray-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Services for selected designer */}
      <div className="flex-1 min-w-0">
        <div className="px-2 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-black">
              {selectedDesigner ? `${selectedDesigner.name} 서비스` : '직원을 선택하세요'}
            </h3>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)} className="rounded border-gray-300" />
              <span className="text-xs text-gray-600">미사용보기</span>
            </label>
          </div>
          {selectedDesigner && (
            <Button icon="add" size="sm" onClick={() => setIsAdding(true)}>항목 등록</Button>
          )}
        </div>

        {selectedDesigner ? (
          <DataTable
            columns={columns}
            data={filteredRows}
            keyExtractor={(r) => r.id}
            emptyMessage="등록된 서비스가 없습니다. 항목 등록을 눌러 추가하세요."
          />
        ) : (
          <p className="text-sm text-gray-400 text-center py-11.5">왼쪽에서 직원을 선택하세요.</p>
        )}
      </div>

      {/* Modals */}
      {isAdding && selectedDesignerId && (
        <AddDesignerServiceModal
          isOpen
          onClose={() => setIsAdding(false)}
          onSaved={() => { setIsAdding(false); fetchAll(); }}
          designerId={selectedDesignerId}
          existingRows={rowsForDesigner}
          serviceOptions={services}
        />
      )}
      {editingRow && (
        <DesignerServiceModal
          isOpen
          onClose={() => setEditingRow(null)}
          onSaved={() => { setEditingRow(null); fetchAll(); }}
          onDelete={() => handleDelete(editingRow)}
          initial={editingRow}
          title="서비스 수정"
        />
      )}
    </div>
  );
}

// ─── PrepaidPassModal ────────────────────────────────────────────────────────

function PrepaidPassModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initial,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<PrepaidPassTemplate, 'id'>) => void;
  onDelete?: () => void;
  initial?: PrepaidPassTemplate;
  title: string;
}) {
  const [type, setType] = useState<'금액 적립' | '할인 전용'>(initial?.type || '금액 적립');
  const [name, setName] = useState(initial?.name || '');
  const [salePrice, setSalePrice] = useState(initial?.salePrice ?? 0);
  const [accumulationAmount, setAccumulationAmount] = useState(initial?.accumulationAmount ?? 0);
  const [validityValue, setValidityValue] = useState('');
  const [validityUnit, setValidityUnit] = useState<'월' | '일'>('월');
  const [isUnlimited, setIsUnlimited] = useState(initial?.validityPeriod === '무제한');
  const [hasDiscount, setHasDiscount] = useState(initial?.hasDiscount ?? false);
  const [serviceDiscount, setServiceDiscount] = useState(initial?.serviceDiscount ?? 0);
  const [productDiscount, setProductDiscount] = useState(initial?.productDiscount ?? 0);
  const [isActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setType(initial?.type || '금액 적립');
    setName(initial?.name || '');
    setSalePrice(initial?.salePrice ?? 0);
    setAccumulationAmount(initial?.accumulationAmount ?? 0);
    setIsUnlimited(initial?.validityPeriod === '무제한');
    setHasDiscount(initial?.hasDiscount ?? false);
    setServiceDiscount(initial?.serviceDiscount ?? 0);
    setProductDiscount(initial?.productDiscount ?? 0);
    setError(null);
    if (initial?.validityPeriod && initial.validityPeriod !== '무제한') {
      const m = initial.validityPeriod.match(/^(\d+)\s*(월|일)$/);
      if (m) {
        setValidityValue(m[1]);
        setValidityUnit(m[2] as '월' | '일');
      } else {
        setValidityValue('');
        setValidityUnit('월');
      }
    } else {
      setValidityValue('');
      setValidityUnit('월');
    }
  }, [isOpen, initial?.id]); // Re-sync form each time add/edit modal opens

  const handleSave = () => {
    if (!name.trim()) {
      setError('정액권명을 입력해주세요.');
      return;
    }
    const validityPeriod = isUnlimited ? '무제한' : `${validityValue}${validityUnit}`;
    onSave({ type, name, salePrice, accumulationAmount, validityPeriod, hasDiscount, serviceDiscount: hasDiscount ? serviceDiscount : 0, productDiscount: hasDiscount ? productDiscount : 0, isActive });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      zIndex={Z.MODAL_PRIMARY}
      scrollable
      footer={
        <>
          <Button onClick={handleSave} className="flex-1">저장</Button>
          {onDelete && <Button variant="danger" onClick={onDelete} className="flex-1">삭제</Button>}
          <Button variant="outline" onClick={onClose} className="flex-1">취소</Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <FormAlert message={error} variant="error" />}

        {/* 유형 */}
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">정액권 유형</p>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="prepaidType" checked={type === '금액 적립'} onChange={() => setType('금액 적립')} className="text-blue-500" />
              <span className="text-sm">금액 적립</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="prepaidType" checked={type === '할인 전용'} onChange={() => setType('할인 전용')} className="text-blue-500" />
              <span className="text-sm">할인 전용</span>
            </label>
          </div>
        </div>

        <Input label="정액권명" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="판매가" type="number" min={0} value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value))} required />

        <div>
          <Input label="적립 금액" type="number" min={0} value={accumulationAmount} onChange={(e) => setAccumulationAmount(Number(e.target.value))} required />
          <p className="text-xs text-blue-500 mt-1">실제 사용 가능한 금액을 입력해 주세요.</p>
        </div>

        {/* 유효기간 */}
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">유효기간 <span className="text-red-500">*</span></p>
          <div className="flex items-center gap-2 mb-2">
            <Input
              type="number"
              min={0}
              value={validityValue}
              onChange={(e) => setValidityValue(e.target.value)}
              wrapperClassName="w-24"
              disabled={isUnlimited}
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="validityUnit" checked={validityUnit === '월'} onChange={() => setValidityUnit('월')} disabled={isUnlimited} />
              <span className="text-sm">월</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="validityUnit" checked={validityUnit === '일'} onChange={() => setValidityUnit('일')} disabled={isUnlimited} />
              <span className="text-sm">일</span>
            </label>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isUnlimited} onChange={(e) => setIsUnlimited(e.target.checked)} className="rounded border-gray-300" />
            <span className="text-sm text-gray-700">무제한</span>
          </label>
        </div>

        {/* 할인율 */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input type="checkbox" checked={hasDiscount} onChange={(e) => setHasDiscount(e.target.checked)} className="rounded border-gray-300" />
            <span className="text-sm font-medium text-gray-700">정액권 보유시 할인율 설정</span>
          </label>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 w-20">서비스 할인</span>
              <Input type="number" min={0} max={100} value={serviceDiscount} onChange={(e) => setServiceDiscount(Number(e.target.value))} wrapperClassName="w-24" disabled={!hasDiscount} />
              <span className="text-sm text-gray-600">%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 w-20">제품 할인</span>
              <Input type="number" min={0} max={100} value={productDiscount} onChange={(e) => setProductDiscount(Number(e.target.value))} wrapperClassName="w-24" disabled={!hasDiscount} />
              <span className="text-sm text-gray-600">%</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Tab 2: 정액권 ────────────────────────────────────────────────────────────

function PrepaidTab() {
  const { templates, addTemplate, updateTemplate, deleteTemplate, reorderTemplates } = usePrepaidTemplates();
  const [showInactive, setShowInactive] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PrepaidPassTemplate | null>(null);

  const filtered = (showInactive ? templates : templates.filter((t) => t.isActive))
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const handleAdd = (data: Omit<PrepaidPassTemplate, 'id'>) => {
    addTemplate(data);
    setIsAdding(false);
  };
  const handleUpdate = (data: Omit<PrepaidPassTemplate, 'id'>) => {
    if (!editingTemplate) return;
    updateTemplate(editingTemplate.id, data);
    setEditingTemplate(null);
  };
  const handleDelete = () => {
    if (!editingTemplate) return;
    deleteTemplate(editingTemplate.id);
    setEditingTemplate(null);
  };

  const columns = [
    { key: 'type', header: '유형', align: 'center' as const, render: (item: PrepaidPassTemplate) => item.type },
    { key: 'name', header: '정액권명', align: 'center' as const, render: (item: PrepaidPassTemplate) => <span className={!item.isActive ? 'text-gray-400' : ''}>{item.name}</span> },
    { key: 'salePrice', header: '판매가', align: 'center' as const, render: (item: PrepaidPassTemplate) => formatPrice(item.salePrice) },
    { key: 'accumulation', header: '적립 금액', align: 'center' as const, render: (item: PrepaidPassTemplate) => formatPrice(item.accumulationAmount) },
    { key: 'validity', header: '유효기간', align: 'center' as const, render: (item: PrepaidPassTemplate) => item.validityPeriod },
    { key: 'serviceDiscount', header: '서비스 할인', align: 'center' as const, render: (item: PrepaidPassTemplate) => item.hasDiscount ? `${item.serviceDiscount}%` : '' },
    { key: 'productDiscount', header: '제품 할인', align: 'center' as const, render: (item: PrepaidPassTemplate) => item.hasDiscount ? `${item.productDiscount}%` : '' },
    { key: 'actions', header: '수정', align: 'center' as const, render: (item: PrepaidPassTemplate) => <Button variant="outline" size="sm" onClick={() => setEditingTemplate(item)}>수정</Button> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="px-2 pb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-black">정액권</h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded border-gray-300" />
              <span className="text-sm text-gray-600">미사용보기</span>
            </label>
            <Button icon="add" size="sm" onClick={() => setIsAdding(true)}>정액권 등록</Button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(t) => t.id}
          emptyMessage="등록된 정액권이 없습니다."
          draggable
          onReorder={(reordered) => {
            reorderTemplates(reordered);
          }}
        />
      </div>
      <p className="text-sm text-red-500">* 순서를 변경하려면 항목을 드래그 하세요.</p>

      {isAdding && <PrepaidPassModal isOpen onClose={() => setIsAdding(false)} onSave={handleAdd} title="정액권 등록" />}
      {editingTemplate && <PrepaidPassModal isOpen onClose={() => setEditingTemplate(null)} onSave={handleUpdate} onDelete={handleDelete} initial={editingTemplate} title="정액권 수정" />}
    </div>
  );
}

// ─── ProductCategoryModal ────────────────────────────────────────────────────

function ProductCategoryModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initial,
  title,
  nameLabel = '분류명',
  zIndex,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string }) => void;
  onDelete?: () => void;
  initial?: InventoryBrand;
  title: string;
  nameLabel?: string;
  zIndex?: string;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError(`${nameLabel}을(를) 입력해주세요.`);
      return;
    }
    onSave({ name });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      zIndex={zIndex ?? Z.MODAL_PRIMARY}
      footer={
        <>
          <Button onClick={handleSave} className="flex-1">저장</Button>
          {onDelete && <Button variant="danger" onClick={onDelete} className="flex-1">삭제</Button>}
          <Button variant="outline" onClick={onClose} className="flex-1">취소</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <FormAlert message={error} variant="error" />}
        <Input label={nameLabel} value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
    </Modal>
  );
}

// ─── ProductModal ────────────────────────────────────────────────────────────

function ProductModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initial,
  title,
  brands,
  categories,
  onAddBrand,
  onAddCategory,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; sku: string | null; size: string | null; category: string; price: number; cost_price: number; stock: number; brand: string | null; icon: string | null; for_internal: boolean; for_retail: boolean }) => void | Promise<void>;
  onDelete?: () => void;
  initial?: InventoryItem;
  title: string;
  brands: InventoryBrand[];
  categories: InventoryProductCategory[];
  onAddBrand: (data: { name: string }) => void;
  onAddCategory: (data: { name: string }) => void;
}) {
  const brandNames = brands.map((b) => b.name);
  const categoryNames = categories.map((c) => c.name);

  const [sku, setSku] = useState(initial?.sku || '');
  const [brand, setBrand] = useState(() => resolveInitialProductBrand(initial, brandNames));
  const [productCategory, setProductCategory] = useState(() =>
    resolveInitialProductCategory(initial, brandNames, categoryNames),
  );
  const [name, setName] = useState(initial?.name || '');
  const [size, setSize] = useState(initial?.size || '');
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [costPrice, setCostPrice] = useState((initial as any)?.cost_price ?? 0);
  const [stock, setStock] = useState(initial?.stock ?? 0);
  const [forInternal, setForInternal] = useState(initial?.for_internal ?? true);
  const [forRetail, setForRetail] = useState(initial?.for_retail ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [isAddingProductCategory, setIsAddingProductCategory] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSku(initial?.sku || '');
    setBrand(resolveInitialProductBrand(initial, brandNames));
    setProductCategory(resolveInitialProductCategory(initial, brandNames, categoryNames));
    setName(initial?.name || '');
    setSize(initial?.size || '');
    setPrice(initial?.price ?? 0);
    setCostPrice((initial as any)?.cost_price ?? 0);
    setStock(initial?.stock ?? 0);
    setForInternal(initial?.for_internal ?? true);
    setForRetail(initial?.for_retail ?? false);
    setError(null);
  }, [isOpen, initial, brandNames.join('|'), categoryNames.join('|')]);

  const handleSave = async () => {
    if (!name.trim()) { setError('제품명을 입력해주세요.'); return; }
    if (!brand) { setError('분류를 선택해주세요.'); return; }
    if (!productCategory) { setError('카테고리를 선택해주세요.'); return; }
    setError(null);
    setSaving(true);
    try {
      await onSave({
        name,
        sku: sku.trim() || null,
        size: size || null,
        category: productCategory,
        price,
        cost_price: costPrice,
        stock,
        brand,
        icon: initial?.icon || null,
        for_internal: forInternal,
        for_retail: forRetail,
      });
    } catch (err: any) {
      setError(err?.message || '제품 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      zIndex={Z.MODAL_PRIMARY}
      scrollable
      closeOnBackdropClick={false}
      showCloseButton={false}
      footer={
        <>
          <Button onClick={handleSave} className="flex-1" disabled={saving} loading={saving}>
            저장
          </Button>
          {onDelete && <Button variant="danger" onClick={onDelete} className="flex-1" disabled={saving}>삭제</Button>}
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>취소</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <FormAlert message={error} variant="error" />}
        <Input label="제품코드 (SKU)" value={sku} onChange={(e) => setSku(e.target.value)} />
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">분류 <span className="text-red-500">*</span></p>
          <div className="flex items-center gap-2">
            <Select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              options={[{ value: '', label: '선택' }, ...brands.map((b) => ({ value: b.name, label: b.name }))]}
              wrapperClassName="flex-1"
            />
            <Button variant="outline" size="sm" onClick={() => setIsAddingBrand(true)}>+</Button>
          </div>
        </div>
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">카테고리 <span className="text-red-500">*</span></p>
          <div className="flex items-center gap-2">
            <Select
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              options={[{ value: '', label: '선택' }, ...categories.map((c) => ({ value: c.name, label: c.name }))]}
              wrapperClassName="flex-1"
            />
            <Button variant="outline" size="sm" onClick={() => setIsAddingProductCategory(true)}>+</Button>
          </div>
        </div>
        <Input label="제품명" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="규격" value={size} onChange={(e) => setSize(e.target.value)} />
        <Input label="판매가 (AUD)" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        <Input label="입고가 (AUD)" type="number" min={0} value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} />
        <Input label="재고" type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value))} />
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">용도</p>
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={forInternal}
                onChange={(e) => setForInternal(e.target.checked)}
              />
              <span>내수</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={forRetail}
                onChange={(e) => setForRetail(e.target.checked)}
              />
              <span>판매</span>
            </label>
          </div>
        </div>
      </div>

      {isAddingBrand && (
        <ProductCategoryModal
          isOpen
          onClose={() => setIsAddingBrand(false)}
          onSave={(data) => { onAddBrand(data); setIsAddingBrand(false); }}
          title="분류 등록"
          zIndex={Z.MODAL_PICKER}
        />
      )}
      {isAddingProductCategory && (
        <ProductCategoryModal
          isOpen
          onClose={() => setIsAddingProductCategory(false)}
          onSave={(data) => {
            onAddCategory(data);
            setProductCategory(data.name);
            setIsAddingProductCategory(false);
          }}
          title="카테고리 등록"
          nameLabel="카테고리명"
          zIndex={Z.MODAL_PICKER}
        />
      )}
    </Modal>
  );
}

// ─── Tab 3: 제품 ──────────────────────────────────────────────────────────────

function ProductsTab({
  items,
  brands,
  categories,
  loading,
  refetch,
}: {
  items: InventoryItem[];
  brands: InventoryBrand[];
  categories: InventoryProductCategory[];
  loading: boolean;
  refetch: () => Promise<void>;
}) {
  const [filterBrand, setFilterBrand] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null);

  const brandNames = brands.map((b) => b.name);
  const categoryNames = categories.map((c) => c.name);

  let filtered = [...items];
  if (filterBrand) {
    filtered = filtered.filter(
      (p) => resolveInventoryBrand(p, brandNames) === filterBrand,
    );
  }
  if (appliedSearch) filtered = filtered.filter((p) => p.name.toLowerCase().includes(appliedSearch.toLowerCase()) || (p.sku || '').includes(appliedSearch));

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleAdd = async (data: { name: string; sku: string | null; size: string | null; category: string; price: number; cost_price: number; stock: number; brand: string | null; icon: string | null; for_internal: boolean; for_retail: boolean }) => {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.error || '제품 등록에 실패했습니다.');
    }
    invalidateInventoryCache();
    await refetch();
    setIsAdding(false);
  };
  const handleUpdate = async (data: { name: string; sku: string | null; size: string | null; category: string; price: number; cost_price: number; stock: number; brand: string | null; icon: string | null; for_internal: boolean; for_retail: boolean }) => {
    if (!editingProduct) return;
    const res = await fetch('/api/inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingProduct.id, ...data }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.error || '제품 수정에 실패했습니다.');
    }
    invalidateInventoryCache();
    await refetch();
    setEditingProduct(null);
  };
  const handleDelete = async () => {
    if (!editingProduct) return;
    try {
      const res = await fetch(`/api/inventory/${editingProduct.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete product');
      invalidateInventoryCache();
      await refetch();
      setEditingProduct(null);
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };
  const handleAddBrand = async (data: { name: string }) => {
    try {
      const res = await fetch('/api/inventory-brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create brand');
      invalidateInventoryCache();
      await refetch();
    } catch (err) {
      console.error('Error creating brand:', err);
    }
  };
  const handleAddCategory = async (data: { name: string }) => {
    try {
      const res = await fetch('/api/inventory-product-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create product category');
      invalidateInventoryCache();
      await refetch();
    } catch (err) {
      console.error('Error creating product category:', err);
    }
  };

  const columns = [
    {
      key: 'brand',
      header: '분류',
      align: 'center' as const,
      render: (item: InventoryItem) => resolveInventoryBrand(item, brandNames) || '-',
    },
    {
      key: 'category',
      header: '카테고리',
      align: 'center' as const,
      render: (item: InventoryItem) =>
        resolveInventoryProductCategory(item, brandNames, categoryNames) || '-',
    },
    { key: 'sku', header: '제품코드', align: 'center' as const, render: (item: InventoryItem) => item.sku || '-' },
    { key: 'name', header: '제품명', align: 'center' as const, render: (item: InventoryItem) => item.name },
    { key: 'size', header: '규격', align: 'center' as const, render: (item: InventoryItem) => item.size || '' },
    { key: 'price', header: '판매가', align: 'center' as const, render: (item: InventoryItem) => formatPrice(item.price) },
    { key: 'cost_price', header: '입고가', align: 'center' as const, render: (item: InventoryItem) => formatPrice(Number((item as any).cost_price ?? 0)) },
    { key: 'stock', header: '재고', align: 'center' as const, render: (item: InventoryItem) => item.stock },
    {
      key: 'usage',
      header: '용도',
      align: 'center' as const,
      render: (item: InventoryItem) => {
        const labels: string[] = [];
        if (item.for_internal) labels.push('내수');
        if (item.for_retail) labels.push('판매');
        return labels.length > 0 ? labels.join(' / ') : '-';
      },
    },
    { key: 'actions', header: '수정', align: 'center' as const, render: (item: InventoryItem) => <Button variant="outline" size="sm" onClick={() => setEditingProduct(item)}>수정</Button> },
  ];

  if (loading) {
    return <div className="py-11.5 text-center text-sm text-gray-500">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        {/* Filter area */}
        <div className="px-2 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Select
              value={filterBrand}
              onChange={(e) => { setFilterBrand(e.target.value); setCurrentPage(1); }}
              options={[{ value: '', label: '전체' }, ...brands.map((b) => ({ value: b.name, label: b.name }))]}
              wrapperClassName="w-36"
            />
            <div className="flex items-center gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제품 코드 / 이름"
                wrapperClassName="w-48"
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') { setAppliedSearch(searchQuery); setCurrentPage(1); } }}
              />
              <Button size="sm" onClick={() => { setAppliedSearch(searchQuery); setCurrentPage(1); }}>검색</Button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">총 {filtered.length} 건</span>
            <Button icon="add" size="sm" onClick={() => setIsAdding(true)}>제품등록</Button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={paged}
          keyExtractor={(p) => p.id}
          emptyMessage="등록된 제품이 없습니다."
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {isAdding && (
        <ProductModal
          isOpen
          onClose={() => setIsAdding(false)}
          onSave={handleAdd}
          title="제품등록"
          brands={brands}
          categories={categories}
          onAddBrand={handleAddBrand}
          onAddCategory={handleAddCategory}
        />
      )}
      {editingProduct && (
        <ProductModal
          isOpen
          onClose={() => setEditingProduct(null)}
          onSave={handleUpdate}
          onDelete={handleDelete}
          initial={editingProduct}
          title="제품 수정"
          brands={brands}
          categories={categories}
          onAddBrand={handleAddBrand}
          onAddCategory={handleAddCategory}
        />
      )}
    </div>
  );
}

// ─── Tab 4: 제품분류 ──────────────────────────────────────────────────────────

function ProductCategoriesTab({
  brands,
  loading,
  refetch,
}: {
  brands: InventoryBrand[];
  loading: boolean;
  refetch: () => Promise<void>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingBrand, setEditingBrand] = useState<InventoryBrand | null>(null);
  const [orderedBrands, setOrderedBrands] = useState<InventoryBrand[]>(brands);

  useEffect(() => {
    setOrderedBrands(brands);
  }, [brands]);

  const handleAdd = async (data: { name: string }) => {
    try {
      const res = await fetch('/api/inventory-brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create brand');
      invalidateInventoryCache();
      await refetch();
      setIsAdding(false);
    } catch (err) {
      console.error('Error creating brand:', err);
    }
  };
  const handleUpdate = async (data: { name: string }) => {
    if (!editingBrand) return;
    try {
      const res = await fetch(`/api/inventory-brands/${editingBrand.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update brand');
      invalidateInventoryCache();
      await refetch();
      setEditingBrand(null);
    } catch (err) {
      console.error('Error updating brand:', err);
    }
  };
  const handleDelete = async () => {
    if (!editingBrand) return;
    if (!confirm(`분류 "${editingBrand.name}"을(를) 삭제할까요?`)) return;
    try {
      const res = await fetch(`/api/inventory-brands/${editingBrand.id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || '분류 삭제에 실패했습니다.');
      invalidateInventoryCache();
      await refetch();
      setEditingBrand(null);
    } catch (err: any) {
      alert(err.message || '분류 삭제에 실패했습니다.');
    }
  };

  const columns = [
    { key: 'name', header: '항목', align: 'center' as const, render: (item: InventoryBrand) => item.name },
    { key: 'actions', header: '수정', align: 'center' as const, render: (item: InventoryBrand) => <Button variant="outline" size="sm" onClick={() => setEditingBrand(item)}>수정</Button> },
  ];

  if (loading) {
    return <div className="py-11.5 text-center text-sm text-gray-500">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="px-2 pb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-black">제품 분류</h3>
          <div className="flex items-center gap-4">
            <Button icon="add" size="sm" onClick={() => setIsAdding(true)}>분류 등록</Button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={orderedBrands}
          keyExtractor={(b) => b.id}
          emptyMessage="등록된 제품 분류가 없습니다."
          draggable
          onReorder={async (reordered) => {
            const order = reordered.map((b, i) => ({ id: b.id, sort_order: i + 1 }));
            const prev = orderedBrands.map((b) => ({ ...b }));
            setOrderedBrands(reordered);
            try {
              const res = await fetch('/api/inventory-brands', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order }),
              });
              const body = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(body.error || '순서 저장에 실패했습니다.');
              invalidateInventoryCache();
              await refetch();
            } catch (err: any) {
              setOrderedBrands(prev);
              alert(err.message || '순서 저장에 실패했습니다.');
            }
          }}
        />
      </div>
      <p className="text-sm text-red-500">* 순서를 변경하려면 항목을 드래그 하세요.</p>

      {isAdding && <ProductCategoryModal isOpen onClose={() => setIsAdding(false)} onSave={handleAdd} title="분류 등록" />}
      {editingBrand && <ProductCategoryModal isOpen onClose={() => setEditingBrand(null)} onSave={handleUpdate} onDelete={handleDelete} initial={editingBrand} title="분류 수정" />}
    </div>
  );
}

// ─── Tab 5: 제품카테고리 ───────────────────────────────────────────────────────

function ProductInventoryCategoriesTab({
  categories,
  loading,
  refetch,
}: {
  categories: InventoryProductCategory[];
  loading: boolean;
  refetch: () => Promise<void>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryProductCategory | null>(null);
  const [orderedCategories, setOrderedCategories] = useState<InventoryProductCategory[]>(categories);

  useEffect(() => {
    setOrderedCategories(categories);
  }, [categories]);

  const handleAdd = async (data: { name: string }) => {
    try {
      const res = await fetch('/api/inventory-product-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create product category');
      invalidateInventoryCache();
      await refetch();
      setIsAdding(false);
    } catch (err) {
      console.error('Error creating product category:', err);
    }
  };
  const handleUpdate = async (data: { name: string }) => {
    if (!editingCategory) return;
    try {
      const res = await fetch(`/api/inventory-product-categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update product category');
      invalidateInventoryCache();
      await refetch();
      setEditingCategory(null);
    } catch (err) {
      console.error('Error updating product category:', err);
    }
  };
  const handleDelete = async () => {
    if (!editingCategory) return;
    if (!confirm(`카테고리 "${editingCategory.name}"을(를) 삭제할까요?`)) return;
    try {
      const res = await fetch(`/api/inventory-product-categories/${editingCategory.id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || '카테고리 삭제에 실패했습니다.');
      invalidateInventoryCache();
      await refetch();
      setEditingCategory(null);
    } catch (err: any) {
      alert(err.message || '카테고리 삭제에 실패했습니다.');
    }
  };

  const columns = [
    { key: 'name', header: '항목', align: 'center' as const, render: (item: InventoryProductCategory) => item.name },
    { key: 'actions', header: '수정', align: 'center' as const, render: (item: InventoryProductCategory) => <Button variant="outline" size="sm" onClick={() => setEditingCategory(item)}>수정</Button> },
  ];

  if (loading) {
    return <div className="py-11.5 text-center text-sm text-gray-500">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="px-2 pb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-black">제품 카테고리</h3>
          <div className="flex items-center gap-4">
            <Button icon="add" size="sm" onClick={() => setIsAdding(true)}>카테고리 등록</Button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={orderedCategories}
          keyExtractor={(c) => c.id}
          emptyMessage="등록된 제품 카테고리가 없습니다."
          draggable
          onReorder={async (reordered) => {
            const order = reordered.map((c, i) => ({ id: c.id, sort_order: i + 1 }));
            const prev = orderedCategories.map((c) => ({ ...c }));
            setOrderedCategories(reordered);
            try {
              const res = await fetch('/api/inventory-product-categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order }),
              });
              const body = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(body.error || '순서 저장에 실패했습니다.');
              invalidateInventoryCache();
              await refetch();
            } catch (err: any) {
              setOrderedCategories(prev);
              alert(err.message || '순서 저장에 실패했습니다.');
            }
          }}
        />
      </div>
      <p className="text-sm text-red-500">* 순서를 변경하려면 항목을 드래그 하세요.</p>

      {isAdding && (
        <ProductCategoryModal
          isOpen
          onClose={() => setIsAdding(false)}
          onSave={handleAdd}
          title="카테고리 등록"
          nameLabel="카테고리명"
        />
      )}
      {editingCategory && (
        <ProductCategoryModal
          isOpen
          onClose={() => setEditingCategory(null)}
          onSave={handleUpdate}
          onDelete={handleDelete}
          initial={editingCategory}
          title="카테고리 수정"
          nameLabel="카테고리명"
        />
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ServicesAndProductsPage() {
  const [activeTab, setActiveTab] = useState('services');
  const { items, brands, categories, loading: inventoryLoading, refetch: inventoryRefetch } = useInventory({
    enabled: activeTab.startsWith('product'),
  });

  return (
    <AdminPageLayout>
      <PageHeader title="서비스 및 제품" />
      <Tabs tabs={PAGE_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="mt-1">
        {activeTab === 'services' && <ServicesTab />}
        {activeTab === 'designerServices' && <DesignerServicesTab />}
        {activeTab === 'prepaid' && <PrepaidTab />}
        {activeTab === 'products' && (
          <ProductsTab
            items={items}
            brands={brands}
            categories={categories}
            loading={inventoryLoading}
            refetch={inventoryRefetch}
          />
        )}
        {activeTab === 'productCategories' && (
          <ProductCategoriesTab brands={brands} loading={inventoryLoading} refetch={inventoryRefetch} />
        )}
        {activeTab === 'productInventoryCategories' && (
          <ProductInventoryCategoriesTab
            categories={categories}
            loading={inventoryLoading}
            refetch={inventoryRefetch}
          />
        )}
      </div>
    </AdminPageLayout>
  );
}
