'use client';

import { useEffect, useState } from 'react';
import AdminTopNav from '@/components/AdminTopNav';

interface Service {
  id: number;
  name: string;
  price: number;
  duration_minutes: number;
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

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex flex-col">
      <AdminTopNav />
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
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-white">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-black mb-2">Service Menu Settings</h1>
                <p className="text-gray-600">Manage your service menu and pricing</p>
              </div>
            </div>

            {/* Category Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
                <p className="text-gray-500 text-sm mt-4">Loading services...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No services found</p>
              </div>
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
                      className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-black hover:shadow-md transition-all text-center"
                    >
                      <h4 className="text-lg font-bold text-black mb-2">{category}</h4>
                      <p className="text-sm text-gray-500">{categoryServices.length} services</p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Service Management Modal */}
            {isServiceModalOpen && selectedCategory && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsServiceModalOpen(false)}>
                <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-black">{selectedCategory}</h3>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddModal(true);
                        }}
                        className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Add Service
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsServiceModalOpen(false);
                          setSearchQuery('');
                        }}
                        className="text-gray-500 hover:text-black transition-colors"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    {/* Search */}
                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="Search services..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                    {/* Services Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Service Name
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Price ($)
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Duration (mins)
                              </th>
                              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {servicesByCategory[selectedCategory]
                              ?.filter((service) =>
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
                              .map((service) => {
                                const isCard = service.name.toLowerCase().includes('(card)');
                                const isCash = service.name.toLowerCase().includes('(cash)');
                                const displayName = service.name.replace(/\s*\(card\)\s*/gi, '').replace(/\s*\(cash\)\s*/gi, '').trim();
                                
                                return (
                                <tr key={service.id} className={`hover:bg-gray-50 ${isCash ? 'bg-gray-50/50' : ''}`}>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm font-medium text-black">{displayName}</div>
                                      {isCard && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                          Card
                                        </span>
                                      )}
                                      {isCash && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                          Cash
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <input
                                      type="number"
                                      value={service.price}
                                      onChange={(e) =>
                                        handleUpdateService(service.id, { price: Number(e.target.value) })
                                      }
                                      className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                                      min="0"
                                      step="0.01"
                                    />
                                  </td>
                                  <td className="px-6 py-4">
                                    <input
                                      type="number"
                                      value={service.duration_minutes}
                                      onChange={(e) =>
                                        handleUpdateService(service.id, { duration_minutes: Number(e.target.value) })
                                      }
                                      className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                                      min="1"
                                    />
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => {
                                          setEditingService(service);
                                          setIsServiceModalOpen(false);
                                        }}
                                        className="text-gray-500 hover:text-black transition-colors"
                                        title="Edit"
                                      >
                                        <span className="material-symbols-outlined text-lg">edit</span>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteService(service.id)}
                                        className="text-gray-500 hover:text-red-600 transition-colors"
                                        title="Delete"
                                      >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

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
    </div>
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
  const [price, setPrice] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [serviceType, setServiceType] = useState<'card' | 'cash'>('card');
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-black">Add New Service</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {category && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
              Adding service to <strong>{category}</strong> category
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="e.g., Men's Cut"
              required
            />
            <p className="text-xs text-gray-500 mt-1">(card) or (cash) will be added automatically</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="serviceType"
                  value="card"
                  checked={serviceType === 'card'}
                  onChange={(e) => setServiceType('card')}
                  className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                />
                <span className="text-sm">Card</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="serviceType"
                  value="cash"
                  checked={serviceType === 'cash'}
                  onChange={(e) => setServiceType('cash')}
                  className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                />
                <span className="text-sm">Cash</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibleTo"
                  value="both"
                  checked={visibleTo === 'both'}
                  onChange={(e) => setVisibleTo('both')}
                  className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                />
                <span className="text-sm">Both (visible to customers on booking page and admins)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibleTo"
                  value="admin"
                  checked={visibleTo === 'admin'}
                  onChange={(e) => setVisibleTo('admin')}
                  className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                />
                <span className="text-sm">Admin (only visible to admins, e.g., additional fees)</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price ($)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="55"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="45"
              min="1"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-black">Edit Service</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price ($)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              min="1"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
