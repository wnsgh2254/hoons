'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Designer } from '@/lib/types';

export default function DesignerSelector() {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [selectedDesigner, setSelectedDesigner] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDesigners() {
      try {
        const { data, error } = await supabase
          .from('designers')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;
        setDesigners(data || []);
      } catch (error) {
        console.error('Error fetching designers:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDesigners();
  }, []);

  if (loading) {
    return (
      <div>
        <label className="block text-lg font-semibold text-gray-900 mb-4">
          디자이너 선택
        </label>
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-lg font-semibold text-gray-900 mb-4">
        디자이너 선택
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {designers.map((designer) => (
          <button
            key={designer.id}
            onClick={() => setSelectedDesigner(designer.id)}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              selectedDesigner === designer.id
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold text-gray-900">{designer.name}</div>
            <div className="text-sm text-gray-500">{designer.role}</div>
          </button>
        ))}
      </div>
      {designers.length === 0 && (
        <p className="text-gray-500">등록된 디자이너가 없습니다.</p>
      )}
    </div>
  );
}



