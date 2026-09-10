'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import type { InventoryItem } from '@/lib/types';
import {
  resolveInventoryBrand,
  resolveInventoryProductCategory,
} from '@/lib/inventory-product-fields';
import {
  AdminPageLayout,
  PageHeader,
  SearchBar,
  DataTable,
  StatCard,
  Modal,
  Input,
  Select,
  Badge,
  FormAlert,
  Button,
  IconButton,
  Tabs,
} from '@/components/ui';

const ICON_OPTIONS = [
  'inventory_2',
  'soap',
  'palette',
  'brush',
  'spa',
  'content_cut',
  'water_drop',
  'science',
  'styler',
] as const;

type IconName = (typeof ICON_OPTIONS)[number];

type ShopOption = {
  id: number;
  name: string;
};

const DEFAULT_INVENTORY_SHOP_ID = 3;

function buildInventoryUrl(path: string, shopId: number, params?: URLSearchParams): string {
  const nextParams = new URLSearchParams(params);
  nextParams.set('shop_id', String(shopId));
  return `${path}?${nextParams.toString()}`;
}

// Comment: Local calendar date as YYYY-MM-DD (for date inputs / filters)
function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Comment: Format date/time to YYYY-MM-DD HH:mm for display
function formatDateTime(dateStr: string | null | undefined): string {
  if (dateStr == null || dateStr === '') return '';
  const s = String(dateStr).trim();
  if (s.length >= 16 && s[10] === 'T') {
    return s.slice(0, 10) + ' ' + s.slice(11, 16);
  }
  if (s.length >= 10) return s.slice(0, 10);
  return s;
}
// .,.,.,.
type InventoryView = {
  title: string;
  subtitle: string;
  icon: string;
  highlights: {
    title: string;
    description: string;
    icon: string;
  }[];
};

const INVENTORY_VIEWS: Record<string, InventoryView> = {
  overview: {
    title: '재고 현황',
    subtitle: '재고를 관리하고 SKU별 수량을 조정하세요.',
    icon: 'inventory',
    highlights: [],
  },
  usage: {
    title: '내부 소모 내역',
    subtitle: '서비스/내부 사용으로 소모된 재고를 기록하고 확인합니다.',
    icon: 'monitoring',
    highlights: [
      {
        title: '기간별 소모량',
        description: '일/주/월 단위 소모 추이를 확인합니다.',
        icon: 'timeline',
      },
      {
        title: '카테고리 분석',
        description: '카테고리별 소모 비중을 빠르게 파악합니다.',
        icon: 'donut_large',
      },
      {
        title: '직원별 사용',
        description: '담당자별 소모 기록을 관리합니다.',
        icon: 'badge',
      },
    ],
  },
  adjustments: {
    title: '재고 조정 내역',
    subtitle: '입출고, 분실, 반품 등 재고 조정 로그를 관리합니다.',
    icon: 'tune',
    highlights: [
      {
        title: '조정 유형',
        description: '입고/출고/폐기 사유를 기록합니다.',
        icon: 'list_alt',
      },
      {
        title: '승인 흐름',
        description: '조정 승인 이력을 추적합니다.',
        icon: 'check_circle',
      },
      {
        title: '증빙 첨부',
        description: '영수증/메모 등 증빙을 보관합니다.',
        icon: 'attach_file',
      },
    ],
  },
  history: {
    title: '재고 변동 이력',
    subtitle: '재고 변화 히스토리를 시계열로 확인합니다.',
    icon: 'history',
    highlights: [
      {
        title: '변동 추적',
        description: 'SKU별 재고 변동 기록을 조회합니다.',
        icon: 'sync_alt',
      },
      {
        title: '알림 기준',
        description: '임계치 이하 변동을 감지합니다.',
        icon: 'notifications',
      },
      {
        title: '필터링',
        description: '날짜/카테고리/상태로 필터합니다.',
        icon: 'filter_alt',
      },
    ],
  },
  purchases: {
    title: '매입',
    subtitle: '매입 내역을 등록하고 공급을 관리합니다.',
    icon: 'receipt_long',
    highlights: [
      {
        title: '매입 등록',
        description: '상품/수량/단가를 입력합니다.',
        icon: 'edit_note',
      },
      {
        title: '입고 일정',
        description: '입고 예정일을 관리합니다.',
        icon: 'event',
      },
      {
        title: '정산 관리',
        description: '세금계산서/정산을 추적합니다.',
        icon: 'receipt',
      },
    ],
  },
  vendors: {
    title: '매입처 관리',
    subtitle: '거래처 정보를 관리하고 계약을 추적합니다.',
    icon: 'storefront',
    highlights: [
      {
        title: '거래처 목록',
        description: '거래처 연락처와 담당자를 저장합니다.',
        icon: 'store',
      },
      {
        title: '계약 조건',
        description: '가격/납기 등 조건을 기록합니다.',
        icon: 'description',
      },
      {
        title: '거래 이력',
        description: '매입 빈도와 금액을 확인합니다.',
        icon: 'insights',
      },
    ],
  },
};

