import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only DB client.
 * Uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). Never expose service role to the browser.
 * With RLS enabled and no anon policies, direct Supabase REST access is blocked for the public.
 */
const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';

const isServer = typeof window === 'undefined';
const activeKey = isServer ? serviceRoleKey || anonKey : anonKey;

if (!supabaseUrl || !activeKey) {
  console.warn(
    'Supabase env missing (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)',
  );
}

if (isServer && !serviceRoleKey) {
  console.warn(
    'SUPABASE_SERVICE_ROLE_KEY is not set. Set it before applying RLS lock migration.',
  );
}

const FETCH_RETRIES = 3;
const FETCH_RETRY_BASE_MS = 400;

function isRetryableSupabaseNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  let cause = '';
  if (err instanceof Error && err.cause) {
    cause = err.cause instanceof Error ? err.cause.message : String(err.cause);
  }
  const combined = `${msg} ${cause}`;
  return (
    combined.includes('fetch failed') ||
    combined.includes('ConnectTimeout') ||
    combined.includes('UND_ERR_CONNECT_TIMEOUT') ||
    combined.includes('UND_ERR_SOCKET') ||
    combined.includes('ECONNRESET') ||
    combined.includes('ETIMEDOUT') ||
    combined.includes('EAI_AGAIN')
  );
}

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let last: unknown;
  for (let attempt = 0; attempt < FETCH_RETRIES; attempt++) {
    try {
      return await fetch(input, init);
    } catch (e) {
      last = e;
      if (attempt === FETCH_RETRIES - 1 || !isRetryableSupabaseNetworkError(e)) {
        throw e;
      }
      await new Promise((r) => setTimeout(r, FETCH_RETRY_BASE_MS * (attempt + 1)));
    }
  }
  throw last;
}

const createMockClient = (): SupabaseClient =>
  ({
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  }) as unknown as SupabaseClient;

export const supabase: SupabaseClient =
  supabaseUrl && activeKey
    ? createClient(supabaseUrl, activeKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: fetchWithRetry },
      })
    : createMockClient();
