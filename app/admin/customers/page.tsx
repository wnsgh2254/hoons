'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminTopNav from '@/components/AdminTopNav';
import type { Customer } from '@/lib/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  const ITEMS_PER_PAGE = 20;

  // Comment: Fetch customers with pagination
  const fetchCustomers = async (page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(ITEMS_PER_PAGE));
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setCustomers(data.customers || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(data.page || 1);
      } else {
        console.error('Failed to load customers:', data.error);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(1);
  }, []);

  // Comment: Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchCustomers(1);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Comment: Format phone number for display
  const formatPhone = (phone: string | null) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  // Comment: Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return dateString.split('T')[0];
  };

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex flex-col">
      <AdminTopNav />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-gray-50/50">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-black">고객</h2>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-black text-white px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg hover:bg-gray-800"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                고객등록
              </button>
            </div>

            {/* Search and Info */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-lg">
                  search
                </span>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="고객명 또는 휴대폰번호로 검색..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="text-sm text-gray-600">
                총 {total.toLocaleString()}명 고객이 검색되었습니다
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">로딩 중...</div>
                </div>
              ) : customers.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">고객이 없습니다.</div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            등록일
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            고객 번호
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            고객명
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            휴대폰 / 전화번호
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            정액권 잔액
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            총 판매액
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {customers.map((customer) => (
                          <tr key={customer.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatDate(customer.created_at)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {customer.customer_number || customer.id}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {customer.name || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatPhone(customer.phone)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {customer.prepaid_balance || 0}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {customer.total_sales ? customer.total_sales.toLocaleString() : '0'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setEditingCustomer(customer)}
                                  className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                                  title="수정"
                                >
                                  <span className="material-symbols-outlined text-lg">edit</span>
                                </button>
                                <button
                                  onClick={() => {
                                    // Comment: Navigate to appointments page with customer filter
                                    window.location.href = `/admin/appointments?customer_id=${customer.id}`;
                                  }}
                                  className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                                  title="예약"
                                >
                                  <span className="material-symbols-outlined text-lg">calendar_month</span>
                                </button>
                                <button
                                  onClick={() => setViewingCustomer(customer)}
                                  className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                                  title="영업"
                                >
                                  <span className="material-symbols-outlined text-lg">receipt_long</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      페이지 {currentPage} 의 {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (currentPage > 1) {
                            setCurrentPage(1);
                            fetchCustomers(1);
                          }
                        }}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        &lt;&lt;
                      </button>
                      <button
                        onClick={() => {
                          if (currentPage > 1) {
                            setCurrentPage(currentPage - 1);
                            fetchCustomers(currentPage - 1);
                          }
                        }}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        &lt;
                      </button>
                      <button
                        onClick={() => {
                          if (currentPage < totalPages) {
                            setCurrentPage(currentPage + 1);
                            fetchCustomers(currentPage + 1);
                          }
                        }}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        &gt;
                      </button>
                      <button
                        onClick={() => {
                          if (currentPage < totalPages) {
                            setCurrentPage(totalPages);
                            fetchCustomers(totalPages);
                          }
                        }}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        &gt;&gt;
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add Customer Modal */}
      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchCustomers(currentPage);
          }}
        />
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSuccess={() => {
            setEditingCustomer(null);
            fetchCustomers(currentPage);
          }}
        />
      )}

      {/* View Customer Sales Modal */}
      {viewingCustomer && (
        <CustomerSalesModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
        />
      )}
    </div>
  );
}