function InventoryContent() {
  const [shops, setShops] = useState<ShopOption[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number>(DEFAULT_INVENTORY_SHOP_ID);
  const [category, setCategory] = useState('전체 카테고리');
  const [status, setStatus] = useState('전체 상태');
  const [brand, setBrand] = useState<string>('전체');
  const [brandOptions, setBrandOptions] = useState<string[]>(['전체']);
  const [productCategoryOptions, setProductCategoryOptions] = useState<string[]>(['전체 카테고리']);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [stockDrafts, setStockDrafts] = useState<Record<number, number>>({});
  const [internalUsageUnits, setInternalUsageUnits] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const viewKey = searchParams.get('view') ?? 'overview';
  const activeView = INVENTORY_VIEWS[viewKey] ?? INVENTORY_VIEWS.overview;

  useEffect(() => {
    let isMounted = true;
    const fetchShops = async () => {
      try {
        const res = await fetch('/api/shops');
        const data = await res.json();
        if (!isMounted) return;
        const list: ShopOption[] = Array.isArray(data.shops) ? data.shops : [];
        setShops(list);
        if (!list.some((shop) => Number(shop.id) === selectedShopId) && list.length > 0) {
          setSelectedShopId(Number(list[0].id));
        }
      } catch {
        if (isMounted) setShops([]);
      }
    };

    fetchShops();
    return () => {
      isMounted = false;
    };
  }, [selectedShopId]);

  // Comment: Load full inventory once on overview; stats always use this, table is filtered client-side
  useEffect(() => {
    if (viewKey !== 'overview') {
      return;
    }

    let isMounted = true;
    const fetchInventory = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(buildInventoryUrl('/api/inventory', selectedShopId));
        const data = await res.json();

        if (isMounted) {
          if (!res.ok) {
            throw new Error(data.error || 'Failed to load inventory');
          }

          const items: InventoryItem[] = data.items || [];
          setProducts(items);
          setStockDrafts(
            items.reduce((acc, item) => {
              acc[item.id] = item.stock;
              return acc;
            }, {} as Record<number, number>)
          );
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load inventory');
          setProducts([]);
          setStockDrafts({});
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInventory();
    return () => {
      isMounted = false;
    };
  }, [viewKey, selectedShopId]);

  useEffect(() => {
    if (viewKey !== 'overview') {
      return;
    }

    let isMounted = true;
    const fetchInternalUsageSummary = async () => {
      try {
        const res = await fetch(buildInventoryUrl('/api/inventory-usage', selectedShopId));
        const data = await res.json();
        if (!isMounted) return;
        const rows = Array.isArray(data.rows) ? data.rows : [];
        const totalUnits = rows.reduce(
          (sum: number, row: { quantity?: number | string | null }) => sum + Number(row.quantity ?? 0),
          0
        );
        setInternalUsageUnits(totalUnits);
      } catch {
        if (isMounted) setInternalUsageUnits(0);
      }
    };

    fetchInternalUsageSummary();
    return () => {
      isMounted = false;
    };
  }, [viewKey, selectedShopId]);

  // Comment: Load brand options from database
  useEffect(() => {
    let isMounted = true;
    const fetchBrands = async () => {
      try {
        const res = await fetch(buildInventoryUrl('/api/inventory-brands', selectedShopId));
        const data = await res.json();
        if (isMounted) {
          const names: string[] = Array.isArray(data.brands)
            ? data.brands.map((b: any) => String(b.name))
            : [];
          setBrandOptions(['전체', ...names]);
        }
      } catch {
        if (isMounted) {
          setBrandOptions(['전체']);
        }
      }
    };

    fetchBrands();
    return () => {
      isMounted = false;
    };
  }, [selectedShopId]);

  useEffect(() => {
    let isMounted = true;
    const fetchProductCategories = async () => {
      try {
        const res = await fetch(
          buildInventoryUrl('/api/inventory-product-categories', selectedShopId),
        );
        const data = await res.json();
        if (isMounted) {
          const names: string[] = Array.isArray(data.categories)
            ? data.categories.map((c: { name: string }) => String(c.name))
            : [];
          setProductCategoryOptions(['전체 카테고리', ...names]);
        }
      } catch {
        if (isMounted) setProductCategoryOptions(['전체 카테고리']);
      }
    };

    fetchProductCategories();
    return () => {
      isMounted = false;
    };
  }, [selectedShopId]);

  const brandNameList = brandOptions.filter((b) => b !== '전체');
  const productCategoryNameList = productCategoryOptions.filter((c) => c !== '전체 카테고리');

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'In Stock':
        return 'success';
      case 'Low Stock':
        return 'warning';
      case 'Out of Stock':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStockColor = (stock: number, status: string) => {
    if (status === 'Out of Stock') return 'text-red-600';
    if (status === 'Low Stock') return 'text-orange-600';
    return 'text-black';
  };

  // Comment: Adjust draft stock for a given product
  const adjustStock = (id: number, delta: number) => {
    setStockDrafts((prev) => {
      const current = prev[id] ?? 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  // Comment: Derived inventory summary values from current products
  const totalProducts = products.length;
  const lowStockItems = products.filter((p) => {
    const draft = stockDrafts[p.id] ?? p.stock;
    return p.status === 'Low Stock' || draft <= 5;
  }).length;
  const inventoryValue = products.reduce((sum, p) => {
    const draft = stockDrafts[p.id] ?? p.stock;
    return sum + Number(p.price || 0) * Number(draft || 0);
  }, 0);

  const hasChanges = products.some((p) => (stockDrafts[p.id] ?? p.stock) !== p.stock);
  const isOverview = viewKey === 'overview';

  // Comment: Filter table by category, status, search, brand on the client; stats always use full products
  const filteredProducts = (() => {
    let list = products;
    if (category !== '전체 카테고리') {
      list = list.filter(
        (p) => resolveInventoryProductCategory(p, brandNameList, productCategoryNameList) === category,
      );
    }
    if (status !== '전체 상태') {
      list = list.filter((p) => p.status === status);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.name?.toLowerCase().includes(q) ?? false) ||
          (p.sku?.toLowerCase().includes(q) ?? false)
      );
    }
    if (brand !== '전체') {
      list = list.filter((p) => resolveInventoryBrand(p, brandNameList) === brand);
    }
    return list;
  })();

  // Comment: Save all changed stock quantities to the database
  const handleSaveInventory = async () => {
    if (!hasChanges) return;
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const items = products
        .map((p) => ({
          id: p.id,
          stock: stockDrafts[p.id] ?? p.stock,
        }))
        .filter((item) => item.stock !== products.find((p) => p.id === item.id)?.stock);

      const res = await fetch(buildInventoryUrl('/api/inventory', selectedShopId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: selectedShopId, items }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save inventory');
      }

      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          stock: stockDrafts[p.id] ?? p.stock,
        }))
      );

      setSuccessMessage('재고가 성공적으로 저장되었습니다.');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || '재고 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (product: InventoryItem) => {
    if (!window.confirm(`"${product.name}"을(를) 삭제하시겠습니까?`)) return;
    try {
      setDeletingProductId(product.id);
      setError(null);
      const res = await fetch(
        `/api/inventory/${product.id}?${new URLSearchParams({ shop_id: String(selectedShopId) }).toString()}`,
        { method: 'DELETE' },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '삭제에 실패했습니다.');
      }
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setSuccessMessage('상품이 삭제되었습니다.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || '삭제에 실패했습니다.');
    } finally {
      setDeletingProductId(null);
    }
  };

  const inventoryColumns = [
    {
      key: 'name',
      header: '상품명',
      render: (product: InventoryItem) => (
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
            <span className="material-symbols-outlined">{product.icon}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-black">{product.name}</span>
            <span className="text-xs text-gray-400">{product.size}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'brand',
      header: '브랜드',
      render: (product: InventoryItem) => (
        <span className="text-gray-600">
          {resolveInventoryBrand(product, brandNameList) ?? '—'}
        </span>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (product: InventoryItem) => (
        <span className="text-gray-500">{product.sku}</span>
      ),
    },
    {
      key: 'category',
      header: '카테고리',
      render: (product: InventoryItem) => {
        const label = resolveInventoryProductCategory(
          product,
          brandNameList,
          productCategoryNameList,
        );
        return label ? <Badge>{label}</Badge> : <span className="text-gray-400">—</span>;
      },
    },
    {
      key: 'price',
      header: '가격 (AUD)',
      render: (product: InventoryItem) => (
        <span className="font-medium">${Number(product.price || 0).toFixed(2)}</span>
      ),
    },
    {
      key: 'stock',
      header: '재고 수량',
      render: (product: InventoryItem) => (
        <span
          className={`font-bold ${getStockColor(product.stock, product.status)}`}
        >
          {product.stock}
        </span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      render: (product: InventoryItem) => (
        <Badge variant={getStatusBadgeVariant(product.status)}>
          <span className="size-1.5 rounded-full bg-current mr-1.5" />
          {product.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (product: InventoryItem) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            title="수정"
            onClick={() => setEditingProduct(product)}
            className="p-1.5 rounded-md text-gray-500 hover:text-black hover:bg-gray-100"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
          </button>
          <button
            type="button"
            title="삭제"
            disabled={deletingProductId === product.id}
            onClick={() => handleDeleteProduct(product)}
            className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      ),
    },
  ];


  return (
    <AdminPageLayout>
      <PageHeader
        title={activeView.title}
        actions={
          <>
            <Select
              value={String(selectedShopId)}
              onChange={(e) => setSelectedShopId(Number(e.target.value))}
              options={shops.map((shop) => ({ value: String(shop.id), label: shop.name }))}
              className="min-w-[150px]"
            />
            {isOverview ? (
              <Button
                variant="primary"
                icon="add"
                onClick={() => setShowAddProductModal(true)}
              >
                상품 추가
              </Button>
            ) : null}
          </>
        }
      />
      {isOverview ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="총 상품 수"
              value={loading ? '...' : totalProducts}
              icon="inventory"
            />
            <StatCard
              label="재고 부족 상품"
              value={loading ? '...' : lowStockItems}
              icon="warning"
            />
            <StatCard
              label="재고 금액"
              value={
                loading
                  ? '...'
                  : `$${inventoryValue.toLocaleString()} AUD`
              }
              icon="attach_money"
            />
            <StatCard
              label="내부 소모"
              value={loading ? '...' : `${internalUsageUnits.toLocaleString()} units`}
              icon="water_drop"
            />
          </div>
          {error && <FormAlert message={error} variant="error" />}
          {successMessage && <FormAlert message={successMessage} variant="success" />}
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="상품명, SKU 검색..."
            rightContent={
              <div className="flex items-center gap-3">
                <Select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  options={brandOptions.map((opt) => ({ value: opt, label: opt }))}
                  className="min-w-[120px]"
                />
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={productCategoryOptions.map((opt) => ({
                    value: opt,
                    label: opt,
                  }))}
                />
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={[
                    { value: '전체 상태', label: '전체 상태' },
                    { value: 'In Stock', label: '재고 있음' },
                    { value: 'Low Stock', label: '재고 부족' },
                    { value: 'Out of Stock', label: '재고 없음' },
                  ]}
                />
              </div>
            }
          />
          <DataTable
            columns={inventoryColumns}
            data={filteredProducts}
            keyExtractor={(p) => p.id}
            loading={loading}
            emptyMessage={
              products.length === 0
                ? '등록된 재고가 없습니다.'
                : '선택한 브랜드에 해당하는 재고가 없습니다.'
            }
          />
        </>
      ) : viewKey === 'usage' ? (
        <InternalUsageView shopId={selectedShopId} />
      ) : viewKey === 'adjustments' ? (
        <AdjustmentHistoryView shopId={selectedShopId} />
      ) : viewKey === 'history' ? (
        <InventoryMovementHistoryView shopId={selectedShopId} />
      ) : viewKey === 'purchases' ? (
        <PurchasesView shopId={selectedShopId} />
      ) : viewKey === 'vendors' ? (
        <SuppliersView shopId={selectedShopId} />
      ) : (
        <InventorySubView view={activeView} />
      )}

      {isOverview && showAddProductModal && (
        <AddProductModal
          shopId={selectedShopId}
          onClose={() => setShowAddProductModal(false)}
          onCreated={(item) => {
            setProducts((prev) => [...prev, item]);
            setStockDrafts((prev) => ({ ...prev, [item.id]: item.stock }));
            setShowAddProductModal(false);
          }}
        />
      )}

      {isOverview && editingProduct && (
        <EditProductModal
          shopId={selectedShopId}
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onUpdated={(item) => {
            setProducts((prev) => prev.map((p) => (p.id === item.id ? item : p)));
            setEditingProduct(null);
          }}
        />
      )}
    </AdminPageLayout>
  );
}

type InventorySubViewProps = {
  view: InventoryView;
};

function InventorySubView({ view }: InventorySubViewProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5.5 md:p-7.5">
      <div className="flex items-start gap-4">
        <div className="size-12 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center">
          <span className="material-symbols-outlined text-2xl">{view.icon}</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-black">{view.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{view.subtitle}</p>
        </div>
      </div>
      <div className="mt-5.5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {view.highlights.map((highlight) => (
          <div
            key={highlight.title}
            className="border border-gray-200 rounded-2xl p-4.5 bg-gray-50/50 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-white border border-gray-200 text-gray-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">
                  {highlight.icon}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{highlight.title}</p>
                <p className="text-xs text-gray-500 mt-1">{highlight.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5.5 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
        상세 화면은 요구사항을 확인한 뒤 이 영역에 구성됩니다.
      </div>
    </div>
  );
}

// Comment: Internal usage list view (내부 소모 내역)
function InternalUsageView({ shopId }: { shopId: number }) {
  const todayStr = todayDateString();
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [type, setType] = useState('전체');
  const [productSearch, setProductSearch] = useState('');
  const [staff, setStaff] = useState('전체');
  const [staffOptions, setStaffOptions] = useState<string[]>([]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingRow, setEditingRow] = useState<
    | {
        id: number;
        inventory_item_id: number | null;
        product_name: string | null;
        quantity: number;
        staff_name: string | null;
        memo: string | null;
        used_at: string;
      }
    | null
  >(null);
  const [rows, setRows] = useState<
    {
      id: number;
      inventory_item_id: number | null;
      used_at: string;
      staff_name: string | null;
      product_code: string | null;
      product_name: string | null;
      unit_price: number | null;
      quantity: number;
      amount: number | null;
      memo: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Comment: Keep staff filters scoped to the selected venue.
  useEffect(() => {
    setStaff('전체');
    const fetchStaffOptions = async () => {
      try {
        const res = await fetch(`/api/staff?shop_id=${shopId}`);
        const data = await res.json();
        const names = Array.isArray(data.staff)
          ? data.staff.map((s: { name?: string | null }) => String(s.name || '')).filter(Boolean)
          : [];
        setStaffOptions(names);
      } catch {
        setStaffOptions([]);
      }
    };

    fetchStaffOptions();
  }, [shopId]);

  // Comment: Load internal usage rows from API
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (startDate) params.append('from', startDate);
        if (endDate) params.append('to', endDate);
        if (type && type !== '전체') params.append('category', type);
        if (productSearch.trim()) params.append('search', productSearch.trim());
        if (staff && staff !== '전체') params.append('staff', staff);

        const res = await fetch(buildInventoryUrl('/api/inventory-usage', shopId, params));
        const data = await res.json();
        setRows(Array.isArray(data.rows) ? data.rows : []);
      } catch (e: any) {
        setError(e?.message ?? '내부 소모 내역을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [startDate, endDate, type, productSearch, staff, reloadKey, shopId]);

  const usageColumns = [
    { key: 'used_at', header: '날짜', render: (row: typeof rows[number]) => formatDateTime(row.used_at) },
    { key: 'staff_name', header: '담당자', render: (row: typeof rows[number]) => row.staff_name ?? '' },
    { key: 'product_code', header: '제품코드', render: (row: typeof rows[number]) => row.product_code ?? '' },
    { key: 'product_name', header: '제품명', render: (row: typeof rows[number]) => row.product_name ?? '' },
    { key: 'unit_price', header: '단가', align: 'right' as const, render: (row: typeof rows[number]) => row.unit_price != null ? row.unit_price.toLocaleString() : '' },
    { key: 'quantity', header: '수량', align: 'right' as const, render: (row: typeof rows[number]) => row.quantity },
    { key: 'amount', header: '금액', align: 'right' as const, render: (row: typeof rows[number]) => row.amount != null ? row.amount.toLocaleString() : '' },
    { key: 'memo', header: '메모', render: (row: typeof rows[number]) => row.memo ?? '' },
    {
      key: 'edit',
      header: '수정',
      align: 'right' as const,
      render: (row: typeof rows[number]) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setEditingRow({
              id: row.id,
              inventory_item_id: row.inventory_item_id ?? null,
              product_name: row.product_name,
              quantity: row.quantity,
              staff_name: row.staff_name,
              memo: row.memo,
              used_at: row.used_at,
            })
          }
        >
          수정
        </Button>
      ),
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4.5 md:p-5.5 flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-start md:items-center justify-start">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">기간</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-auto"
          />
          <span className="text-gray-400">~</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">분류</span>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[{ value: '전체', label: '전체' }]}
            className="min-w-[100px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">제품</span>
          <Input
            type="text"
            placeholder="제품코드 또는 제품명"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="min-w-[200px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">담당자</span>
          <Select
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
            options={[
              { value: '전체', label: '전체' },
              ...staffOptions.map((name) => ({ value: name, label: name })),
            ]}
            className="min-w-[100px]"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="primary" onClick={() => setShowRegisterModal(true)}>
            내부 소모 등록
          </Button>
        </div>
      </div>
      {error && <FormAlert message={error} variant="error" />}
      <div className="text-sm text-gray-500">
        총 <span className="font-semibold">{rows.length}</span>건
      </div>
      <DataTable
        columns={usageColumns}
        data={rows}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="내역이 없습니다."
      />
      {showRegisterModal && (
        <InternalUsageRegisterModal
          shopId={shopId}
          onClose={() => setShowRegisterModal(false)}
          onSaved={(savedDates) => {
            if (savedDates && savedDates.length > 0) {
              const sorted = [...savedDates].sort();
              const minDate = sorted[0];
              const maxDate = sorted[sorted.length - 1];
              if (startDate > minDate) setStartDate(minDate);
              if (endDate < maxDate) setEndDate(maxDate);
            }
            setReloadKey((prev) => prev + 1);
          }}
        />
      )}
      {editingRow && (
        <InternalUsageEntryModal
          mode="edit"
          shopId={shopId}
          usageId={editingRow.id}
          inventoryItemId={editingRow.inventory_item_id ?? undefined}
          productName={editingRow.product_name ?? ''}
          defaultQuantity={editingRow.quantity}
          defaultStaff={editingRow.staff_name ?? ''}
          defaultMemo={editingRow.memo ?? ''}
          defaultDate={
            editingRow.used_at && editingRow.used_at.length >= 10
              ? editingRow.used_at.slice(0, 10)
              : todayDateString()
          }
          onSaved={() => {
            setReloadKey((prev) => prev + 1);
          }}
          onClose={() => setEditingRow(null)}
        />
      )}
    </div>
  );
}

// Comment: Purchases main view (매입 / 반품 목록)
function PurchasesView({ shopId }: { shopId: number }) {
  const todayStr = todayDateString();
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [supplier, setSupplier] = useState('');
  const [type, setType] = useState<'all' | 'purchase' | 'return'>('all');
  const [rows, setRows] = useState<
    {
      id: number;
      type: 'purchase' | 'return';
      purchase_date: string;
      supplier_name: string | null;
      total_amount: number;
      memo: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<'purchase' | 'return' | null>(null);

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (startDate) params.append('from', startDate);
        if (endDate) params.append('to', endDate);
        if (type !== 'all') params.append('type', type);
        if (supplier.trim()) params.append('supplier', supplier.trim());

        const res = await fetch(buildInventoryUrl('/api/inventory-purchases', shopId, params));
        const data = await res.json();
        setRows(Array.isArray(data.rows) ? data.rows : []);
      } catch (e: any) {
        setError(e?.message ?? '매입 내역을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, [startDate, endDate, type, supplier, shopId]);

  const totalCount = rows.length;
  const totalAmount = rows.reduce((sum, r) => sum + Number(r.total_amount ?? 0), 0);

  const purchaseColumns = [
    { key: 'type', header: '구분', render: (row: typeof rows[number]) => row.type === 'purchase' ? '매입' : '반품' },
    { key: 'purchase_date', header: '날짜', render: (row: typeof rows[number]) => formatDateTime(row.purchase_date) },
    { key: 'supplier_name', header: '공급처', render: (row: typeof rows[number]) => row.supplier_name ?? '' },
    { key: 'total_amount', header: '금액', align: 'right' as const, render: (row: typeof rows[number]) => Number(row.total_amount ?? 0).toLocaleString() },
    { key: 'memo', header: '메모', render: (row: typeof rows[number]) => row.memo ?? '' },
    {
      key: 'detail',
      header: '상세보기',
      align: 'center' as const,
      render: (row: typeof rows[number]) => (
        <Button variant="outline" size="sm" onClick={() => setDetailId(row.id)}>
          보기
        </Button>
      ),
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-5.5 flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-start md:items-center justify-start">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">기간</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-auto"
          />
          <span className="text-gray-400">~</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">공급처</span>
          <Input
            type="text"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="전체"
            className="min-w-[160px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">구분</span>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            options={[
              { value: 'all', label: '전체' },
              { value: 'purchase', label: '매입' },
              { value: 'return', label: '반품' },
            ]}
            className="min-w-[100px]"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setEditMode('purchase')}>
            매입 등록
          </Button>
          <Button variant="outline" onClick={() => setEditMode('return')}>
            반품 등록
          </Button>
          <Button variant="primary">검색</Button>
        </div>
      </div>
      {error && <FormAlert message={error} variant="error" />}
      <div className="text-xs text-gray-500">
        총 <span className="font-semibold">{totalCount}</span> 건, 총 금액{' '}
        <span className="font-semibold">
          {totalAmount.toLocaleString()}
        </span>
      </div>
      <DataTable
        columns={purchaseColumns}
        data={rows}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="내역이 없습니다."
      />
      {detailId && (
        <PurchaseDetailModal id={detailId} shopId={shopId} onClose={() => setDetailId(null)} />
      )}
      {editMode && (
        <PurchaseEditModal mode={editMode} shopId={shopId} onClose={() => setEditMode(null)} />
      )}
    </div>
  );
}

// Comment: Supplier management view (매입처 관리)
function SuppliersView({ shopId }: { shopId: number }) {
  const [showInactive, setShowInactive] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [rows, setRows] = useState<
    {
      id: number;
      name: string;
      contact_name: string | null;
      mobile_phone: string | null;
      phone: string | null;
      fax: string | null;
      email: string | null;
      memo: string | null;
      is_active: boolean;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editSupplier, setEditSupplier] = useState<
    | {
        id?: number;
        name: string;
        contact_name: string;
        mobile_phone: string;
        phone: string;
        fax: string;
        email: string;
        memo: string;
        is_active: boolean;
      }
    | null
  >(null);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.append('onlyActive', showInactive ? 'false' : 'true');
        const res = await fetch(buildInventoryUrl('/api/inventory-suppliers', shopId, params));
        const data = await res.json();
        const list: any[] = Array.isArray(data.suppliers) ? data.suppliers : [];
        setRows(
          list.map((s) => ({
            id: s.id,
            name: s.name,
            contact_name: s.contact_name ?? null,
            mobile_phone: s.mobile_phone ?? null,
            phone: s.phone ?? null,
            fax: s.fax ?? null,
            email: s.email ?? null,
            memo: s.memo ?? null,
            is_active: s.is_active ?? true,
          }))
        );
      } catch (e: any) {
        setError(e?.message ?? '매입처 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, [showInactive, reloadKey, shopId]);

  const openCreate = () => {
    setEditSupplier({
      id: undefined,
      name: '',
      contact_name: '',
      mobile_phone: '',
      phone: '',
      fax: '',
      email: '',
      memo: '',
      is_active: true,
    });
  };

  const openEdit = (row: (typeof rows)[number]) => {
    setEditSupplier({
      id: row.id,
      name: row.name,
      contact_name: row.contact_name ?? '',
      mobile_phone: row.mobile_phone ?? '',
      phone: row.phone ?? '',
      fax: row.fax ?? '',
      email: row.email ?? '',
      memo: row.memo ?? '',
      is_active: row.is_active,
    });
  };

  const handleSaved = () => {
    setEditSupplier(null);
    setReloadKey((prev) => prev + 1);
  };

  const supplierColumns = [
    {
      key: 'name',
      header: '매입처',
      render: (row: typeof rows[number]) => (
        <>
          {row.name}{' '}
          {!row.is_active && (
            <Badge variant="default" size="sm">미사용</Badge>
          )}
        </>
      ),
    },
    { key: 'contact_name', header: '담당자', render: (row: typeof rows[number]) => row.contact_name ?? '' },
    { key: 'phone', header: '전화 번호', render: (row: typeof rows[number]) => row.phone ?? '' },
    { key: 'mobile_phone', header: '휴대폰 번호', render: (row: typeof rows[number]) => row.mobile_phone ?? '' },
    { key: 'fax', header: '팩스', render: (row: typeof rows[number]) => row.fax ?? '' },
    { key: 'email', header: '이메일', render: (row: typeof rows[number]) => row.email ?? '' },
    { key: 'memo', header: '메모', render: (row: typeof rows[number]) => row.memo ?? '' },
    {
      key: 'edit',
      header: '수정',
      align: 'center' as const,
      render: (row: typeof rows[number]) => (
        <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
          수정
        </Button>
      ),
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-5.5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded-lg border border-gray-200"
          />
          미사용 보기
        </label>
        <Button variant="outline" onClick={openCreate}>
          매입처 등록
        </Button>
      </div>
      {error && <FormAlert message={error} variant="error" />}
      <DataTable
        columns={supplierColumns}
        data={rows}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="내역이 없습니다."
      />
      {editSupplier && (
        <SupplierEditModal
          shopId={shopId}
          supplier={editSupplier}
          onClose={() => setEditSupplier(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

type SupplierEditModalProps = {
  shopId: number;
  supplier: {
    id?: number;
    name: string;
    contact_name: string;
    mobile_phone: string;
    phone: string;
    fax: string;
    email: string;
    memo: string;
    is_active: boolean;
  };
  onClose: () => void;
  onSaved: () => void;
};

// Comment: Supplier create/edit modal (매입처 등록/수정)
function SupplierEditModal({ shopId, supplier, onClose, onSaved }: SupplierEditModalProps) {
  const [form, setForm] = useState(supplier);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!form.id;

  const handleChange = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('공급 업체 명은 필수입니다.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const payload: any = {
        id: form.id,
        shopId,
        name: form.name.trim(),
        contactName: form.contact_name || null,
        mobilePhone: form.mobile_phone || null,
        phone: form.phone || null,
        fax: form.fax || null,
        email: form.email || null,
        memo: form.memo || null,
        isActive: form.is_active,
      };

      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(buildInventoryUrl('/api/inventory-suppliers', shopId), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '저장에 실패했습니다.');
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message ?? '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!form.id) {
      onClose();
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(buildInventoryUrl('/api/inventory-suppliers', shopId), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: form.id, shopId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '삭제에 실패했습니다.');
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message ?? '삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEdit ? '매입처 수정' : '매입처 등록'}
      footer={
        <>
          {isEdit && (
            <Button variant="danger" onClick={handleDelete} disabled={loading}>
              삭제
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSave} loading={loading}>
            {loading ? '저장 중...' : '저장'}
          </Button>
        </>
      }
    >
      {error && <FormAlert message={error} variant="error" className="mb-4" />}
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-20 text-gray-700">
            공급 업체 명 <span className="text-red-500">*</span>
          </div>
          <Input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            wrapperClassName="flex-1"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20 text-gray-700">담당자</div>
          <Input
            type="text"
            value={form.contact_name}
            onChange={(e) => handleChange('contact_name', e.target.value)}
            wrapperClassName="flex-1"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20 text-gray-700">휴대폰 번호</div>
          <Input
            type="text"
            value={form.mobile_phone}
            onChange={(e) => handleChange('mobile_phone', e.target.value)}
            wrapperClassName="flex-1"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20 text-gray-700">전화 번호</div>
          <Input
            type="text"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            wrapperClassName="flex-1"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20 text-gray-700">팩스</div>
          <Input
            type="text"
            value={form.fax}
            onChange={(e) => handleChange('fax', e.target.value)}
            wrapperClassName="flex-1"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20 text-gray-700">이메일</div>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            wrapperClassName="flex-1"
          />
        </div>
        <div className="flex items-start gap-3">
          <div className="w-20 text-gray-700">메모</div>
          <textarea
            value={form.memo}
            onChange={(e) => handleChange('memo', e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[80px] focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <div className="w-20 text-gray-700">상태</div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => handleChange('is_active', e.target.checked)}
              className="rounded-lg border border-gray-200"
            />
            사용
          </label>
        </div>
      </div>
    </Modal>
  );
}

// Comment: Stock adjustment history view (재고 조정 내역)
function AdjustmentHistoryView({ shopId }: { shopId: number }) {
  const todayStr = todayDateString();
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [productSearch, setProductSearch] = useState('');
  const [rows, setRows] = useState<
    {
      id: number;
      adjusted_at: string;
      product_code: string | null;
      product_name: string | null;
      before_stock: number;
      after_stock: number;
      diff: number;
      memo: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Comment: Load stock adjustment history from API
  useEffect(() => {
    const fetchAdjustments = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (startDate) params.append('from', startDate);
        if (endDate) params.append('to', endDate);
        if (productSearch.trim()) params.append('search', productSearch.trim());

        const res = await fetch(buildInventoryUrl('/api/inventory-adjustments', shopId, params));
        const data = await res.json();
        setRows(Array.isArray(data.rows) ? data.rows : []);
      } catch (e: any) {
        setError(e?.message ?? '재고 조정 내역을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchAdjustments();
  }, [startDate, endDate, productSearch, shopId]);

  const adjustmentColumns = [
    { key: 'adjusted_at', header: '날짜', render: (row: typeof rows[number]) => formatDateTime(row.adjusted_at) },
    { key: 'product_code', header: '제품코드', render: (row: typeof rows[number]) => row.product_code ?? '' },
    { key: 'product_name', header: '제품명', render: (row: typeof rows[number]) => row.product_name ?? '' },
    { key: 'before_stock', header: '변경 전', align: 'right' as const, render: (row: typeof rows[number]) => <span className="text-red-600">{row.before_stock.toLocaleString()}</span> },
    { key: 'after_stock', header: '변경 후', align: 'right' as const, render: (row: typeof rows[number]) => row.after_stock.toLocaleString() },
    { key: 'diff', header: '변동 수량', align: 'right' as const, render: (row: typeof rows[number]) => row.diff.toLocaleString() },
    { key: 'memo', header: '메모', render: (row: typeof rows[number]) => row.memo ?? '' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-5.5 flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-start md:items-center justify-start">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">기간</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-auto"
          />
          <span className="text-gray-400">~</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">제품</span>
          <Input
            type="text"
            placeholder="제품코드 또는 제품명"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="min-w-[200px]"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setShowAdjustModal(true)}>
            재고 임의 조정
          </Button>
          <Button variant="primary">검색</Button>
        </div>
      </div>
      {error && <FormAlert message={error} variant="error" />}
      <div className="text-xs text-gray-500">
        총 <span className="font-semibold">{rows.length}</span> 건
      </div>
      <DataTable
        columns={adjustmentColumns}
        data={rows}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="내역이 없습니다."
      />
      {showAdjustModal && (
        <StockAdjustmentModal shopId={shopId} onClose={() => setShowAdjustModal(false)} />
      )}
    </div>
  );
}

type MovementRow = {
  createdAt: string;
  userId: string;
  productCode: string;
  productName: string;
  type: string;
  diff: number;
  currentStock: number;
};

// Comment: Inventory movement history view (재고 변동 이력)
function InventoryMovementHistoryView({ shopId }: { shopId: number }) {
  const todayStr = todayDateString();
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [productCode, setProductCode] = useState('');
  const [category, setCategory] = useState('전체');
  const [selected, setSelected] = useState<MovementRow | null>(null);
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comment: Load inventory movement history from API
  useEffect(() => {
    const fetchMovements = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (startDate) params.append('from', startDate);
        if (endDate) params.append('to', endDate);
        if (productCode.trim()) params.append('productCode', productCode.trim());
        if (category && category !== '전체') params.append('category', category);

        const res = await fetch(buildInventoryUrl('/api/inventory-movements', shopId, params));
        const data = await res.json();
        const mapped: MovementRow[] = Array.isArray(data.rows)
          ? data.rows.map((row: any) => ({
              createdAt: row.created_at,
              userId: row.user_id,
              productCode: row.product_code,
              productName: row.product_name,
              type: row.type,
              diff: row.quantity_change,
              currentStock: row.current_stock,
            }))
          : [];
        setRows(mapped);
      } catch (e: any) {
        setError(e?.message ?? '재고 변동 이력을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchMovements();
  }, [startDate, endDate, productCode, category, shopId]);

  const movementColumns = [
    { key: 'createdAt', header: '생성일', render: (row: MovementRow) => row.createdAt },
    { key: 'userId', header: '사용자 ID', render: (row: MovementRow) => row.userId },
    { key: 'productCode', header: '제품코드', render: (row: MovementRow) => row.productCode },
    { key: 'productName', header: '제품명', render: (row: MovementRow) => row.productName },
    { key: 'type', header: '구분', render: (row: MovementRow) => row.type },
    { key: 'diff', header: '변동 수량', align: 'right' as const, render: (row: MovementRow) => row.diff > 0 ? `+${row.diff}` : row.diff },
    { key: 'currentStock', header: '현 재고', align: 'right' as const, render: (row: MovementRow) => row.currentStock.toLocaleString() },
    {
      key: 'detail',
      header: '상세',
      align: 'center' as const,
      render: (row: MovementRow) => (
        <Button variant="outline" size="sm" onClick={() => setSelected(row)}>
          보기
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-5.5 flex flex-col gap-4">
        <div className="flex flex-wrap gap-3 items-start md:items-center justify-start">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">기간</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-auto"
            />
            <span className="text-gray-400">~</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">제품</span>
            <Input
              type="text"
              placeholder="제품코드"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              className="min-w-[140px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">구분</span>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[{ value: '전체', label: '전체' }]}
              className="min-w-[100px]"
            />
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="primary">검색</Button>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          총 <span className="font-semibold">{rows.length}</span> 건
        </div>
        <DataTable
          columns={movementColumns}
          data={rows}
          keyExtractor={(row) => `${row.productCode}-${row.createdAt}-${row.userId}`}
          loading={loading}
          emptyMessage="내역이 없습니다."
        />
        <div className="text-xs text-gray-500 border-t border-gray-200 pt-3">
          · 생성일은 사용자가 시스템에 등록한 일시를 의미합니다.
          <br />
          · 판매/매입/내부 소모 등록 시 날짜를 변경한 경우 실제 재고 변동일시와 시스템 생성일시가
          다르다는 점에 유의하시기 바랍니다.
        </div>
      </div>

      {selected && (
        <InventoryMovementDetailModal row={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

type InventoryMovementDetailModalProps = {
  row: MovementRow;
  onClose: () => void;
};

// Comment: Detail modal for inventory movement row (판매 상세와 유사한 구조)
function InventoryMovementDetailModal({ row, onClose }: InventoryMovementDetailModalProps) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="판매 상세"
      maxWidth="max-w-4xl"
      scrollable
      footer={
        <div className="flex justify-end w-full">
          <Button variant="primary" onClick={onClose}>
            닫기
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-800">
          <div className="font-medium">{row.productName}</div>
          <div className="text-gray-500 text-xs mt-1">
            {row.createdAt} · {row.userId}
          </div>
        </div>
        {/* Complex table with specific layout - kept as custom table */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5.5 py-4 text-left">판매 항목</th>
                <th className="px-5.5 py-4 text-right">단가</th>
                <th className="px-5.5 py-4 text-right">수량</th>
                <th className="px-5.5 py-4 text-right">할인</th>
                <th className="px-5.5 py-4 text-right">금액</th>
                <th className="px-5.5 py-4 text-left">담당자</th>
                <th className="px-5.5 py-4 text-left">영업 구분</th>
                <th className="px-5.5 py-4 text-right">포인트 차감</th>
                <th className="px-5.5 py-4 text-right">정액권 차감</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100">
                <td className="px-5.5 py-4">{row.productName}</td>
                <td className="px-5.5 py-4 text-right">6,500</td>
                <td className="px-5.5 py-4 text-right">1</td>
                <td className="px-5.5 py-4 text-right">0</td>
                <td className="px-5.5 py-4 text-right">6,500</td>
                <td className="px-5.5 py-4">winter 선생님</td>
                <td className="px-5.5 py-4">매출</td>
                <td className="px-5.5 py-4 text-right">0</td>
                <td className="px-5.5 py-4 text-right">0</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr,2fr] gap-4">
          <div className="border border-gray-200 rounded-xl p-4 text-sm space-y-1">
            <div className="font-semibold text-gray-800 mb-1">결제</div>
            <div className="flex justify-between">
              <span className="text-gray-600">판매 금액</span>
              <span className="font-medium text-gray-800">56,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">할인 금액</span>
              <span className="font-medium text-gray-800">0</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-1">
              <span className="font-semibold text-gray-800">합계</span>
              <span className="font-semibold text-sky-600">56,000</span>
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl p-4 text-sm space-y-2">
            <div className="font-semibold text-gray-800 mb-1">메모</div>
            <div className="min-h-[60px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 text-sm">
              7Cb + mint
            </div>
            <div className="text-xs text-gray-500">
              등록자 {row.userId} {row.createdAt}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

type InternalUsageRegisterModalProps = {
  shopId: number;
  onClose: () => void;
  onSaved?: (savedDates: string[]) => void;
};

// Comment: Modal for registering internal usage based on inventory items
function InternalUsageRegisterModal({ shopId, onClose, onSaved }: InternalUsageRegisterModalProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([
    { value: '전체', label: '전체' },
  ]);
  const [staffOptions, setStaffOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [category, setCategory] = useState('전체');
  const [includeRetail, setIncludeRetail] = useState(false);
  const [selectedRows, setSelectedRows] = useState<
    Array<{
      rowId: string;
      inventoryItemId: number;
      productName: string;
      quantity: number;
      staffName: string;
      memo: string;
      usedAt: string;
      unitPrice: number;
    }>
  >([]);

  const filteredItems = items.filter((item) => {
    if (productSearch.trim()) {
      const q = productSearch.trim().toLowerCase();
      const displayCode = String(item.sku ?? item.id).toLowerCase();
      const matchesSearch =
        (item.name?.toLowerCase().includes(q) ?? false) ||
        displayCode.includes(q) ||
        (item.sku?.toLowerCase().includes(q) ?? false);
      if (!matchesSearch) return false;
    }
    if (category && category !== '전체' && item.category !== category) {
      return false;
    }
    if (!includeRetail && item.for_retail === true && item.for_internal !== true) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(buildInventoryUrl('/api/inventory-product-categories', shopId));
        const data = await res.json();
        const list: { id: number; name: string }[] = Array.isArray(data.categories)
          ? data.categories
          : [];
        setCategoryOptions([
          { value: '전체', label: '전체' },
          ...list.map((row) => ({ value: row.name, label: row.name })),
        ]);
      } catch {
        setCategoryOptions([{ value: '전체', label: '전체' }]);
      }
    };

    fetchCategories();
  }, [shopId]);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (productSearch.trim()) params.append('search', productSearch.trim());
        const res = await fetch(buildInventoryUrl('/api/inventory', shopId, params));
        const data = await res.json();
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e: any) {
        setError(e?.message ?? '재고 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [shopId, productSearch]);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await fetch(`/api/staff?shop_id=${shopId}`);
        const data = await res.json();
        const names = Array.isArray(data.staff)
          ? data.staff.map((s: any) => String(s.name || '')).filter(Boolean)
          : [];
        setStaffOptions(names);
      } catch {
        setStaffOptions([]);
      }
    };

    fetchStaff();
  }, [shopId]);

  const todayStr = todayDateString();

  const handleAddRow = (item: InventoryItem) => {
    setSelectedRows((prev) => [
      ...prev,
      {
        rowId: `${item.id}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        inventoryItemId: item.id,
        productName: item.name,
        quantity: 1,
        staffName: '',
        memo: '',
        usedAt: todayStr,
        unitPrice: Number((item as any).cost_price ?? item.price ?? 0),
      },
    ]);
  };

  const handleSaveAll = async () => {
    if (selectedRows.length === 0) {
      setError('추가된 항목이 없습니다.');
      return;
    }
    const invalid = selectedRows.some((row) => !Number.isFinite(row.quantity) || row.quantity <= 0);
    if (invalid) {
      setError('수량은 1 이상이어야 합니다.');
      return;
    }
    const missingStaff = selectedRows.some((row) => !row.staffName || !row.staffName.trim());
    if (missingStaff) {
      setError('직원을 선택해주세요.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      for (const row of selectedRows) {
        const res = await fetch(buildInventoryUrl('/api/inventory-usage', shopId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inventoryItemId: row.inventoryItemId,
            shopId,
            quantity: row.quantity,
            staffName: row.staffName || null,
            memo: row.memo || null,
            usedAt: row.usedAt,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || '내부 소모 저장에 실패했습니다.');
        }
      }
      onSaved?.(selectedRows.map((row) => row.usedAt));
      onClose();
    } catch (e: any) {
      setError(e?.message ?? '내부 소모를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const registerColumns = [
    { key: 'sku', header: '제품코드', render: (item: InventoryItem) => item.sku ?? item.id },
    { key: 'name', header: '제품명', render: (item: InventoryItem) => item.name },
    {
      key: 'cost_price',
      header: '입고가',
      align: 'right' as const,
      render: (item: InventoryItem) => Number((item as any).cost_price ?? item.price ?? 0).toLocaleString(),
    },
    { key: 'stock', header: '현 재고', align: 'right' as const, render: (item: InventoryItem) => Number(item.stock ?? 0).toLocaleString() },
    {
      key: 'add',
      header: '추가',
      align: 'center' as const,
      render: (item: InventoryItem) => (
        <Button variant="outline" size="sm" onClick={() => handleAddRow(item)}>
          추가
        </Button>
      ),
    },
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="내부 소모 등록"
      maxWidth="max-w-5xl"
      scrollable
      footer={
        <div className="flex justify-end w-full gap-2">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button variant="primary" onClick={handleSaveAll} loading={saving} disabled={selectedRows.length === 0}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      }
    >
      {error && <FormAlert message={error} variant="error" className="mb-4" />}
      <div className="mb-3 flex items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">분류</span>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={categoryOptions}
            className="min-w-[100px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">제품</span>
          <Input
            type="text"
            placeholder="제품코드 또는 제품명"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="min-w-[200px]"
          />
        </div>
        <label className="ml-4 inline-flex cursor-pointer items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={includeRetail}
            onChange={(e) => setIncludeRetail(e.target.checked)}
            className="rounded-lg border border-gray-200"
          />
          판매용 제품 포함
        </label>
      </div>
      <DataTable
        columns={registerColumns}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="등록된 재고가 없습니다."
      />
      <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
          <div className="col-span-3">제품명</div>
          <div className="col-span-1 text-center">수량</div>
          <div className="col-span-2">직원</div>
          <div className="col-span-3">메모</div>
          <div className="col-span-2">날짜</div>
          <div className="col-span-1 text-center">삭제</div>
        </div>
        {selectedRows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500">추가된 항목이 없습니다.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {selectedRows.map((row) => (
              <div key={row.rowId} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center text-sm">
                <div className="col-span-3 text-gray-900">{row.productName}</div>
                <div className="col-span-1 flex items-center justify-center gap-1">
                  <button
                    type="button"
                    className="px-1.5 py-0.5 border border-gray-200 rounded"
                    onClick={() =>
                      setSelectedRows((prev) =>
                        prev.map((r) =>
                          r.rowId === row.rowId
                            ? { ...r, quantity: Math.max(1, r.quantity - 1) }
                            : r,
                        ),
                      )
                    }
                  >
                    -
                  </button>
                  <span className="min-w-[18px] text-center">{row.quantity}</span>
                  <button
                    type="button"
                    className="px-1.5 py-0.5 border border-gray-200 rounded"
                    onClick={() =>
                      setSelectedRows((prev) =>
                        prev.map((r) =>
                          r.rowId === row.rowId ? { ...r, quantity: r.quantity + 1 } : r,
                        ),
                      )
                    }
                  >
                    +
                  </button>
                </div>
                <div className="col-span-2">
                  <Select
                    value={row.staffName}
                    onChange={(e) =>
                      setSelectedRows((prev) =>
                        prev.map((r) =>
                          r.rowId === row.rowId ? { ...r, staffName: e.target.value } : r,
                        ),
                      )
                    }
                    options={[{ value: '', label: '선택' }, ...staffOptions.map((name) => ({ value: name, label: name }))]}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    value={row.memo}
                    onChange={(e) =>
                      setSelectedRows((prev) =>
                        prev.map((r) =>
                          r.rowId === row.rowId ? { ...r, memo: e.target.value } : r,
                        ),
                      )
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="date"
                    value={row.usedAt}
                    onChange={(e) =>
                      setSelectedRows((prev) =>
                        prev.map((r) =>
                          r.rowId === row.rowId ? { ...r, usedAt: e.target.value } : r,
                        ),
                      )
                    }
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedRows((prev) => prev.filter((r) => r.rowId !== row.rowId))
                    }
                  >
                    삭제
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

type InternalUsageEntryModalProps = {
  mode: 'create' | 'edit';
  shopId: number;
  usageId?: number;
  inventoryItemId?: number;
  productName: string;
  defaultQuantity: number;
  defaultStaff?: string;
  defaultMemo?: string;
  defaultDate?: string;
  onSaved?: () => void;
  onClose: () => void;
};

// Comment: Small modal for internal usage create/edit
function InternalUsageEntryModal({
  mode,
  shopId,
  usageId,
  inventoryItemId,
  productName,
  defaultQuantity,
  defaultStaff = '',
  defaultMemo = '',
  defaultDate,
  onSaved,
  onClose,
}: InternalUsageEntryModalProps) {
  const [quantity, setQuantity] = useState(defaultQuantity.toString());
  const [staff, setStaff] = useState(defaultStaff);
  const [memo, setMemo] = useState(defaultMemo);
  const [date, setDate] = useState(defaultDate || todayDateString());
  const [staffOptions, setStaffOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await fetch(`/api/staff?shop_id=${shopId}`);
        const data = await res.json();
        const names = Array.isArray(data.staff)
          ? data.staff.map((s: { name?: string | null }) => String(s.name || '')).filter(Boolean)
          : [];
        setStaffOptions(names);
      } catch {
        setStaffOptions([]);
      }
    };

    fetchStaff();
  }, [shopId]);

  // Comment: Create or update internal usage entry
  const handleSave = async () => {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('수량은 1 이상 숫자로 입력해주세요.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (mode === 'edit') {
        if (!usageId) {
          setError('수정할 내역을 찾을 수 없습니다.');
          return;
        }
        const res = await fetch(buildInventoryUrl(`/api/inventory-usage/${usageId}`, shopId), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopId,
            quantity: qty,
            staffName: staff || null,
            memo: memo || null,
            usedAt: date,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || '내부 소모 수정에 실패했습니다.');
        }
      } else {
        if (!inventoryItemId) {
          setError('제품을 선택해주세요.');
          return;
        }
        const res = await fetch(buildInventoryUrl('/api/inventory-usage', shopId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inventoryItemId,
            shopId,
            quantity: qty,
            staffName: staff || null,
            memo: memo || null,
            usedAt: date,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || '내부 소모 저장에 실패했습니다.');
        }
      }

      if (onSaved) onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? '내부 소모를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // Comment: Delete usage entry and restore stock
  const handleDelete = async () => {
    if (!usageId) {
      onClose();
      return;
    }
    if (!window.confirm('이 내부 소모 내역을 삭제할까요? 재고가 복원됩니다.')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await fetch(buildInventoryUrl(`/api/inventory-usage/${usageId}`, shopId), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '삭제에 실패했습니다.');
      }
      if (onSaved) onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? '삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={mode === 'create' ? '내부 소모 등록' : '내부 소모 편집'}
      zIndex="z-[60]"
      footer={
        <>
          {mode === 'edit' && (
            <Button variant="danger" onClick={handleDelete} disabled={saving}>
              삭제
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </>
      }
    >
      {error && <FormAlert message={error} variant="error" className="mb-4" />}
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-20 text-gray-700">제품명</div>
          <Input
            type="text"
            value={productName}
            readOnly
            wrapperClassName="flex-1"
            className="bg-gray-50"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20 text-gray-700">
            수량 <span className="text-red-500">*</span>
          </div>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            wrapperClassName="flex-1"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20 text-gray-700">직원</div>
          <Select
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
            options={[
              { value: '', label: '선택' },
              ...staffOptions.map((name) => ({ value: name, label: name })),
            ]}
            placeholder="선택"
            wrapperClassName="flex-1"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20 text-gray-700">메모</div>
          <Input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            wrapperClassName="flex-1"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20 text-gray-700">날짜</div>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            wrapperClassName="flex-1"
          />
        </div>
      </div>
    </Modal>
  );
}

type StockAdjustmentModalProps = {
  shopId: number;
  onClose: () => void;
};

// Comment: Modal for arbitrary stock adjustment
function StockAdjustmentModal({ shopId, onClose }: StockAdjustmentModalProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [draftAfter, setDraftAfter] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(buildInventoryUrl('/api/inventory', shopId));
        const data = await res.json();
        const list: InventoryItem[] = Array.isArray(data.items) ? data.items : [];
        setItems(list);
        setDraftAfter(
          list.reduce(
            (acc, item) => ({
              ...acc,
              [item.id]: item.stock,
            }),
            {} as Record<number, number>
          )
        );
      } catch (e: any) {
        setError(e?.message ?? '재고 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [shopId]);

  const handleChangeAfter = (id: number, value: string) => {
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) return;
    setDraftAfter((prev) => ({ ...prev, [id]: num }));
  };

  const handleSave = async () => {
    const adjustments = items
      .map((item) => {
        const before = Number(item.stock ?? 0);
        const after = draftAfter[item.id] ?? before;
        const diff = after - before;
        return { inventory_item_id: item.id, before, after, diff };
      })
      .filter((a) => a.diff !== 0);

    if (!adjustments.length) {
      onClose();
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await fetch(buildInventoryUrl('/api/inventory-adjustments', shopId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId, adjustments }),
      });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? '재고 임의 조정을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // This table has inline editable inputs per row, keeping as custom table
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="재고 임의 조정"
      maxWidth="max-w-5xl"
      scrollable
      footer={
        <>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </>
      }
    >
      {error && <FormAlert message={error} variant="error" className="mb-4" />}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-5.5 py-4 text-left">제품코드</th>
              <th className="px-5.5 py-4 text-left">제품명</th>
              <th className="px-5.5 py-4 text-right">현 재고 (조정 전)</th>
              <th className="px-5.5 py-4 text-right">현 재고 (조정 후)</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-5.5 py-7.5 text-center text-gray-500">
                  불러오는 중입니다...
                </td>
              </tr>
            )}
            {!loading &&
              items.map((item) => {
                const before = Number(item.stock ?? 0);
                const after = draftAfter[item.id] ?? before;
                return (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-5.5 py-4">{item.sku ?? item.id}</td>
                    <td className="px-5.5 py-4">{item.name}</td>
                    <td className="px-5.5 py-4 text-right">
                      {before.toLocaleString()}
                    </td>
                    <td className="px-5.5 py-4 text-right">
                      <input
                        type="number"
                        min={0}
                        className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-right text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                        value={after}
                        onChange={(e) => handleChangeAfter(item.id, e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5.5 py-7.5 text-center text-gray-500">
                  등록된 재고가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

type PurchaseDetailModalProps = {
  id: number;
  shopId: number;
  onClose: () => void;
};

// Comment: Purchase detail modal (매입 상세)
function PurchaseDetailModal({ id, shopId, onClose }: PurchaseDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [header, setHeader] = useState<{
    type: 'purchase' | 'return';
    supplier_name: string | null;
    purchase_date: string;
    created_at: string;
    memo: string | null;
  } | null>(null);
  const [items, setItems] = useState<
    {
      id: number;
      product_code: string | null;
      product_name: string | null;
      unit_price: number;
      quantity: number;
      line_amount: number;
    }[]
  >([]);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(buildInventoryUrl(`/api/inventory-purchases/${id}`, shopId));
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || '매입 상세를 불러오지 못했습니다.');
        }
        setHeader(data.header);
        setItems(data.items ?? []);
      } catch (e: any) {
        setError(e?.message ?? '매입 상세를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, shopId]);

  const titlePrefix = header?.type === 'return' ? '반품' : '매입';

  const detailColumns = [
    { key: 'product_code', header: '제품 코드', render: (item: typeof items[number]) => item.product_code ?? '' },
    { key: 'product_name', header: '상품명', render: (item: typeof items[number]) => item.product_name ?? '' },
    { key: 'unit_price', header: '단가', align: 'right' as const, render: (item: typeof items[number]) => Number(item.unit_price ?? 0).toLocaleString() },
    { key: 'quantity', header: '수량', align: 'right' as const, render: (item: typeof items[number]) => item.quantity },
    { key: 'line_amount', header: '금액', align: 'right' as const, render: (item: typeof items[number]) => Number(item.line_amount ?? 0).toLocaleString() },
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`${titlePrefix} 상세`}
      maxWidth="max-w-4xl"
      scrollable
      footer={
        <div className="flex justify-end w-full">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <FormAlert message={error} variant="error" />}
        <div className="flex flex-col gap-1 text-sm text-gray-800">
          <div className="flex justify-between">
            <div>
              <span className="font-semibold mr-2">{titlePrefix}</span>
              <span className="text-gray-600">
                공급처: {header?.supplier_name ?? '-'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              생성일: {formatDateTime(header?.created_at) || ''}
            </div>
          </div>
          <div className="text-gray-600 text-xs">
            날짜: {formatDateTime(header?.purchase_date) || ''}{' '}
            {header?.memo && <span className="ml-2">메모: {header.memo}</span>}
          </div>
        </div>
        <DataTable
          columns={detailColumns}
          data={items}
          keyExtractor={(item) => item.id}
          loading={loading}
          emptyMessage="품목이 없습니다."
        />
      </div>
    </Modal>
  );
}

type PurchaseEditModalProps = {
  mode: 'purchase' | 'return';
  shopId: number;
  onClose: () => void;
};

// Comment: Purchase / Return edit modal (매입 등록 / 반품 등록)
function PurchaseEditModal({ mode, shopId, onClose }: PurchaseEditModalProps) {
  const [supplier, setSupplier] = useState('');
  const [supplierOptions, setSupplierOptions] = useState<string[]>([]);
  const [date, setDate] = useState(todayDateString());
  const [memo, setMemo] = useState('');
  const [items, setItems] = useState<
    { inventoryItemId: number; code: string; name: string; unitPrice: number; quantity: number }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showItemPicker, setShowItemPicker] = useState(false);

  const title = mode === 'purchase' ? '매입 등록' : '반품 등록';

  const totalAmount = items.reduce(
    (sum, i) => sum + Number(i.unitPrice ?? 0) * Number(i.quantity ?? 0),
    0
  );

  // Comment: Load supplier options from database
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await fetch(buildInventoryUrl('/api/inventory-suppliers', shopId));
        const data = await res.json();
        const names: string[] = Array.isArray(data.suppliers)
          ? data.suppliers.map((s: any) => String(s.name))
          : [];
        setSupplierOptions(names);
        if (!supplier && names.length > 0) {
          setSupplier(names[0]);
        }
      } catch {
        setSupplierOptions([]);
      }
    };

    fetchSuppliers();
  }, [shopId]);

  const handleSave = async () => {
    const payloadItems = items
      .filter((i) => i.quantity > 0)
      .map((i) => ({
        inventoryItemId: i.inventoryItemId,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      }));

    if (!supplier.trim() || !date || !payloadItems.length) {
      setError('공급처, 날짜, 품목을 확인해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(buildInventoryUrl('/api/inventory-purchases', shopId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mode,
          shopId,
          supplierName: supplier.trim(),
          purchaseDate: date,
          memo: memo || null,
          items: payloadItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '저장에 실패했습니다.');
      }
      onClose();
    } catch (e: any) {
      setError(e?.message ?? '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // This table has inline editable inputs per row, keeping as custom table
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={title}
      maxWidth="max-w-5xl"
      scrollable
      footer={
        <>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSave} loading={loading}>
            {loading ? '저장 중...' : '저장'}
          </Button>
        </>
      }
    >
      {error && <FormAlert message={error} variant="error" className="mb-4" />}
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-14 text-gray-700">공급처</span>
            <Select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              options={supplierOptions.map((name) => ({ value: name, label: name }))}
              placeholder="선택"
              className="min-w-[200px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-12 text-gray-700">날짜</span>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">메모</span>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[80px] focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setShowItemPicker(true)}>
            제품 추가
          </Button>
          <div className="text-xs text-gray-500">
            총 금액{' '}
            <span className="font-semibold text-gray-900">
              {totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  <th className="px-5.5 py-4 text-left">제품 코드</th>
                  <th className="px-5.5 py-4 text-left">상품명</th>
                  <th className="px-5.5 py-4 text-right">단가</th>
                  <th className="px-5.5 py-4 text-right">수량</th>
                  <th className="px-5.5 py-4 text-right">금액</th>
                  <th className="px-5.5 py-4 text-center">삭제</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const lineAmount =
                    Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0);
                  return (
                    <tr key={`${item.inventoryItemId}-${idx}`} className="border-t border-gray-100">
                      <td className="px-5.5 py-4">{item.code}</td>
                      <td className="px-5.5 py-4">{item.name}</td>
                      <td className="px-5.5 py-4 text-right">
                        <input
                          type="number"
                          className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-right text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                          value={item.unitPrice}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((p, i) =>
                                i === idx ? { ...p, unitPrice: Number(e.target.value) } : p
                              )
                            )
                          }
                        />
                      </td>
                      <td className="px-5.5 py-4 text-right">
                        <input
                          type="number"
                          className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-right text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                          value={item.quantity}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((p, i) =>
                                i === idx ? { ...p, quantity: Number(e.target.value) } : p
                              )
                            )
                          }
                        />
                      </td>
                      <td className="px-5.5 py-4 text-right">
                        {lineAmount.toLocaleString()}
                      </td>
                      <td className="px-5.5 py-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setItems((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          삭제
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!items.length && (
                  <tr>
                    <td colSpan={6} className="px-5.5 py-7.5 text-center text-gray-500">
                      내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {showItemPicker && (
        <PurchaseItemPickerModal
          shopId={shopId}
          onClose={() => setShowItemPicker(false)}
          onConfirm={(selected) => {
            setItems((prev) => {
              const merged = [...prev];
              for (const row of selected) {
                const idx = merged.findIndex((p) => p.inventoryItemId === row.inventoryItemId);
                if (idx >= 0) {
                  merged[idx] = {
                    ...merged[idx],
                    unitPrice: row.unitPrice,
                    quantity: merged[idx].quantity + row.quantity,
                  };
                } else {
                  merged.push(row);
                }
              }
              return merged;
            });
            setShowItemPicker(false);
          }}
        />
      )}
    </Modal>
  );
}

type PurchaseItemPickerModalProps = {
  shopId: number;
  onClose: () => void;
  onConfirm: (
    items: {
      inventoryItemId: number;
      code: string;
      name: string;
      unitPrice: number;
      quantity: number;
    }[]
  ) => void;
};

// Comment: Product picker modal for purchases (제품 추가)
function PurchaseItemPickerModal({ shopId, onClose, onConfirm }: PurchaseItemPickerModalProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([
    { value: '전체 카테고리', label: '전체 카테고리' },
  ]);
  const [draft, setDraft] = useState<
    Record<number, { unitPrice: number; quantity: number }>
  >({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('전체 카테고리');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredItems =
    !category || category === '전체 카테고리'
      ? items
      : items.filter((item) => item.category === category);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(buildInventoryUrl('/api/inventory-product-categories', shopId));
        const data = await res.json();
        const list: { id: number; name: string }[] = Array.isArray(data.categories)
          ? data.categories
          : [];
        setCategoryOptions([
          { value: '전체 카테고리', label: '전체 카테고리' },
          ...list.map((row) => ({ value: row.name, label: row.name })),
        ]);
      } catch {
        setCategoryOptions([{ value: '전체 카테고리', label: '전체 카테고리' }]);
      }
    };

    fetchCategories();
  }, [shopId]);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (search.trim()) params.append('search', search.trim());
        const res = await fetch(buildInventoryUrl('/api/inventory', shopId, params));
        const data = await res.json();
        const list: InventoryItem[] = Array.isArray(data.items) ? data.items : [];
        setItems(list);
        setDraft(
          list.reduce(
            (acc, item) => ({
              ...acc,
              [item.id]: {
                unitPrice: Number(item.price ?? 0),
                quantity: 0,
              },
            }),
            {} as Record<number, { unitPrice: number; quantity: number }>
          )
        );
      } catch (e: any) {
        setError(e?.message ?? '상품 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [search, shopId]);

  const handleConfirm = () => {
    const selected = filteredItems
      .map((item) => {
        const row = draft[item.id] ?? { unitPrice: Number(item.price ?? 0), quantity: 0 };
        return {
          inventoryItemId: item.id,
          code: item.sku ?? String(item.id),
          name: item.name,
          unitPrice: row.unitPrice,
          quantity: row.quantity,
        };
      })
      .filter((row) => row.quantity > 0);

    onConfirm(selected);
  };

  // This table has inline editable inputs per row, keeping as custom table
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="제품 추가"
      maxWidth="max-w-5xl"
      zIndex="z-[60]"
      scrollable
      footer={
        <>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            확인
          </Button>
        </>
      }
    >
      {error && <FormAlert message={error} variant="error" className="mb-4" />}
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제품 코드 / 이름 / 바코드"
              className="min-w-[240px]"
            />
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categoryOptions}
              className="min-w-[140px]"
            />
          </div>
        </div>
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5.5 py-4 text-left">제품 코드</th>
                  <th className="px-5.5 py-4 text-left">상품명</th>
                  <th className="px-5.5 py-4 text-right">단가</th>
                  <th className="px-5.5 py-4 text-right">수량</th>
                  <th className="px-5.5 py-4 text-right">금액</th>
                  <th className="px-5.5 py-4 text-right">현 재고</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-5.5 py-7.5 text-center text-gray-500">
                      불러오는 중입니다...
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredItems.map((item) => {
                    const row = draft[item.id] ?? {
                      unitPrice: Number(item.price ?? 0),
                      quantity: 0,
                    };
                    const amount =
                      Number(row.unitPrice ?? 0) * Number(row.quantity ?? 0);
                    return (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="px-5.5 py-4">{item.sku ?? String(item.id)}</td>
                        <td className="px-5.5 py-4">{item.name}</td>
                        <td className="px-5.5 py-4 text-right">
                          <input
                            type="number"
                            className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-right text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                            value={row.unitPrice}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  unitPrice: Number(e.target.value),
                                },
                              }))
                            }
                          />
                        </td>
                        <td className="px-5.5 py-4 text-right">
                          <input
                            type="number"
                            className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-right text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                            value={row.quantity}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  quantity: Number(e.target.value),
                                },
                              }))
                            }
                          />
                        </td>
                        <td className="px-5.5 py-4 text-right">
                          {amount.toLocaleString()}
                        </td>
                        <td className="px-5.5 py-4 text-right">
                          {Number(item.stock ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                {!loading && filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5.5 py-7.5 text-center text-gray-500">
                      등록된 재고가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}

type AddProductModalProps = {
  shopId: number;
  onClose: () => void;
  onCreated: (item: InventoryItem) => void;
};

function AddProductModal({ shopId, onClose, onCreated }: AddProductModalProps) {
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Hair Care');
  const [price, setPrice] = useState<string>('');
  const [stock, setStock] = useState<string>('0');
  const [icon, setIcon] = useState<IconName>('inventory_2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comment: Handle add product form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(buildInventoryUrl('/api/inventory', shopId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          shopId,
          size: size || null,
          sku: sku || null,
          category,
          price: Number(price || 0),
          stock: Number(stock || 0),
          icon,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add product');
      }

      onCreated(data.item);
    } catch (err: any) {
      setError(err.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="상품 추가"
      maxWidth="max-w-lg"
      scrollable
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormAlert message={error} variant="error" />}
        <Input
          label="상품명"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="용량 / 옵션"
          type="text"
          value={size}
          onChange={(e) => setSize(e.target.value)}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="SKU"
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <Select
            label="카테고리"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: 'Hair Care', label: '헤어 케어' },
              { value: 'Coloring', label: '염색' },
              { value: 'Styling', label: '스타일링' },
              { value: 'Treatment', label: '트리트먼트' },
              { value: 'Tools', label: '도구' },
            ]}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="가격 (AUD)"
            type="number"
            min="0"
            step="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Input
            label="초기 재고"
            type="number"
            min="0"
            step="1"
            required
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">아이콘</label>
          <div className="grid grid-cols-5 gap-2">
            {ICON_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setIcon(option)}
                className={`min-w-0 w-full flex flex-col items-center justify-center gap-1 px-2 py-2 border rounded-lg text-xs overflow-hidden ${
                  icon === option
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-black/60'
                }`}
              >
                <span className="material-symbols-outlined text-base shrink-0">
                  {option}
                </span>
                <span className="truncate w-full min-w-0 text-center">{option}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 text-sm font-medium rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 transition-colors"
          >
            {loading && <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />}
            {loading ? '추가 중...' : '상품 추가'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

type EditProductModalProps = {
  shopId: number;
  product: InventoryItem;
  onClose: () => void;
  onUpdated: (item: InventoryItem) => void;
};

function EditProductModal({ shopId, product, onClose, onUpdated }: EditProductModalProps) {
  const [name, setName] = useState(product.name);
  const [size, setSize] = useState(product.size ?? '');
  const [sku, setSku] = useState(product.sku ?? '');
  const [category, setCategory] = useState(product.category);
  const [price, setPrice] = useState<string>(String(product.price ?? ''));
  const [icon, setIcon] = useState<IconName>(
    (product.icon as IconName) || 'inventory_2'
  );
  const [editStock, setEditStock] = useState<string>(String(product.stock ?? 0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comment: Handle edit product form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(buildInventoryUrl('/api/inventory', shopId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          shopId,
          name,
          size: size || null,
          sku: sku || null,
          category,
          price: Number(price || 0),
          icon,
          stock: Number(editStock ?? 0),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update product');
      }

      onUpdated(data.item);
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="상품 수정"
      maxWidth="max-w-lg"
      scrollable
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormAlert message={error} variant="error" />}
        <Input
          label="상품명"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="용량 / 옵션"
          type="text"
          value={size}
          onChange={(e) => setSize(e.target.value)}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="SKU"
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <Select
            label="카테고리"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: 'Hair Care', label: '헤어 케어' },
              { value: 'Coloring', label: '염색' },
              { value: 'Styling', label: '스타일링' },
              { value: 'Treatment', label: '트리트먼트' },
              { value: 'Tools', label: '도구' },
            ]}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="가격 (AUD)"
            type="number"
            min="0"
            step="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Input
            label="현재 재고"
            type="number"
            min="0"
            value={editStock}
            onChange={(e) => setEditStock(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">아이콘</label>
          <div className="grid grid-cols-5 gap-2">
            {ICON_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setIcon(option)}
                className={`min-w-0 w-full flex flex-col items-center justify-center gap-1 px-2 py-2 border rounded-lg text-xs overflow-hidden ${
                  icon === option
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-black/60'
                }`}
              >
                <span className="material-symbols-outlined text-base shrink-0">
                  {option}
                </span>
                <span className="truncate w-full min-w-0 text-center">{option}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 text-sm font-medium rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 transition-colors"
          >
            {loading && <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />}
            {loading ? '저장 중...' : '변경 저장'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function InventoryManagementPage() {
  return (
    <Suspense fallback={
      <AdminPageLayout>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-gray-500">Loading...</div>
        </div>
      </AdminPageLayout>
    }>
      <InventoryContent />
    </Suspense>
  );
}
