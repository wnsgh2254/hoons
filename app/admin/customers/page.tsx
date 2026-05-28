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
import { useSalesDetailActions } from '@/hooks/useSalesDetailActions';
import { formatAudNumber } from '@/lib/utils';

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
  const [newBookingTimeSlots, setNewBookingTimeSlots] = useState<NewBookingTimeSlot[]>([
    { ...DEFAULT_NEW_BOOKING_TIME_SLOT },
  ]);

  // Sales Detail Modal + edit/delete actions (shared hook)
  const salesActions = useSalesDetailActions({
    onRefresh: async () => {
      if (viewingCustomerId) {
        await loadCustomerInfo(viewingCustomerId);
      }
      await fetchCustomers(currentPage);
    },
  });

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchCustomers(page);
  };

  // Comment: Load customer info for CustomerInfoDrawer
  const loadCustomerInfo = async (customerId: number) => {
    setCustomerInfoLoading(true);
    setViewingCustomerId(customerId);
    try {
      const [customerRes, statsRes] = await Promise.all([
        fetch(`/api/customers/${customerId}`),
        fetch(`/api/customers/${customerId}/stats`),
      ]);
      const customerData = await customerRes.json();

      if (!customerRes.ok || !customerData.customer) {
        alert('고객 정보를 불러올 수 없습니다.');
        setViewingCustomerId(null);
        return;
      }

      const statsData = statsRes.ok ? await statsRes.json() : {};
      setViewingCustomer({
        ...customerData.customer,
        last_visit_date: statsData.last_visit_date ?? null,
        days_since_last_visit: statsData.days_since_last_visit ?? null,
        appointments_count: statsData.appointments_count ?? 0,
        cancelled_count: statsData.cancelled_count ?? 0,
        next_appointment: statsData.next_appointment ?? null,
        prepaid_tickets: statsData.prepaid_tickets ?? [],
        prepaid_balance: statsData.prepaid_balance ?? 0,
        total_sales: statsData.total_sales ?? 0,
      });
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
      render: (c: Customer) => formatAudNumber(Number(c.prepaid_balance ?? 0)),
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
        emptyMessage={
          searchQuery.trim() ? '검색 결과가 없습니다' : '고객이 없습니다'
        }
        emptyIcon="person"
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
          setNewBookingTimeSlots([{ ...DEFAULT_NEW_BOOKING_TIME_SLOT }]);
        }}
        selectedDate={new Date().toISOString().split('T')[0]}
        newBookingTimeSlots={newBookingTimeSlots}
        setNewBookingTimeSlots={setNewBookingTimeSlots}
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
        onViewSalesDetail={(item) => {
          const salesDetail = {
            id: item.id,
            customer_id: item.customer_id ?? viewingCustomerId ?? 0,
            shop_id: item.shop_id ?? null,
            booking_id: item.booking_id ?? null,
            customer_name: viewingCustomer?.name || '',
            sales_date: item.sales_date,
            sales_time: item.sales_time || '',
            sales_amount: item.sales_amount || 0,
            discount_amount: item.discount_amount || 0,
            total_amount: item.total_amount || 0,
            cash_amount: item.cash_amount || 0,
            card_amount: item.card_amount || 0,
            bank_transfer_amount: item.bank_transfer_amount || 0,
            payment_method: item.payment_method || null,
            point_accumulation: item.point_accumulation || 0,
            memo: item.memo || null,
            items: (item.sales_items || []).map((i: any) => ({
              item_type: i.item_type || 'service',
              item_name: i.item_name || '-',
              unit_price: Number(i.unit_price) || 0,
              quantity: Number(i.quantity) || 1,
              discount: Number(i.discount) || 0,
              discount_type: i.discount_type || null,
              discount_value: i.discount_value ?? null,
              amount: Number(i.amount) || 0,
              manager: i.manager || null,
              sales_classification: i.sales_classification || null,
              prepaid_deduction: Number(i.prepaid_deduction) || 0,
            })),
            created_by: item.created_by,
            created_at: item.created_at,
            edit_history: item.edit_history || [],
          };
          salesActions.openDetail(salesDetail);
        }}
      />

      {salesActions.modals}
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

