import { supabase } from '@/lib/supabase';

// Comment: Resolve shop_id for designer_schedules (NOT NULL) from body or designers row
export async function resolveShopIdForDesigner(
  designerId: number,
  shopIdFromBody: unknown
): Promise<number | null> {
  let resolvedShopId: number | null =
    shopIdFromBody != null && shopIdFromBody !== '' ? Number(shopIdFromBody) : null;
  if (!resolvedShopId || Number.isNaN(resolvedShopId)) {
    const { data: designerRow, error: designerErr } = await supabase
      .from('designers')
      .select('shop_id')
      .eq('id', designerId)
      .maybeSingle();
    if (designerErr) {
      console.error('Error resolving designer shop_id:', designerErr);
    }
    const raw = designerRow?.shop_id;
    resolvedShopId = raw != null && raw !== '' ? Number(raw) : null;
    if (resolvedShopId != null && Number.isNaN(resolvedShopId)) {
      resolvedShopId = null;
    }
  }
  return resolvedShopId;
}

export type UpsertScheduleRowInput = {
  designer_id: number;
  resolvedShopId: number;
  weekday: number;
  start_time: string;
  end_time: string;
  effective_from?: string;
  effective_to?: string | null;
};

// Comment: Insert or update one active row per (designer_id, weekday) with effective_to null
export async function upsertDesignerScheduleRow(
  input: UpsertScheduleRowInput
): Promise<{ schedule: unknown; error?: string }> {
  const { designer_id, resolvedShopId, weekday, start_time, end_time, effective_from, effective_to } =
    input;

  const { data: existing } = await supabase
    .from('designer_schedules')
    .select('id')
    .eq('designer_id', Number(designer_id))
    .eq('weekday', Number(weekday))
    .is('effective_to', null)
    .single();

  const effectiveFrom = effective_from || new Date().toISOString().split('T')[0];

  if (existing) {
    const { data, error } = await supabase
      .from('designer_schedules')
      .update({
        shop_id: resolvedShopId,
        start_time,
        end_time,
        effective_from: effectiveFrom,
        effective_to: effective_to || null,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating schedule:', error);
      return { schedule: null, error: error.message };
    }
    return { schedule: data };
  }

  const { data, error } = await supabase
    .from('designer_schedules')
    .insert({
      designer_id: Number(designer_id),
      shop_id: resolvedShopId,
      weekday: Number(weekday),
      start_time,
      end_time,
      effective_from: effectiveFrom,
      effective_to: effective_to || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating schedule:', error);
    return { schedule: null, error: error.message };
  }
  return { schedule: data };
}
