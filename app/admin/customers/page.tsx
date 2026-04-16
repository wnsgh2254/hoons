'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import {
  AdminPageLayout,
  PageHeader,
  SearchBar,
  DataTable,
  Button,
  IconButton,
  Modal,
  Input,
  Select,
  FormAlert,
} from '@/components/ui';
import AddCustomerModal from '@/components/admin/customers/AddCustomerModal';
import CustomerInfoDrawer from '@/components/admin/appointments/CustomerInfoDrawer';
import NewBookingModal from '@/components/admin/appointments/NewBookingModal';
import type { Customer, NewBookingTimeSlot } from '@/lib/types';
import { DEFAULT_NEW_BOOKING_TIME_SLOT } from '@/lib/types';
import { useStaff } from '@/hooks/useStaff';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomerId, setViewingCustomerId] = useState<number | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<any | null>(null);
  const [customerInfoLoading, setCustomerInfoLoading] = useState(false);
  const [customerInfoTab, setCustomerInfoTab] = useState<'sales' | 'bookings' | 'prepaid'>('sales');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingCustomer, setBookingCustomer] = useState<{ id: number; name: string; phone: string } | null>(null);

  // NewBookingModal state (same shape as admin/appointments page)
  const [newBookingCustomerSearch, setNewBookingCustomerSearch] = useState('');
  const [newBookingDate, setNewBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newBookingTimeSlots, setNewBookingTimeSlots] = useState<NewBookingTimeSlot[]>([
    { ...DEFAULT_NEW_BOOKING_TIME_SLOT },
  ]);
  const [newBookingDesigners, setNewBookingDesigners] = useState<any[]>([]);
  const [newBookingServices, setNewBookingServices] = useState<{ id: number; name: string; duration_minutes: number }[]>([]);
  const [newBookingMemo, setNewBookingMemo] = useState('');
  const [newBookingSubmitting, setNewBookingSubmitting] = useState(false);
  const [newBookingLoadingOptions, setNewBookingLoadingOptions] = useState(false);
  const [newBookingShopId, setNewBookingShopId] = useState<number | null>(null);
  const [newBookingSelectedCustomerId, setNewBookingSelectedCustomerId] = useState<number | null>(null);
  const [newBookingCustomerSearchResults, setNewBookingCustomerSearchResults] = useState<any[]>([]);
  const [newBookingIsCustomerSearching, setNewBookingIsCustomerSearching] = useState(false);
  const [isCustomerRegistrationModalOpen, setIsCustomerRegistrationModalOpen] = useState(false);

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

  // Comment: Load shops/designers/services when New Booking modal opens
  useEffect(() => {
    if (!isBookingModalOpen) return;
    setNewBookingLoadingOptions(true);
    const targetDate = newBookingDate || new Date().toISOString().split('T')[0];
    const loadShops = async () => {
      const res = await fetch('/api/shops');
      const json = await res.json();
      if (res.ok) {
        const shops = json.shops || [];
        if (shops.length > 0) setNewBookingShopId((prev) => prev ?? shops[0].id);
      }
    };
    const loadDesigners = async () => {
      const res = await fetch(`/api/working-designers?date=${encodeURIComponent(targetDate)}`);
      const json = await res.json();
      if (res.ok) setNewBookingDesigners(json.designers || []);
    };
    const loadServices = async () => {
      const res = await fetch('/api/services');
      const json = await res.json();
      if (res.ok) setNewBookingServices(json.services || []);
    };
    Promise.all([loadShops(), loadDesigners(), loadServices()]).finally(() =>
      setNewBookingLoadingOptions(false)
    );
  }, [isBookingModalOpen, newBookingDate]);

  // Comment: Pre-fill customer when opening booking modal from customer row
  useEffect(() => {
    if (isBookingModalOpen && bookingCustomer) {
      setNewBookingSelectedCustomerId(bookingCustomer.id);
      setNewBookingCustomerSearchResults([bookingCustomer]);
      setNewBookingCustomerSearch(bookingCustomer.name);
    }
  }, [isBookingModalOpen, bookingCustomer]);

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchCustomers(page);
  };

  // Comment: Load customer info for CustomerInfoDrawer
  const loadCustomerInfo = async (customerId: number) => {
    setCustomerInfoLoading(true);
    setViewingCustomerId(customerId);
    try {
      const customerRes = await fetch(`/api/customers/${customerId}`);
      const customerData = await customerRes.json();

      if (!customerRes.ok || !customerData.customer) {
        alert('고객 정보를 불러올 수 없습니다.');
        setViewingCustomerId(null);
        return;
      }

      const baseCustomer = customerData.customer;
      setViewingCustomer(baseCustomer);

      // Background: detailed stats
      void (async () => {
        try {
          const [bookingsRes, prepaidRes] = await Promise.all([
            fetch(`/api/appointment?customer_id=${customerId}&limit=500`),
            fetch(`/api/prepaid?customer_id=${customerId}`).catch(() => null),
          ]);

          const bookingsData = await bookingsRes.json();
          const prepaidData = prepaidRes ? await prepaidRes.json() : null;
          const bookings = bookingsData.bookings || [];

          const totalSales = bookings.reduce((sum: number, b: any) => sum + Number(b.total_amount || 0), 0);

          const completedBookings = bookings.filter(
            (b: any) => b.status === 'PAID' || b.status === 'COMPLETED',
          );
          const lastBooking = completedBookings.sort((a: any, b: any) => {
            const dateA = new Date(`${a.booking_date}T${a.booking_time || '00:00:00'}`);
            const dateB = new Date(`${b.booking_date}T${b.booking_time || '00:00:00'}`);
            return dateB.getTime() - dateA.getTime();
          })[0];

          const lastVisitDate = lastBooking ? lastBooking.booking_date : null;
          let daysSinceLastVisit = null as number | null;
          if (lastVisitDate) {
            const diffTime = new Date().getTime() - new Date(lastVisitDate).getTime();
            daysSinceLastVisit = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          }

          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          const recentBookings = bookings.filter((b: any) => new Date(b.booking_date) >= oneYearAgo);
          const appointmentsCount = recentBookings.length;
          const cancelledCount = recentBookings.filter((b: any) => b.status === 'CANCELLED').length;

          const upcomingBookings = bookings
            .filter((b: any) => {
              const bookingDate = new Date(`${b.booking_date}T${b.booking_time || '00:00:00'}`);
              return bookingDate > new Date() && (b.status === 'BOOKED' || b.status === 'CONFIRMED' || !b.status);
            })
            .sort((a: any, b: any) => {
              const dateA = new Date(`${a.booking_date}T${a.booking_time || '00:00:00'}`);
              const dateB = new Date(`${b.booking_date}T${b.booking_time || '00:00:00'}`);
              return dateA.getTime() - dateB.getTime();
            });
          const nextAppointment = upcomingBookings[0]
            ? { date: upcomingBookings[0].booking_date, time: upcomingBookings[0].booking_time || '' }
            : null;

          const prepaidTickets = prepaidData?.prepaid || [];
          const totalPrepaidBalance =
            Number(prepaidData?.totalPoints ?? 0) ||
            prepaidTickets.reduce(
              (sum: number, ticket: any) =>
                sum + (Number(ticket.balance ?? ticket.points) || 0),
              0,
            );

          setViewingCustomer((prev: any) => {
            if (!prev || prev.id !== baseCustomer.id) return prev;
            return {
              ...prev,
              last_visit_date: lastVisitDate,
              days_since_last_visit: daysSinceLastVisit,
              appointments_count: appointmentsCount,
              cancelled_count: cancelledCount,
              next_appointment: nextAppointment,
              prepaid_tickets: prepaidTickets,
              prepaid_balance: totalPrepaidBalance,
              total_sales: totalSales,
            };
          });
        } catch (err) {
          console.error('Error loading detailed customer stats:', err);
        }
      })();
    } catch (err) {
      console.error('Error loading customer info:', err);
      alert('고객 정보를 불러오는 중 오류가 발생했습니다.');
      setViewingCustomerId(null);
    } finally {
      setCustomerInfoLoading(false);
    }
  };

  const columns = [
    {
      key: 'created_at',
      header: '등록일',
      render: (c: Customer) => formatDate(c.created_at),
    },
    {
      key: 'customer_number',
      header: '고객 번호',
      render: (c: Customer) => c.customer_number || c.id,
    },
    {
      key: 'name',
      header: '고객명',
      render: (c: Customer) => (
        <span className="font-medium">{c.name || '-'}</span>
      ),
    },
    {
      key: 'phone',
      header: '휴대폰 / 전화번호',
      render: (c: Customer) => formatPhone(c.phone),
    },
    {
      key: 'designer',
      header: '담당자',
      render: (c: Customer) => c.assigned_designer?.name || '-',
    },
    {
      key: 'prepaid_balance',
      header: '정액권 잔액',
      render: (c: Customer) => c.prepaid_balance || 0,
    },
    {
      key: 'total_sales',
      header: '총 판매액',
      render: (c: Customer) =>
        c.total_sales ? c.total_sales.toLocaleString() : '0',
    },
    {
      key: 'actions',
      header: '',
      align: 'center' as const,
      render: (c: Customer) => (
        <div className="flex items-center justify-center gap-2">
          <IconButton
            icon="edit"
            onClick={() => setEditingCustomer(c)}
            title="수정"
          />
          <IconButton
            icon="calendar_month"
            onClick={() => {
              setBookingCustomer({ id: c.id, name: c.name || '', phone: c.phone || '' });
              setIsBookingModalOpen(true);
            }}
            title="예약"
          />
          <IconButton
            icon="receipt_long"
            onClick={() => loadCustomerInfo(c.id)}
            title="영업"
          />
        </div>
      ),
    },
  ];

  return (
    <AdminPageLayout>
      <PageHeader
        title="고객"
        actions={
          <Button
            icon="add"
            onClick={() => setShowAddModal(true)}
            className="shadow-md hover:shadow-lg"
          >
            고객등록
          </Button>
        }
      />

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="고객명 또는 휴대폰번호로 검색..."
        rightContent={
          <div className="text-sm text-gray-600">
            총 {total.toLocaleString()}명 고객이 검색되었습니다
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={customers}
        keyExtractor={(c) => c.id}
        loading={loading}
        emptyMessage="고객이 없습니다."
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {/* Add Customer Modal */}
      {showAddModal && (
        <AddCustomerModal
          isOpen={showAddModal}
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

      {/* New Booking Modal */}
      <NewBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setBookingCustomer(null);
          setNewBookingSelectedCustomerId(null);
          setNewBookingCustomerSearchResults([]);
          setNewBookingCustomerSearch('');
          setNewBookingTimeSlots([{ ...DEFAULT_NEW_BOOKING_TIME_SLOT }]);
        }}
        selectedDate={new Date().toISOString().split('T')[0]}
        newBookingCustomerSearch={newBookingCustomerSearch}
        newBookingDate={newBookingDate}
        newBookingTimeSlots={newBookingTimeSlots}
        newBookingDesigners={newBookingDesigners}
        newBookingServices={newBookingServices}
        newBookingMemo={newBookingMemo}
        newBookingSubmitting={newBookingSubmitting}
        newBookingLoadingOptions={newBookingLoadingOptions}
        newBookingShopId={newBookingShopId}
        newBookingSelectedCustomerId={newBookingSelectedCustomerId}
        newBookingCustomerSearchResults={newBookingCustomerSearchResults}
        newBookingIsCustomerSearching={newBookingIsCustomerSearching}
        setNewBookingCustomerSearch={setNewBookingCustomerSearch}
        setNewBookingDate={setNewBookingDate}
        setNewBookingTimeSlots={setNewBookingTimeSlots}
        setNewBookingMemo={setNewBookingMemo}
        setNewBookingSubmitting={setNewBookingSubmitting}
        setIsCustomerRegistrationModalOpen={setIsCustomerRegistrationModalOpen}
        setBookingSuccessMessage={() => {}}
        setBookings={() => {}}
        setFilteredBookings={() => {}}
        setNewBookingSelectedCustomerId={setNewBookingSelectedCustomerId}
        setNewBookingCustomerSearchResults={setNewBookingCustomerSearchResults}
        setNewBookingIsCustomerSearching={setNewBookingIsCustomerSearching}
        onSuccess={(message) => {
          setIsBookingModalOpen(false);
          setBookingCustomer(null);
          alert(message);
        }}
        onOpenCustomerRegistration={() => setShowAddModal(true)}
        registeredCustomer={bookingCustomer}
      />

      {/* Customer Info Drawer */}
      <CustomerInfoDrawer
        customerId={viewingCustomerId}
        customer={viewingCustomer}
        loading={customerInfoLoading}
        tab={customerInfoTab}
        onClose={() => {
          setViewingCustomerId(null);
          setViewingCustomer(null);
        }}
        onTabChange={setCustomerInfoTab}
      />
    </AdminPageLayout>
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
  const [assignedDesignerId, setAssignedDesignerId] = useState<number | null>(customer.assigned_designer_id || null);
  const { staff: designers } = useStaff({ onlyActive: true });
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
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          assigned_designer_id: assignedDesignerId || null,
        }),
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

  const designerOptions = designers.map((d) => ({
    value: d.id,
    label: d.name,
  }));

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="고객 수정"
      hideHeader={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4 -m-5.5 p-5.5">
        <Input
          label="고객 번호"
          value={String(customer.customer_number || customer.id)}
          disabled
          className="bg-gray-50 text-gray-500"
        />
        <Input
          label="고객명"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="휴대폰 번호"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          placeholder="숫자만 입력해 주세요"
          required
        />
        <Select
          label="담당자"
          value={assignedDesignerId || ''}
          onChange={(e) => setAssignedDesignerId(e.target.value ? Number(e.target.value) : null)}
          options={designerOptions}
          placeholder="선택 안 함"
        />
        <Input
          label="등록일"
          value={customer.created_at ? customer.created_at.split('T')[0] : ''}
          disabled
          className="bg-gray-50 text-gray-500"
        />
        {error && <FormAlert message={error} variant="error" />}
        <div className="flex gap-3 pt-4">
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={deleting}
          >
            삭제
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" loading={loading}>
            저장
          </Button>
        </div>
      </form>
    </Modal>
  );
}

