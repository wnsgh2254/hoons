'use client';

import { defaultAppointmentRequest, useAppointmentRequest } from '@/lib/appointment-request';
import { useState, useEffect, useRef } from 'react';

export interface InventoryItem {
  id: number;
  shop_id?: number | null;
  name: string;
  size: string | null;
  sku: string | null;
  category: string;
  price: number;
  cost_price?: number;
  stock: number;
  status: string;
  icon: string | null;
  brand: string | null;
  for_internal?: boolean;
  for_retail?: boolean;
}

export interface InventoryBrand {
  id: number;
  shop_id?: number | null;
  name: string;
}

export interface InventoryProductCategory {
  id: number;
  shop_id?: number | null;
  name: string;
}

// Simple in-memory cache
let cachedItems: InventoryItem[] | null = null;
let cachedBrands: InventoryBrand[] | null = null;
let cachedCategories: InventoryProductCategory[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000; // 30 seconds

function isCacheValid() {
  return cachedItems !== null && Date.now() - cacheTimestamp < CACHE_TTL;
}

export function invalidateInventoryCache() {
  cachedItems = null;
  cachedBrands = null;
  cachedCategories = null;
  cacheTimestamp = 0;
}

export function useInventory(options: { enabled?: boolean; shopId?: number | null } = {}) {
  const request = useAppointmentRequest();
  const useSharedCache = request === defaultAppointmentRequest;
  const { enabled = true, shopId = null } = options;
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [brands, setBrands] = useState<InventoryBrand[]>([]);
  const [categories, setCategories] = useState<InventoryProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    if (useSharedCache && shopId == null && isCacheValid() && cachedItems && cachedBrands && cachedCategories) {
      Promise.resolve().then(() => {
        if (!cancelled && mountedRef.current && cachedItems && cachedBrands && cachedCategories) {
          setItems(cachedItems);
          setBrands(cachedBrands);
          setCategories(cachedCategories);
        }
      });
      return () => { cancelled = true; };
    }

    const query = shopId != null ? `?shop_id=${shopId}` : '';
    Promise.resolve()
      .then(() => {
        if (cancelled) return Promise.reject(new Error('cancelled'));
        setLoading(true);
        setError(null);
        return Promise.all([
          request(`/api/inventory${query}`).then((r) => r.json()),
          request(`/api/inventory-brands${query}`).then((r) => r.json()),
          request(`/api/inventory-product-categories${query}`).then((r) => r.json()),
        ]);
      })
      .then(([itemsData, brandsData, categoriesData]) => {
        if (cancelled) return;
        const itemList: InventoryItem[] = itemsData.items || [];
        const brandList: InventoryBrand[] = brandsData.brands || [];
        const categoryList: InventoryProductCategory[] = categoriesData.categories || [];
        if (useSharedCache && shopId == null) {
          cachedItems = itemList;
          cachedBrands = brandList;
          cachedCategories = categoryList;
          cacheTimestamp = Date.now();
        }
        if (mountedRef.current) {
          setItems(itemList);
          setBrands(brandList);
          setCategories(categoryList);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('useInventory fetch error:', err);
        if (mountedRef.current) {
          setError('인벤토리를 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (!cancelled && mountedRef.current) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [enabled, shopId, request, useSharedCache]);

  const refetch = (): Promise<void> => {
    if (useSharedCache) invalidateInventoryCache();
    setLoading(true);
    const query = shopId != null ? `?shop_id=${shopId}` : '';
    return Promise.all([
      request(`/api/inventory${query}`).then((r) => r.json()),
      request(`/api/inventory-brands${query}`).then((r) => r.json()),
      request(`/api/inventory-product-categories${query}`).then((r) => r.json()),
    ])
      .then(([itemsData, brandsData, categoriesData]) => {
        const itemList: InventoryItem[] = itemsData.items || [];
        const brandList: InventoryBrand[] = brandsData.brands || [];
        const categoryList: InventoryProductCategory[] = categoriesData.categories || [];
        if (useSharedCache) {
          cachedItems = itemList;
          cachedBrands = brandList;
          cachedCategories = categoryList;
          cacheTimestamp = Date.now();
        }
        if (mountedRef.current) {
          setItems(itemList);
          setBrands(brandList);
          setCategories(categoryList);
          setError(null);
        }
      })
      .catch((err) => {
        console.error('useInventory refetch error:', err);
        if (mountedRef.current) {
          setError('인벤토리를 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  };

  return { items, brands, categories, loading, error, refetch };
}
