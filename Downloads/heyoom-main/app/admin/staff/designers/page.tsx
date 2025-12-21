'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function DesignerManagementPage() {
  const [selectedDesigner, setSelectedDesigner] = useState('sarah');
  const [services, setServices] = useState([
    { id: 1, name: "Women's Haircut", price: 80, active: true, description: 'Includes wash & styling' },
    { id: 2, name: "Men's Haircut", price: 50, active: true, description: 'Standard cut' },
    { id: 3, name: 'Digital Perm', price: 250, active: false, description: 'Long hair specialist' },
    { id: 4, name: 'Root Touch-up', price: 110, active: true, description: 'Color service' },
  ]);

  const designers = [
    {
      id: 'sarah',
      name: 'Sarah Kim',
      title: 'Senior Stylist',
      image: 'AB6AXuCvoqYR9ZwtF8ZmLZiNB7pi-srAanju415Ry-oNHJYxd05SWpeIsSdRV3GtBduvelDu5ww-UePvYymfrol_0-ib2TX0XF8MMPk2eM54zVcCAi9vIWDwwxSXgQbdAl7jBnyS-32a_EoWrdyizEKeUiv-vFWCUfLGPHeNzovapePX5hWiWJbxsWLs-zfTphV4RYI-ZolnpU2GrpU18aZIUsuBBJbg1IKrImrRgK4XdY2wr4TnSmJjuZ-CXVIar7vGty283MmahIM0f1md',
      status: 'online',
    },
    {
      id: 'jason',
      name: 'Jason Lee',
      title: 'Junior Stylist',
      image: 'AB6AXuAhBNcyvQk1QBzaOXrX-y7nEVd8LwSp8unaBFIrkzauTn9wXvIpmZnD0aTJzT_6JtwOdcECB9RU2bhvilgIdaFa3qFbaCrBDarNkC7czsWPqEnbJJqMBUOY1kTVy327VMWLR-Q19e3tzFxClVH4bp80d-UviBz8MhOALavBO8JfUTafAq2Mh_WV3-noqKlZ8QcZTzYQu6wn9QDAEcvHs6N_7xDqXvap-_xi_F0MDnZ4XIVEsxdwH2qik0AB_dIafHR6DmHhL0oqrFT-',
      status: 'offline',
    },
    {
      id: 'minji',
      name: 'Minji Park',
      title: 'Director',
      image: 'AB6AXuAXZFaVSqUfkvquGr2Ltvctboyn5OSvwNbyjdS1MWmon0VE2V9Qa5n9gh4_MK__lx3TNTrJkQi7bBFsULOkXyw6d6l0fyrX2qABcQDiyFyw9IYWMxnRSSnPj0JLGQyOpqblvANmzqyrx0ga-K9AkMr88KGPSivO5VhZAoe2J9vJdNJBw8cyhnPKIdZFEHXBlZPNteDQDsA4CZpNP7U4OPZrMW7dsMobk441GqC2_ZCL7uwzOMNmU9MJAafz-Mow79hNAKQrO6xDgGTO',
      status: 'online',
    },
    {
      id: 'david',
      name: 'David Chen',
      title: 'Stylist',
      image: 'AB6AXuCgXbk4PuDyse1HubqG4_pR3ZhaGMpL35apPYs62LYmGCFsIKYqRGc6jW2KXzdb5G3QTDB7xCkalJ_TboadiILcLwVYoCJREGJNPCs-DEBZLf_LmQ3920Y0XmEfWP4cWCai22bdrg4q2nN39hxbaVoz9v6L0R44uBZVh4Bg-e3rmbe11fafOdlsElopqnNVRmTn-twjsoDD2BPiPWzHwfG66O0N245TpCN8iZyHSK59e9nIKxnmQqe1cT6xmI8LA0mUiqxUM9i8suO5',
      status: 'away',
    },
  ];

  const schedule = [
    { day: 'Monday', status: 'off', time: null },
    { day: 'Tuesday', status: 'on', time: { start: '10:00 AM', end: '07:00 PM' }, active: true },
    { day: 'Wednesday', status: 'on', time: { start: '10:00 AM', end: '07:00 PM' }, active: false },
    { day: 'Thursday', status: 'on', time: { start: '12:00 PM', end: '09:00 PM' }, active: false },
    { day: 'Friday', status: 'on', time: { start: '10:00 AM', end: '07:00 PM' }, active: false },
    { day: 'Saturday', status: 'on', time: { start: '09:00 AM', end: '05:00 PM' }, active: false },
    { day: 'Sunday', status: 'off', time: null, disabled: true },
  ];

  const toggleService = (id: number) => {
    setServices(services.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  };

  const updateServicePrice = (id: number, price: number) => {
    setServices(services.map((s) => (s.id === id ? { ...s, price } : s)));
  };

  const currentDesigner = designers.find((d) => d.id === selectedDesigner);

  return (
    <div className="bg-white text-text-primary font-display overflow-hidden h-screen flex selection:bg-black selection:text-white">
      <nav className="w-20 lg:w-64 flex-shrink-0 flex flex-col justify-between border-r border-border-light bg-[#121212] z-20 transition-all duration-300">
        <div className="flex flex-col">
          <div className="h-20 flex items-center px-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold text-lg">H</div>
              <span className="text-lg font-semibold tracking-wide hidden lg:block text-white">Haeyoom</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 p-4">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-4 px-3 py-3 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors group"
            >
              <span className="material-symbols-outlined group-hover:text-white">dashboard</span>
              <span className="text-sm font-medium hidden lg:block">Dashboard</span>
            </Link>
            <Link
              href="/admin/staff/designers"
              className="flex items-center gap-4 px-3 py-3 rounded-lg bg-white text-black shadow-sm ring-1 ring-white/5"
            >
              <span className="material-symbols-outlined text-black">group</span>
              <span className="text-sm font-medium hidden lg:block">Staff</span>
            </Link>
            <Link
              href="/admin/appointments"
              className="flex items-center gap-4 px-3 py-3 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors group"
            >
              <span className="material-symbols-outlined group-hover:text-white">calendar_month</span>
              <span className="text-sm font-medium hidden lg:block">Bookings</span>
            </Link>
            <Link
              href="/admin/reports"
              className="flex items-center gap-4 px-3 py-3 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors group"
            >
              <span className="material-symbols-outlined group-hover:text-white">pie_chart</span>
              <span className="text-sm font-medium hidden lg:block">Reports</span>
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-4 px-3 py-3 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors group"
            >
              <span className="material-symbols-outlined group-hover:text-white">settings</span>
              <span className="text-sm font-medium hidden lg:block">Settings</span>
            </Link>
          </div>
        </div>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <div
              className="w-8 h-8 rounded-full bg-gray-600 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD80Qd4AMu1qv7cXoXwUa78nexu6F4XBMB24OGTNLBi9cxCgXo8DnKNfwBZvNINkuJx0c7tjaBPFLYpsyCScv3DOUB5ZaadMJ05Z3k68M6Jwtz9Wx32MkdcigUPrf6zjt9ub6HRFnS-0UIU7gxXKsWuoZ7s2q9SPir3MikHQ609OMPOB40RYNdK870kZI8cdRcHxJ-LiwGJgNKikjAAkkz42Fp5flbtkaFh7-Ap-QyIX9jXl3X1R7RxVmYKtfYv8b9gn3IorSDCwYRZ')",
              }}
            />
            <div className="flex-col hidden lg:flex">
              <span className="text-sm font-medium text-white">Admin</span>
              <span className="text-xs text-gray-400">Manager</span>
            </div>
          </div>
        </div>
      </nav>
      <aside className="w-80 flex-shrink-0 border-r border-border-light bg-gray-50 flex flex-col z-10">
        <div className="p-6 flex flex-col gap-4 border-b border-border-light">
          <h2 className="text-xl font-medium text-text-primary">Designers</h2>
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-text-secondary text-[20px]">search</span>
            </div>
            <input
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg leading-5 bg-white text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm shadow-sm"
              placeholder="Search name..."
              type="text"
            />
          </div>
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#121212] to-[#333333] hover:opacity-90 h-10 px-4 text-white text-sm font-bold tracking-wide transition-all shadow-md">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Add New Designer</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="flex flex-col">
            {designers.map((designer) => {
              const isSelected = designer.id === selectedDesigner;
              const statusColor =
                designer.status === 'online'
                  ? 'bg-green-500'
                  : designer.status === 'away'
                  ? 'bg-yellow-500'
                  : 'bg-gray-400';
              return (
                <div
                  key={designer.id}
                  onClick={() => setSelectedDesigner(designer.id)}
                  className={`flex items-center gap-4 px-6 py-4 border-l-4 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-black bg-gray-50'
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="relative">
                    <div
                      className={`h-12 w-12 rounded-full bg-cover bg-center ring-2 ${
                        isSelected ? 'ring-black/10' : 'ring-transparent'
                      }`}
                      style={{
                        backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/${designer.image}')`,
                      }}
                    />
                    <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${statusColor} border-2 border-white`}></div>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className={`text-sm truncate ${isSelected ? 'text-text-primary font-bold' : 'text-text-secondary group-hover:text-text-primary font-medium'}`}>
                      {designer.name}
                    </p>
                    <p className={`text-xs truncate ${isSelected ? 'text-text-secondary' : 'text-text-secondary/60'}`}>
                      {designer.title}
                    </p>
                  </div>
                  {isSelected && <span className="material-symbols-outlined text-text-primary text-[20px]">chevron_right</span>}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">
        <header className="h-20 flex items-center justify-between px-8 border-b border-border-light bg-white/90 backdrop-blur-md z-10 sticky top-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <span>Staff</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span>Designers</span>
            </div>
            <h1 className="text-xl font-semibold text-text-primary">Edit Profile</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
              Delete
            </button>
            <button className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-br from-[#121212] to-[#333333] hover:opacity-90 shadow-md transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">save</span>
              Save Changes
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-20">
            <section className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-border-light shadow-sm">
                <div className="relative group cursor-pointer">
                  <div
                    className="w-32 h-32 rounded-full bg-cover bg-center ring-4 ring-gray-100 shadow-xl"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBrg1dHzSdQEz1vIpf9R4MxueUrzNj2dLkBFqr0Po1yZ1lYDk6Eb6hyRiKMy7Yl3YP9Yxd9TfUpyoyNjexIqwQTOBCW0h661FoBUl00lb69SMW261q1CLrAG5LJnmMr2_YpP4Wg3Go4Q45LcTbW0HS43r2aV8j6fhHWUkGgVBCrh4e6Usl7KyQmFneLACxvgoATLOunuyT1ySBaDjnzy34wTlT7YOKceAJPR2hXvXQOUzKu5wslLRmz13_ZMH88lp0Fw9wRDPGlA-oE')",
                    }}
                  />
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                  </div>
                </div>
                <button className="mt-4 text-sm text-black font-semibold hover:text-gray-600 underline underline-offset-2">
                  Change Photo
                </button>
                <p className="mt-2 text-xs text-text-secondary">Recommended: 400x400px</p>
              </div>
              <div className="md:col-span-8 p-6 bg-white rounded-xl border border-border-light shadow-sm flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Full Name</label>
                    <input
                      className="bg-gray-50 border border-gray-200 rounded-lg h-11 px-4 text-text-primary focus:ring-1 focus:ring-black focus:border-black placeholder-text-secondary/50"
                      type="text"
                      defaultValue={currentDesigner?.name}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Title / Role</label>
                    <input
                      className="bg-gray-50 border border-gray-200 rounded-lg h-11 px-4 text-text-primary focus:ring-1 focus:ring-black focus:border-black placeholder-text-secondary/50"
                      type="text"
                      defaultValue={currentDesigner?.title}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Bio / Description</label>
                  <textarea
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-text-primary focus:ring-1 focus:ring-black focus:border-black resize-none placeholder-text-secondary/50"
                    rows={3}
                    defaultValue="Specializing in digital perms and modern cuts with over 5 years of experience in Seoul and Sydney."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Phone</label>
                    <input
                      className="bg-gray-50 border border-gray-200 rounded-lg h-11 px-4 text-text-primary focus:ring-1 focus:ring-black focus:border-black placeholder-text-secondary/50"
                      type="text"
                      defaultValue="0412 345 678"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Instagram</label>
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg h-11 px-4 focus-within:ring-1 focus-within:ring-black focus-within:border-black">
                      <span className="text-text-secondary">@</span>
                      <input
                        className="bg-transparent border-none w-full p-0 text-text-primary focus:ring-0 placeholder-text-secondary/50 ml-1"
                        type="text"
                        defaultValue="haeyoom_sarah"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gray-100">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Wage Type</label>
                    <select className="bg-gray-50 border border-gray-200 rounded-lg h-11 px-4 text-text-primary focus:ring-1 focus:ring-black focus:border-black">
                      <option>Percentage</option>
                      <option>Hourly</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Wage Rate (% or $/hr)
                    </label>
                    <input
                      className="bg-gray-50 border border-gray-200 rounded-lg h-11 px-4 text-text-primary focus:ring-1 focus:ring-black focus:border-black placeholder-text-secondary/50"
                      type="number"
                      placeholder="e.g., 40% or $25/hr"
                    />
                  </div>
                </div>
              </div>
            </section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-text-primary">Services &amp; Pricing</h3>
                  <button className="text-xs font-medium text-black underline underline-offset-2 hover:text-gray-600 transition-colors">
                    Manage Types
                  </button>
                </div>
                <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden">
                  <div className="flex items-center px-6 py-3 bg-gray-50 border-b border-border-light text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    <div className="flex-1">Service Name</div>
                    <div className="w-24 text-center">Price ($)</div>
                    <div className="w-16 text-right">Active</div>
                  </div>
                  <div className="flex flex-col divide-y divide-border-light">
                    {services.map((service) => (
                      <div key={service.id} className="flex items-center px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-text-primary">{service.name}</p>
                          <p className="text-xs text-text-secondary">{service.description}</p>
                        </div>
                        <div className="w-24">
                          <input
                            className="w-full bg-white border border-gray-200 text-text-primary rounded text-sm text-center py-1 focus:border-black focus:ring-1 focus:ring-black"
                            type="number"
                            value={service.price}
                            onChange={(e) => updateServicePrice(service.id, Number(e.target.value))}
                          />
                        </div>
                        <div className="w-16 flex justify-end">
                          <label className="flex items-center cursor-pointer relative">
                            <input
                              checked={service.active}
                              onChange={() => toggleService(service.id)}
                              className="sr-only peer"
                              type="checkbox"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              <section className="flex flex-col gap-4">
                <h3 className="text-lg font-bold text-text-primary">Weekly Schedule</h3>
                <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden flex flex-col gap-1 p-1">
                  {schedule.map((day, idx) => (
                    <div
                      key={day.day}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors border border-transparent hover:border-gray-100 ${
                        day.status === 'on' && day.active ? 'bg-gray-50 hover:bg-white hover:shadow-sm' : 'hover:bg-gray-50'
                      } ${day.disabled ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-3 w-32">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            day.status === 'off' ? 'bg-red-200' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                          }`}
                        ></div>
                        <span className={`text-sm font-medium ${day.status === 'on' ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {day.day}
                        </span>
                      </div>
                      <div className="flex-1 flex justify-center gap-2 items-center text-sm text-text-primary">
                        {day.status === 'off' ? (
                          <span className="text-xs font-semibold text-text-secondary uppercase bg-gray-100 px-3 py-1 rounded">
                            Day Off
                          </span>
                        ) : (
                          <>
                            <span className={`border border-gray-200 px-3 py-1 rounded ${day.active ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
                              {day.time?.start}
                            </span>
                            <span className="text-text-secondary">-</span>
                            <span className={`border border-gray-200 px-3 py-1 rounded ${day.active ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
                              {day.time?.end}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="w-8 flex justify-end">
                        <span className="material-symbols-outlined text-gray-400 text-[20px] cursor-pointer hover:text-black">edit</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


