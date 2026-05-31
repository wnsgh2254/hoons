import type { SupabaseClient } from '@supabase/supabase-js';
import { roundToCents } from '@/lib/utils';

const normalizeName = (value: string | null | undefined) => String(value || '').trim().toLowerCase();

type InventoryStockRow = {
  id: number;
  stock: number | string | null;
};

type PrepaidPassRow = {
  id: number;
  name: string | null;
  points: number | string | null;
  customer_id: number;
};

export async function adjustInventoryStockForSaleItem(
  supabase: SupabaseClient,
  params: {
    sourceItemId?: number | null;
    shopId?: number | null;
    itemName?: string | null;
    quantityDelta: number;
  },
): Promise<void> {
  const quantityDelta = Math.trunc(Number(params.quantityDelta) || 0);
  if (quantityDelta === 0) return;

  let item: InventoryStockRow | null = null;

  if (params.sourceItemId != null && Number.isFinite(Number(params.sourceItemId))) {
    const { data } = await supabase
      .from('inventory_items')
      .select('id, stock')
      .eq('id', Number(params.sourceItemId))
      .eq('shop_id', Number(params.shopId ?? 3))
      .maybeSingle();
    item = data as InventoryStockRow | null;
  }

  if (!item && params.itemName) {
    const { data } = await supabase
      .from('inventory_items')
      .select('id, stock')
      .eq('name', params.itemName)
      .eq('shop_id', Number(params.shopId ?? 3))
      .limit(1)
      .maybeSingle();
    item = data as InventoryStockRow | null;
  }

  if (!item?.id) return;

  const nextStock = Math.max(0, Number(item.stock || 0) + quantityDelta);
  const { error } = await supabase
    .from('inventory_items')
    .update({ stock: nextStock })
    .eq('id', Number(item.id))
    .eq('shop_id', Number(params.shopId ?? 3));

  if (error) {
    throw new Error(error.message);
  }
}

export async function getActivePrepaidBalance(
  supabase: SupabaseClient,
  customerId: number,
): Promise<number> {
  const { data, error } = await supabase
    .from('prepaid_passes')
    .select('points')
    .eq('is_active', true)
    .eq('customer_id', customerId);
  if (error) {
    throw new Error(error.message);
  }
  return roundToCents(
    (data || []).reduce(
      (sum, row) => sum + Number((row as { points?: number | string | null }).points || 0),
      0,
    ),
  );
}

/** Reject prepaid deductions when the owner has no pass or insufficient balance. */
export async function assertSufficientPrepaidBalance(
  supabase: SupabaseClient,
  customerId: number,
  deductionAmount: number,
): Promise<void> {
  const amount = roundToCents(Number(deductionAmount) || 0);
  if (amount <= 0) return;

  const balance = await getActivePrepaidBalance(supabase, customerId);
  if (balance <= 0) {
    throw new Error('사용 가능한 정액권이 없습니다.');
  }
  if (amount > balance) {
    throw new Error('정액권 잔액이 부족합니다.');
  }
}

export async function adjustPrepaidBalance(
  supabase: SupabaseClient,
  params: {
    customerId: number;
    passLabel?: string | null;
    pointsDelta: number;
  },
): Promise<void> {
  const pointsDelta = roundToCents(Number(params.pointsDelta) || 0);
  if (pointsDelta === 0) return;

  const { data, error } = await supabase
    .from('prepaid_passes')
    .select('id, name, points, customer_id')
    .eq('is_active', true)
    .eq('customer_id', params.customerId)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || []) as PrepaidPassRow[];
  if (rows.length === 0) {
    if (pointsDelta < 0) {
      throw new Error('사용 가능한 정액권이 없습니다.');
    }
    return;
  }

  const preferredRows = rows.filter(
    (row) => normalizeName(row.name) === normalizeName(params.passLabel),
  );
  const targetRows = preferredRows.length > 0 ? preferredRows : rows;

  if (pointsDelta > 0) {
    const target = targetRows[0];
    if (!target) return;
    const nextPoints = Math.max(0, Number(target.points || 0) + pointsDelta);
    const { error: updateError } = await supabase
      .from('prepaid_passes')
      .update({ points: nextPoints })
      .eq('id', Number(target.id));
    if (updateError) {
      throw new Error(updateError.message);
    }
    return;
  }

  let remaining = Math.abs(pointsDelta);
  for (const row of targetRows) {
    if (remaining <= 0) break;
    const current = Number(row.points || 0);
    const deduct = Math.min(current, remaining);
    const nextPoints = Math.max(0, current - deduct);
    const { error: updateError } = await supabase
      .from('prepaid_passes')
      .update({ points: nextPoints })
      .eq('id', Number(row.id));
    if (updateError) {
      throw new Error(updateError.message);
    }
    remaining -= deduct;
  }

  if (remaining > 0) {
    throw new Error('정액권 잔액이 부족합니다.');
  }
}
