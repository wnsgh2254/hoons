'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function AppointmentsManagementPage() {
  // Modal open state for full schedule view (daily schedule)
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex">
      {/* Sidebar */}
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
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black text-white shadow-lg shadow-black/20"
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

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <header className="h-16 flex items-center justify-between px-6 md:px-10 py-4 bg-white border-b border-gray-100 z-10">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Dashboard</span>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-black">Appointments Management</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">
                search
              </span>
              <input
                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-full text-sm focus:ring-1 focus:ring-black w-64 placeholder-gray-400"
                placeholder="Search bookings..."
                type="text"
              />
            </div>
            <button className="flex items-center justify-center size-8 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
            <button className="flex items-center justify-center size-8 rounded-full hover:bg-gray-100 text-gray-500 md:hidden transition-colors">
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-gray-50/50">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">
            {/* Header + controls */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-black">Appointments</h2>
                <p className="text-gray-500 text-sm">Manage schedule, bookings and stylist availability.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                  <button className="px-4 py-1.5 rounded-md bg-gray-100 text-black text-xs font-semibold shadow-sm">
                    Month
                  </button>
                  <button className="px-4 py-1.5 rounded-md text-gray-500 hover:text-black hover:bg-gray-50 text-xs font-medium transition-colors">
                    Week
                  </button>
                  <button className="px-4 py-1.5 rounded-md text-gray-500 hover:text-black hover:bg-gray-50 text-xs font-medium transition-colors">
                    Day
                  </button>
                </div>
                <button className="flex items-center gap-2 bg-white border border-gray-200 text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">filter_list</span>
                  Filter
                </button>
                <button className="flex items-center gap-2 bg-gradient-to-r from-black to-gray-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg hover:brightness-110">
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  New Booking
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
              {/* Calendar */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-black flex items-center gap-2">
                      November 2023
                      <span className="material-symbols-outlined text-gray-400 text-sm cursor-pointer hover:text-black">
                        expand_more
                      </span>
                    </h3>
                    <div className="flex items-center gap-1">
                      <button className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                      </button>
                      <button className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                      </button>
                    </div>
                  </div>

                  <div className="w-full">
                    <div className="grid grid-cols-7 mb-4">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2 lg:gap-4">
                      {/* Previous month days */}
                      {[29, 30, 31].map((d) => (
                        <div
                          key={d}
                          className="aspect-square p-2 border border-gray-50 rounded-lg bg-gray-50/30 text-gray-300 flex flex-col justify-between hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm font-medium">{d}</span>
                        </div>
                      ))}

                      {/* 1 */}
                      <div className="aspect-square p-2 border border-gray-100 rounded-lg hover:border-black/20 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group">
                        <span className="text-sm font-medium text-gray-700 group-hover:text-black">1</span>
                        <div className="flex gap-1 justify-center">
                          <div className="size-1.5 rounded-full bg-black" />
                          <div className="size-1.5 rounded-full bg-gray-300" />
                        </div>
                      </div>

                      {/* 2 */}
                      <div className="aspect-square p-2 border border-gray-100 rounded-lg hover:border-black/20 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group">
                        <span className="text-sm font-medium text-gray-700 group-hover:text-black">2</span>
                        <div className="flex gap-1 justify-center">
                          <div className="size-1.5 rounded-full bg-black" />
                          <div className="size-1.5 rounded-full bg-black" />
                          <div className="size-1.5 rounded-full bg-black" />
                        </div>
                      </div>

                      {/* 3 - Closed */}
                      <div className="aspect-square p-2 border border-gray-100 rounded-lg hover:border-black/20 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group bg-gray-50">
                        <span className="text-sm font-medium text-gray-400 group-hover:text-black">3</span>
                        <div className="flex justify-center">
                          <span className="text-[10px] text-gray-400 font-medium">Closed</span>
                        </div>
                      </div>

                      {/* 4 */}
                      <div className="aspect-square p-2 border border-gray-100 rounded-lg hover:border-black/20 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group">
                        <span className="text-sm font-medium text-gray-700 group-hover:text-black">4</span>
                        <div className="flex gap-1 justify-center">
                          <div className="size-1.5 rounded-full bg-black" />
                        </div>
                      </div>

                      {/* 5 - selected */}
                      <div className="aspect-square p-2 border border-gray-100 rounded-lg hover:border-black/20 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group bg-black text-white shadow-lg shadow-black/20 transform scale-105">
                        <span className="text-sm font-bold">5</span>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] font-medium opacity-90">12 Bookings</span>
                          <div className="w-8 h-0.5 bg-white/30 rounded-full overflow-hidden">
                            <div className="w-3/4 h-full bg-white" />
                          </div>
                        </div>
                      </div>

                      {/* 6 */}
                      <div className="aspect-square p-2 border border-gray-100 rounded-lg hover:border-black/20 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden">
                        <span className="text-sm font-medium text-gray-700 group-hover:text-black">6</span>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-gray-200 to-transparent" />
                        <div className="flex gap-1 justify-center">
                          <div className="size-1.5 rounded-full bg-black" />
                          <div className="size-1.5 rounded-full bg-gray-400" />
                        </div>
                      </div>

                      {/* 7 */}
                      <div className="aspect-square p-2 border border-gray-100 rounded-lg hover:border-black/20 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group">
                        <span className="text-sm font-medium text-gray-700 group-hover:text-black">7</span>
                        <div className="flex gap-1 justify-center flex-wrap px-2">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="size-1.5 rounded-full bg-black" />
                          ))}
                        </div>
                      </div>

                      {/* 8 */}
                      <div className="aspect-square p-2 border border-gray-100 rounded-lg hover:border-black/20 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group">
                        <span className="text-sm font-medium text-gray-700 group-hover:text-black">8</span>
                        <div className="flex gap-1 justify-center">
                          <div className="size-1.5 rounded-full bg-gray-300" />
                        </div>
                      </div>

                      {/* 9 */}
                      <div className="aspect-square p-2 border border-gray-100 rounded-lg hover:border-black/20 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group">
                        <span className="text-sm font-medium text-gray-700 group-hover:text-black">9</span>
                      </div>

                      {/* 10 - Training */}
                      <div className="aspect-square p-2 border border-gray-100 rounded-lg hover:border-black/20 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group relative">
                        <span className="text-sm font-medium text-gray-700 group-hover:text-black">10</span>
                        <div className="absolute inset-2 flex items-center justify-center pointer-events-none">
                          <span className="text-[10px] text-gray-400 font-medium rotate-[-15deg] border border-gray-200 px-1 rounded">
                            Training
                          </span>
                        </div>
                      </div>

                      {/* 11-21 muted days */}
                      {Array.from({ length: 11 }, (_, i) => 11 + i).map((d) => (
                        <div
                          key={d}
                          className="aspect-square p-2 border border-gray-100 rounded-lg bg-gray-50/50 flex flex-col justify-between"
                        >
                          <span className="text-sm text-gray-400">{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto pt-6 flex items-center gap-6 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-black" />
                      <span>Full Booking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-gray-300" />
                      <span>Available Slot</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-sm bg-gray-100 border border-gray-200" />
                      <span>Day Off / Closed</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column: filters + upcoming list */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Find Availability
                  </label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <span className="material-symbols-outlined text-gray-400">styler</span>
                      <select className="bg-transparent border-none text-sm w-full p-0 focus:ring-0 text-gray-700">
                        <option>All Stylists</option>
                        <option>Jin-su Park</option>
                        <option>Min-ji Lee</option>
                        <option>Sarah Kim</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <span className="material-symbols-outlined text-gray-400">content_cut</span>
                      <select className="bg-transparent border-none text-sm w-full p-0 focus:ring-0 text-gray-700">
                        <option>Select Service</option>
                        <option>Cut &amp; Style</option>
                        <option>Perm</option>
                        <option>Coloring</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-black">Upcoming (Nov 5)</h3>
                    <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">12</span>
                  </div>
                  <div className="overflow-y-auto p-4 flex flex-col gap-3 h-[500px] lg:h-auto">
                    {/* Booking 1 */}
                    <div className="group bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer relative">
                      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-gray-400 hover:text-black">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button className="text-gray-400 hover:text-red-500">
                          <span className="material-symbols-outlined text-[18px]">cancel</span>
                        </button>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center min-w-[3rem]">
                          <span className="text-lg font-bold text-black">10:00</span>
                          <span className="text-xs text-gray-400 uppercase">AM</span>
                        </div>
                        <div className="w-px h-10 bg-gray-100" />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-bold text-black">Sophie Chen</h4>
                              <p className="text-xs text-gray-500 mt-0.5">Cut &amp; Style • 60min</p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="size-5 rounded-full bg-cover bg-center grayscale"
                                style={{
                                  backgroundImage:
                                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAJagopAw_q8rxfNlCaVsuzO6iuOuLu5FEHM1MKfxE2nRLS65Mkm3Jy7FZTU_3li5uAlUgqYiNHckiTeJ_-HTw4wPe5nFNuK3O9zU6tiJHy3JO4tfHWm9OnSlLMfd22pT6jLwCoxjFxD3yupg0DDfNWMLb-VZwa-CKHF-OUkMN6FOzDn1eoOC-guzzQhgnOzQT7Dc7mNoGLOzccEJGnDL2qid3NmrEmjcxywXVA76FYSXrv4FukelEpLzx2Rl03XwJAZtPCHkaXnGv5')",
                                }}
                              />
                              <span className="text-xs text-gray-600">Min-ji Lee</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-black">AU$85</span>
                              <span className="size-2 rounded-full bg-green-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Booking 2 - cancelled */}
                    <div className="group bg-gray-50 rounded-xl border border-gray-100 p-4 relative transition-all">
                      <div className="flex items-start gap-3 opacity-50">
                        <div className="flex flex-col items-center min-w-[3rem]">
                          <span className="text-lg font-bold text-black">11:30</span>
                          <span className="text-xs text-gray-400 uppercase">AM</span>
                        </div>
                        <div className="w-px h-10 bg-gray-200" />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-bold text-black">Jessica Wu</h4>
                              <p className="text-xs text-gray-500 mt-0.5">Color &amp; Treatment</p>
                            </div>
                            <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                              Cancelled
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Booking 3 - highlighted */}
                    <div className="group bg-white rounded-xl border-l-4 border-l-black border-y border-r border-gray-100 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative">
                      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-gray-400 hover:text-black">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center min-w-[3rem]">
                          <span className="text-lg font-bold text-black">01:00</span>
                          <span className="text-xs text-gray-400 uppercase">PM</span>
                        </div>
                        <div className="w-px h-10 bg-gray-100" />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-bold text-black">Grace Park</h4>
                              <p className="text-xs text-gray-500 mt-0.5">Digital Perm • 180min</p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="size-5 rounded-full bg-cover bg-center grayscale"
                                style={{
                                  backgroundImage:
                                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAbz_oHyr4oQ4eG1rqvVySXhlkGTu4jJ9YrWuawY0EfsmR7aBFucsweRFw3UHmdIV0L2tGBEblSqmklWpysb2tYyr5U6lY3a0WEfNeubHVJ7n4rFHMdoudtKkJ8GuQyc74QK6-5ZyPboBypwDEQHOqjKWZXIF7wmxWo79JSp-HxrPO9tXoa0UxB0c_S2D8rO0veOotiaydVzLYA4st5mgBNkn2k9erWv_D--22AzmNKA5fcAywbG7nfqkBK_VSVZ2MSihq1Z8QmWNhY')",
                                }}
                              />
                              <span className="text-xs text-gray-600">Jin-su Park</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-black">AU$280</span>
                              <span className="size-2 rounded-full bg-yellow-500" title="Pending Payment" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Booking 4 */}
                    <div className="group bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer relative">
                      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-gray-400 hover:text-black">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center min-w-[3rem]">
                          <span className="text-lg font-bold text-black">04:30</span>
                          <span className="text-xs text-gray-400 uppercase">PM</span>
                        </div>
                        <div className="w-px h-10 bg-gray-100" />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-bold text-black">Michael Chang</h4>
                              <p className="text-xs text-gray-500 mt-0.5">Men&apos;s Cut • 45min</p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="size-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                <span className="material-symbols-outlined text-[14px]">person</span>
                              </div>
                              <span className="text-xs text-gray-600">James Kim</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-black">AU$55</span>
                              <span className="size-2 rounded-full bg-gray-300" title="Confirmed" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <button
                      onClick={() => setShowFullSchedule(true)}
                      className="w-full py-2 text-sm font-medium text-gray-600 hover:text-black transition-colors flex items-center justify-center gap-2"
                    >
                      View Full Schedule <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Full Schedule Modal (Daily Schedule) */}
      {showFullSchedule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowFullSchedule(false)}
        >
          <div
            className="relative bg-background-light dark:bg-[#101622] text-[#0d121b] font-[Inter] min-h-[80vh] max-h-[90vh] w-[95vw] max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowFullSchedule(false)}
              className="absolute right-4 top-3 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[#0d121b] shadow hover:bg-white"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>

            {/* Top Navigation */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-[#e7ebf3] bg-white px-6 py-3 shrink-0">
              <div className="flex items-center gap-4 text-[#0d121b]">
                <div className="size-8 flex items-center justify-center bg-[#135bec]/10 rounded-lg text-[#135bec]">
                  <span className="material-symbols-outlined text-2xl">content_cut</span>
                </div>
                <h2 className="text-[#0d121b] text-xl font-bold leading-tight tracking-[-0.015em]">Haeyoom</h2>
              </div>
              <div className="hidden md:flex flex-1 justify-center gap-8 px-8">
                <a className="text-[#0d121b] text-sm font-semibold leading-normal border-b-2 border-[#135bec] pb-1" href="#">
                  Appointments
                </a>
                <a className="text-[#64748b] text-sm font-medium leading-normal hover:text-[#0d121b] transition-colors" href="#">
                  Clients
                </a>
                <a className="text-[#64748b] text-sm font-medium leading-normal hover:text-[#0d121b] transition-colors" href="#">
                  Staff
                </a>
                <a className="text-[#64748b] text-sm font-medium leading-normal hover:text-[#0d121b] transition-colors" href="#">
                  Settings
                </a>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-[#f1f5f9] text-[#0d121b] transition-colors">
                  <span className="material-symbols-outlined">notifications</span>
                </button>
                <div
                  className="bg-center bg-no-repeat bg-cover rounded-full size-10 border border-[#e7ebf3]"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBwrx4b7-f4meeLbtNv3m0lobnqrKh3cbTdiwyPcVIA71ZKUS5H6pjp2tHSUXloChm-7VEPAj5IDaOY1iNsWQBlru0juxBseqpE_1qXJSx_wW780W6oKZcvmV9NDmo5Sn4wQLtg2qv1FtFA95xTcNf6iKKZZAU6dwOY70277cqfNZFM9L19PH7WnqpAZuK6tOSL4wyJWWK-g_ripCPgUnCyNSCBvX8JVv8RPrlHOp6iy5Kd63xjsN6Ssow0CtAMISqgdzEuAiryd9w7')",
                  }}
                />
              </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#f6f6f8] dark:bg-[#101622]">
              {/* Page Controls & Header */}
              <div className="bg-white border-b border-[#e7ebf3] shrink-0 z-20 shadow-sm">
                <div className="px-6 py-4">
                  {/* Top Row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-[#64748b] mb-1">
                        <span className="cursor-pointer hover:underline">Appointments</span>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="font-medium text-[#135bec]">Schedule View</span>
                      </div>
                      <h1 className="text-3xl font-black tracking-tight text-[#0d121b]">Wednesday, Oct 25</h1>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowFullSchedule(false)}
                        className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 border border-[#e7ebf3] bg-white text-[#0d121b] text-sm font-bold hover:bg-[#f8f9fc] transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">calendar_month</span>
                        <span className="hidden sm:inline">Back to Month</span>
                      </button>
                      <button className="flex items-center justify-center gap-2 rounded-lg h-10 px-5 bg-[#135bec] text-white text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
                        <span className="material-symbols-outlined text-lg">add</span>
                        <span>New Appointment</span>
                      </button>
                    </div>
                  </div>

                  {/* Bottom Row */}
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    {/* Date Nav */}
                    <div className="flex items-center gap-3 order-2 xl:order-1">
                      <div className="flex items-center bg-[#f1f5f9] rounded-lg p-1">
                        <button className="size-8 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm text-[#0d121b] transition-all">
                          <span className="material-symbols-outlined text-lg">chevron_left</span>
                        </button>
                        <span className="px-3 text-sm font-bold w-24 text-center">Today</span>
                        <button className="size-8 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm text-[#0d121b] transition-all">
                          <span className="material-symbols-outlined text-lg">chevron_right</span>
                        </button>
                      </div>
                      <div className="h-6 w-px bg-[#e2e8f0] mx-1" />
                      <span className="text-sm text-[#64748b] hidden sm:block">12 Appointments Scheduled</span>
                    </div>

                    {/* Staff Filter Chips */}
                    <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar order-1 xl:order-2 pb-1 xl:pb-0">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] mr-2 shrink-0">
                        Filter Staff:
                      </span>
                      <button className="flex h-8 shrink-0 items-center gap-2 rounded-full bg-[#0d121b] text-white px-4 transition-transform active:scale-95">
                        <span className="text-sm font-medium">All Staff</span>
                      </button>
                      <button className="group flex h-8 shrink-0 items-center gap-2 rounded-full bg-white border border-[#e7ebf3] px-3 hover:border-[#cbd5e1] transition-colors">
                        <div className="size-2 rounded-full bg-blue-500" />
                        <span className="text-sm font-medium text-[#0d121b]">Sarah</span>
                      </button>
                      <button className="group flex h-8 shrink-0 items-center gap-2 rounded-full bg-white border border-[#e7ebf3] px-3 hover:border-[#cbd5e1] transition-colors">
                        <div className="size-2 rounded-full bg-pink-500" />
                        <span className="text-sm font-medium text-[#0d121b]">Min-ji</span>
                      </button>
                      <button className="group flex h-8 shrink-0 items-center gap-2 rounded-full bg-white border border-[#e7ebf3] px-3 hover:border-[#cbd5e1] transition-colors">
                        <div className="size-2 rounded-full bg-emerald-500" />
                        <span className="text-sm font-medium text-[#0d121b]">David</span>
                      </button>
                      <button className="group flex h-8 shrink-0 items-center gap-2 rounded-full bg-white border border-[#e7ebf3] px-3 hover:border-[#cbd5e1] transition-colors">
                        <div className="size-2 rounded-full bg-amber-500" />
                        <span className="text-sm font-medium text-[#0d121b]">Hanna</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable Schedule Grid */}
              <div className="flex-1 overflow-auto schedule-scroll bg-[#f8f9fc] relative">
                <div className="min-w-[1024px] pb-10">
                  {/* Sticky Header */}
                  <div className="sticky top-0 z-10 flex border-b border-[#e2e8f0] bg-[#f8f9fc] shadow-sm">
                    <div className="w-20 shrink-0 border-r border-[#e2e8f0] bg-[#f8f9fc]" />
                    <div className="grid grid-cols-4 flex-1">
                      {[
                        {
                          code: 'SA',
                          bg: 'bg-blue-100',
                          text: 'text-blue-600',
                          name: 'Sarah',
                          title: 'Senior Stylist',
                        },
                        {
                          code: 'MI',
                          bg: 'bg-pink-100',
                          text: 'text-pink-600',
                          name: 'Min-ji',
                          title: 'Color Specialist',
                        },
                        {
                          code: 'DA',
                          bg: 'bg-emerald-100',
                          text: 'text-emerald-600',
                          name: 'David',
                          title: 'Director',
                        },
                        {
                          code: 'HA',
                          bg: 'bg-amber-100',
                          text: 'text-amber-600',
                          name: 'Hanna',
                          title: 'Stylist',
                        },
                      ].map((staff) => (
                        <div
                          key={staff.name}
                          className="flex items-center gap-3 border-r border-[#e2e8f0] px-4 py-3 bg-white/50 backdrop-blur-sm last:border-r-transparent"
                        >
                          <div className={`size-8 rounded-full flex items-center justify-center font-bold text-xs ${staff.bg} ${staff.text}`}>
                            {staff.code}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#0d121b]">{staff.name}</p>
                            <p className="text-xs text-[#64748b]">{staff.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grid Body */}
                  <div className="flex relative">
                    {/* Current Time Line (static demo) */}
                    <div
                      className="absolute w-full border-t-2 border-[#135bec] z-10 pointer-events-none flex items-center"
                      style={{ top: 340 }}
                    >
                      <div className="absolute left-0 -translate-y-1/2 bg-[#135bec] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-r-md">
                        11:25
                      </div>
                      <div className="size-2 rounded-full bg-[#135bec] -ml-1" />
                    </div>

                    {/* Time Column */}
                    <div className="w-20 shrink-0 border-r border-[#e2e8f0] bg-white text-xs font-medium text-[#94a3b8] flex flex-col">
                      {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map((t) => (
                        <div
                          key={t}
                          className="h-[120px] border-b border-[#f1f5f9] p-2 text-right relative"
                        >
                          <span className="absolute -top-2.5 right-2 bg-white px-1">{t}</span>
                        </div>
                      ))}
                    </div>

                    {/* Appointment Columns */}
                    <div className="grid grid-cols-4 flex-1 bg-white relative">
                      {/* Hour guidelines */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col z-0">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-[120px] border-b border-[#f1f5f9] border-dashed"
                          />
                        ))}
                      </div>

                      {/* Column 1: Sarah */}
                      <div className="border-r border-[#e2e8f0] relative h-full">
                        {/* 09:30 - 10:30 */}
                        <div className="absolute top-[60px] left-1 right-1 h-[120px] z-10">
                          <div className="h-full w-full bg-white border-l-4 border-blue-500 rounded shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer p-2 flex flex-col justify-between overflow-hidden group">
                            <div>
                              <p className="text-xs font-bold text-[#0d121b] mb-0.5">Alice Morgan</p>
                              <p className="text-[11px] text-[#64748b]">Women&apos;s Cut &amp; Style</p>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] font-mono text-[#94a3b8]">09:30 - 10:30</span>
                              <span className="text-[10px] font-bold text-[#0d121b] bg-gray-100 px-1.5 py-0.5 rounded">
                                $95
                              </span>
                            </div>
                            {/* Tooltip */}
                            <div className="opacity-0 group-hover:opacity-100 absolute -right-[220px] top-0 w-[200px] bg-[#1e293b] text-white p-3 rounded-lg shadow-xl z-50 pointer-events-none transition-opacity duration-200">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="size-6 bg-blue-500 rounded-full flex items-center justify-center text-xs">
                                  AM
                                </div>
                                <span className="font-bold text-sm">Alice Morgan</span>
                              </div>
                              <div className="text-xs text-slate-300 space-y-1">
                                <p>
                                  <span className="text-slate-400">Service:</span> Women&apos;s Cut
                                </p>
                                <p>
                                  <span className="text-slate-400">Duration:</span> 60 mins
                                </p>
                                <p>
                                  <span className="text-slate-400">Notes:</span> Client has sensitive scalp.
                                </p>
                                <div className="mt-2 pt-2 border-t border-slate-600 flex justify-between items-center">
                                  <span className="font-bold text-emerald-400">Confirmed</span>
                                  <span className="font-bold">$95 AUD</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 13:00 - 15:00 */}
                        <div className="absolute top-[480px] left-1 right-1 h-[240px] z-10">
                          <div className="h-full w-full bg-gradient-to-b from-blue-50/50 to-white border-l-4 border-blue-500 rounded shadow-sm hover:shadow-md transition-all cursor-pointer p-2 flex flex-col justify-between">
                            <div>
                              <p className="text-xs font-bold text-[#0d121b] mb-0.5">Jessica Lim</p>
                              <p className="text-[11px] text-[#64748b]">Full Balayage &amp; Toner</p>
                              <div className="mt-2 flex gap-1">
                                <span
                                  className="size-2 rounded-full bg-emerald-400"
                                  title="Confirmed"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-[#94a3b8]">13:00 - 15:00</span>
                              <span className="text-[10px] font-bold text-[#0d121b] bg-gray-100 px-1.5 py-0.5 rounded">
                                $320
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Min-ji */}
                      <div className="border-r border-[#e2e8f0] relative h-full bg-[#fcfcfc]">
                        {/* 10:00 - 11:30 */}
                        <div className="absolute top-[120px] left-1 right-1 h-[180px] z-10">
                          <div className="h-full w-full bg-white border-l-4 border-pink-500 rounded shadow-sm hover:shadow-md transition-all cursor-pointer p-2 flex flex-col justify-between">
                            <div>
                              <p className="text-xs font-bold text-[#0d121b] mb-0.5">Grace Lee</p>
                              <p className="text-[11px] text-[#64748b]">Root Touch Up</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-[#94a3b8]">10:00 - 11:30</span>
                              <span className="text-[10px] font-bold text-[#0d121b] bg-gray-100 px-1.5 py-0.5 rounded">
                                $110
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 12:00 - 12:45 */}
                        <div className="absolute top-[360px] left-1 right-1 h-[90px] z-10">
                          <div className="h-full w-full bg-white border-l-4 border-pink-500 rounded shadow-sm hover:shadow-md transition-all cursor-pointer p-2 flex flex-col justify-between">
                            <div>
                              <p className="text-xs font-bold text-[#0d121b] mb-0.5">Walk-in</p>
                              <p className="text-[11px] text-[#64748b]">Consultation</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-[#94a3b8]">12:00 - 12:45</span>
                              <span className="text-[10px] font-bold text-[#0d121b] bg-gray-100 px-1.5 py-0.5 rounded">
                                Free
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Column 3: David */}
                      <div className="border-r border-[#e2e8f0] relative h-full">
                        {/* 09:00 - 10:00 cancelled */}
                        <div className="absolute top-[0px] left-1 right-1 h-[120px] z-10">
                          <div className="h-full w-full bg-white border-l-4 border-emerald-500 rounded shadow-sm hover:shadow-md transition-all cursor-pointer p-2 flex flex-col justify-between opacity-60">
                            <div>
                              <div className="flex justify-between">
                                <p className="text-xs font-bold text-[#0d121b] mb-0.5 line-through">Tom H.</p>
                                <span className="text-[9px] uppercase font-bold text-red-500 border border-red-200 px-1 rounded bg-red-50 h-fit">
                                  Cancelled
                                </span>
                              </div>
                              <p className="text-[11px] text-[#64748b]">Men&apos;s Cut</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-[#94a3b8]">09:00 - 10:00</span>
                            </div>
                          </div>
                        </div>

                        {/* 11:00 - 13:00 */}
                        <div className="absolute top-[240px] left-1 right-1 h-[240px] z-10">
                          <div className="h-full w-full bg-gradient-to-br from-emerald-50 to-white border-l-4 border-emerald-500 rounded shadow-sm hover:shadow-md transition-all cursor-pointer p-2 flex flex-col justify-between ring-2 ring-emerald-500/20">
                            <div>
                              <div className="flex justify-between items-start">
                                <p className="text-xs font-bold text-[#0d121b] mb-0.5">Sophie T.</p>
                                <span className="material-symbols-outlined text-emerald-500 text-sm">schedule</span>
                              </div>
                              <p className="text-[11px] text-[#64748b]">Digital Perm</p>
                              <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px]">check_circle</span>
                                Checked In
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-[#94a3b8]">11:00 - 13:00</span>
                              <span className="text-[10px] font-bold text-[#0d121b] bg-gray-100 px-1.5 py-0.5 rounded">
                                $250
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Column 4: Hanna */}
                      <div className="relative h-full bg-[#fcfcfc]">
                        {/* Blocked Time */}
                        <div className="absolute top-[0px] left-1 right-1 h-[240px] z-0">
                          <div className="h-full w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMODAgME0wIDQwTDQwIDQwTTAgNDBMMCAwIiBzdHJva2U9IiNlN2ViZjMiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-50 flex items-center justify-center rounded border border-[#e2e8f0]">
                            <span className="bg-white/90 px-2 py-1 text-xs font-medium text-[#64748b] rounded shadow-sm">
                              Not Available
                            </span>
                          </div>
                        </div>

                        {/* 14:00 - 15:30 */}
                        <div className="absolute top-[600px] left-1 right-1 h-[180px] z-10">
                          <div className="h-full w-full bg-white border-l-4 border-amber-500 rounded shadow-sm hover:shadow-md transition-all cursor-pointer p-2 flex flex-col justify-between">
                            <div>
                              <p className="text-xs font-bold text-[#0d121b] mb-0.5">Ben K.</p>
                              <p className="text-[11px] text-[#64748b]">Head Spa Treatment</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-[#94a3b8]">14:00 - 15:30</span>
                              <span className="text-[10px] font-bold text-[#0d121b] bg-gray-100 px-1.5 py-0.5 rounded">
                                $150
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-10 bg-transparent" />
                </div>
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  );
}


