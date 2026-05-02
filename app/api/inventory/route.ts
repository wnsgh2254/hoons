import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getInventoryStatus } from '@/lib/utils/inventory-utils';
import { handleApiError } from '@/lib/api-utils';
import { parseInventoryShopId } from '@/lib/inventory-shop';

type InventoryRow = {
  id: number;
  brand?: string | null;
  price?: number | string | null;
  cost_price?: number | string | null;
  stock?: number | string | null;
};

// Comment: Fetch inventory items from Supabase with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const brandParam = searchParams.get('brand');
    const shopId = parseInventoryShopId(searchParams.get('shop_id'));

    // Comment: Load brand list for fallback and filtering
    const { data: brandsData } = await supabase
      .from('inventory_brands')
      .select('id, name')
      .eq('shop_id', shopId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    const brandNames: string[] = (brandsData ?? []).map((b: { name: string }) => String(b.name));

    let query = supabase.from('inventory_items').select('*').eq('shop_id', shopId).order('name');

    if (category && category !== 'All Categories') {
      query = query.eq('category', category);
    }

    if (status && status !== 'All Status') {
      query = query.eq('status', status);
    }

    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      query = query.or(`name.ilike.${term},sku.ilike.${term}`);
    }

    const { data, error } = await query;

    if (error) {
      return handleApiError(error, 'inventory GET', '인벤토리 목록을 불러오지 못했습니다.');
    }

    let items = ((data || []) as InventoryRow[]).map((item) => {
      const brand =
        item.brand != null && String(item.brand).trim() !== ''
          ? String(item.brand).trim()
          : brandNames.length > 0
            ? brandNames[Math.abs(item.id) % brandNames.length]
            : null;
      return {
        ...item,
        price: Number(item.price ?? 0),
        stock: Number(item.stock ?? 0),
        brand: brand ?? item.brand ?? null,
      };
    });

    if (brandParam && brandParam !== '전체' && brandParam.trim() !== '') {
      items = items.filter((item: { brand?: string | null }) => item.brand === brandParam);
    }

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'inventory GET', '인벤토리 목록을 불러오지 못했습니다.');
  }
}

// Comment: Create a new inventory item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, size, sku, category, price, cost_price, stock, icon, for_internal, for_retail } = body;
    const shopId = parseInventoryShopId(body.shop_id ?? body.shopId);

    if (!name || !category || price == null || stock == null) {
      return NextResponse.json(
        { error: 'name, category, price, stock 는 필수입니다.' },
        { status: 400 }
      );
    }

    const numericPrice = Number(price);
    const numericCostPrice = Number(cost_price ?? 0);
    const numericStock = Number(stock);

    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        name: String(name).trim(),
        shop_id: shopId,
        size: size ? String(size).trim() : null,
        sku: sku ? String(sku).trim() : null,
        category: String(category).trim(),
        price: numericPrice,
        cost_price: numericCostPrice,
        stock: numericStock,
        status: getInventoryStatus(numericStock),
        icon: icon ? String(icon).trim() : null,
        // Keep backward compatibility: products are internal by default unless explicitly changed.
        for_internal: for_internal !== undefined ? Boolean(for_internal) : true,
        for_retail: for_retail !== undefined ? Boolean(for_retail) : false,
      })
      .select()
      .single();

    if (error) {
      return handleApiError(error, 'inventory POST', '인벤토리 상품을 추가하지 못했습니다.');
    }

    const item = {
      ...data,
      price: Number(data.price ?? 0),
      cost_price: Number(data.cost_price ?? 0),
      stock: Number(data.stock ?? 0),
    };

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'inventory POST', '인벤토리 상품을 추가하지 못했습니다.');
  }
}

// Comment: Bulk update inventory stock quantities
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const shopId = parseInventoryShopId(body.shop_id ?? body.shopId);

    if (!items.length) {
      return NextResponse.json({ updated: 0 }, { status: 200 });
    }

    // Comment: Update each item stock in parallel
    const updates = await Promise.all(
      items.map(async (item: { id?: number; stock?: number }) => {
        const id = Number(item.id);
        const stock = Number(item.stock);
        if (!id || Number.isNaN(stock)) return null;

        const { error } = await supabase
          .from('inventory_items')
          .update({ stock, status: getInventoryStatus(stock) })
          .eq('id', id)
          .eq('shop_id', shopId);

        if (error) {
          console.error(`Error updating inventory item ${id}:`, error);
          return null;
        }

        return id;
      })
    );

    const updatedCount = updates.filter((id) => id !== null).length;

    return NextResponse.json({ updated: updatedCount }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'inventory PUT', '인벤토리 수량을 저장하지 못했습니다.');
  }
}

// Comment: Update a single inventory item (excluding stock-only bulk updates)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, size, sku, category, price, cost_price, icon, stock, for_internal, for_retail } = body;
    const shopId = parseInventoryShopId(body.shop_id ?? body.shopId);

    const numericId = Number(id);
    if (!numericId) {
      return NextResponse.json({ error: '올바른 id 가 필요합니다.' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (size !== undefined) updates.size = size ? String(size).trim() : null;
    if (sku !== undefined) updates.sku = sku ? String(sku).trim() : null;
    if (category !== undefined) updates.category = String(category).trim();
    if (price !== undefined) updates.price = Number(price);
    if (cost_price !== undefined) updates.cost_price = Number(cost_price);
    if (icon !== undefined) updates.icon = icon ? String(icon).trim() : null;
    if (stock !== undefined) {
      const nextStock = Math.max(0, Number(stock));
      updates.stock = nextStock;
      updates.status = getInventoryStatus(nextStock);
    }
    if (for_internal !== undefined) updates.for_internal = Boolean(for_internal);
    if (for_retail !== undefined) updates.for_retail = Boolean(for_retail);

    const { data, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', numericId)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) {
      return handleApiError(error, 'inventory PATCH', '인벤토리 상품을 수정하지 못했습니다.');
    }

    const item = {
      ...data,
      price: Number(data.price ?? 0),
      cost_price: Number(data.cost_price ?? 0),
      stock: Number(data.stock ?? 0),
    };

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'inventory PATCH', '인벤토리 상품을 수정하지 못했습니다.');
  }
}

