import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getInventoryStatus } from '@/lib/utils/inventory-utils';
import { handleApiError } from '@/lib/api-utils';
import { parseInventoryShopId, resolveCatalogInventoryShopIds } from '@/lib/inventory-shop';
import {
  findInventoryCatalogSiblingIds,
  type InventoryCatalogRow,
} from '@/lib/inventory-catalog-sync';

type InventoryRow = {
  id: number;
  shop_id?: number | null;
  brand?: string | null;
  price?: number | string | null;
  cost_price?: number | string | null;
  stock?: number | string | null;
};

// Comment: Match product name, sku, or inventory id shown as fallback product code in UI.
function buildInventorySearchFilter(search: string) {
  const trimmed = search.trim();
  const term = `%${trimmed}%`;
  const clauses = [`name.ilike.${term}`, `sku.ilike.${term}`];
  if (/^\d+$/.test(trimmed)) {
    clauses.push(`id.eq.${trimmed}`);
  }
  return clauses.join(',');
}

// Comment: Fetch inventory items from Supabase with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const brandParam = searchParams.get('brand');
    const shopId = parseInventoryShopId(searchParams.get('shop_id'));

    let query = supabase.from('inventory_items').select('*').eq('shop_id', shopId).order('name');

    if (category && category !== 'All Categories') {
      query = query.eq('category', category);
    }

    if (status && status !== 'All Status') {
      query = query.eq('status', status);
    }

    if (search && search.trim().length > 0) {
      query = query.or(buildInventorySearchFilter(search));
    }

    const { data, error } = await query;

    if (error) {
      return handleApiError(error, 'inventory GET', '인벤토리 목록을 불러오지 못했습니다.');
    }

    let items = ((data || []) as InventoryRow[]).map((item) => {
      // Comment: Do not invent a brand from id modulo — it made saved categories look "renamed" after refresh.
      const brand =
        item.brand != null && String(item.brand).trim() !== '' ? String(item.brand).trim() : null;
      return {
        ...item,
        price: Number(item.price ?? 0),
        stock: Number(item.stock ?? 0),
        brand,
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
    const { name, size, sku, category, brand, price, cost_price, stock, icon, for_internal, for_retail } =
      body;
    const shopIds = resolveCatalogInventoryShopIds(body);

    if (!name || !category || !brand || price == null || stock == null) {
      return NextResponse.json(
        { error: 'name, brand, category, price, stock 는 필수입니다.' },
        { status: 400 }
      );
    }

    const numericPrice = Number(price);
    const numericCostPrice = Number(cost_price ?? 0);
    const numericStock = Number(stock);
    const trimmedSku = sku && String(sku).trim() ? String(sku).trim() : null;

    if (trimmedSku) {
      const { data: existingRows, error: lookupError } = await supabase
        .from('inventory_items')
        .select('id, shop_id')
        .in('shop_id', shopIds)
        .eq('sku', trimmedSku);

      if (lookupError) {
        return handleApiError(lookupError, 'inventory POST', '인벤토리 상품을 추가하지 못했습니다.');
      }

      if (existingRows && existingRows.length > 0) {
        return NextResponse.json(
          { error: `제품코드 "${trimmedSku}"는 이미 등록되어 있습니다. 다른 코드를 사용해주세요.` },
          { status: 409 },
        );
      }
    }

    const rows = shopIds.map((shop_id) => ({
      name: String(name).trim(),
      shop_id,
      size: size ? String(size).trim() : null,
      sku: trimmedSku,
      category: String(category).trim(),
      brand: String(brand).trim(),
      price: numericPrice,
      cost_price: numericCostPrice,
      stock: numericStock,
      status: getInventoryStatus(numericStock),
      icon: icon ? String(icon).trim() : null,
      for_internal: for_internal !== undefined ? Boolean(for_internal) : true,
      for_retail: for_retail !== undefined ? Boolean(for_retail) : false,
    }));

    const { data, error } = await supabase.from('inventory_items').insert(rows).select();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          {
            error: trimmedSku
              ? `제품코드 "${trimmedSku}"는 이미 등록되어 있습니다.`
              : '동일한 제품 정보가 이미 등록되어 있습니다.',
          },
          { status: 409 },
        );
      }
      return handleApiError(error, 'inventory POST', '인벤토리 상품을 추가하지 못했습니다.');
    }

    const inserted = (data ?? []) as InventoryRow[];
    const normalized = inserted.map((row: InventoryRow) => ({
      ...row,
      price: Number(row.price ?? 0),
      cost_price: Number(row.cost_price ?? 0),
      stock: Number(row.stock ?? 0),
    }));

    return NextResponse.json(
      { items: normalized, item: normalized[0] ?? null },
      { status: 201 },
    );
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
    const { id, name, size, sku, category, brand, price, cost_price, icon, stock, for_internal, for_retail } =
      body;
    const rawShopId = body.shop_id ?? body.shopId;
    const shopId = parseInventoryShopId(rawShopId);

    const numericId = Number(id);
    if (!numericId) {
      return NextResponse.json({ error: '올바른 id 가 필요합니다.' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (size !== undefined) updates.size = size ? String(size).trim() : null;
    if (sku !== undefined) updates.sku = sku ? String(sku).trim() : null;
    if (category !== undefined) updates.category = String(category).trim();
    if (brand !== undefined) updates.brand = brand ? String(brand).trim() : null;
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

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '수정할 항목이 없습니다.' }, { status: 400 });
    }

    const { data: source, error: sourceError } = await supabase
      .from('inventory_items')
      .select('id, shop_id, name, sku, brand, category')
      .eq('id', numericId)
      .single();

    if (sourceError || !source) {
      return handleApiError(sourceError, 'inventory PATCH', '인벤토리 상품을 찾지 못했습니다.');
    }

    // Comment: Products are shared across shops (mirrored catalog) — propagate edits to sibling rows
    // so price/stock stay in sync regardless of which shop's page the edit was made from.
    const targetIds = await findInventoryCatalogSiblingIds(source as InventoryCatalogRow);

    const { data, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .in('id', targetIds)
      .select();

    if (error) {
      return handleApiError(error, 'inventory PATCH', '인벤토리 상품을 수정하지 못했습니다.');
    }

    const rows = (data ?? []) as InventoryRow[];
    const primary =
      rows.find((row) => row.id === numericId) ??
      rows.find((row) => row.shop_id === shopId) ??
      rows[0];

    if (!primary) {
      return NextResponse.json({ error: '인벤토리 상품을 찾지 못했습니다.' }, { status: 404 });
    }

    const item = {
      ...primary,
      price: Number(primary.price ?? 0),
      cost_price: Number(primary.cost_price ?? 0),
      stock: Number(primary.stock ?? 0),
    };

    return NextResponse.json({ item, updated: rows.length }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'inventory PATCH', '인벤토리 상품을 수정하지 못했습니다.');
  }
}

