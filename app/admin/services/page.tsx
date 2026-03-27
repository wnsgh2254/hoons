'use client';

import { useEffect, useState } from 'react';
import { invalidateServicesCache } from '@/hooks/useServices';
import {
  AdminPageLayout,
  PageHeader,
  SearchBar,
  DataTable,
  Modal,
  Input,
  Button,
  IconButton,
  Badge,
  FormAlert,
  EmptyState,
} from '@/components/ui';

interface Service {
  id: number;
  name: string;
  price: number;
  duration_minutes: number;
  description?: string | null;
  is_active: boolean;
  shop_id: number | null;
  category: string | null;
  visible_to: 'customer' | 'admin' | 'both';
  created_at: string;
}

// Comment: Helper function to determine service category based on name
// Remove (card) or (cash) from name for category detection
function getServiceCategory(name: string): string {
  const cleanName = name.replace(/\s*\(card\)\s*/gi, '').replace(/\s*\(cash\)\s*/gi, '').trim();
  const lowerName = cleanName.toLowerCase();

  // Check for category suffix first (e.g., "- Perm", "- Magic", "- Hot Perm", "- Color", "- Clinic", "- Package")
  if (lowerName.includes('- perm') && !lowerName.includes('hot perm') && !lowerName.includes('magic')) return 'Perm';
  if (lowerName.includes('- magic')) return 'Magic';
  if (lowerName.includes('- hot perm')) return 'Hot Perm';
  if (lowerName.includes('- color')) return 'Color';
  if (lowerName.includes('- clinic')) return 'Clinic';
  if (lowerName.includes('- package')) return 'Package';

  // Check for specific patterns
  // Package category - includes packages and design additions (without category suffix)
  if (lowerName.includes('package') || (lowerName.includes('design addition') && !lowerName.includes('-'))) return 'Package';
  if (lowerName.includes('mucota') || lowerName.includes('ahyunchae') || lowerName.includes('keratin') || lowerName.includes('scalp') || lowerName.includes('sleek') || lowerName.includes('clinic')) return 'Clinic';
  if (lowerName.includes('color') || lowerName.includes('bleach') || lowerName.includes('toning')) return 'Color';
  if (lowerName.includes('special perm') || lowerName.includes('setting perm') || lowerName.includes('design setting perm')) return 'Hot Perm';
  if (lowerName.includes('magic') || lowerName.includes('iron perm') || lowerName.includes('iron root')) return 'Magic';
  if (lowerName.includes('perm') && !lowerName.includes('magic') && !lowerName.includes('special') && !lowerName.includes('setting')) return 'Perm';
  if (lowerName.includes('styling') || lowerName.includes('shampoo') || lowerName.includes('dry')) return 'Dry';

  // Cut category - includes all cut-related services and additions (without category suffix)
  if (lowerName.includes('cut') ||
      (lowerName.includes('length addition') && !lowerName.includes('-')) ||
      lowerName.includes('hair extension') ||
      (lowerName.includes('director level') && !lowerName.includes('-')) ||
      (lowerName.includes('manager level') && !lowerName.includes('-')) ||
      lowerName.includes('kids cut') ||
      lowerName.includes('bangs cut')) {
    return 'Cut';
  }

  return 'Others';
}

const categoryOrder = ['Cut', 'Dry', 'Perm', 'Magic', 'Hot Perm', 'Color', 'Clinic', 'Package', 'Others'];

