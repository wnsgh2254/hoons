import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client for server-only operations (webhooks, SMS helpers).
 * Avoid importing this from client components.
 */
const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

let cached: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  if (!supabaseUrl || !serviceRoleKey) {
    cached = null;
    return null;
  }
  cached = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cached;
}
