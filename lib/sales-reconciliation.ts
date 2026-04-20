import type { SupabaseClient } from '@supabase/supabase-js';

const normalizeName = (value: string | null | undefined) => String(value || '').trim().toLowerCase();

async function loadCustomerPhone(supabase: SupabaseClient, customerId: number): Promise<string> {
  const { data } = await supabase
    .from('customers')
    .select('phone')
    .eq('id', customerId)
    .maybeSingle();

  return String(data?.phone || '').replace(/\D/g, '');
}

export async function adjustInventoryStockForSaleItem(
  supabase: SupabaseClient,
  params: {
    sourceItemId?: number | null;
    itemName?: string | null;
    quantityDelta: number;
  },
): Promise<void> {
  const quantityDelta = Math.trunc(Number(params.quantityDelta) || 0);
  if (quantityDelta === 0) return;

  let item: any = null;

  if (params.sourceItemId != null && Number.isFinite(Number(params.sourceItemId))) {
    const { data } = await supabase
      .from('inventory_items')
      .select('id, stock')
      .eq('id', Number(params.sourceItemId))
      .maybeSingle();
    item = data;
  }

  if (!item && params.itemName) {
    const { data } = await supabase
      .from('inventory_items')
      .select('id, stock')
      .eq('name', params.itemName)
      .limit(1)
      .maybeSingle();
    item = data;
  }

  if (!item?.id) return;

  const nextStock = Math.max(0, Number(item.stock || 0) + quantityDelta);
  const { error } = await supabase
    .from('inventory_items')
    .update({ stock: nextStock })
    .eq('id', Number(item.id));

  if (error) {
    throw new Error(error.message);
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
  const pointsDelta = Math.round(Number(params.pointsDelta) || 0);
  if (pointsDelta === 0) return;

  const normalizedPhone = await loadCustomerPhone(supabase, params.customerId);
  let query = supabase
    .from('prepaid_passes')
    .select('id, name, points, customer_id')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (normalizedPhone) {
    query = query.or(
      `customer_id.eq.${params.customerId},and(customer_id.is.null,phone.eq.${normalizedPhone})`,
    );
  } else {
    query = query.eq('customer_id', params.customerId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = data || [];
  if (rows.length === 0) return;

  const preferredRows = rows.filter(
    (row: any) => normalizeName(row.name) === normalizeName(params.passLabel),
  );
  const targetRows = preferredRows.length > 0 ? preferredRows : rows;

  const legacyIds = rows
    .filter((row: any) => row.customer_id == null)
    .map((row: any) => Number(row.id))
    .filter((id: number) => Number.isFinite(id));

  if (legacyIds.length > 0) {
    await supabase
      .from('prepaid_passes')
      .update({ customer_id: params.customerId })
      .in('id', legacyIds);
  }

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
}
