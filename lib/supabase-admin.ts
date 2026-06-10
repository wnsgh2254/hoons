import { supabase } from '@/lib/supabase';

/** @deprecated Use `supabase` from `@/lib/supabase` (service role on server). */
export function getSupabaseAdmin() {
  return supabase;
}
