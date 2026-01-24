'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import type { InventoryItem } from '@/lib/types';
import AdminTopNav from '@/components/AdminTopNav';

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
  const [category, setCategory] = useState('All Categories');
  const [status, setStatus] = useState('All Status');
  const [brand, setBrand] = useState<string>('전체');
  const [brandOptions, setBrandOptions] = useState<string[]>(['전체']);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [stockDrafts, setStockDrafts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null);
  const searchParams = useSearchParams();
  const viewKey = searchParams.get('view') ?? 'overview';
  const activeView = INVENTORY_VIEWS[viewKey] ?? INVENTORY_VIEWS.overview;

  // Comment: Load inventory items from API using current filters
  useEffect(() => {
    if (viewKey !== 'overview') {
      return;
    }

    let isMounted = true;
    const fetchInventory = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (category !== 'All Categories') {
          params.append('category', category);
        }
        if (status !== 'All Status') {
          params.append('status', status);
        }
        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim());
        }

        const queryString = params.toString();
        const res = await fetch(`/api/inventory${queryString ? `?${queryString}` : ''}`);
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
  }, [category, status, searchQuery, viewKey]);

  // Comment: Load brand options from database
  useEffect(() => {
    let isMounted = true;
    const fetchBrands = async () => {
      try {
        const res = await fetch('/api/inventory-brands');
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
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock':
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case 'Low Stock':
        return 'text-orange-700 bg-orange-50 border-orange-100';
      case 'Out of Stock':
        return 'text-red-700 bg-red-50 border-red-100';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-100';
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

      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
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

      setSuccessMessage('Inventory saved successfully.');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save inventory');
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex flex-col">
      <AdminTopNav />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-white">
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-black">
                  {activeView.title}
                </h2>
                <p className="text-gray-500 text-sm">{activeView.subtitle}</p>
              </div>
              {isOverview && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveInventory}
                    disabled={!hasChanges || saving}
                    className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-60 disabled:hover:bg-white"
                  >
                    <span className="material-symbols-outlined text-lg">save</span>
                    {saving ? 'Saving...' : 'Save Inventory'}
                  </button>
                  <button
                    onClick={() => setShowAddProductModal(true)}
                    className="flex items-center gap-2 bg-linear-to-br from-[#111111] to-[#333333] hover:from-black hover:to-[#222222] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Add Product
                  </button>
                </div>
              )}
            </div>
            {isOverview ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-gray-50 p-2 rounded-lg text-gray-500 group-hover:text-black transition-colors">
                        <span className="material-symbols-outlined">inventory</span>
                      </div>
                    </div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Total Products</p>
                    <h3 className="text-2xl font-bold text-black">
                      {loading ? '...' : totalProducts}
                    </h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-orange-50 p-2 rounded-lg text-orange-600 group-hover:text-orange-700 transition-colors">
                        <span className="material-symbols-outlined">warning</span>
                      </div>
                      <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                        Action Needed
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Low Stock Items</p>
                    <h3 className="text-2xl font-bold text-black">
                      {loading ? '...' : lowStockItems}
                    </h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-gray-50 p-2 rounded-lg text-gray-500 group-hover:text-black transition-colors">
                        <span className="material-symbols-outlined">attach_money</span>
                      </div>
                    </div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Inventory Value</p>
                    <h3 className="text-2xl font-bold text-black">
                      {loading ? (
                        '...'
                      ) : (
                        <>
                          ${inventoryValue.toLocaleString()}{' '}
                          <span className="text-xs text-gray-400 font-normal">AUD</span>
                        </>
                      )}
                    </h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-gray-50 p-2 rounded-lg text-gray-500 group-hover:text-black transition-colors">
                        <span className="material-symbols-outlined">water_drop</span>
                      </div>
                      <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">This Month</span>
                    </div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Internal Usage</p>
                    <h3 className="text-2xl font-bold text-black">
                      142 <span className="text-sm font-normal text-gray-500">units</span>
                    </h3>
                  </div>
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-lg">
                    {successMessage}
                  </div>
                )}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="relative w-full md:w-96">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                      search
                    </span>
                    <input
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all"
                      placeholder="상품명, SKU 검색..."
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative">
                      <select
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-4 pr-10 rounded-lg text-sm focus:outline-none focus:border-black cursor-pointer min-w-[120px]"
                      >
                        {brandOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <span className="material-symbols-outlined text-lg">expand_more</span>
                      </div>
                    </div>
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-4 pr-10 rounded-lg text-sm focus:outline-none focus:border-black cursor-pointer"
                      >
                        <option>All Categories</option>
                        <option>Hair Care</option>
                        <option>Coloring</option>
                        <option>Styling</option>
                        <option>Treatment</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <span className="material-symbols-outlined text-lg">expand_more</span>
                      </div>
                    </div>
                    <div className="relative">
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-4 pr-10 rounded-lg text-sm focus:outline-none focus:border-black cursor-pointer"
                      >
                        <option>All Status</option>
                        <option>In Stock</option>
                        <option>Low Stock</option>
                        <option>Out of Stock</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <span className="material-symbols-outlined text-lg">expand_more</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                          <th className="px-6 py-4">Product Name</th>
                          <th className="px-6 py-4">SKU</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Price (AUD)</th>
                          <th className="px-6 py-4">Stock Qty</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                        {loading ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                              Loading inventory...
                            </td>
                          </tr>
                        ) : products.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                              No inventory items found.
                            </td>
                          </tr>
                        ) : (
                          products.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="size-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                    <span className="material-symbols-outlined">{product.icon}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-black">{product.name}</span>
                                    <span className="text-xs text-gray-400">{product.size}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-gray-500">{product.sku}</td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {product.category}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-medium">
                                ${Number(product.price || 0).toFixed(2)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 group">
                                  <span
                                    className={`font-bold ${getStockColor(
                                      stockDrafts[product.id] ?? product.stock,
                                      product.status
                                    )}`}
                                  >
                                    {stockDrafts[product.id] ?? product.stock}
                                  </span>
                                  <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() => adjustStock(product.id, 1)}
                                      className="leading-none text-xs text-gray-500 hover:text-black"
                                    >
                                      ▲
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => adjustStock(product.id, -1)}
                                      disabled={(stockDrafts[product.id] ?? product.stock) <= 0}
                                      className="leading-none text-xs text-gray-500 hover:text-black disabled:opacity-40"
                                    >
                                      ▼
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div
                                  className={`flex items-center gap-2 w-fit px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                    product.status
                                  )}`}
                                >
                                  <span className="size-1.5 rounded-full bg-current"></span>
                                  {product.status}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => setEditingProduct(product)}
                                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                                    title="Edit"
                                  >
                                    <span className="material-symbols-outlined text-[1.1rem]">
                                      edit
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
                    <span className="text-xs text-gray-500">
                      {loading
                        ? 'Loading...'
                        : `Showing ${products.length} item${products.length === 1 ? '' : 's'}`}
                    </span>
                    <div className="flex gap-1">
                      <button className="p-1 rounded-md text-gray-400 hover:text-black disabled:opacity-50">
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                      </button>
                      <button className="p-1 rounded-md text-gray-400 hover:text-black">
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : viewKey === 'usage' ? (
              <InternalUsageView />
            ) : viewKey === 'adjustments' ? (
              <AdjustmentHistoryView />
            ) : viewKey === 'history' ? (
              <InventoryMovementHistoryView />
            ) : viewKey === 'purchases' ? (
              <PurchasesView />
            ) : viewKey === 'vendors' ? (
              <SuppliersView />
            ) : (
              <InventorySubView view={activeView} />
            )}
          </div>
        </div>
      </main>

      {isOverview && showAddProductModal && (
        <AddProductModal
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
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onUpdated={(item) => {
            setProducts((prev) => prev.map((p) => (p.id === item.id ? item : p)));
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}

type InventorySubViewProps = {
  view: InventoryView;
};

function InventorySubView({ view }: InventorySubViewProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
      <div className="flex items-start gap-4">
        <div className="size-12 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center">
          <span className="material-symbols-outlined text-2xl">{view.icon}</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-black">{view.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{view.subtitle}</p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {view.highlights.map((highlight) => (
          <div
            key={highlight.title}
            className="border border-gray-200 rounded-2xl p-5 bg-gray-50/50 hover:bg-gray-50 transition-colors"
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
      <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
        상세 화면은 요구사항을 확인한 뒤 이 영역에 구성됩니다.
      </div>
    </div>
  );
}

// Comment: Internal usage list view (내부 소모 내역)
function InternalUsageView() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-20');
  const [type, setType] = useState('전체');
  const [productSearch, setProductSearch] = useState('');
  const [staff, setStaff] = useState('전체');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingRow, setEditingRow] = useState<
    | {
        id: number;
        product_name: string | null;
        quantity: number;
      }
    | null
  >(null);
  const [rows, setRows] = useState<
    {
      id: number;
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

        const res = await fetch(`/api/inventory-usage?${params.toString()}`);
        const data = await res.json();
        setRows(Array.isArray(data.rows) ? data.rows : []);
      } catch (e: any) {
        setError(e?.message ?? '내부 소모 내역을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [startDate, endDate, type, productSearch, staff]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6 flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">기간</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">분류</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm min-w-[100px]"
          >
            <option>전체</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">제품</span>
          <input
            type="text"
            placeholder="제품코드 또는 제품명"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm min-w-[200px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">담당자</span>
          <select
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm min-w-[100px]"
          >
            <option>전체</option>
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <button className="px-4 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50">
            검색
          </button>
          <button
            type="button"
            onClick={() => setShowRegisterModal(true)}
            className="px-4 py-1.5 rounded-md bg-slate-900 text-sm text-white hover:bg-black"
          >
            내부 소모 등록
          </button>
        </div>
      </div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <div className="text-xs text-gray-500">
        총 <span className="font-semibold">{rows.length}</span>건
      </div>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-gray-600">
                <th className="px-4 py-2 text-left">날짜</th>
                <th className="px-4 py-2 text-left">담당자</th>
                <th className="px-4 py-2 text-left">제품코드</th>
                <th className="px-4 py-2 text-left">제품명</th>
                <th className="px-4 py-2 text-right">단가</th>
                <th className="px-4 py-2 text-right">수량</th>
                <th className="px-4 py-2 text-right">금액</th>
                <th className="px-4 py-2 text-left">메모</th>
                <th className="px-4 py-2 text-center">수정</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                    불러오는 중입니다...
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-gray-100 even:bg-gray-50/40 text-gray-800"
                  >
                    <td className="px-4 py-2">{row.used_at}</td>
                    <td className="px-4 py-2">{row.staff_name ?? ''}</td>
                    <td className="px-4 py-2">{row.product_code ?? ''}</td>
                    <td className="px-4 py-2">{row.product_name ?? ''}</td>
                    <td className="px-4 py-2 text-right">
                      {row.unit_price != null ? row.unit_price.toLocaleString() : ''}
                    </td>
                    <td className="px-4 py-2 text-right">{row.quantity}</td>
                    <td className="px-4 py-2 text-right">
                      {row.amount != null ? row.amount.toLocaleString() : ''}
                    </td>
                    <td className="px-4 py-2">{row.memo ?? ''}</td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingRow({
                            id: row.id,
                            product_name: row.product_name,
                            quantity: row.quantity,
                          })
                        }
                        className="rounded-md border border-gray-400 px-3 py-1 text-xs text-gray-800 hover:bg-gray-100"
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr
                  className="border-t border-gray-100 text-gray-800"
                >
                  <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                    내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showRegisterModal && (
        <InternalUsageRegisterModal onClose={() => setShowRegisterModal(false)} />
      )}
      {editingRow && (
        <InternalUsageEntryModal
          mode="edit"
          inventoryItemId={undefined}
          productName={editingRow.product_name ?? ''}
          defaultQuantity={editingRow.quantity}
          onSaved={undefined}
          onClose={() => setEditingRow(null)}
        />
      )}
    </div>
  );
}