export default function ServiceMenuSettingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Load services
  useEffect(() => {
    let isMounted = true;
    const fetchServices = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/services');
        const data = await res.json();
        if (isMounted) {
          if (!res.ok) {
            throw new Error(data.error || 'Failed to load services');
          }
          setServices(data.services || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load services');
          setServices([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchServices();
    return () => {
      isMounted = false;
    };
  }, []);

  // Group services by category (use DB category if available, otherwise fallback to name-based detection)
  const servicesByCategory = services.reduce((acc, service) => {
    let category = service.category || getServiceCategory(service.name);
    // Normalize 'Other' to 'Others' for consistency
    if (category === 'Other') {
      category = 'Others';
    }
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery(''); // Reset search when opening modal
    setIsServiceModalOpen(true);
  };

  const handleUpdateService = async (serviceId: number, updates: Partial<Service>) => {
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update service');
      }

      // Update local state
      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? { ...s, ...updates } : s))
      );
      invalidateServicesCache();
      setSuccessMessage('Service updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update service');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete service');
      }

      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      invalidateServicesCache();
      setSuccessMessage('Service deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete service');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleToggleActive = (service: Service) => {
    handleUpdateService(service.id, { is_active: !service.is_active });
  };

  // Filtered & sorted services for the category modal table
  const filteredServices = selectedCategory
    ? (servicesByCategory[selectedCategory] || [])
        .filter((service) =>
          searchQuery.trim() === '' || service.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
          // Sort: card services first, then cash services
          const aIsCard = a.name.toLowerCase().includes('(card)');
          const bIsCard = b.name.toLowerCase().includes('(card)');
          if (aIsCard && !bIsCard) return -1;
          if (!aIsCard && bIsCard) return 1;
          // Within same type, sort alphabetically
          return a.name.localeCompare(b.name);
        })
    : [];

  // DataTable columns for the category service list
  const serviceColumns = [
    {
      key: 'name',
      header: '시술 이름',
      render: (service: Service) => {
        const isCard = service.name.toLowerCase().includes('(card)');
        const isCash = service.name.toLowerCase().includes('(cash)');
        const displayName = service.name.replace(/\s*\(card\)\s*/gi, '').replace(/\s*\(cash\)\s*/gi, '').trim();

        return (
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-black">{displayName}</div>
            {isCard && <Badge variant="info">카드</Badge>}
            {isCash && <Badge variant="success">현금</Badge>}
          </div>
        );
      },
    },
    {
      key: 'price',
      header: '가격 ($)',
      render: (service: Service) => (
        <Input
          type="number"
          value={service.price}
          onChange={(e) =>
            handleUpdateService(service.id, { price: Number(e.target.value) })
          }
          className="!w-24"
          min={0}
          step={0.01}
        />
      ),
    },
    {
      key: 'duration',
      header: '시간 (분)',
      render: (service: Service) => (
        <Input
          type="number"
          value={service.duration_minutes}
          onChange={(e) =>
            handleUpdateService(service.id, { duration_minutes: Number(e.target.value) })
          }
          className="!w-24"
          min={1}
        />
      ),
    },
    {
      key: 'actions',
      header: '액션',
      align: 'center' as const,
      render: (service: Service) => (
        <div className="flex items-center justify-center gap-2">
          <IconButton
            icon="edit"
            size="sm"
            variant="ghost"
            title="수정"
            onClick={() => {
              setEditingService(service);
              setIsServiceModalOpen(false);
            }}
          />
          <IconButton
            icon="delete"
            size="sm"
            variant="danger"
            title="삭제"
            onClick={() => handleDeleteService(service.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <AdminPageLayout>
      {successMessage && (
        <div className="pointer-events-none fixed right-4 top-20 z-50">
          <div className="pointer-events-auto rounded-xl bg-black text-white shadow-lg px-4 py-3 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>{successMessage}</span>
          </div>
        </div>
      )}
      {error && (
        <div className="pointer-events-none fixed right-4 top-20 z-50">
          <div className="pointer-events-auto rounded-xl bg-red-500 text-white shadow-lg px-4 py-3 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Page header */}
      <PageHeader title="서비스 메뉴 설정" />

      {/* Category Grid */}
      {loading ? (
        <div className="text-center py-11.5">
          <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm mt-4">Loading services...</p>
        </div>
      ) : services.length === 0 ? (
        <EmptyState title="No services found" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categoryOrder.map((category) => {
            const categoryServices = servicesByCategory[category] || [];
            // Always show "Others" category, even if it has 0 services
            if (category !== 'Others' && categoryServices.length === 0) return null;

            return (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryClick(category)}
                className="bg-white border-2 border-gray-200 rounded-2xl p-5.5 hover:border-black hover:shadow-md transition-all text-center"
              >
                <h4 className="text-lg font-bold text-black mb-2">{category}</h4>
                <p className="text-sm text-gray-500">{categoryServices.length} services</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Service Management Modal */}
      <Modal
        isOpen={isServiceModalOpen && !!selectedCategory}
        onClose={() => {
          setIsServiceModalOpen(false);
          setSearchQuery('');
        }}
        title={selectedCategory || ''}
        maxWidth="max-w-6xl"
        scrollable
      >
        <div className="flex items-center justify-end -mt-2 mb-4">
          <Button
            variant="primary"
            size="sm"
            icon="add"
            onClick={() => {
              setShowAddModal(true);
            }}
          >
            시술 추가
          </Button>
        </div>

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="시술 검색..."
          className="mb-4"
        />

        <DataTable
          columns={serviceColumns}
          data={filteredServices}
          keyExtractor={(service) => service.id}
          emptyMessage="No services found"
        />
      </Modal>

      {/* Add Service Modal */}
      {showAddModal && (
        <AddServiceModal
          category={selectedCategory || undefined}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            // Reload services
            window.location.reload();
          }}
        />
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <EditServiceModal
          service={editingService}
          onClose={() => setEditingService(null)}
          onSuccess={() => {
            setEditingService(null);
            // Reload services
            window.location.reload();
          }}
        />
      )}
    </AdminPageLayout>
  );
}

// Add Service Modal
function AddServiceModal({
  category,
  onClose,
  onSuccess,
}: {
  category?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [serviceType, setServiceType] = useState<'card' | 'cash'>('card');
  // Comment: Visibility is derived from service type (card -> both, cash -> admin)
  const [visibleTo, setVisibleTo] = useState<'admin' | 'both'>('both');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || !duration) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Add (card) or (cash) suffix to service name
      const serviceName = `${name.trim()} (${serviceType})`;

      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: serviceName,
          price: Number(price),
          duration_minutes: Number(duration),
          description: description.trim() || null,
          shop_id: null,
          is_active: true,
          category: category || null,
          visible_to: visibleTo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create service');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="새 시술 추가"
      zIndex="z-[60]"
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="flex-1">
            취소
          </Button>
          <Button
            variant="primary"
            loading={loading}
            onClick={(e) => {
              // Trigger form submit via the form's onSubmit
              const form = document.getElementById('add-service-form') as HTMLFormElement;
              form?.requestSubmit();
            }}
            className="flex-1"
          >
            {loading ? '생성 중...' : '시술 생성'}
          </Button>
        </>
      }
    >
      <form id="add-service-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <FormAlert message={error} variant="error" />}
        {category && (
          <FormAlert
            message={`${category} 카테고리에 시술을 추가합니다.`}
            variant="info"
          />
        )}
        <Input
          label="시술 이름"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Men's Cut"
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">시술 유형</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="serviceType"
                value="card"
                checked={serviceType === 'card'}
                onChange={() => {
                  setServiceType('card');
                  setVisibleTo('both'); // Comment: card services are visible to both customer & admin
                }}
                className="w-4 h-4 text-black border-gray-300 focus:ring-black"
              />
              <span className="text-sm">카드</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="serviceType"
                value="cash"
                checked={serviceType === 'cash'}
                onChange={() => {
                  setServiceType('cash');
                  setVisibleTo('admin'); // Comment: cash-only services are visible to admin only
                }}
                className="w-4 h-4 text-black border-gray-300 focus:ring-black"
              />
              <span className="text-sm">현금</span>
            </label>
          </div>
        </div>
        <Input
          label="가격 ($)"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="55"
          min={0}
          step={0.01}
          required
        />
        <Input
          label="시간 (분)"
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="45"
          min={1}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            설명 (고객 예약 페이지, 선택)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="짧은 시술 설명"
          />
        </div>
      </form>
    </Modal>
  );
}

// Edit Service Modal
function EditServiceModal({
  service,
  onClose,
  onSuccess,
}: {
  service: Service;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description ?? '');
  const [price, setPrice] = useState<string>(String(service.price));
  const [duration, setDuration] = useState<string>(String(service.duration_minutes));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || !duration) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/services/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          price: Number(price),
          duration_minutes: Number(duration),
          description: description.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update service');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Edit Service"
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={loading}
            onClick={() => {
              const form = document.getElementById('edit-service-form') as HTMLFormElement;
              form?.requestSubmit();
            }}
            className="flex-1"
          >
            {loading ? 'Updating...' : 'Update Service'}
          </Button>
        </>
      }
    >
      <form id="edit-service-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <FormAlert message={error} variant="error" />}
        <Input
          label="시술 이름"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="가격 ($)"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          min={0}
          step={0.01}
          required
        />
        <Input
          label="시간 (분)"
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          min={1}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            설명 (고객 예약 페이지, 선택)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="짧은 시술 설명"
          />
        </div>
      </form>
    </Modal>
  );
}
