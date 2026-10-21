'use client';

import { useEffect, useState } from 'react';
import { useStaff } from '@/hooks/useStaff';
import { BOOKING_DEPOSIT_AUD } from '@/lib/booking-deposit';
import { useServices } from '@/hooks/useServices';
import {
  AdminPageLayout,
  PageHeader,
  DataTable,
  IconButton,
  Modal,
  Input,
  Select,
  Badge,
  Button,
  FormAlert,
} from '@/components/ui';

export default function ServiceHistoryPage() {
  const [serviceHistory, setServiceHistory] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const { staff: designers } = useStaff();
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

  // Fetch shops
  useEffect(() => {
    const fetchShops = async () => {
      try {
        const res = await fetch('/api/shops');
        const data = await res.json();
        if (data.shops) setShops(data.shops);
      } catch (error) {
        console.error('Error fetching shops:', error);
      }
    };
    fetchShops();
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success' as const;
      case 'cancelled':
        return 'error' as const;
      case 'noshow':
        return 'warning' as const;
      default:
        return 'default' as const;
    }
  };

  const designerOptions = designers.map((designer) => ({
    value: String(designer.id),
    label: designer.name,
  }));

  const columns = [
    {
      key: 'date_time',
      header: 'Date & Time',
      render: (service: any) => (
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
      ),
    },
    {
      key: 'designer',
      header: 'Designer',
      render: (service: any) => (
        <span className="text-gray-600">{service.designer?.name || '—'}</span>
      ),
    },
    {
      key: 'service',
      header: 'Service',
      render: (service: any) => (
        <>
          <span className="text-gray-600">
            {service.custom_service_name || service.service?.name || '—'}
          </span>
          {(service.custom_service_duration || service.service?.duration_minutes) && (
            <span className="text-xs text-gray-500 block">
              {service.custom_service_duration || service.service?.duration_minutes} min
            </span>
          )}
        </>
      ),
    },
    {
      key: 'shop',
      header: 'Shop',
      render: (service: any) => (
        <span className="text-gray-600">{service.shop?.name || '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (service: any) => (
        <Badge variant={getStatusBadgeVariant(service.status)}>
          {service.status || 'pending'}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (service: any) => (
        <>
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
        </>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      render: (service: any) => (
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton
            icon="edit"
            onClick={() => setEditingService(service)}
            title="Edit"
          />
        </div>
      ),
    },
  ];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchServiceHistory(page);
  };

  return (
    <AdminPageLayout>
      <PageHeader title="시술 내역" />

      {/* Filters */}
      <div className="bg-white p-5.5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-start">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            wrapperClassName="flex-1"
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            wrapperClassName="flex-1"
          />
          <Select
            label="Designer"
            value={selectedDesignerId}
            onChange={(e) => setSelectedDesignerId(e.target.value)}
            options={designerOptions}
            placeholder="All Designers"
            wrapperClassName="flex-1"
          />
        </div>
      </div>

      {/* Service History Table */}
      <div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5.5 border-b border-gray-100">
            <h3 className="text-lg font-bold text-black">Service Records</h3>
            <p className="text-xs text-gray-500 mt-1">
              {loading
                ? 'Loading service history...'
                : serviceHistory.length === 0
                  ? 'No service records found for the selected period.'
                  : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, total)} of ${total} service record${total === 1 ? '' : 's'}`}
            </p>
          </div>
          <DataTable
            columns={columns}
            data={serviceHistory}
            keyExtractor={(service) => service.id}
            loading={loading}
            emptyMessage="No service records"
            emptyIcon="history"
            className="border-0 rounded-none shadow-none"
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-green-500 text-white px-5.5 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">check_circle</span>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      <EditServiceModal
        service={editingService}
        isOpen={!!editingService}
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
    </AdminPageLayout>
  );
}

// Comment: Edit Service Modal Component
function EditServiceModal({
  service,
  isOpen,
  onClose,
  onSuccess,
}: {
  service: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [bookingDate, setBookingDate] = useState(
    service?.booking_date ? service.booking_date.split('T')[0] : ''
  );
  const [bookingTime, setBookingTime] = useState(service?.booking_time || '');
  const [status, setStatus] = useState(service?.status || 'pending');
  const [totalAmount, setTotalAmount] = useState<string>(String(service?.total_amount || 0));
  const [depositAmount, setDepositAmount] = useState<string>(String(service?.deposit_amount || 0));
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    service?.service_id ? String(service.service_id) : 'other'
  );
  const [customServiceName, setCustomServiceName] = useState<string>(
    service?.custom_service_name || (service?.service_id ? '' : (service?.service?.name || ''))
  );
  const [customServiceDuration, setCustomServiceDuration] = useState<string>(
    service?.service_id ? '' : String(service?.custom_service_duration || service?.service?.duration_minutes || '')
  );
  const { services } = useServices();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOtherSelected = selectedServiceId === 'other';

  // Reset form state when service changes
  useEffect(() => {
    if (service) {
      setBookingDate(service.booking_date ? service.booking_date.split('T')[0] : '');
      setBookingTime(service.booking_time || '');
      setStatus(service.status || 'pending');
      setTotalAmount(String(service.total_amount || 0));
      setDepositAmount(String(service.deposit_amount || 0));
      setSelectedServiceId(service.service_id ? String(service.service_id) : 'other');
      setCustomServiceName(
        service.custom_service_name || (service.service_id ? '' : (service.service?.name || ''))
      );
      setCustomServiceDuration(
        service.service_id ? '' : String(service.custom_service_duration || service.service?.duration_minutes || '')
      );
      setError(null);
    }
  }, [service]);

  // Comment: Update total amount when service is selected
  useEffect(() => {
    if (selectedServiceId && selectedServiceId !== 'other' && services.length > 0) {
      const selectedService = services.find((svc) => String(svc.id) === selectedServiceId);
      if (selectedService) {
        setTotalAmount(String(selectedService.price || 0));
        // Comment: Deposit is a flat amount regardless of service price
        setDepositAmount(String(BOOKING_DEPOSIT_AUD));
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

  const serviceOptions = [
    ...services.map((svc) => ({
      value: String(svc.id),
      label: `${svc.name} - ₩${Number(svc.price).toLocaleString('ko-KR')} (${svc.duration_minutes} min)`,
    })),
    { value: 'other', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'noshow', label: 'No Show' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Service Record"
      maxWidth="max-w-lg"
      scrollable
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={loading}
            onClick={handleSubmit}
            className="flex-1"
            type="submit"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormAlert message={error} variant="error" />}
        <Input
          label="Date *"
          type="date"
          required
          value={bookingDate}
          onChange={(e) => setBookingDate(e.target.value)}
        />
        <Input
          label="Time *"
          type="time"
          required
          value={bookingTime}
          onChange={(e) => setBookingTime(e.target.value)}
        />
        <Select
          label="Service *"
          value={selectedServiceId}
          onChange={(e) => {
            setSelectedServiceId(e.target.value);
            if (e.target.value !== 'other') {
              setCustomServiceName('');
              setCustomServiceDuration('');
            }
          }}
          required
          options={serviceOptions}
          placeholder="Select a service"
        />
        {isOtherSelected && (
          <>
            <Input
              label="Service Name *"
              type="text"
              value={customServiceName}
              onChange={(e) => setCustomServiceName(e.target.value)}
              required={isOtherSelected}
              placeholder="Enter service name"
            />
            <Input
              label="Duration (minutes) *"
              type="number"
              min="1"
              value={customServiceDuration}
              onChange={(e) => setCustomServiceDuration(e.target.value)}
              required={isOtherSelected}
              placeholder="Enter duration in minutes"
            />
          </>
        )}
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={statusOptions}
        />
        <Input
          label="Total Amount"
          type="number"
          min="0"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          placeholder="Enter total amount"
        />
        <Input
          label="Deposit Amount"
          type="number"
          min="0"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          placeholder="Enter deposit amount"
        />
      </form>
    </Modal>
  );
}