// Comment: Purchases main view (매입 / 반품 목록)
function PurchasesView() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-20');
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

        const res = await fetch(`/api/inventory-purchases?${params.toString()}`);
        const data = await res.json();
        setRows(Array.isArray(data.rows) ? data.rows : []);
      } catch (e: any) {
        setError(e?.message ?? '매입 내역을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, [startDate, endDate, type, supplier]);

  const totalCount = rows.length;
  const totalAmount = rows.reduce((sum, r) => sum + Number(r.total_amount ?? 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6 flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">기간</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">공급처</span>
          <input
            type="text"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="전체"
            className="border border-gray-300 rounded-md px-2 py-1 text-sm min-w-[160px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">구분</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm min-w-[100px]"
          >
            <option value="all">전체</option>
            <option value="purchase">매입</option>
            <option value="return">반품</option>
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setEditMode('purchase')}
            className="px-4 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            매입 등록
          </button>
          <button
            type="button"
            onClick={() => setEditMode('return')}
            className="px-4 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            반품 등록
          </button>
          <button className="px-4 py-1.5 rounded-md bg-slate-900 text-sm text-white hover:bg-black">
            검색
          </button>
        </div>
      </div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <div className="text-xs text-gray-500">
        총 <span className="font-semibold">{totalCount}</span> 건, 총 금액{' '}
        <span className="font-semibold">
          {totalAmount.toLocaleString()}
        </span>
      </div>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-gray-600">
                <th className="px-4 py-2 text-left">구분</th>
                <th className="px-4 py-2 text-left">날짜</th>
                <th className="px-4 py-2 text-left">공급처</th>
                <th className="px-4 py-2 text-right">금액</th>
                <th className="px-4 py-2 text-left">메모</th>
                <th className="px-4 py-2 text-center">상세보기</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    불러오는 중입니다...
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-gray-100 even:bg-gray-50/40 text-gray-800"
                  >
                    <td className="px-4 py-2">{row.type === 'purchase' ? '매입' : '반품'}</td>
                    <td className="px-4 py-2">{row.purchase_date}</td>
                    <td className="px-4 py-2">{row.supplier_name ?? ''}</td>
                    <td className="px-4 py-2 text-right">
                      {Number(row.total_amount ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{row.memo ?? ''}</td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setDetailId(row.id)}
                        className="rounded-md border border-gray-400 px-3 py-1 text-xs text-gray-800 hover:bg-gray-100"
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {detailId && (
        <PurchaseDetailModal id={detailId} onClose={() => setDetailId(null)} />
      )}
      {editMode && (
        <PurchaseEditModal mode={editMode} onClose={() => setEditMode(null)} />
      )}
    </div>
  );
}

// Comment: Supplier management view (매입처 관리)
function SuppliersView() {
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
        const res = await fetch(`/api/inventory-suppliers?${params.toString()}`);
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
  }, [showInactive, reloadKey]);

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

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          미사용 보기
        </label>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50"
        >
          매입처 등록
        </button>
      </div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-gray-600">
                <th className="px-4 py-2 text-left">매입처</th>
                <th className="px-4 py-2 text-left">담당자</th>
                <th className="px-4 py-2 text-left">전화 번호</th>
                <th className="px-4 py-2 text-left">휴대폰 번호</th>
                <th className="px-4 py-2 text-left">팩스</th>
                <th className="px-4 py-2 text-left">이메일</th>
                <th className="px-4 py-2 text-left">메모</th>
                <th className="px-4 py-2 text-center">수정</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                    불러오는 중입니다...
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-gray-100 even:bg-gray-50/40 text-gray-800"
                  >
                    <td className="px-4 py-2">
                      {row.name}{' '}
                      {!row.is_active && (
                        <span className="ml-1 inline-flex rounded-full border border-gray-300 px-2 text-[10px] text-gray-500">
                          미사용
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">{row.contact_name ?? ''}</td>
                    <td className="px-4 py-2">{row.phone ?? ''}</td>
                    <td className="px-4 py-2">{row.mobile_phone ?? ''}</td>
                    <td className="px-4 py-2">{row.fax ?? ''}</td>
                    <td className="px-4 py-2">{row.email ?? ''}</td>
                    <td className="px-4 py-2">{row.memo ?? ''}</td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                    내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {editSupplier && (
        <SupplierEditModal
          supplier={editSupplier}
          onClose={() => setEditSupplier(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

type SupplierEditModalProps = {
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
function SupplierEditModal({ supplier, onClose, onSaved }: SupplierEditModalProps) {
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
      const res = await fetch('/api/inventory-suppliers', {
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
      const res = await fetch('/api/inventory-suppliers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: form.id }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-base font-semibold text-gray-900">
            {isEdit ? '매입처 수정' : '매입처 등록'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        {error && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        <div className="space-y-3 px-5 py-4 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-20 text-gray-700">
              공급 업체 명 <span className="text-red-500">*</span>
            </div>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 text-gray-700">담당자</div>
            <input
              type="text"
              value={form.contact_name}
              onChange={(e) => handleChange('contact_name', e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 text-gray-700">휴대폰 번호</div>
            <input
              type="text"
              value={form.mobile_phone}
              onChange={(e) => handleChange('mobile_phone', e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 text-gray-700">전화 번호</div>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 text-gray-700">팩스</div>
            <input
              type="text"
              value={form.fax}
              onChange={(e) => handleChange('fax', e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 text-gray-700">이메일</div>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1"
            />
          </div>
          <div className="flex items-start gap-3">
            <div className="w-20 text-gray-700">메모</div>
            <textarea
              value={form.memo}
              onChange={(e) => handleChange('memo', e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1 min-h-[80px]"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className="w-20 text-gray-700">상태</div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => handleChange('is_active', e.target.checked)}
                className="rounded border-gray-300"
              />
              사용
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="rounded-md border border-red-500 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              삭제
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Comment: Stock adjustment history view (재고 조정 내역)
function AdjustmentHistoryView() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-20');
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

        const res = await fetch(`/api/inventory-adjustments?${params.toString()}`);
        const data = await res.json();
        setRows(Array.isArray(data.rows) ? data.rows : []);
      } catch (e: any) {
        setError(e?.message ?? '재고 조정 내역을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchAdjustments();
  }, [startDate, endDate, productSearch]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6 flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">기간</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">제품</span>
          <input
            type="text"
            placeholder="제품코드 또는 제품명"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm min-w-[200px]"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setShowAdjustModal(true)}
            className="px-4 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            재고 임의 조정
          </button>
          <button className="px-4 py-1.5 rounded-md bg-slate-900 text-sm text-white hover:bg-black">
            검색
          </button>
        </div>
      </div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <div className="text-xs text-gray-500">
        총 <span className="font-semibold">{rows.length}</span> 건
      </div>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-gray-600">
                <th className="px-4 py-2 text-left">날짜</th>
                <th className="px-4 py-2 text-left">제품코드</th>
                <th className="px-4 py-2 text-left">제품명</th>
                <th className="px-4 py-2 text-right">변경 전</th>
                <th className="px-4 py-2 text-right">변경 후</th>
                <th className="px-4 py-2 text-right">변동 수량</th>
                <th className="px-4 py-2 text-left">메모</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                    불러오는 중입니다...
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-gray-100 even:bg-gray-50/40 text-gray-800"
                  >
                    <td className="px-4 py-2">{row.adjusted_at}</td>
                    <td className="px-4 py-2">{row.product_code ?? ''}</td>
                    <td className="px-4 py-2">{row.product_name ?? ''}</td>
                    <td className="px-4 py-2 text-right text-red-600">
                      {row.before_stock.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {row.after_stock.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">{row.diff.toLocaleString()}</td>
                    <td className="px-4 py-2">{row.memo ?? ''}</td>
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr
                  className="border-t border-gray-100 text-gray-800"
                >
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                    내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showAdjustModal && (
        <StockAdjustmentModal onClose={() => setShowAdjustModal(false)} />
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
function InventoryMovementHistoryView() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-20');
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

        const res = await fetch(`/api/inventory-movements?${params.toString()}`);
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
  }, [startDate, endDate, productCode, category]);

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6 flex flex-col gap-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">기간</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">제품</span>
            <input
              type="text"
              placeholder="제품코드"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm min-w-[140px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">구분</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm min-w-[100px]"
            >
              <option>전체</option>
            </select>
          </div>
          <div className="ml-auto flex gap-2">
            <button className="px-4 py-1.5 rounded-md bg-slate-900 text-sm text-white hover:bg-black">
              검색
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          총 <span className="font-semibold">{rows.length}</span> 건
        </div>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-gray-600">
                  <th className="px-4 py-2 text-left">생성일</th>
                  <th className="px-4 py-2 text-left">사용자 ID</th>
                  <th className="px-4 py-2 text-left">제품코드</th>
                  <th className="px-4 py-2 text-left">제품명</th>
                  <th className="px-4 py-2 text-left">구분</th>
                  <th className="px-4 py-2 text-right">변동 수량</th>
                  <th className="px-4 py-2 text-right">현 재고</th>
                  <th className="px-4 py-2 text-center">상세</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                      불러오는 중입니다...
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-gray-100 even:bg-gray-50/40 text-gray-800"
                  >
                    <td className="px-4 py-2">{row.createdAt}</td>
                    <td className="px-4 py-2">{row.userId}</td>
                    <td className="px-4 py-2">{row.productCode}</td>
                    <td className="px-4 py-2">{row.productName}</td>
                    <td className="px-4 py-2">{row.type}</td>
                    <td className="px-4 py-2 text-right">
                      {row.diff > 0 ? `+${row.diff}` : row.diff}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {row.currentStock.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setSelected(row)}
                        className="px-3 py-1 text-xs rounded-md border border-sky-500 text-sky-600 hover:bg-sky-50"
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                  ))}
                {!loading && rows.length === 0 && (
                  <tr className="border-t border-gray-100">
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                      내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-sky-600 text-white">
          <h3 className="text-base font-semibold">판매 상세</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white material-symbols-outlined text-xl"
          >
            close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            <div className="text-sm text-gray-800">
              <div className="font-medium">{row.productName}</div>
              <div className="text-gray-500 text-xs mt-1">
                {row.createdAt} · {row.userId}
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left">판매 항목</th>
                    <th className="px-4 py-2 text-right">단가</th>
                    <th className="px-4 py-2 text-right">수량</th>
                    <th className="px-4 py-2 text-right">할인</th>
                    <th className="px-4 py-2 text-right">금액</th>
                    <th className="px-4 py-2 text-left">담당자</th>
                    <th className="px-4 py-2 text-left">영업 구분</th>
                    <th className="px-4 py-2 text-right">포인트 차감</th>
                    <th className="px-4 py-2 text-right">정액권 차감</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-100">
                    <td className="px-4 py-2">{row.productName}</td>
                    <td className="px-4 py-2 text-right">6,500</td>
                    <td className="px-4 py-2 text-right">1</td>
                    <td className="px-4 py-2 text-right">0</td>
                    <td className="px-4 py-2 text-right">6,500</td>
                    <td className="px-4 py-2">winter 선생님</td>
                    <td className="px-4 py-2">매출</td>
                    <td className="px-4 py-2 text-right">0</td>
                    <td className="px-4 py-2 text-right">0</td>
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
                <div className="min-h-[60px] rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 text-sm">
                  7Cb + mint
                </div>
                <div className="text-xs text-gray-500">
                  등록자 {row.userId} {row.createdAt}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-md bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

type InternalUsageRegisterModalProps = {
  onClose: () => void;
};

// Comment: Modal for registering internal usage based on inventory items
function InternalUsageRegisterModal({ onClose }: InternalUsageRegisterModalProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/inventory');
        const data = await res.json();
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e: any) {
        setError(e?.message ?? '재고 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-base font-semibold text-gray-900">내부 소모 등록</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        {error && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-3 flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">분류</span>
              <select className="min-w-[100px] rounded-md border border-gray-300 px-2 py-1 text-sm">
                <option>전체</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">제품</span>
              <input
                type="text"
                placeholder="제품코드 또는 제품명"
                className="min-w-[200px] rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
            <label className="ml-4 inline-flex cursor-pointer items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" className="rounded border-gray-300" />
              판매용 제품 포함
            </label>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left">제품코드</th>
                  <th className="px-4 py-2 text-left">제품명</th>
                  <th className="px-4 py-2 text-right">현 재고</th>
                  <th className="px-4 py-2 text-center">추가</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                      불러오는 중입니다...
                    </td>
                  </tr>
                )}
                {!loading &&
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="px-4 py-2">{item.sku ?? item.id}</td>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2 text-right">
                        {Number(item.stock ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="rounded-md border border-sky-500 px-3 py-1 text-xs text-sky-600 hover:bg-sky-50"
                        >
                          추가
                        </button>
                      </td>
                    </tr>
                  ))}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                      등록된 재고가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
      {selectedItem && (
        <InternalUsageEntryModal
          mode="create"
          inventoryItemId={selectedItem.id}
          productName={selectedItem.name}
          defaultQuantity={1}
          onSaved={undefined}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

type InternalUsageEntryModalProps = {
  mode: 'create' | 'edit';
  inventoryItemId?: number;
  productName: string;
  defaultQuantity: number;
  onSaved?: () => void;
  onClose: () => void;
};

// Comment: Small modal for internal usage create/edit
function InternalUsageEntryModal({
  mode,
  inventoryItemId,
  productName,
  defaultQuantity,
  onSaved,
  onClose,
}: InternalUsageEntryModalProps) {
  const [quantity, setQuantity] = useState(defaultQuantity.toString());
  const [staff, setStaff] = useState('');
  const [memo, setMemo] = useState('');
  const [date, setDate] = useState('2026-01-20');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comment: Handle save internal usage (create only for now)
  const handleSave = async () => {
    if (!inventoryItemId || mode !== 'create') {
      onClose();
      return;
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('수량은 1 이상 숫자로 입력해주세요.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await fetch('/api/inventory-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryItemId,
          quantity: qty,
          staffName: staff || null,
          memo: memo || null,
          usedAt: date,
        }),
      });
      if (onSaved) onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? '내부 소모를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-base font-semibold text-gray-900">
            {mode === 'create' ? '내부 소모 등록' : '내부 소모 편집'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        {error && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        <div className="space-y-3 px-5 py-4 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-20 text-gray-700">제품명</div>
            <input
              type="text"
              value={productName}
              readOnly
              className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 text-gray-700">
              수량 <span className="text-red-500">*</span>
            </div>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 text-gray-700">직원</div>
            <select
              value={staff}
              onChange={(e) => setStaff(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1"
            >
              <option value="">선택</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 text-gray-700">메모</div>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 text-gray-700">날짜</div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          {mode === 'edit' && (
            <button
              type="button"
              className="rounded-md border border-red-500 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              삭제
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

type StockAdjustmentModalProps = {
  onClose: () => void;
};

// Comment: Modal for arbitrary stock adjustment
function StockAdjustmentModal({ onClose }: StockAdjustmentModalProps) {
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
        const res = await fetch('/api/inventory');
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
  }, []);

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
      await fetch('/api/inventory-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustments }),
      });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? '재고 임의 조정을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-base font-semibold text-gray-900">재고 임의 조정</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        {error && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left">제품코드</th>
                  <th className="px-4 py-2 text-left">제품명</th>
                  <th className="px-4 py-2 text-right">현 재고 (조정 전)</th>
                  <th className="px-4 py-2 text-right">현 재고 (조정 후)</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
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
                        <td className="px-4 py-2">{item.sku ?? item.id}</td>
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2 text-right">
                          {before.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right text-sm"
                            value={after}
                            onChange={(e) => handleChangeAfter(item.id, e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                      등록된 재고가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

type PurchaseDetailModalProps = {
  id: number;
  onClose: () => void;
};

// Comment: Purchase detail modal (매입 상세)
function PurchaseDetailModal({ id, onClose }: PurchaseDetailModalProps) {
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
        const res = await fetch(`/api/inventory-purchases/${id}`);
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
  }, [id]);

  const titlePrefix = header?.type === 'return' ? '반품' : '매입';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">
            {titlePrefix} 상세
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-1 text-sm text-gray-800">
              <div className="flex justify-between">
                <div>
                  <span className="font-semibold mr-2">{titlePrefix}</span>
                  <span className="text-gray-600">
                    공급처: {header?.supplier_name ?? '-'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  생성일: {header?.created_at ?? ''}
                </div>
              </div>
              <div className="text-gray-600 text-xs">
                날짜: {header?.purchase_date ?? ''}{' '}
                {header?.memo && <span className="ml-2">메모: {header.memo}</span>}
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left">제품 코드</th>
                    <th className="px-4 py-2 text-left">상품명</th>
                    <th className="px-4 py-2 text-right">단가</th>
                    <th className="px-4 py-2 text-right">수량</th>
                    <th className="px-4 py-2 text-right">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                        불러오는 중입니다...
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    items.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="px-4 py-2">{item.product_code ?? ''}</td>
                        <td className="px-4 py-2">{item.product_name ?? ''}</td>
                        <td className="px-4 py-2 text-right">
                          {Number(item.unit_price ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-right">
                          {Number(item.line_amount ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  {!loading && !items.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                        품목이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

type PurchaseEditModalProps = {
  mode: 'purchase' | 'return';
  onClose: () => void;
};

// Comment: Purchase / Return edit modal (매입 등록 / 반품 등록)
function PurchaseEditModal({ mode, onClose }: PurchaseEditModalProps) {
  const [supplier, setSupplier] = useState('');
  const [supplierOptions, setSupplierOptions] = useState<string[]>([]);
  const [date, setDate] = useState('2026-01-20');
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
        const res = await fetch('/api/inventory-suppliers');
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
  }, []);

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
      const res = await fetch('/api/inventory-purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mode,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        {error && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-14 text-gray-700">공급처</span>
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm min-w-[200px] bg-white"
              >
                <option value="">선택</option>
                {supplierOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-12 text-gray-700">날짜</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">메모</span>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[80px]"
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowItemPicker(true)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              제품 추가
            </button>
            <div className="text-xs text-gray-500">
              총 금액{' '}
              <span className="font-semibold text-gray-900">
                {totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-gray-600">
                    <th className="px-4 py-2 text-left">제품 코드</th>
                    <th className="px-4 py-2 text-left">상품명</th>
                    <th className="px-4 py-2 text-right">단가</th>
                    <th className="px-4 py-2 text-right">수량</th>
                    <th className="px-4 py-2 text-right">금액</th>
                    <th className="px-4 py-2 text-center">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const lineAmount =
                      Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0);
                    return (
                      <tr key={`${item.inventoryItemId}-${idx}`} className="border-t border-gray-100">
                        <td className="px-4 py-2">{item.code}</td>
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right text-sm"
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
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right text-sm"
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
                        <td className="px-4 py-2 text-right">
                          {lineAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setItems((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!items.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                        내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
      {showItemPicker && (
        <PurchaseItemPickerModal
          onClose={() => setShowItemPicker(false)}
          onConfirm={(selected) => {
            setItems(selected);
            setShowItemPicker(false);
          }}
        />
      )}
    </div>
  );
}

type PurchaseItemPickerModalProps = {
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
function PurchaseItemPickerModal({ onClose, onConfirm }: PurchaseItemPickerModalProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [draft, setDraft] = useState<
    Record<number, { unitPrice: number; quantity: number }>
  >({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (search.trim()) params.append('search', search.trim());
        const res = await fetch(`/api/inventory?${params.toString()}`);
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
  }, [search]);

  const handleConfirm = () => {
    const selected = items
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

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-base font-semibold text-gray-900">제품 추가</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        {error && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="제품 코드 / 이름 / 바코드"
                className="rounded-md border border-gray-300 px-3 py-1 text-sm min-w-[240px]"
              />
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left">제품 코드</th>
                    <th className="px-4 py-2 text-left">상품명</th>
                    <th className="px-4 py-2 text-right">단가</th>
                    <th className="px-4 py-2 text-right">수량</th>
                    <th className="px-4 py-2 text-right">금액</th>
                    <th className="px-4 py-2 text-right">현 재고</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                        불러오는 중입니다...
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    items.map((item) => {
                      const row = draft[item.id] ?? {
                        unitPrice: Number(item.price ?? 0),
                        quantity: 0,
                      };
                      const amount =
                        Number(row.unitPrice ?? 0) * Number(row.quantity ?? 0);
                      return (
                        <tr key={item.id} className="border-t border-gray-100">
                          <td className="px-4 py-2">{item.sku ?? String(item.id)}</td>
                          <td className="px-4 py-2">{item.name}</td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="number"
                              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right text-sm"
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
                          <td className="px-4 py-2 text-right">
                            <input
                              type="number"
                              className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right text-sm"
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
                          <td className="px-4 py-2 text-right">
                            {amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {Number(item.stock ?? 0).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  {!loading && items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                        등록된 재고가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-900"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

type AddProductModalProps = {
  onClose: () => void;
  onCreated: (item: InventoryItem) => void;
};

function AddProductModal({ onClose, onCreated }: AddProductModalProps) {
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

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">Add Product</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Size / Variant</label>
            <input
              type="text"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="Hair Care">Hair Care</option>
                <option value="Coloring">Coloring</option>
                <option value="Styling">Styling</option>
                <option value="Treatment">Treatment</option>
                <option value="Tools">Tools</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (AUD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setIcon(option)}
                  className={`flex flex-col items-center justify-center gap-1 px-2 py-2 border rounded-lg text-xs ${
                    icon === option
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-black/60'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {option}
                  </span>
                  <span className="truncate">{option}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white hover:bg-gray-900 disabled:opacity-60"
            >
              {loading ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type EditProductModalProps = {
  product: InventoryItem;
  onClose: () => void;
  onUpdated: (item: InventoryItem) => void;
};

function EditProductModal({ product, onClose, onUpdated }: EditProductModalProps) {
  const [name, setName] = useState(product.name);
  const [size, setSize] = useState(product.size ?? '');
  const [sku, setSku] = useState(product.sku ?? '');
  const [category, setCategory] = useState(product.category);
  const [price, setPrice] = useState<string>(String(product.price ?? ''));
  const [icon, setIcon] = useState<IconName>(
    (product.icon as IconName) || 'inventory_2'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comment: Handle edit product form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          name,
          size: size || null,
          sku: sku || null,
          category,
          price: Number(price || 0),
          icon,
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">Edit Product</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Size / Variant</label>
            <input
              type="text"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="Hair Care">Hair Care</option>
                <option value="Coloring">Coloring</option>
                <option value="Styling">Styling</option>
                <option value="Treatment">Treatment</option>
                <option value="Tools">Tools</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (AUD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
              <div className="grid grid-cols-5 gap-2">
                {ICON_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setIcon(option)}
                    className={`flex flex-col items-center justify-center gap-1 px-2 py-2 border rounded-lg text-xs ${
                      icon === option
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-black/60'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {option}
                    </span>
                    <span className="truncate">{option}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-black text-white hover:bg-gray-900 disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryManagementPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <AdminTopNav />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    }>
      <InventoryContent />
    </Suspense>
  );
}
