'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function SalesOverviewPage() {
  const [timeRange, setTimeRange] = useState('Today');

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
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black text-white shadow-lg shadow-black/20"
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
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
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
            <span className="font-medium text-white">Sales Overview</span>
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
                <h2 className="text-3xl font-bold tracking-tight text-black">Performance Overview</h2>
                <p className="text-gray-500 text-sm">Track your salon&apos;s financial health and stylist performance.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-gray-100 rounded-lg p-1 flex border border-gray-200">
                  {['Today', 'Week', 'Month', 'Year'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        timeRange === range
                          ? 'bg-black text-white shadow-sm'
                          : 'text-gray-500 font-medium hover:text-black hover:bg-gray-200'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
                <button className="flex items-center gap-2 bg-white hover:bg-gray-50 text-black border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm">
                  <span className="material-symbols-outlined text-lg">download</span>
                  Export
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-gray-50 p-2 rounded-lg text-gray-400 group-hover:text-black transition-colors">
                    <span className="material-symbols-outlined">attach_money</span>
                  </div>
                  <span className="bg-gray-100 text-black text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    12.5%
                  </span>
                </div>
                <p className="text-gray-500 text-sm font-medium mb-1">Total Revenue</p>
                <h3 className="text-2xl font-bold text-black">₩12,450,000</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-gray-50 p-2 rounded-lg text-gray-400 group-hover:text-black transition-colors">
                    <span className="material-symbols-outlined">receipt_long</span>
                  </div>
                  <span className="bg-gray-100 text-black text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    5.2%
                  </span>
                </div>
                <p className="text-gray-500 text-sm font-medium mb-1">Transactions</p>
                <h3 className="text-2xl font-bold text-black">142</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-gray-50 p-2 rounded-lg text-gray-400 group-hover:text-black transition-colors">
                    <span className="material-symbols-outlined">savings</span>
                  </div>
                  <span className="bg-gray-100 text-black text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    8.1%
                  </span>
                </div>
                <p className="text-gray-500 text-sm font-medium mb-1">Net Profit</p>
                <h3 className="text-2xl font-bold text-black">₩8,200,000</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-gray-50 p-2 rounded-lg text-gray-400 group-hover:text-black transition-colors">
                    <span className="material-symbols-outlined">shopping_bag</span>
                  </div>
                  <span className="bg-gray-50 text-gray-500 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">trending_down</span>
                    1.2%
                  </span>
                </div>
                <p className="text-gray-500 text-sm font-medium mb-1">Avg Ticket</p>
                <h3 className="text-2xl font-bold text-black">₩87,000</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold text-black">Revenue Trends</h3>
                  <button className="text-gray-400 hover:text-black transition-colors">
                    <span className="material-symbols-outlined">more_horiz</span>
                  </button>
                </div>
                <div className="h-64 w-full flex items-end justify-between gap-2 md:gap-4 px-2">
                  {[
                    { day: 'Mon', height: '40%', value: '₩4.2m' },
                    { day: 'Tue', height: '55%', value: '₩5.8m' },
                    { day: 'Wed', height: '45%', value: '₩4.9m' },
                    { day: 'Thu', height: '65%', value: '₩6.8m' },
                    { day: 'Fri', height: '85%', value: '₩9.2m', highlight: true },
                    { day: 'Sat', height: '75%', value: '₩7.8m' },
                    { day: 'Sun', height: '60%', value: '₩6.2m' },
                  ].map((item) => (
                    <div key={item.day} className="w-full flex flex-col justify-end items-center gap-2 group">
                      <div
                        className={`w-full rounded-t-sm relative transition-all ${
                          item.highlight
                            ? 'bg-gradient-to-t from-gray-800 to-black shadow-[0_4px_10px_rgba(0,0,0,0.3)] group-hover:from-gray-600 group-hover:to-gray-800'
                            : 'bg-gray-200 group-hover:bg-gray-400'
                        }`}
                        style={{ height: item.height }}
                      >
                        <div
                          className={`absolute -top-8 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded pointer-events-none transition-opacity ${
                            item.highlight
                              ? 'opacity-100 bg-black text-white font-bold shadow-lg border border-gray-700'
                              : 'opacity-0 group-hover:opacity-100 bg-black text-white'
                          }`}
                        >
                          {item.value}
                        </div>
                      </div>
                      <span className={`text-xs ${item.highlight ? 'text-black font-bold' : 'text-gray-500'}`}>
                        {item.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-black">Payment Method</h3>
                  <button className="text-gray-400 hover:text-black transition-colors">
                    <span className="material-symbols-outlined">more_horiz</span>
                  </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center relative my-4">
                  <div
                    className="size-48 rounded-full relative flex items-center justify-center shadow-inner"
                    style={{
                      background: 'conic-gradient(#111111 0% 45%, #71717a 45% 70%, #d4d4d8 70% 100%)',
                    }}
                  >
                    <div className="size-36 bg-white rounded-full flex flex-col items-center justify-center z-10 shadow-sm">
                      <span className="text-xs text-gray-500">Total</span>
                      <span className="text-xl font-bold text-black">100%</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 mt-2">
                  {[
                    { label: 'Card', percentage: '45%', color: 'bg-black' },
                    { label: 'Cash', percentage: '25%', color: 'bg-gray-500' },
                    { label: 'Transfer', percentage: '30%', color: 'bg-gray-300' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`size-3 rounded-full ${item.color} shadow-sm`}></div>
                        <span className="text-sm text-gray-500">{item.label}</span>
                      </div>
                      <span className="text-sm font-medium text-black">{item.percentage}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-black mb-6">Top Stylists</h3>
                <div className="flex flex-col gap-6">
                  {[
                    { name: 'Min-ji Lee', revenue: '₩3.2m', percentage: 85, image: 'AB6AXuAJagopAw_q8rxfNlCaVsuzO6iuOuLu5FEHM1MKfxE2nRLS65Mkm3Jy7FZTU_3li5uAlUgqYiNHckiTeJ_-HTw4wPe5nFNuK3O9zU6tiJHy3JO4tfHWm9OnSlLMfd22pT6jLwCoxjFxD3yupg0DDfNWMLb-VZwa-CKHF-OUkMN6FOzDn1eoOC-guzzQhgnOzQT7Dc7mNoGLOzccEJGnDL2qid3NmrEmjcxywXVA76FYSXrv4FukelEpLzx2Rl03XwJAZtPCHkaXnGv5' },
                    { name: 'Jin-su Park', revenue: '₩2.8m', percentage: 72, image: 'AB6AXuAbz_oHyr4oQ4eG1rqvVySXhlkGTu4jJ9YrWuawY0EfsmR7aBFucsweRFw3UHmdIV0L2tGBEblSqmklWpysb2tYyr5U6lY3a0WEfNeubHVJ7n4rFHMdoudtKkJ8GuQyc74QK6-5ZyPboBypwDEQHOqjKWZXIF7wmxWo79JSp-HxrPO9tXoa0UxB0c_S2D8rO0veOotiaydVzLYA4st5mgBNkn2k9erWv_D--22AzmNKA5fcAywbG7nfqkBK_VSVZ2MSihq1Z8QmWNhY' },
                    { name: 'So-hee Kim', revenue: '₩2.1m', percentage: 55, image: 'AB6AXuBfZxEXkYdRNHbObHvIlkNO-mw5WXni3h3YOPyWhHiZuTn82XfbENaIxfXv-riNDhHXQDcvdGn05wVjMXrCinJwt4BUWfJu49WSh7Ew2zFF4ydPdlzeY9yERYuJnBcudrgtA3GUr9qoVBsyxcS4LJC7kUp-NV23sKZszlOeWwHaxDb0s1NF23mjwJXIDaJmwH_mcJ0JN5w0rno-9B2zU6LoIFbOeSxqBD2o4sPfs-YwVvtEx-AkuEmhIVPdSZaUJRrHdeJy1SpX376c' },
                  ].map((stylist) => (
                    <div key={stylist.name} className="flex items-center gap-4">
                      <div
                        className="size-10 rounded-full bg-cover bg-center grayscale shadow-sm border border-gray-200"
                        style={{
                          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/${stylist.image}')`,
                        }}
                      />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-black">{stylist.name}</span>
                          <span className="text-sm font-bold text-black">{stylist.revenue}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              stylist.percentage >= 80 ? 'bg-black' : stylist.percentage >= 60 ? 'bg-gray-600' : 'bg-gray-400'
                            }`}
                            style={{ width: `${stylist.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-black mb-6">Revenue by Category</h3>
                <div className="space-y-4">
                  {[
                    { name: 'Cut', icon: 'content_cut', transactions: 450, revenue: '₩4,500,000', bgColor: 'bg-black' },
                    { name: 'Perm', icon: 'waves', transactions: 120, revenue: '₩3,200,000', bgColor: 'bg-gray-200' },
                    { name: 'Color', icon: 'palette', transactions: 85, revenue: '₩2,950,000', bgColor: 'bg-gray-200' },
                    { name: 'Treatment', icon: 'spa', transactions: 40, revenue: '₩1,800,000', bgColor: 'bg-gray-200' },
                  ].map((category) => (
                    <div key={category.name} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className={`${category.bgColor} p-2 rounded-lg ${category.bgColor === 'bg-black' ? 'text-white' : 'text-gray-700'}`}>
                          <span className="material-symbols-outlined">{category.icon}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-black">{category.name}</p>
                          <p className="text-xs text-gray-500">{category.transactions} transactions</p>
                        </div>
                      </div>
                      <p className="font-bold text-black">{category.revenue}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


