'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function InventoryManagementPage() {
  const [category, setCategory] = useState('All Categories');
  const [status, setStatus] = useState('All Status');

  const products = [
    {
      id: 1,
      name: 'Repairing Shampoo',
      size: '500ml',
      sku: 'HC-0012',
      category: 'Hair Care',
      price: '$42.00',
      stock: 45,
      status: 'In Stock',
      icon: 'soap',
    },
    {
      id: 2,
      name: 'Ash Grey Dye Tube',
      size: 'Professional Line',
      sku: 'CL-2938',
      category: 'Coloring',
      price: '$18.50',
      stock: 0,
      status: 'Out of Stock',
      icon: 'palette',
    },
    {
      id: 3,
      name: 'Matte Clay Wax',
      size: 'Strong Hold',
      sku: 'ST-0442',
      category: 'Styling',
      price: '$32.00',
      stock: 4,
      status: 'Low Stock',
      icon: 'brush',
    },
    {
      id: 4,
      name: 'Argan Oil Serum',
      size: '100ml',
      sku: 'TR-8821',
      category: 'Treatment',
      price: '$55.00',
      stock: 18,
      status: 'In Stock',
      icon: 'spa',
    },
    {
      id: 5,
      name: 'Premium Scissors Set',
      size: 'Equipment',
      sku: 'EQ-1102',
      category: 'Tools',
      price: '$450.00',
      stock: 2,
      status: 'Low Stock',
      icon: 'content_cut',
    },
  ];

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

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex">
      <aside className="w-64 flex-shrink-0 flex flex-col justify-between bg-white border-r border-gray-200 h-full overflow-y-auto hidden md:flex">
        <div className="flex flex-col gap-8 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-black flex items-center justify-center rounded-full size-10 text-white">
              <span className="material-symbols-outlined">content_cut</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-wider text-black">HAEYOOM</h1>
              <p className="text-xs text-gray-500 font-medium tracking-widest">SEOUL • SYDNEY</p>
            </div>
          </div>
          <nav className="flex flex-col gap-2">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
            <Link
              href="/admin/sales"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">monitoring</span>
              <span className="text-sm font-medium">Sales Overview</span>
            </Link>
            <Link
              href="/admin/appointments"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">calendar_month</span>
              <span className="text-sm font-medium">Appointments</span>
            </Link>
            <Link
              href="/admin/staff"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">groups</span>
              <span className="text-sm font-medium">Staff</span>
            </Link>
            <Link
              href="/admin/inventory"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black text-white shadow-lg shadow-black/20"
            >
              <span className="material-symbols-outlined">inventory_2</span>
              <span className="text-sm font-medium">Inventory</span>
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">settings</span>
              <span className="text-sm font-medium">Settings</span>
            </Link>
          </nav>
        </div>
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="size-10 rounded-full bg-cover bg-center grayscale"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAjhD0WmE9CSsv_JWqCz325cTf4HM2m39YT5VSu09Lc2YQqci2GEmubVTLNi3mhaSzXeI1aOETFfv9VpKUOwV_LoiTkw5FBCVBNCznsSmppHNQiAWcQrAE7cw73i0kzJkDOrZHBn-rVhTR-sBvQ9yPTejyv271gCTallJe0gM8N5_cOiuGK0ZhmDcFdRyL97zFu_5tj-DgObrIlkZqquHTlK8OeBJB297gGVKfjJWl_e8t3cnmO4nqHfGDOJjhwTSHFyyB9M083o3dh')",
              }}
            />
            <div className="flex flex-col">
              <p className="text-sm font-medium text-black">Sarah Kim</p>
              <p className="text-xs text-gray-500">Manager</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <header className="h-16 flex items-center justify-between px-6 md:px-10 py-4 bg-[#1a1a1a] text-white z-10 shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Dashboard</span>
            <span className="text-gray-500">/</span>
            <span className="font-medium text-white">Inventory Management</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center justify-center size-8 rounded-full hover:bg-white/10 text-gray-300 transition-colors">
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
            <button className="flex items-center justify-center size-8 rounded-full hover:bg-white/10 text-gray-300 md:hidden transition-colors">
              <span className="material-symbols-outlined text-xl">menu</span>
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
                <button className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm">
                  <span className="material-symbols-outlined text-lg">history</span>
                  Usage History
                </button>
                <button className="flex items-center gap-2 bg-gradient-to-br from-[#111111] to-[#333333] hover:from-black hover:to-[#222222] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg">
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
                <h3 className="text-2xl font-bold text-black">1,432</h3>
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
                <h3 className="text-2xl font-bold text-black">18</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-gray-50 p-2 rounded-lg text-gray-500 group-hover:text-black transition-colors">
                    <span className="material-symbols-outlined">attach_money</span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm font-medium mb-1">Inventory Value</p>
                <h3 className="text-2xl font-bold text-black">
                  $45,280 <span className="text-xs text-gray-400 font-normal">AUD</span>
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
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all"
                  placeholder="Search product name, SKU..."
                  type="text"
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
                    {products.map((product) => (
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
                        <td className="px-6 py-4 font-medium">{product.price}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${getStockColor(product.stock, product.status)}`}>{product.stock}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-2 w-fit px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(product.status)}`}>
                            <span className="size-1.5 rounded-full bg-current"></span>
                            {product.status}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors" title="Use Internally">
                              <span className="material-symbols-outlined text-[1.1rem]">water_drop</span>
                            </button>
                            <button className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors" title="Edit">
                              <span className="material-symbols-outlined text-[1.1rem]">edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
                <span className="text-xs text-gray-500">Showing 1 to 5 of 1,432 entries</span>
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
    </div>
  );
}


