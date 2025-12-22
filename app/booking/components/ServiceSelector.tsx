'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Service } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export default function ServiceSelector() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;
        setServices(data || []);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, []);

  const toggleService = (serviceId: number) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const totalPrice = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + Number(s.price), 0);

  if (loading) {
    return (
      <div>
        <label className="block text-lg font-semibold text-gray-900 mb-4">
          서비스 선택
        </label>
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-lg font-semibold text-gray-900 mb-4">
        서비스 선택
      </label>
      <div className="space-y-3">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => toggleService(service.id)}
            className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
              selectedServices.includes(service.id)
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{service.name}</div>
                <div className="text-sm text-gray-500">
                  소요시간: {service.duration_minutes}분
                </div>
              </div>
              <div className="font-bold text-gray-900">
                {formatCurrency(Number(service.price))}
              </div>
            </div>
          </button>
        ))}
      </div>
      {services.length === 0 && (
        <p className="text-gray-500">등록된 서비스가 없습니다.</p>
      )}
      {selectedServices.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">총 금액</span>
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalPrice)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}



