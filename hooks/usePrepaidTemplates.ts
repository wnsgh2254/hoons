'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PrepaidPassTemplate {
  id: number;
  type: '금액 적립' | '할인 전용';
  name: string;
  salePrice: number;
  accumulationAmount: number;
  validityPeriod: string;
  hasDiscount: boolean;
  serviceDiscount: number;
  productDiscount: number;
  isActive: boolean;
  sortOrder?: number;
}

const STORAGE_KEY = 'heyoom_prepaid_templates';

const DEFAULT_TEMPLATES: PrepaidPassTemplate[] = [
  { id: 1, type: '금액 적립', name: '500볼', salePrice: 50000, accumulationAmount: 60000, validityPeriod: '무제한', hasDiscount: false, serviceDiscount: 0, productDiscount: 0, isActive: true, sortOrder: 1 },
  { id: 2, type: '금액 적립', name: '1000볼', salePrice: 100000, accumulationAmount: 130000, validityPeriod: '무제한', hasDiscount: false, serviceDiscount: 0, productDiscount: 0, isActive: true, sortOrder: 2 },
];

// Module-level shared state + listeners for cross-component sync
let sharedTemplates: PrepaidPassTemplate[] | null = null;
let nextId = 2000;
const listeners = new Set<() => void>();

function loadTemplates(): PrepaidPassTemplate[] {
  if (sharedTemplates !== null) return sharedTemplates;
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as PrepaidPassTemplate[];
      const normalized = parsed.map((t, idx) => ({
        ...t,
        sortOrder: Number.isFinite(t.sortOrder) ? Number(t.sortOrder) : idx + 1,
      }));
      normalized.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      sharedTemplates = normalized;
      // Set nextId higher than any existing id
      const maxId = normalized.reduce((max, t) => Math.max(max, t.id), 0);
      if (maxId >= nextId) nextId = maxId + 1;
      return normalized;
    }
  } catch { /* ignore */ }
  sharedTemplates = DEFAULT_TEMPLATES;
  return DEFAULT_TEMPLATES;
}

function saveTemplates(next: PrepaidPassTemplate[]) {
  const normalized = next.map((t, idx) => ({
    ...t,
    sortOrder: Number.isFinite(t.sortOrder) ? Number(t.sortOrder) : idx + 1,
  }));
  normalized.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  sharedTemplates = normalized;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  listeners.forEach((fn) => fn());
}

function getNextId() {
  return ++nextId;
}

export function usePrepaidTemplates() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      // Reload from localStorage when changed externally
      sharedTemplates = null;
      forceUpdate((n) => n + 1);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const templates = loadTemplates();

  const addTemplate = useCallback((data: Omit<PrepaidPassTemplate, 'id'>) => {
    const current = loadTemplates();
    saveTemplates([...current, { ...data, id: getNextId(), sortOrder: current.length + 1 }]);
  }, []);

  const updateTemplate = useCallback((id: number, data: Omit<PrepaidPassTemplate, 'id'>) => {
    saveTemplates(loadTemplates().map((t) => (t.id === id ? { ...data, id, sortOrder: t.sortOrder } : t)));
  }, []);

  const deleteTemplate = useCallback((id: number) => {
    saveTemplates(loadTemplates().filter((t) => t.id !== id));
  }, []);

  const reorderTemplates = useCallback((reordered: PrepaidPassTemplate[]) => {
    const reorderedIds = reordered.map((t) => t.id);
    const rest = loadTemplates().filter((t) => !reorderedIds.includes(t.id));
    const next = [...reordered, ...rest].map((t, idx) => ({
      ...t,
      sortOrder: idx + 1,
    }));
    saveTemplates(next);
  }, []);

  return { templates, addTemplate, updateTemplate, deleteTemplate, reorderTemplates };
}
