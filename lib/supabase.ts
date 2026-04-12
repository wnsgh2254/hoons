import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client configuration (no NEXT_PUBLIC_ prefix)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables (SUPABASE_URL / SUPABASE_ANON_KEY) are not set');
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

/** Comment: Undici often times out at ~10s on cold or flaky links; brief retries avoid 500s on transient failures. */
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

// Create a minimal mock supabase client if env vars are not set
const createMockClient = () => {
  return {
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
  } as any;
};

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: { fetch: fetchWithRetry },
    })
  : createMockClient();

