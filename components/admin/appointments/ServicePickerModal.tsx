'use client';

import { SERVICE_PICKER_CATEGORY_ORDER, getServiceCategoryForPicker } from '@/lib/utils/appointment-utils';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Z } from '@/lib/constants';

const CATEGORY_NORMALIZE_MAP: Record<string, string> = {
  '커트': 'Cut', '드라이': 'Dry', '펌': 'Perm', '매직': 'Magic',
  '열펌': 'Hot Perm', '핫펌': 'Hot Perm', '염색': 'Color',
  '크리닉': 'Clinic', '클리닉': 'Clinic', '패키지': 'Package', '기타': 'Others',
};
function normalizeCategory(cat: string): string {
  return CATEGORY_NORMALIZE_MAP[cat] || cat;
}

interface ServicePickerModalProps {
  services: { id: number; name: string; duration_minutes?: number | null; category?: string | null }[];
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

  const title = servicePickerCategory == null ? '카테고리 선택' : servicePickerCategory;

  return (
    <Modal
      isOpen
      onClose={servicePickerCategory != null ? () => setServicePickerCategory(null) : onClose}
      title={title}
      zIndex={Z.MODAL_PICKER}
      maxWidth="max-w-lg"
      scrollable
    >
      {servicePickerCategory == null ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(() => {
            const grouped: Record<string, typeof services> = {};
            services.forEach((s) => {
              const cat = normalizeCategory(s.category || getServiceCategoryForPicker(s.name));
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(s);
            });
            const allCats = new Set(Object.keys(grouped));
            const ordered = [
              ...SERVICE_PICKER_CATEGORY_ORDER.filter((c) => allCats.has(c)),
              ...Array.from(allCats).filter((c) => !SERVICE_PICKER_CATEGORY_ORDER.includes(c)),
            ];
            return ordered.map((cat) => {
              const list = grouped[cat] || [];
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
            });
          })()}
        </div>
      ) : (
        <div className="space-y-2">
          {services
            .filter((s) => (normalizeCategory(s.category || getServiceCategoryForPicker(s.name))) === servicePickerCategory)
            .map((s) => {
              const name = s.name.replace(/\s*\(card\)\s*/gi, '').trim();
              const dur = s.duration_minutes != null ? `${s.duration_minutes}분` : '';
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
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
    </Modal>
  );
}
