'use client';

import { SERVICE_PICKER_CATEGORY_ORDER, getServiceCategoryForPicker } from '@/lib/utils/appointment-utils';
import { useState } from 'react';

interface ServicePickerModalProps {
  services: { id: number; name: string; duration_minutes?: number | null }[];
  selectedServiceId: number | null;
  onSelect: (serviceId: number) => void;
  onClose: () => void;
}

export default function ServicePickerModal({
  services,
  selectedServiceId,
  onSelect,
  onClose,
}: ServicePickerModalProps) {
  const [servicePickerCategory, setServicePickerCategory] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-black">
            {servicePickerCategory == null ? '카테고리 선택' : servicePickerCategory}
          </h3>
          {servicePickerCategory != null ? (
            <button
              type="button"
              onClick={() => setServicePickerCategory(null)}
              className="text-sm text-gray-600 hover:text-black"
            >
              뒤로
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-black"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {servicePickerCategory == null ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SERVICE_PICKER_CATEGORY_ORDER.map((cat) => {
                const list = services.filter(
                  (s) => getServiceCategoryForPicker(s.name) === cat
                );
                if (list.length === 0) return null;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setServicePickerCategory(cat)}
                    className="border-2 border-gray-200 rounded-xl p-4 text-center hover:border-black hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900">{cat}</span>
                    <p className="text-xs text-gray-500 mt-1">{list.length}개</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {services
                .filter((s) => getServiceCategoryForPicker(s.name) === servicePickerCategory)
                .map((s) => {
                  const name = s.name.replace(/\s*\(card\)\s*/gi, '').trim();
                  const dur = s.duration_minutes != null ? `${s.duration_minutes}분` : '';
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onSelect(s.id);
                      }}
                      className={`w-full text-left border rounded-xl px-4 py-3 text-sm transition-colors ${
                        selectedServiceId === s.id
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 hover:border-black hover:bg-gray-50'
                      }`}
                    >
                      {dur ? `${name} · ${dur}` : name}
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
