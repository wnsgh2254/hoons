'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminTopNav from '@/components/AdminTopNav';

export default function ServiceHistoryPage() {
  const [serviceHistory, setServiceHistory] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [designers, setDesigners] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>('');

  const ITEMS_PER_PAGE = 20;

  // Get current date range (last 30 days) as default
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  // Fetch designers and shops
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [designersRes, shopsRes] = await Promise.all([
          fetch('/api/staff'),
          fetch('/api/staff'),
        ]);
        const designersData = await designersRes.json();
        const shopsData = await shopsRes.json();
        if (designersData.staff) setDesigners(designersData.staff);
        if (shopsData.shops) setShops(shopsData.shops);
      } catch (error) {
        console.error('Error fetching options:', error);
      }
    };
    fetchOptions();
  }, []);

  // Fetch service history with pagination
  const fetchServiceHistory = async (page: number = 1) => {
    if (!startDate || !endDate) return;

    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('start_date', startDate);
      params.append('end_date', endDate);
      params.append('page', String(page));
      params.append('limit', String(ITEMS_PER_PAGE));
      if (selectedDesignerId) {
        params.append('designer_id', selectedDesignerId);
      }

      const res = await fetch(`/api/appointment?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load service history');
      }
      setServiceHistory(data.bookings || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.page || 1);
    } catch (error: any) {
      console.error('Error fetching service history:', error);
      setError(error.message || 'Failed to load service history');
      setServiceHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      setCurrentPage(1);
      fetchServiceHistory(1);
    }
  }, [startDate, endDate, selectedDesignerId]);

  const formatTime = (time: string) => {
    if (!time) return '—';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex flex-col">
      <AdminTopNav />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-white">
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-black">시술 내역</h2>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-start">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designer</label>
                  <select
                    value={selectedDesignerId}
                    onChange={(e) => setSelectedDesignerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                  >
                    <option value="">All Designers</option>
                    {designers.map((designer) => (
                      <option key={designer.id} value={designer.id}>
                        {designer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Service History Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-black">Service Records</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {loading
                    ? 'Loading service history...'
                    : serviceHistory.length === 0
                      ? 'No service records found for the selected period.'
                      : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, total)} of ${total} service record${total === 1 ? '' : 's'}`}
                </p>
              </div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-500 text-sm">Loading service history...</div>
                ) : serviceHistory.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-gray-400 text-3xl">history</span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-1">No service records</p>
                    <p className="text-xs text-gray-500">Try adjusting your date range or filters.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                        <th className="px-6 py-4">Date & Time</th>
                        <th className="px-6 py-4">Designer</th>
                        <th className="px-6 py-4">Service</th>
                        <th className="px-6 py-4">Shop</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                      {serviceHistory.map((service) => (
                        <tr key={service.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-black">
                                {new Date(service.booking_date).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              <span className="text-xs text-gray-500">{formatTime(service.booking_time)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-600">
                              {service.designer?.name || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-600">
                              {service.custom_service_name || service.service?.name || '—'}
                            </span>
                            {(service.custom_service_duration || service.service?.duration_minutes) && (
                              <span className="text-xs text-gray-500 block">
                                {service.custom_service_duration || service.service?.duration_minutes} min
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-600">
                              {service.shop?.name || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                service.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : service.status === 'cancelled'
                                    ? 'bg-red-100 text-red-700'
                                    : service.status === 'noshow'
                                      ? 'bg-orange-100 text-orange-700'
                                      : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {service.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-black">
                              ₩{service.total_amount ? Number(service.total_amount).toLocaleString('ko-KR') : '0'}
                            </span>
                            {service.deposit_amount > 0 && (
                              <span className="text-xs text-gray-500 block">
                                Deposit: ₩{Number(service.deposit_amount).toLocaleString('ko-KR')}
                              </span>
                            )}
                            {service.deposit_paid != null && Number(service.deposit_paid) >= 0 && (
                              <>
                                <span className="text-xs text-green-600 block">
                                  Paid: ₩{Number(service.deposit_paid).toLocaleString('ko-KR')}
                                </span>
                                <span className="text-xs text-gray-700 block font-medium">
                                  Remaining: ₩{((Number(service.total_amount) || 0) - (Number(service.deposit_paid) || 0)).toLocaleString('ko-KR')}
                                </span>
                              </>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => setEditingService(service)}
                                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                                title="Edit"
                              >
                                <span className="material-symbols-outlined text-[1.1rem]">edit</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {totalPages > 1 && (
                  <div className="p-6 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newPage = currentPage - 1;
                          if (newPage >= 1) {
                            setCurrentPage(newPage);
                            fetchServiceHistory(newPage);
                          }
                        }}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-black"
                      >
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            pageNum === 1 ||
                            pageNum === totalPages ||
                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => {
                                  setCurrentPage(pageNum);
                                  fetchServiceHistory(pageNum);
                                }}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                  currentPage === pageNum
                                    ? 'bg-black text-white'
                                    : 'border border-gray-200 hover:bg-gray-50 text-black'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          } else if (
                            pageNum === currentPage - 2 ||
                            pageNum === currentPage + 2
                          ) {
                            return (
                              <span key={pageNum} className="px-2 text-gray-400">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>
                      <button
                        onClick={() => {
                          const newPage = currentPage + 1;
                          if (newPage <= totalPages) {
                            setCurrentPage(newPage);
                            fetchServiceHistory(newPage);
                          }
                        }}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-black"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">check_circle</span>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <EditServiceModal
          service={editingService}
          onClose={() => setEditingService(null)}
          onSuccess={() => {
            setEditingService(null);
            setSuccessMessage('Service record updated successfully');
            fetchServiceHistory(currentPage);
            // Comment: Hide success message after 3 seconds
            setTimeout(() => {
              setSuccessMessage(null);
            }, 3000);
          }}
        />
      )}
    </div>
  );
}

// Comment: Edit Service Modal Component
function EditServiceModal({
  service,
  onClose,
  onSuccess,
}: {
  service: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [bookingDate, setBookingDate] = useState(
    service.booking_date ? service.booking_date.split('T')[0] : ''
  );
  const [bookingTime, setBookingTime] = useState(service.booking_time || '');
  const [status, setStatus] = useState(service.status || 'pending');
  const [totalAmount, setTotalAmount] = useState<string>(String(service.total_amount || 0));
  const [depositAmount, setDepositAmount] = useState<string>(String(service.deposit_amount || 0));
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    service.service_id ? String(service.service_id) : 'other'
  );
  const [customServiceName, setCustomServiceName] = useState<string>(
    service.custom_service_name || (service.service_id ? '' : (service.service?.name || ''))
  );
  const [customServiceDuration, setCustomServiceDuration] = useState<string>(
    service.service_id ? '' : String(service.custom_service_duration || service.service?.duration_minutes || '')
  );
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isOtherSelected = selectedServiceId === 'other';

  // Comment: Fetch services list
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch('/api/services');
        const data = await res.json();
        if (res.ok && data.services) {
          setServices(data.services);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
      }
    };
    fetchServices();
  }, []);

  // Comment: Update total amount when service is selected
  useEffect(() => {
    if (selectedServiceId && selectedServiceId !== 'other' && services.length > 0) {
      const selectedService = services.find((svc) => String(svc.id) === selectedServiceId);
      if (selectedService) {
        setTotalAmount(String(selectedService.price || 0));
        // Comment: Update deposit amount to 20% of total (if needed)
        const newDeposit = Math.round((selectedService.price || 0) * 0.2);
        setDepositAmount(String(newDeposit));
        // Comment: Clear custom service fields when selecting a regular service
        setCustomServiceName('');
        setCustomServiceDuration('');
      }
    }
  }, [selectedServiceId, services]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      // Update booking
      const res = await fetch(`/api/appointment/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_date: bookingDate,
          booking_time: bookingTime,
          status,
          total_amount: Number(totalAmount) || 0,
          deposit_amount: Number(depositAmount) || 0,
          service_id: isOtherSelected ? null : (selectedServiceId ? Number(selectedServiceId) : undefined),
          custom_service_name: isOtherSelected ? customServiceName : undefined,
          custom_service_duration: isOtherSelected && customServiceDuration ? Number(customServiceDuration) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update service');
      }

      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">Edit Service Record</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              required
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => {
                setSelectedServiceId(e.target.value);
                if (e.target.value !== 'other') {
                  setCustomServiceName('');
                  setCustomServiceDuration('');
                }
              }}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent bg-white"
            >
              <option value="">Select a service</option>
              {services.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name} - ₩{Number(svc.price).toLocaleString('ko-KR')} ({svc.duration_minutes} min)
                </option>
              ))}
              <option value="other">Other</option>
            </select>
          </div>
          {isOtherSelected && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                  required={isOtherSelected}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Enter service name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={customServiceDuration}
                  onChange={(e) => setCustomServiceDuration(e.target.value)}
                  required={isOtherSelected}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Enter duration in minutes"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent bg-white"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="noshow">No Show</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
            <input
              type="number"
              min="0"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Enter total amount"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount</label>
            <input
              type="number"
              min="0"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Enter deposit amount"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-black"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-black text-white hover:bg-gray-900 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