// Comment: Add Customer Modal Component
function AddCustomerModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('고객명을 입력해주세요.');
      return;
    }

    if (!phone.trim()) {
      setError('휴대폰번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || '고객 등록에 실패했습니다.');
      }
    } catch (error) {
      setError('고객 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="bg-black text-white p-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-xl font-bold">고객등록</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              고객명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              휴대폰 번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="숫자만 입력해 주세요"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Comment: Edit Customer Modal Component
function EditCustomerModal({
  customer,
  onClose,
  onSuccess,
}: {
  customer: Customer;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(customer.name || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('고객명을 입력해주세요.');
      return;
    }

    if (!phone.trim()) {
      setError('휴대폰번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/customers?id=${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || '고객 수정에 실패했습니다.');
      }
    } catch (error) {
      setError('고객 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`정말로 ${customer.name} 고객을 삭제하시겠습니까?`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/customers?id=${customer.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        alert(data.error || '고객 삭제에 실패했습니다.');
      }
    } catch (error) {
      alert('고객 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  // Comment: Format phone number for display
  const formatPhone = (phone: string | null) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="bg-black text-white p-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-xl font-bold">고객 수정</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              고객 번호
            </label>
            <input
              type="text"
              value={customer.customer_number || customer.id}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              고객명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              휴대폰 번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="숫자만 입력해 주세요"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              등록일
            </label>
            <input
              type="text"
              value={customer.created_at ? customer.created_at.split('T')[0] : ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
            >
              {deleting ? '삭제 중...' : '삭제'}
            </button>
            <div className="flex-1"></div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Comment: Customer Sales Modal Component
function CustomerSalesModal({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [designers, setDesigners] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        // Comment: Fetch customer's bookings (sales history)
        const bookingsRes = await fetch(`/api/appointment?customer_id=${customer.id}&limit=1000`);
        const bookingsData = await bookingsRes.json();

        if (isMounted) {
          if (bookingsRes.ok) {
            setSalesHistory(bookingsData.bookings || []);
          }

          // Comment: Fetch related data
          const [designersRes, shopsRes, servicesRes, paymentsRes] = await Promise.all([
            fetch('/api/staff'),
            fetch('/api/shops'),
            fetch('/api/services'),
            fetch(`/api/payments?customer_id=${customer.id}`).catch(() => null),
          ]);

          const designersData = await designersRes.json();
          const shopsData = await shopsRes.json();
          const servicesData = await servicesRes.json();

          if (isMounted) {
            if (designersRes.ok && designersData.staff) {
              setDesigners(designersData.staff);
            }
            if (shopsRes.ok && shopsData.shops) {
              setShops(shopsData.shops);
            }
            if (servicesRes.ok && servicesData.services) {
              setServices(servicesData.services);
            }

            // Comment: Fetch payments for these bookings
            if (bookingsRes.ok && bookingsData.bookings && bookingsData.bookings.length > 0) {
              const bookingIds = bookingsData.bookings.map((b: any) => b.id);
              try {
                const paymentsRes = await fetch(
                  `/api/payments?booking_ids=${bookingIds.join(',')}`
                );
                if (paymentsRes.ok) {
                  const paymentsData = await paymentsRes.json();
                  if (paymentsData.payments) {
                    // Comment: Create a map of booking_id to payment
                    const paymentsMap = new Map();
                    paymentsData.payments.forEach((p: any) => {
                      if (p.booking_id) {
                        paymentsMap.set(p.booking_id, p);
                      }
                    });
                    // Comment: Attach payment info to sales history
                    setSalesHistory((prev) =>
                      prev.map((sale) => ({
                        ...sale,
                        payment: paymentsMap.get(sale.id),
                      }))
                    );
                  }
                }
              } catch (error) {
                console.error('Error fetching payments:', error);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching customer sales data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [customer.id]);

  // Comment: Format time for display
  const formatTime = (time: string) => {
    if (!time) return '—';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Comment: Get designer name
  const getDesignerName = (designerId: number | null) => {
    if (!designerId) return '-';
    const designer = designers.find((d) => d.id === designerId);
    return designer?.name || '-';
  };

  // Comment: Get service name
  const getServiceName = (serviceId: number | null) => {
    if (!serviceId) return '-';
    const service = services.find((s) => s.id === serviceId);
    return service?.name || '-';
  };

  // Comment: Get shop name
  const getShopName = (shopId: number | null) => {
    if (!shopId) return '-';
    const shop = shops.find((s) => s.id === shopId);
    return shop?.name || '-';
  };

  // Comment: Format phone number
  const formatPhone = (phone: string | null) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-black text-white p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">고객 판매 내역 - {customer.name}</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Customer Info */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">고객명</div>
              <div className="text-lg font-bold">{customer.name || '-'}</div>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">휴대폰</div>
              <div className="text-lg font-bold">{formatPhone(customer.phone)}</div>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">고객 번호</div>
              <div className="text-lg font-bold">{customer.customer_number || customer.id}</div>
            </div>
          </div>

          {/* Sales History Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">로딩 중...</div>
            </div>
          ) : salesHistory.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">판매 내역이 없습니다.</div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">
                  총 {salesHistory.length}건
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        지점
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        날짜
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        판매 항목
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        담당자
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        금액
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        결제 방법
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        결제 금액
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {salesHistory.map((sale: any) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {getShopName(sale.shop_id)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {sale.booking_date} {formatTime(sale.booking_time)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {getServiceName(sale.service_id)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {getDesignerName(sale.designer_id)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {sale.total_amount ? sale.total_amount.toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {sale.payment?.method === 'cash' ? '현금' : sale.payment?.method === 'card' ? '카드' : sale.payment?.method === 'bank_transfer' ? '계좌이체' : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {sale.payment?.amount ? sale.payment.amount.toLocaleString() : (sale.total_amount ? sale.total_amount.toLocaleString() : '-')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
