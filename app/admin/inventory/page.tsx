'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { InventoryItem } from '@/lib/types';
import AdminSidebar from '@/components/AdminSidebar';

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

export default function InventoryManagementPage() {
  const [category, setCategory] = useState('All Categories');
  const [status, setStatus] = useState('All Status');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [stockDrafts, setStockDrafts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Comment: Load inventory items from API using current filters
  useEffect(() => {
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
      } catch (err: any) {
        setError(err.message || 'Failed to load inventory');
        setProducts([]);
        setStockDrafts({});
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [category, status, searchQuery]);

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

  const hasChanges = products.some(
    (p) => (stockDrafts[p.id] ?? p.stock) !== p.stock
  );

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

  // Comment: Close sidebar when clicking outside
  useEffect(() => {
    if (!isSidebarOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const sidebar = document.getElementById('admin-sidebar');
      const menuButton = target.closest('button[aria-label="Toggle sidebar"]');
      
      // Comment: Don't close if clicking inside sidebar or menu button
      if (sidebar && sidebar.contains(target)) {
        return;
      }
      if (menuButton) {
        return;
      }
      
      setIsSidebarOpen(false);
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen]);

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex">
      <AdminSidebar isSidebarOpen={isSidebarOpen} />
      <main className={`flex-1 flex flex-col h-full overflow-hidden relative bg-white transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'ml-64' : ''
      }`}>
        <header className="h-16 flex items-center justify-between px-6 md:px-10 py-4 bg-gray-100 text-gray-900 z-10">
          <div className="flex items-center gap-4 flex-1">
            {/* Navigation Menu Button */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            {/* Home Button */}
            <Link
              href="/admin/dashboard"
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">home</span>
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-900">Inventory Management</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center justify-center size-8 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-white">
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-black">Inventory</h2>
                <p className="text-gray-500 text-sm">Manage product stock, track internal usage, and update SKUs.</p>
              </div>
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
            </div>
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
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all"
                  placeholder="Search product name, SKU..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
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
          </div>
        </div>
      </main>

      {showAddProductModal && (
        <AddProductModal
          onClose={() => setShowAddProductModal(false)}
          onCreated={(item) => {
            setProducts((prev) => [...prev, item]);
            setStockDrafts((prev) => ({ ...prev, [item.id]: item.stock }));
            setShowAddProductModal(false);
          }}
        />
      )}

      {editingProduct && (
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
